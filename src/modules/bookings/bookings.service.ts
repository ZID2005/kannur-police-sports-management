import crypto from 'crypto';
import {
  BookingType,
  CourtPartition,
  FacilityCode,
  Prisma,
  SlotBookingStatus,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AuthenticatedUser } from '../../types/express';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLogger';
import {
  combineDateAndTime,
  doTimeRangesOverlap,
  formatDateOnly,
  formatDateToTime,
  minutesToTime,
  parseDateOnly,
  parseTimeToDate,
  timeToMinutes,
} from '../../utils/time';
import { getConflictingPartitions } from '../facilities/facilities.service';
import { CancelBookingInput, ReserveSlotInput } from './bookings.schema';

const HOURLY_BOOKABLE_FACILITIES = new Set<FacilityCode>([
  FacilityCode.FOOTBALL_GROUND,
  FacilityCode.POLICE_TURF,
  FacilityCode.BADMINTON_COURT,
]);

const CANCELLATION_MIN_ADVANCE_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

/**
 * Per-facility-date async lock queue to serialize concurrent reservation requests
 * alongside PostgreSQL Serializable transactions + SELECT ... FOR UPDATE row locks.
 */
const facilityDateLocks = new Map<string, Promise<void>>();

async function withFacilityDateLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  const previous = facilityDateLocks.get(lockKey) ?? Promise.resolve();
  let releaseLock!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  facilityDateLocks.set(
    lockKey,
    previous.then(() => current)
  );

  await previous;
  try {
    return await fn();
  } finally {
    releaseLock();
    if (facilityDateLocks.get(lockKey) === current) {
      facilityDateLocks.delete(lockKey);
    }
  }
}

type DbTxClient = Pick<
  typeof prisma,
  'authorityBlock' | 'slotBooking' | 'tariff'
> & {
  $queryRaw?: any;
};

/**
 * Generates a unique slot booking code in the format `KCP-SLT-2026-XXXX`.
 */
