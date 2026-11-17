import {
  CourtPartition,
  FacilityCode,
  SlotBookingStatus,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import {
  doTimeRangesOverlap,
  formatDateToTime,
  minutesToTime,
  parseDateOnly,
  parseTimeToDate,
  timeToMinutes,
} from '../../utils/time';

/**
 * Returns the set of partitions that conflict with a given target partition.
 * - FULL conflicts with FULL, HALF_A, and HALF_B.
 * - HALF_A conflicts with FULL and HALF_A (leaves HALF_B independent).
 * - HALF_B conflicts with FULL and HALF_B (leaves HALF_A independent).
 */
export function getConflictingPartitions(partition: CourtPartition): CourtPartition[] {
  switch (partition) {
    case CourtPartition.FULL:
      return [CourtPartition.FULL, CourtPartition.HALF_A, CourtPartition.HALF_B];
    case CourtPartition.HALF_A:
      return [CourtPartition.FULL, CourtPartition.HALF_A];
    case CourtPartition.HALF_B:
      return [CourtPartition.FULL, CourtPartition.HALF_B];
  }
}

export class FacilitiesService {
  /**
   * Lists all 4 facilities with operating hours, daily user hour caps,
   * partition rules, and active tariffs for the user's category.
   */
  static async listFacilities(userRole?: UserRole) {
    const userCategory =
      userRole === UserRole.GOVT_PERSONNEL ? UserCategory.GOVT_PERSONNEL : UserCategory.PUBLIC;

    const facilities = await prisma.facility.findMany({
      include: {
        tariffs: {
          where: { is_active: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return facilities.map((facility) => {
      const categoryTariffs = facility.tariffs
        .filter((t) => t.user_category === userCategory)
        .map((t) => {
          const basePrice = Number(t.base_price);
          const gstPercent = Number(t.gst_percent);
          const gstAmount = Math.round(basePrice * (gstPercent / 100) * 100) / 100;
          const totalPrice = Math.round((basePrice + gstAmount) * 100) / 100;

          return {
            id: t.id,
            user_category: t.user_category,
            booking_type: t.booking_type,
            base_price: basePrice.toFixed(2),
            gst_percent: gstPercent.toFixed(2),
            gst_amount: gstAmount.toFixed(2),
            total_price: totalPrice.toFixed(2),
            is_active: t.is_active,
          };
        });

      const supportedPartitions = facility.is_partitionable
        ? [CourtPartition.FULL, CourtPartition.HALF_A, CourtPartition.HALF_B]
        : [CourtPartition.FULL];

      return {
        id: facility.id,
        code: facility.code,
        name: facility.name,
        operating_start: formatDateToTime(facility.operating_start),
        operating_end: formatDateToTime(facility.operating_end),
        slot_duration_mins: facility.slot_duration_mins,
        daily_user_hour_cap: facility.daily_user_hour_cap,
        monthly_member_cap: facility.monthly_member_cap,
        is_partitionable: facility.is_partitionable,
        booking_mode:
          facility.code === FacilityCode.SYNTHETIC_TRACK
            ? 'MONTHLY_MEMBERSHIP_ONLY'
            : 'HOURLY_SLOTS',
        partition_rules: {
          is_partitionable: facility.is_partitionable,
          supported_partitions: supportedPartitions,
          rule_summary: facility.is_partitionable
            ? 'FULL occupies FULL, HALF_A, and HALF_B. HALF_A occupies FULL and HALF_A while leaving HALF_B available (and vice versa for HALF_B).'
            : 'Only FULL court booking is supported for this facility.',
        },
        user_category: userCategory,
        tariffs: categoryTariffs,
      };
    });
  }

  /**
   * Public endpoint: Dynamically generates hourly slots for a facility on `dateStr`.
   * STRICT CONFIDENTIAL SLOT MASKING:
   * Every unavailable slot or partition—whether booked by a citizen or blocked by police authority—
   * returns ONLY `status: 'ALREADY_BOOKED'` with ZERO internal_reason, officer details, or user names.
   */
  static async getPublicFacilitySlots(facilityCode: FacilityCode, dateStr: string) {
    const targetDate = parseDateOnly(dateStr);

    const facility = await prisma.facility.findUnique({
      where: { code: facilityCode },
    });

    if (!facility) {
      throw new AppError(
        `Facility '${facilityCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const [activeBookings, activeBlocks] = await Promise.all([
      prisma.slotBooking.findMany({
        where: {
          facility_id: facility.id,
          booking_date: targetDate,
          status: {
            in: [SlotBookingStatus.PENDING_PAYMENT, SlotBookingStatus.CONFIRMED],
          },
        },
        select: {
          start_time: true,
          end_time: true,
          court_partition: true,
        },
      }),
      prisma.authorityBlock.findMany({
        where: {
          facility_id: facility.id,
          block_date: targetDate,
          is_active: true,
        },
        select: {
          start_time: true,
          end_time: true,
          court_partition: true,
        },
      }),
    ]);

    const startMins = timeToMinutes(formatDateToTime(facility.operating_start));
    const endMins = timeToMinutes(formatDateToTime(facility.operating_end));
    const stepMins = facility.slot_duration_mins || 60;

    const applicablePartitions = facility.is_partitionable
      ? [CourtPartition.FULL, CourtPartition.HALF_A, CourtPartition.HALF_B]
      : [CourtPartition.FULL];

    const slots = [];

    for (let current = startMins; current + stepMins <= endMins; current += stepMins) {
      const slotStartStr = minutesToTime(current);
      const slotEndStr = minutesToTime(current + stepMins);
      const slotStartDate = parseTimeToDate(slotStartStr);
      const slotEndDate = parseTimeToDate(slotEndStr);

      const partitionsMap: Record<
        string,
        { partition: CourtPartition; status: 'AVAILABLE' | 'ALREADY_BOOKED' }
      > = {};

      for (const partition of applicablePartitions) {
        const conflictingSet = getConflictingPartitions(partition);

        const hasBookingConflict = activeBookings.some(
          (b) =>
            conflictingSet.includes(b.court_partition) &&
            doTimeRangesOverlap(slotStartDate, slotEndDate, b.start_time, b.end_time)
        );

        const hasBlockConflict = activeBlocks.some(
          (blk) =>
            conflictingSet.includes(blk.court_partition) &&
            doTimeRangesOverlap(slotStartDate, slotEndDate, blk.start_time, blk.end_time)
        );

        const isUnavailable = hasBookingConflict || hasBlockConflict;

        partitionsMap[partition] = {
          partition,
          status: isUnavailable ? 'ALREADY_BOOKED' : 'AVAILABLE',
        };
      }

      // Overall slot status:
      // For non-partitionable facilities, identical to FULL status.
      // For partitionable facilities (POLICE_TURF), 'ALREADY_BOOKED' if FULL, HALF_A, and HALF_B are all unavailable,
      // or 'AVAILABLE' if at least one partition can still be booked.
      const allPartitionsUnavailable = applicablePartitions.every(
        (p) => partitionsMap[p].status === 'ALREADY_BOOKED'
      );

      slots.push({
        start_time: slotStartStr,
        end_time: slotEndStr,
        status: allPartitionsUnavailable ? ('ALREADY_BOOKED' as const) : ('AVAILABLE' as const),
        partitions: partitionsMap,
      });
    }

    return {
      facility: {
        id: facility.id,
        code: facility.code,
        name: facility.name,
        is_partitionable: facility.is_partitionable,
        operating_start: formatDateToTime(facility.operating_start),
        operating_end: formatDateToTime(facility.operating_end),
        slot_duration_mins: facility.slot_duration_mins,
        daily_user_hour_cap: facility.daily_user_hour_cap,
      },
      date: dateStr,
      slots,
    };
  }

  /**
   * Admin endpoint (`STAFF_ADMIN` only): Returns the unmasked slot breakdown
   * (`AVAILABLE`, `BOOKED`, `AUTHORITY_BLOCKED`) including `internal_reason`,
   * `booking_code`, and citizen `full_name`.
   */
  static async getAdminFacilitySlots(facilityCode: FacilityCode, dateStr: string) {
    const targetDate = parseDateOnly(dateStr);

    const facility = await prisma.facility.findUnique({
      where: { code: facilityCode },
    });

    if (!facility) {
      throw new AppError(
        `Facility '${facilityCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const [activeBookings, activeBlocks] = await Promise.all([
      prisma.slotBooking.findMany({
        where: {
          facility_id: facility.id,
          booking_date: targetDate,
          status: {
            in: [SlotBookingStatus.PENDING_PAYMENT, SlotBookingStatus.CONFIRMED],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              role: true,
            },
          },
        },
      }),
      prisma.authorityBlock.findMany({
        where: {
          facility_id: facility.id,
          block_date: targetDate,
          is_active: true,
        },
        include: {
          created_by_officer: {
            select: {
              id: true,
              username: true,
              full_name: true,
            },
          },
        },
      }),
    ]);

    const startMins = timeToMinutes(formatDateToTime(facility.operating_start));
    const endMins = timeToMinutes(formatDateToTime(facility.operating_end));
    const stepMins = facility.slot_duration_mins || 60;

    const applicablePartitions = facility.is_partitionable
      ? [CourtPartition.FULL, CourtPartition.HALF_A, CourtPartition.HALF_B]
      : [CourtPartition.FULL];

    const slots = [];

    for (let current = startMins; current + stepMins <= endMins; current += stepMins) {
      const slotStartStr = minutesToTime(current);
      const slotEndStr = minutesToTime(current + stepMins);
      const slotStartDate = parseTimeToDate(slotStartStr);
      const slotEndDate = parseTimeToDate(slotEndStr);

      const partitionsMap: Record<string, any> = {};

      for (const partition of applicablePartitions) {
        const conflictingSet = getConflictingPartitions(partition);

        const matchingBlock = activeBlocks.find(
          (blk) =>
            conflictingSet.includes(blk.court_partition) &&
            doTimeRangesOverlap(slotStartDate, slotEndDate, blk.start_time, blk.end_time)
        );

        const matchingBooking = activeBookings.find(
          (b) =>
            conflictingSet.includes(b.court_partition) &&
            doTimeRangesOverlap(slotStartDate, slotEndDate, b.start_time, b.end_time)
        );

        if (matchingBlock) {
          partitionsMap[partition] = {
            partition,
            status: 'AUTHORITY_BLOCKED',
            block_id: matchingBlock.id,
            blocked_partition: matchingBlock.court_partition,
            internal_reason: matchingBlock.internal_reason,
            created_by_officer: matchingBlock.created_by_officer,
          };
        } else if (matchingBooking) {
          partitionsMap[partition] = {
            partition,
            status: 'BOOKED',
            booking_id: matchingBooking.id,
            booking_code: matchingBooking.booking_code,
            booking_status: matchingBooking.status,
            booked_partition: matchingBooking.court_partition,
            user_full_name: matchingBooking.user?.full_name ?? null,
            user: matchingBooking.user ?? null,
          };
        } else {
          partitionsMap[partition] = {
            partition,
            status: 'AVAILABLE',
          };
        }
      }

      // Find any direct block or booking on this hourly window for top-level convenience fields
      const slotBlocks = activeBlocks.filter((blk) =>
        doTimeRangesOverlap(slotStartDate, slotEndDate, blk.start_time, blk.end_time)
      );
      const slotBookings = activeBookings.filter((b) =>
        doTimeRangesOverlap(slotStartDate, slotEndDate, b.start_time, b.end_time)
      );

      let overallStatus: 'AVAILABLE' | 'BOOKED' | 'AUTHORITY_BLOCKED' = 'AVAILABLE';
      if (slotBlocks.length > 0) {
        overallStatus = 'AUTHORITY_BLOCKED';
      } else if (slotBookings.length > 0) {
        overallStatus = 'BOOKED';
      }

      slots.push({
        start_time: slotStartStr,
        end_time: slotEndStr,
        status: overallStatus,
        internal_reason: slotBlocks[0]?.internal_reason ?? null,
        booking_code: slotBookings[0]?.booking_code ?? null,
        user_full_name: slotBookings[0]?.user?.full_name ?? null,
        partitions: partitionsMap,
      });
    }

    return {
      facility: {
        id: facility.id,
        code: facility.code,
        name: facility.name,
        is_partitionable: facility.is_partitionable,
        operating_start: formatDateToTime(facility.operating_start),
        operating_end: formatDateToTime(facility.operating_end),
        slot_duration_mins: facility.slot_duration_mins,
        daily_user_hour_cap: facility.daily_user_hour_cap,
      },
      date: dateStr,
      slots,
    };
  }
}