async function generateUniqueBookingCode(tx: DbTxClient): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const randomSuffix = crypto.randomInt(1000, 10000).toString();
    const candidate = `KCP-SLT-2026-${randomSuffix}`;
    const existing = await tx.slotBooking.findUnique({
      where: { booking_code: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  const fallbackHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `KCP-SLT-2026-${fallbackHex}`;
}

export class BookingsService {
  /**
   * POST /api/bookings/reserve
   * Validates hourly bookability, partition rules, operating hours, daily user hour cap,
   * and overlapping partition conflicts inside a Serializable transaction with SELECT ... FOR UPDATE.
   */
  static async reserveSlot(user: AuthenticatedUser, input: ReserveSlotInput) {
    // 1. Validate facility is hourly-bookable
    if (!HOURLY_BOOKABLE_FACILITIES.has(input.facility_code)) {
      throw new AppError(
        `Facility '${input.facility_code}' does not support hourly slot bookings. Use the monthly membership application endpoint (/api/memberships/apply).`,
        400,
        'FACILITY_NOT_HOURLY_BOOKABLE'
      );
    }

    const bookingDateObj = parseDateOnly(input.booking_date);
    const startMins = timeToMinutes(input.start_time);

    const facility = await prisma.facility.findUnique({
      where: { code: input.facility_code },
    });

    if (!facility) {
      throw new AppError(
        `Facility '${input.facility_code}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    // 2. Validate court_partition is FULL unless facility.is_partitionable === true
    const requestedPartition = input.court_partition ?? CourtPartition.FULL;
    if (!facility.is_partitionable && requestedPartition !== CourtPartition.FULL) {
      throw new AppError(
        `Facility '${facility.code}' is not partitionable and only accepts 'FULL' court bookings.`,
        400,
        'PARTITION_NOT_SUPPORTED'
      );
    }

    // 3. Determine and validate start_time and end_time against facility operating hours
    const slotDurationMins = facility.slot_duration_mins || 60;
    const resolvedEndTimeStr = input.end_time ?? minutesToTime(startMins + slotDurationMins);
    const endMins = timeToMinutes(resolvedEndTimeStr);

    if (endMins <= startMins) {
      throw new AppError(
        'Slot end_time must be strictly after start_time.',
        400,
        'INVALID_SLOT_TIME_RANGE'
      );
    }

    const durationMins = endMins - startMins;
    if (durationMins % slotDurationMins !== 0) {
      throw new AppError(
        `Slot duration must be a multiple of ${slotDurationMins} minutes.`,
        400,
        'INVALID_SLOT_DURATION'
      );
    }

    const opStartMins = timeToMinutes(formatDateToTime(facility.operating_start));
    const opEndMins = timeToMinutes(formatDateToTime(facility.operating_end));

    if (startMins < opStartMins || endMins > opEndMins) {
      throw new AppError(
        `Requested slot (${input.start_time} - ${resolvedEndTimeStr}) is outside facility operating hours (${formatDateToTime(facility.operating_start)} - ${formatDateToTime(facility.operating_end)}).`,
        400,
        'OUTSIDE_OPERATING_HOURS'
      );
    }

    const requestedHours = durationMins / 60;
    const startTimeDate = parseTimeToDate(input.start_time);
    const endTimeDate = parseTimeToDate(resolvedEndTimeStr);
    const conflictingPartitions = getConflictingPartitions(requestedPartition);

    const lockKey = `${facility.id}:${input.booking_date}`;

    // 4. Execute inside lock + PostgreSQL Serializable transaction with SELECT ... FOR UPDATE
    return withFacilityDateLock(lockKey, async () => {
      const runReservationTx = async (tx: DbTxClient) => {
        // Acquire PostgreSQL row-level lock on the facility and existing slot_bookings for that date
        if (typeof (tx as any).$queryRaw === 'function') {
          await (tx as any).$queryRaw`
            SELECT id FROM facilities WHERE id = ${facility.id}::uuid FOR UPDATE
          `;
          await (tx as any).$queryRaw`
            SELECT id FROM slot_bookings
            WHERE facility_id = ${facility.id}::uuid
              AND booking_date = ${bookingDateObj}::date
            FOR UPDATE
          `;
        }

        // 4a. Check overlapping active authority blocks & active citizen bookings first
        //     (Strict Confidential Masking: both return identical ALREADY_BOOKED error)
        const [existingAuthorityBlocks, existingFacilityBookings] = await Promise.all([
          tx.authorityBlock.findMany({
            where: {
              facility_id: facility.id,
              block_date: bookingDateObj,
              is_active: true,
              court_partition: { in: conflictingPartitions },
            },
          }),
          tx.slotBooking.findMany({
            where: {
              facility_id: facility.id,
              booking_date: bookingDateObj,
              status: {
                in: [SlotBookingStatus.PENDING_PAYMENT, SlotBookingStatus.CONFIRMED],
              },
              court_partition: { in: conflictingPartitions },
            },
          }),
        ]);

        const hasBlockOverlap = existingAuthorityBlocks.some((blk) =>
          doTimeRangesOverlap(startTimeDate, endTimeDate, blk.start_time, blk.end_time)
        );

        const hasBookingOverlap = existingFacilityBookings.some((b) =>
          doTimeRangesOverlap(startTimeDate, endTimeDate, b.start_time, b.end_time)
        );

        if (hasBlockOverlap || hasBookingOverlap) {
          throw new AppError(
            'The requested slot or partition is already booked and unavailable.',
            409,
            'SLOT_ALREADY_BOOKED'
          );
        }

        // 4b. Enforce per-user daily_user_hour_cap for that booking_date (PENDING_PAYMENT + CONFIRMED)
        const userDayBookings = await tx.slotBooking.findMany({
          where: {
            user_id: user.id,
            facility_id: facility.id,
            booking_date: bookingDateObj,
            status: {
              in: [SlotBookingStatus.PENDING_PAYMENT, SlotBookingStatus.CONFIRMED],
            },
          },
        });

        const bookedHoursToday = userDayBookings.reduce((sum, b) => {
          const bStart = timeToMinutes(formatDateToTime(b.start_time));
          const bEnd = timeToMinutes(formatDateToTime(b.end_time));
          return sum + Math.max(0, bEnd - bStart) / 60;
        }, 0);

        if (bookedHoursToday + requestedHours > facility.daily_user_hour_cap) {
          throw new AppError(
            `Daily booking limit exceeded for ${facility.name}: maximum ${facility.daily_user_hour_cap} hour(s) per user per day. You currently have ${bookedHoursToday} hour(s) booked on ${input.booking_date}.`,
            409,
            'DAILY_HOUR_CAP_EXCEEDED'
          );
        }

        // 4c. Calculate total_amount from active tariff (base_price + 18% GST)
        const userCategory =
          user.role === UserRole.GOVT_PERSONNEL
            ? UserCategory.GOVT_PERSONNEL
            : UserCategory.PUBLIC;

        const bookingType =
          requestedPartition === CourtPartition.FULL
            ? BookingType.FULL_COURT
            : BookingType.HALF_COURT;

        const tariff = await tx.tariff.findUnique({
          where: {
            uq_tariff_facility_category_type: {
              facility_id: facility.id,
              user_category: userCategory,
              booking_type: bookingType,
            },
          },
        });

        if (!tariff || !tariff.is_active) {
          throw new AppError(
            `No active tariff configured for ${facility.code} (${userCategory} / ${bookingType}).`,
            404,
            'TARIFF_NOT_FOUND'
          );
        }

        const hourlyBasePrice = Number(tariff.base_price);
        const gstPercent = Number(tariff.gst_percent);
        const baseAmount = Math.round(hourlyBasePrice * requestedHours * 100) / 100;
        const gstAmount = Math.round(baseAmount * (gstPercent / 100) * 100) / 100;
        const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100;

        const bookingCode = await generateUniqueBookingCode(tx);

        const createdBooking = await tx.slotBooking.create({
          data: {
            booking_code: bookingCode,
            user_id: user.id,
            facility_id: facility.id,
            booking_date: bookingDateObj,
            start_time: startTimeDate,
            end_time: endTimeDate,
            court_partition: requestedPartition,
            total_amount: totalAmount.toFixed(2),
            status: SlotBookingStatus.PENDING_PAYMENT,
          },
          include: {
            facility: true,
          },
        });

        return {
          booking: {
            ...createdBooking,
            booking_date_formatted: formatDateOnly(createdBooking.booking_date),
            start_time_formatted: formatDateToTime(createdBooking.start_time),
            end_time_formatted: formatDateToTime(createdBooking.end_time),
            fee_breakdown: {
              user_category: userCategory,
              booking_type: bookingType,
              hours: requestedHours,
              base_amount: baseAmount.toFixed(2),
              gst_percent: gstPercent.toFixed(2),
              gst_amount: gstAmount.toFixed(2),
              total_amount: totalAmount.toFixed(2),
            },
          },
        };
      };

      if (typeof (prisma as any).$transaction === 'function') {
        return prisma.$transaction(
          async (tx) => runReservationTx(tx),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        );
      }

      return runReservationTx(prisma);
    });
  }

  /**
   * GET /api/bookings/my
   * Lists the logged-in user's slot bookings.
   */
  static async getMyBookings(user: AuthenticatedUser) {
    const bookings = await prisma.slotBooking.findMany({
      where: { user_id: user.id },
      include: {
        facility: true,
      },
      orderBy: [{ booking_date: 'desc' }, { start_time: 'desc' }],
    });

    const nowMs = Date.now();

    const formatted = bookings.map((b) => {
      const slotStartTimestamp = combineDateAndTime(b.booking_date, b.start_time);
      const isFutureEligible =
        slotStartTimestamp.getTime() - nowMs > CANCELLATION_MIN_ADVANCE_MS;
      const isStatusCancelable =
        b.status === SlotBookingStatus.PENDING_PAYMENT ||
        b.status === SlotBookingStatus.CONFIRMED;

      return {
        ...b,
        booking_date_formatted: formatDateOnly(b.booking_date),
        start_time_formatted: formatDateToTime(b.start_time),
        end_time_formatted: formatDateToTime(b.end_time),
        can_cancel: isFutureEligible && isStatusCancelable,
      };
    });

    return { bookings: formatted };
  }

  /**
   * POST /api/bookings/:id/cancel
   * Cancels an eligible future booking (> 4 hours prior to slot start) and logs cancellation details.
   */
  static async cancelBooking(
    bookingId: string,
    user: AuthenticatedUser,
    input: CancelBookingInput,
    ipAddress: string
  ) {
    const booking = await prisma.slotBooking.findUnique({
      where: { id: bookingId },
      include: {
        facility: true,
      },
    });

    if (!booking) {
      throw new AppError(`Booking '${bookingId}' not found.`, 404, 'BOOKING_NOT_FOUND');
    }

    if (booking.user_id !== user.id && user.role !== UserRole.STAFF_ADMIN) {
      throw new AppError(
        'You are not authorized to cancel a booking belonging to another user.',
        403,
        'FORBIDDEN_BOOKING_ACCESS'
      );
    }

    if (
      booking.status === SlotBookingStatus.CANCELLED ||
      booking.status === SlotBookingStatus.REFUNDED
    ) {
      throw new AppError(
        `Booking '${booking.booking_code}' is already in '${booking.status}' status.`,
        400,
        'BOOKING_ALREADY_CANCELLED'
      );
    }

    const slotStartTimestamp = combineDateAndTime(booking.booking_date, booking.start_time);
    const msUntilStart = slotStartTimestamp.getTime() - Date.now();

    if (msUntilStart <= CANCELLATION_MIN_ADVANCE_MS) {
      throw new AppError(
        'Bookings can only be cancelled more than 4 hours prior to the scheduled slot start time.',
        400,
        'CANCELLATION_WINDOW_EXPIRED'
      );
    }

    const previousStatus = booking.status;

    const cancelledBooking = await prisma.slotBooking.update({
      where: { id: booking.id },
      data: {
        status: SlotBookingStatus.CANCELLED,
      },
      include: {
        facility: true,
      },
    });

    const cancellationReason =
      input.reason ?? 'Cancelled by user more than 4 hours before slot start.';

    await recordAuditLog({
      officerId: user.id,
      actionCategory: 'BOOKING_CANCELLATION',
      actionDescription: `Booking '${booking.booking_code}' (${previousStatus} -> CANCELLED) cancelled by '${user.username}'. Reason: ${cancellationReason}`,
      targetRefId: booking.booking_code,
      details: {
        booking_id: booking.id,
        booking_code: booking.booking_code,
        facility_id: booking.facility_id,
        booking_date: formatDateOnly(booking.booking_date),
        start_time: formatDateToTime(booking.start_time),
        end_time: formatDateToTime(booking.end_time),
        court_partition: booking.court_partition,
        previous_status: previousStatus,
        new_status: SlotBookingStatus.CANCELLED,
        reason: cancellationReason,
      },
      ipAddress,
    });

    return {
      booking: {
        ...cancelledBooking,
        booking_date_formatted: formatDateOnly(cancelledBooking.booking_date),
        start_time_formatted: formatDateToTime(cancelledBooking.start_time),
        end_time_formatted: formatDateToTime(cancelledBooking.end_time),
        cancellation_reason: cancellationReason,
        cancelled_at: new Date().toISOString(),
      },
    };
  }
}
