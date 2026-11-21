import crypto from 'crypto';
import {
  AccountStatus,
  BookingType,
  CourtPartition,
  FacilityCode,
  MembershipStatus,
  PaymentMode,
  PaymentReferenceType,
  PaymentStatus,
  SlotBookingStatus,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../config/database';
import type {
  FacilityBookingMode,
  FacilityOperationalStatus,
  FacilitySlotRecord,
  ManagedSlotStatus,
} from '../../config/inMemoryDb';
import { AuthenticatedUser } from '../../types/express';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLogger';
import {
  doTimeRangesOverlap,
  formatDateOnly,
  formatDateToTime,
  minutesToTime,
  parseDateOnly,
  parseTimeToDate,
  timeToMinutes,
} from '../../utils/time';
import { getConflictingPartitions } from '../facilities/facilities.service';
import {
  AdminAuditLogsQuery,
  AdminBookingsQuery,
  AdminFacilitiesQuery,
  AdminMembersQuery,
  AdminPaymentsQuery,
  CreateAuthorityBlockInput,
  CreateFacilityInput,
  CreateFacilitySlotInput,
  FinancialReportQuery,
  ToggleSlotBlockInput,
  UpdateFacilityInput,
  UpdateFacilitySlotInput,
  UpdateFacilityStatusInput,
  UpdateUserStatusInput,
} from './admin.schema';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getFacilityDefaultsByCode(code: string) {
  switch (code) {
    case FacilityCode.SYNTHETIC_TRACK:
      return {
        category: 'Athletic Track',
        court_count: 8,
        court_unit_label: 'Lanes',
        max_capacity_per_slot: 40,
        booking_mode: 'MONTHLY_MEMBERSHIP_ONLY' as FacilityBookingMode,
        description:
          '400m 8-lane synthetic athletic track at Kannur Armed Reserve Police Grounds. Monthly membership access across morning and evening conditioning windows.',
      };
    case FacilityCode.FOOTBALL_GROUND:
      return {
        category: 'Outdoor Grass Pitch',
        court_count: 1,
        court_unit_label: 'Full Pitch',
        max_capacity_per_slot: 1,
        booking_mode: 'HOURLY_SLOTS' as FacilityBookingMode,
        description:
          'Full 11-a-side natural turf football ground with stadium lighting towers for club matches and departmental sessions.',
      };
    case FacilityCode.POLICE_TURF:
      return {
        category: 'Floodlit Artificial Turf',
        court_count: 2,
        court_unit_label: 'Half Courts',
        max_capacity_per_slot: 2,
        booking_mode: 'HOURLY_SLOTS' as FacilityBookingMode,
        description:
          'Floodlit artificial football turf supporting full 7-a-side bookings or dual independent 5-a-side half-court sessions.',
      };
    case FacilityCode.BADMINTON_COURT:
      return {
        category: 'Indoor Court Complex',
        court_count: 4,
        court_unit_label: 'Courts',
        max_capacity_per_slot: 4,
        booking_mode: 'HOURLY_SLOTS' as FacilityBookingMode,
        description:
          'Climate-controlled indoor maple wooden arena featuring 4 regulation badminton courts. Non-marking footwear required.',
      };
    default:
      return {
        category: 'Sports Facility',
        court_count: 1,
        court_unit_label: 'Courts',
        max_capacity_per_slot: 1,
        booking_mode: 'HOURLY_SLOTS' as FacilityBookingMode,
        description: 'Kannur City Police managed sports facility.',
      };
  }
}

function getFacilityOperationalStatus(fac: any): FacilityOperationalStatus {
  const status = fac?.operational_status;
  if (status === 'MAINTENANCE' || status === 'CLOSED') return status;
  return 'ACTIVE';
}

function inferBlockType(block: any): 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT' {
  if (block?.block_type === 'BLOCKED_MAINTENANCE' || block?.block_type === 'RESERVED_DEPARTMENT') {
    return block.block_type;
  }
  const reason = String(block?.internal_reason ?? '').toLowerCase();
  if (
    reason.includes('maint') ||
    reason.includes('resurfac') ||
    reason.includes('repair') ||
    reason.includes('clean') ||
    reason.includes('brush') ||
    reason.includes('polish') ||
    reason.includes('inspection')
  ) {
    return 'BLOCKED_MAINTENANCE';
  }
  return 'RESERVED_DEPARTMENT';
}

function generateFacilityCodeFromName(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return cleaned.length >= 3 ? cleaned : `FACILITY_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function getManagedSlotDelegate() {
  return (prisma as any).facilitySlot ?? null;
}

async function getSlotsForFacilityOnDate(facility: any, dateStr: string): Promise<FacilitySlotRecord[]> {
  const slotDelegate = getManagedSlotDelegate();
  if (slotDelegate && typeof slotDelegate.findMany === 'function') {
    const allFacilitySlots: FacilitySlotRecord[] = await slotDelegate.findMany({
      where: { facility_id: facility.id },
      orderBy: { start_time: 'asc' },
    });

    const applicable = allFacilitySlots.filter(
      (s) => s.slot_date === null || s.slot_date === dateStr
    );

    applicable.sort((a, b) => {
      const cmp =
        timeToMinutes(formatDateToTime(a.start_time)) -
        timeToMinutes(formatDateToTime(b.start_time));
      if (cmp !== 0) return cmp;
      return (a.slot_date ? 1 : 0) - (b.slot_date ? 1 : 0);
    });

    return applicable;
  }

  // Fallback when running without managed facility_slots table (e.g., mocked Prisma tests)
  const defaults = getFacilityDefaultsByCode(facility.code);
  const startMins = timeToMinutes(formatDateToTime(facility.operating_start));
  const endMins = timeToMinutes(formatDateToTime(facility.operating_end));
  const step = facility.slot_duration_mins || 60;
  const maxCap = facility.max_capacity_per_slot ?? defaults.max_capacity_per_slot;
  const generated: FacilitySlotRecord[] = [];
  const now = new Date();

  for (let current = startMins; current + step <= endMins; current += step) {
    const startStr = minutesToTime(current);
    const endStr = minutesToTime(current + step);
    generated.push({
      id: `${facility.id}-${startStr}`,
      facility_id: facility.id,
      slot_date: null,
      start_time: parseTimeToDate(startStr),
      end_time: parseTimeToDate(endStr),
      max_capacity: maxCap,
      status: 'OPEN',
      block_reason: null,
      court_partition: CourtPartition.FULL,
      created_at: now,
      updated_at: now,
    });
  }

  return generated;
}

async function findFacilityByIdOrCode(idOrCode: string): Promise<any | null> {
  const db = prisma as any;
  if (UUID_REGEX.test(idOrCode)) {
    const byId = await db.facility.findUnique({
      where: { id: idOrCode },
      include: { tariffs: true },
    });
    if (byId) return byId;
  }
  const byCode = await db.facility.findUnique({
    where: { code: idOrCode },
    include: { tariffs: true },
  });
  if (byCode) return byCode;

  const all: any[] = await db.facility.findMany({ include: { tariffs: true } });
  return all.find((f) => f.id === idOrCode || f.code === idOrCode) ?? null;
}

function formatFacilityPricing(facility: any, tariffsList: any[]) {
  const defaults = getFacilityDefaultsByCode(facility.code);
  const bookingMode: FacilityBookingMode = facility.booking_mode ?? defaults.booking_mode;
  const primaryType =
    bookingMode === 'MONTHLY_MEMBERSHIP_ONLY'
      ? BookingType.MONTHLY_PASS
      : BookingType.FULL_COURT;

  const activeTariffs = (tariffsList ?? []).filter((t) => t.is_active !== false);
  const findRate = (cat: UserCategory, type: BookingType): number | null => {
    const found = activeTariffs.find(
      (t) => t.user_category === cat && t.booking_type === type
    );
    return found ? Number(found.base_price) : null;
  };

  const publicPrimary =
    findRate(UserCategory.PUBLIC, primaryType) ??
    findRate(UserCategory.PUBLIC, BookingType.FULL_COURT) ??
    findRate(UserCategory.PUBLIC, BookingType.MONTHLY_PASS) ??
    0;
  const govtPrimary =
    findRate(UserCategory.GOVT_PERSONNEL, primaryType) ??
    findRate(UserCategory.GOVT_PERSONNEL, BookingType.FULL_COURT) ??
    findRate(UserCategory.GOVT_PERSONNEL, BookingType.MONTHLY_PASS) ??
    0;

  const halfPublic = facility.is_partitionable
    ? findRate(UserCategory.PUBLIC, BookingType.HALF_COURT)
    : null;
  const halfGovt = facility.is_partitionable
    ? findRate(UserCategory.GOVT_PERSONNEL, BookingType.HALF_COURT)
    : null;

  const sampleTariff = activeTariffs[0];
  const gstPercent = sampleTariff ? Number(sampleTariff.gst_percent) : 18;

  return {
    unit: bookingMode === 'MONTHLY_MEMBERSHIP_ONLY' ? ('per_month' as const) : ('per_hour' as const),
    gst_percent: gstPercent,
    public_rate: publicPrimary,
    govt_rate: govtPrimary,
    half_court_public_rate: halfPublic,
    half_court_govt_rate: halfGovt,
  };
}

function buildEnrichedFacilitySlot(
  slot: FacilitySlotRecord,
  facility: any,
  dateBookings: any[],
  dateBlocks: any[]
) {
  const matchingBookings = dateBookings.filter((b) =>
    doTimeRangesOverlap(slot.start_time, slot.end_time, b.start_time, b.end_time)
  );
  const matchingBlocks = dateBlocks.filter((blk) =>
    doTimeRangesOverlap(slot.start_time, slot.end_time, blk.start_time, blk.end_time)
  );

  const bookedCount = facility.is_partitionable
    ? Math.min(
        slot.max_capacity,
        matchingBookings.reduce(
          (sum, b) => sum + (b.court_partition === CourtPartition.FULL ? slot.max_capacity : 1),
          0
        )
      )
    : matchingBookings.length;

  let effectiveStatus: 'OPEN' | 'FULL' | 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT' = 'OPEN';
  let effectiveBlockReason: string | null = null;
  let effectiveBlockId: string | null = null;

  if (matchingBlocks.length > 0) {
    effectiveStatus = inferBlockType(matchingBlocks[0]);
    effectiveBlockReason = matchingBlocks[0].internal_reason ?? null;
    effectiveBlockId = matchingBlocks[0].id;
  } else if (
    slot.status === 'BLOCKED_MAINTENANCE' ||
    slot.status === 'RESERVED_DEPARTMENT'
  ) {
    effectiveStatus = slot.status;
    effectiveBlockReason = slot.block_reason ?? null;
  } else if (bookedCount >= slot.max_capacity) {
    effectiveStatus = 'FULL';
  }

  return {
    id: slot.id,
    facility_id: slot.facility_id,
    slot_date: slot.slot_date,
    start_time: formatDateToTime(slot.start_time),
    end_time: formatDateToTime(slot.end_time),
    max_capacity: slot.max_capacity,
    booked_count: bookedCount,
    active_bookings_count: matchingBookings.length,
    status: effectiveStatus,
    base_status: slot.status,
    block_reason: effectiveBlockReason,
    block_id: effectiveBlockId,
    court_partition: slot.court_partition,
    bookings: matchingBookings.map((b) => ({
      id: b.id,
      booking_code: b.booking_code,
      member_name: b.user?.full_name ?? b.user?.username ?? 'Portal Member',
      member_username: b.user?.username ?? 'member',
      court_partition: b.court_partition,
      status: b.status,
    })),
  };
}

async function formatFacilityWithSchedule(
  facility: any,
  dateStr: string,
  allDateBookings: any[],
  allDateBlocks: any[]
) {
  const defaults = getFacilityDefaultsByCode(facility.code);
  const facBookings = allDateBookings.filter((b) => b.facility_id === facility.id);
  const facBlocks = allDateBlocks.filter((blk) => blk.facility_id === facility.id);
  const rawSlots = await getSlotsForFacilityOnDate(facility, dateStr);
  const slots = rawSlots.map((slot) =>
    buildEnrichedFacilitySlot(slot, facility, facBookings, facBlocks)
  );

  const openSlots = slots.filter((s) => s.status === 'OPEN').length;
  const fullSlots = slots.filter((s) => s.status === 'FULL').length;
  const blockedSlots = slots.filter(
    (s) => s.status === 'BLOCKED_MAINTENANCE' || s.status === 'RESERVED_DEPARTMENT'
  ).length;
  const occupiedSlots = slots.filter(
    (s) =>
      s.booked_count > 0 ||
      s.status === 'BLOCKED_MAINTENANCE' ||
      s.status === 'RESERVED_DEPARTMENT'
  ).length;
  const utilizationRate =
    slots.length > 0 ? Math.round((occupiedSlots / slots.length) * 100) : 0;

  return {
    id: facility.id,
    code: facility.code,
    name: facility.name,
    category: facility.category ?? defaults.category,
    court_count: facility.court_count ?? defaults.court_count,
    court_unit_label: facility.court_unit_label ?? defaults.court_unit_label,
    operational_status: getFacilityOperationalStatus(facility),
    max_capacity_per_slot: facility.max_capacity_per_slot ?? defaults.max_capacity_per_slot,
    operating_start: formatDateToTime(facility.operating_start),
    operating_end: formatDateToTime(facility.operating_end),
    slot_duration_mins: facility.slot_duration_mins ?? 60,
    daily_user_hour_cap: facility.daily_user_hour_cap ?? 2,
    monthly_member_cap: facility.monthly_member_cap ?? null,
    is_partitionable: Boolean(facility.is_partitionable),
    booking_mode: (facility.booking_mode ?? defaults.booking_mode) as FacilityBookingMode,
    description: facility.description ?? defaults.description,
    pricing: formatFacilityPricing(facility, facility.tariffs ?? []),
    stats: {
      total_slots: slots.length,
      open_slots: openSlots,
      full_slots: fullSlots,
      blocked_slots: blockedSlots,
      active_bookings_count: facBookings.length,
      occupied_slots: occupiedSlots,
      utilization_rate: utilizationRate,
    },
    slots,
  };
}

/**
 * Escapes a value for RFC-4180 CSV output.
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeMonthlySettledRevenue(
  settledPayments: Array<{ created_at: Date | string; total_amount: unknown }>
): number {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const monthlySettledTotal = round2(
    settledPayments
      .filter((p) => {
        const dt = new Date(p.created_at);
        return dt.getUTCFullYear() === currentYear && dt.getUTCMonth() === currentMonth;
      })
      .reduce((sum, p) => sum + Number(p.total_amount ?? 0), 0)
  );

  const overallSettledTotal = round2(
    settledPayments.reduce((sum, p) => sum + Number(p.total_amount ?? 0), 0)
  );

  return monthlySettledTotal > 0 ? monthlySettledTotal : overallSettledTotal;
}

type AuditEntityType = 'FACILITY' | 'SLOT' | 'PAYMENT' | 'USER' | 'SYSTEM';

function resolveAuditEntityType(
  actionCategory: string,
  details?: Record<string, unknown> | null
): AuditEntityType {
  const explicit = String(details?.target_entity ?? '').toUpperCase();
  if (
    explicit === 'FACILITY' ||
    explicit === 'SLOT' ||
    explicit === 'PAYMENT' ||
    explicit === 'USER' ||
    explicit === 'SYSTEM'
  ) {
    return explicit;
  }

  const cat = actionCategory.toUpperCase();
  if (
    cat.startsWith('FACILITY_SLOT_') ||
    cat.startsWith('AUTHORITY_SLOT_') ||
    cat.includes('BOOKING')
  ) {
    return 'SLOT';
  }
  if (cat.startsWith('FACILITY_')) {
    return 'FACILITY';
  }
  if (cat.includes('PAYMENT') || cat.includes('RECEIPT')) {
    return 'PAYMENT';
  }
  if (cat.includes('USER_STATUS') || cat === 'OFFICER_AUTH') {
    return 'USER';
  }
  return 'SYSTEM';
}

function matchesAuditActionCategoryFilter(logActionCategory: string, filter: string): boolean {
  const normalizedFilter = filter.trim().toUpperCase();
  if (!normalizedFilter || normalizedFilter === 'ALL') return true;
  const cat = logActionCategory.toUpperCase();

  switch (normalizedFilter) {
    case 'FACILITIES':
      return cat.startsWith('FACILITY_') && !cat.startsWith('FACILITY_SLOT_');
    case 'SLOTS':
      return (
        cat.startsWith('FACILITY_SLOT_') ||
        cat.startsWith('AUTHORITY_SLOT_') ||
        cat.includes('BOOKING')
      );
    case 'PAYMENTS':
      return cat.includes('PAYMENT') || cat.includes('RECEIPT');
    case 'ACCOUNTS':
      return cat.includes('USER_STATUS') || cat === 'OFFICER_AUTH';
    default:
      return cat === normalizedFilter;
  }
}

function extractAuditReason(log: any): string {
  const d = (log.details ?? {}) as Record<string, unknown>;
  const candidates = [
    d.reason,
    d.internal_reason,
    d.ban_reason,
    d.remarks,
    d.block_reason,
    d.officer_remarks,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }

  if (d.previous_status && d.new_status) {
    return `Status changed from ${String(d.previous_status)} to ${String(d.new_status)}`;
  }
  if (Array.isArray(d.updated_fields) && d.updated_fields.length > 0) {
    return `Updated fields: ${(d.updated_fields as string[]).join(', ')}`;
  }
  if (d.start_time && d.end_time) {
    return `Slot window ${String(d.start_time)}-${String(d.end_time)}${
      d.max_capacity ? ` (capacity ${String(d.max_capacity)})` : ''
    }`;
  }

  return log.action_description;
}

function extractAuditTargetLabel(log: any, entityType: AuditEntityType): string {
  const d = (log.details ?? {}) as Record<string, unknown>;
  if (entityType === 'FACILITY') {
    return String(d.facility_name ?? d.facility_code ?? d.code ?? log.target_ref_id ?? 'Facility');
  }
  if (entityType === 'SLOT') {
    const facLabel = String(d.facility_name ?? d.facility_code ?? 'Sports Facility');
    const windowStr =
      d.start_time && d.end_time ? `${String(d.start_time)}–${String(d.end_time)}` : '';
    const dateStr = d.date || d.block_date || d.slot_date;
    return [facLabel, windowStr, dateStr ? `(${String(dateStr)})` : '']
      .filter(Boolean)
      .join(' ');
  }
  if (entityType === 'PAYMENT') {
    const receipt = String(d.receipt_no ?? log.target_ref_id ?? 'Payment');
    const refCode = d.pass_or_booking_code ? `• ${String(d.pass_or_booking_code)}` : '';
    return `${receipt} ${refCode}`.trim();
  }
  if (entityType === 'USER') {
    return d.username ? `@${String(d.username)}` : String(log.target_ref_id ?? 'Account');
  }
  return String(log.target_ref_id ?? 'System');
}

const STANDARD_PUBLIC_UNIT_RATES: Record<string, number> = {
  [`${FacilityCode.SYNTHETIC_TRACK}|${BookingType.MONTHLY_PASS}`]: 500,
  [`${FacilityCode.FOOTBALL_GROUND}|${BookingType.FULL_COURT}`]: 2000,
  [`${FacilityCode.POLICE_TURF}|${BookingType.FULL_COURT}`]: 1400,
  [`${FacilityCode.POLICE_TURF}|${BookingType.HALF_COURT}`]: 800,
  [`${FacilityCode.BADMINTON_COURT}|${BookingType.FULL_COURT}`]: 400,
  [`${FacilityCode.BADMINTON_COURT}|${BookingType.MONTHLY_PASS}`]: 1000,
};

export class AdminService {
  /**
   * POST /api/admin/slots/block (`STAFF_ADMIN` only)
   * Creates an `authority_blocks` record. Checks for conflicts with existing `CONFIRMED`
   * bookings unless `force_override` is explicitly true, and writes to `audit_logs`.
   */
  static async createAuthorityBlock(
    officer: AuthenticatedUser,
    input: CreateAuthorityBlockInput,
    ipAddress: string
  ) {
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

    const requestedPartition = input.court_partition ?? CourtPartition.FULL;
    if (!facility.is_partitionable && requestedPartition !== CourtPartition.FULL) {
      throw new AppError(
        `Facility '${facility.code}' is not partitionable; authority blocks must use 'FULL'.`,
        400,
        'PARTITION_NOT_SUPPORTED'
      );
    }

    const blockDateObj = parseDateOnly(input.block_date);
    const startMins = timeToMinutes(input.start_time);
    const slotDurationMins = facility.slot_duration_mins || 60;
    const resolvedEndTimeStr = input.end_time ?? minutesToTime(startMins + slotDurationMins);
    const endMins = timeToMinutes(resolvedEndTimeStr);

    if (endMins <= startMins) {
      throw new AppError(
        'Authority block end_time must be strictly after start_time.',
        400,
        'INVALID_SLOT_TIME_RANGE'
      );
    }

    const opStartMins = timeToMinutes(formatDateToTime(facility.operating_start));
    const opEndMins = timeToMinutes(formatDateToTime(facility.operating_end));

    if (startMins < opStartMins || endMins > opEndMins) {
      throw new AppError(
        `Authority block (${input.start_time} - ${resolvedEndTimeStr}) is outside operating hours (${formatDateToTime(facility.operating_start)} - ${formatDateToTime(facility.operating_end)}).`,
        400,
        'OUTSIDE_OPERATING_HOURS'
      );
    }

    const startTimeDate = parseTimeToDate(input.start_time);
    const endTimeDate = parseTimeToDate(resolvedEndTimeStr);
    const conflictingPartitions = getConflictingPartitions(requestedPartition);

    // Check for conflicting CONFIRMED bookings (and PENDING_PAYMENT bookings)
    const existingBookings = await prisma.slotBooking.findMany({
      where: {
        facility_id: facility.id,
        booking_date: blockDateObj,
        status: {
          in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT],
        },
        court_partition: { in: conflictingPartitions },
      },
    });

    const overlappingBookings = existingBookings.filter((b) =>
      doTimeRangesOverlap(startTimeDate, endTimeDate, b.start_time, b.end_time)
    );

    const overlappingConfirmed = overlappingBookings.filter(
      (b) => b.status === SlotBookingStatus.CONFIRMED
    );

    if (overlappingConfirmed.length > 0 && !input.force_override) {
      throw new AppError(
        `Cannot block slot: ${overlappingConfirmed.length} CONFIRMED booking(s) exist in the requested window (${overlappingConfirmed.map((b) => b.booking_code).join(', ')}). Pass 'force_override: true' to override confirmed citizen bookings.`,
        409,
        'CONFIRMED_BOOKING_CONFLICT',
        {
          conflicting_bookings: overlappingConfirmed.map((b) => ({
            id: b.id,
            booking_code: b.booking_code,
            court_partition: b.court_partition,
            start_time: formatDateToTime(b.start_time),
            end_time: formatDateToTime(b.end_time),
            status: b.status,
          })),
        }
      );
    }

    // If force_override is true (or there are PENDING_PAYMENT bookings), cancel overlapping bookings
    const overriddenBookingCodes: string[] = [];
    for (const conflictBooking of overlappingBookings) {
      await prisma.slotBooking.update({
        where: { id: conflictBooking.id },
        data: { status: SlotBookingStatus.CANCELLED },
      });
      overriddenBookingCodes.push(conflictBooking.booking_code);
    }

    const createdBlock = await prisma.authorityBlock.create({
      data: {
        facility_id: facility.id,
        block_date: blockDateObj,
        start_time: startTimeDate,
        end_time: endTimeDate,
        court_partition: requestedPartition,
        internal_reason: input.internal_reason,
        created_by_officer_id: officer.id,
        is_active: true,
      },
      include: {
        facility: true,
        created_by_officer: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
    });

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'AUTHORITY_SLOT_BLOCK',
      actionDescription: `Officer '${officer.username}' blocked ${facility.code} (${requestedPartition}) on ${input.block_date} from ${input.start_time} to ${resolvedEndTimeStr}. Internal reason: ${input.internal_reason}`,
      targetRefId: createdBlock.id,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'SLOT',
        block_id: createdBlock.id,
        facility_code: facility.code,
        facility_name: facility.name,
        block_date: input.block_date,
        start_time: input.start_time,
        end_time: resolvedEndTimeStr,
        court_partition: requestedPartition,
        block_type: inferBlockType(createdBlock),
        internal_reason: input.internal_reason,
        reason: input.internal_reason,
        force_override: input.force_override,
        overridden_bookings: overriddenBookingCodes,
      },
      ipAddress,
    });

    return {
      authority_block: {
        ...createdBlock,
        block_date_formatted: formatDateOnly(createdBlock.block_date),
        start_time_formatted: formatDateToTime(createdBlock.start_time),
        end_time_formatted: formatDateToTime(createdBlock.end_time),
        overridden_bookings: overriddenBookingCodes,
      },
    };
  }

  /**
   * DELETE /api/admin/slots/block/:id (`STAFF_ADMIN` only)
   * Deactivates an `authority_blocks` record (`is_active = false`) and logs to `audit_logs`.
   */
  static async deactivateAuthorityBlock(
    blockId: string,
    officer: AuthenticatedUser,
    ipAddress: string
  ) {
    const existingBlock = await prisma.authorityBlock.findUnique({
      where: { id: blockId },
      include: {
        facility: true,
      },
    });

    if (!existingBlock) {
      throw new AppError(
        `Authority block '${blockId}' not found.`,
        404,
        'AUTHORITY_BLOCK_NOT_FOUND'
      );
    }

    if (!existingBlock.is_active) {
      throw new AppError(
        `Authority block '${blockId}' is already inactive.`,
        400,
        'AUTHORITY_BLOCK_ALREADY_INACTIVE'
      );
    }

    const updatedBlock = await prisma.authorityBlock.update({
      where: { id: existingBlock.id },
      data: { is_active: false },
      include: {
        facility: true,
      },
    });

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'AUTHORITY_SLOT_UNBLOCK',
      actionDescription: `Officer '${officer.username}' deactivated authority block '${existingBlock.id}' on ${existingBlock.facility?.code ?? existingBlock.facility_id} (${existingBlock.court_partition}).`,
      targetRefId: existingBlock.id,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'SLOT',
        block_id: existingBlock.id,
        facility_id: existingBlock.facility_id,
        facility_code: existingBlock.facility?.code ?? null,
        facility_name: existingBlock.facility?.name ?? null,
        block_date: formatDateOnly(existingBlock.block_date),
        start_time: formatDateToTime(existingBlock.start_time),
        end_time: formatDateToTime(existingBlock.end_time),
        court_partition: existingBlock.court_partition,
        internal_reason: existingBlock.internal_reason,
        reason: `Deactivated block: ${existingBlock.internal_reason}`,
      },
      ipAddress,
    });

    return {
      authority_block: {
        ...updatedBlock,
        block_date_formatted: formatDateOnly(updatedBlock.block_date),
        start_time_formatted: formatDateToTime(updatedBlock.start_time),
        end_time_formatted: formatDateToTime(updatedBlock.end_time),
      },
    };
  }

  /**
   * PATCH /api/admin/users/:id/status (`STAFF_ADMIN` only)
   * Updates a user's `account_status` (`ACTIVE`, `SUSPENDED`, `BANNED`) with a mandatory `ban_reason`
   * and writes an immutable entry to `audit_logs`.
   */
  static async updateUserAccountStatus(
    targetUserId: string,
    officer: AuthenticatedUser,
    input: UpdateUserStatusInput,
    ipAddress: string
  ) {
    if (targetUserId === officer.id && input.account_status !== AccountStatus.ACTIVE) {
      throw new AppError(
        'Officers cannot suspend or ban their own administrative account.',
        400,
        'SELF_MODERATION_NOT_ALLOWED'
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new AppError(`User '${targetUserId}' not found.`, 404, 'USER_NOT_FOUND');
    }

    const previousStatus = targetUser.account_status;

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        account_status: input.account_status,
        ban_reason: input.ban_reason,
      },
      select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        role: true,
        account_status: true,
        ban_reason: true,
        profile_photo_url: true,
        created_at: true,
        updated_at: true,
      },
    });

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'USER_STATUS_MODERATION',
      actionDescription: `Officer '${officer.username}' updated account status of user '${targetUser.username}' from '${previousStatus}' to '${input.account_status}'. Reason: ${input.ban_reason}`,
      targetRefId: targetUser.id,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'USER',
        target_user_id: targetUser.id,
        username: targetUser.username,
        previous_status: previousStatus,
        new_status: input.account_status,
        ban_reason: input.ban_reason,
        reason: input.ban_reason,
      },
      ipAddress,
    });

    return { user: updatedUser };
  }

  /**
   * GET /api/admin/audit-logs (`STAFF_ADMIN` only)
   * Paginated, filterable query of the immutable `audit_logs` ledger (supports `?format=csv` export).
   */
  static async listAuditLogs(query: AdminAuditLogsQuery) {
    const allAuditLogs = await prisma.auditLog.findMany({
      where: {
        ...(query.officer_id ? { officer_id: query.officer_id } : {}),
        ...(query.target_ref_id ? { target_ref_id: query.target_ref_id } : {}),
      },
      include: {
        officer: {
          select: {
            id: true,
            username: true,
            full_name: true,
            role: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const enrichedAll = allAuditLogs.map((log: any) => {
      const detailsObj =
        log.details && typeof log.details === 'object'
          ? (log.details as Record<string, unknown>)
          : {};
      const targetEntity = resolveAuditEntityType(log.action_category, detailsObj);
      const officerUsername =
        log.officer?.username ??
        (typeof detailsObj.officer_username === 'string'
          ? detailsObj.officer_username
          : 'system');
      const officerRole =
        log.officer?.role ??
        (typeof detailsObj.officer_role === 'string'
          ? detailsObj.officer_role
          : UserRole.STAFF_ADMIN);
      const reason = extractAuditReason(log);
      const targetEntityLabel = extractAuditTargetLabel(log, targetEntity);

      return {
        ...log,
        timestamp: new Date(log.created_at).toISOString(),
        officer_username: officerUsername,
        officer_role: officerRole,
        target_entity: targetEntity,
        target_entity_label: targetEntityLabel,
        reason,
      };
    });

    const fromTimestamp = query.from_date
      ? new Date(`${query.from_date}T00:00:00.000Z`).getTime()
      : null;
    const toTimestamp = query.to_date
      ? new Date(`${query.to_date}T23:59:59.999Z`).getTime()
      : null;

    const filtered = enrichedAll.filter((log) => {
      if (
        query.action_category &&
        !matchesAuditActionCategoryFilter(log.action_category, query.action_category)
      ) {
        return false;
      }

      if (query.entity_type && log.target_entity !== query.entity_type) {
        return false;
      }

      const createdMs = new Date(log.created_at).getTime();
      if (fromTimestamp !== null && createdMs < fromTimestamp) return false;
      if (toTimestamp !== null && createdMs > toTimestamp) return false;

      if (query.search) {
        const q = query.search.toLowerCase();
        const matchesDesc = log.action_description.toLowerCase().includes(q);
        const matchesCat = log.action_category.toLowerCase().includes(q);
        const matchesRef = (log.target_ref_id ?? '').toLowerCase().includes(q);
        const matchesOfficer =
          (log.officer?.username ?? '').toLowerCase().includes(q) ||
          (log.officer?.full_name ?? '').toLowerCase().includes(q) ||
          log.officer_username.toLowerCase().includes(q);
        const matchesReason = log.reason.toLowerCase().includes(q);
        const matchesTarget = log.target_entity_label.toLowerCase().includes(q);
        if (
          !matchesDesc &&
          !matchesCat &&
          !matchesRef &&
          !matchesOfficer &&
          !matchesReason &&
          !matchesTarget
        ) {
          return false;
        }
      }
      return true;
    });

    if (query.format === 'csv') {
      const headers = [
        'id',
        'created_at',
        'officer_id',
        'officer_username',
        'action_category',
        'target_ref_id',
        'action_description',
        'ip_address',
        'details_json',
      ];
      const rows = filtered.map((l) =>
        [
          escapeCsvCell(l.id),
          escapeCsvCell(new Date(l.created_at).toISOString()),
          escapeCsvCell(l.officer_id),
          escapeCsvCell(l.officer?.username ?? l.officer_username ?? ''),
          escapeCsvCell(l.action_category),
          escapeCsvCell(l.target_ref_id ?? ''),
          escapeCsvCell(l.action_description),
          escapeCsvCell(l.ip_address),
          escapeCsvCell(l.details),
        ].join(',')
      );

      return {
        format: 'csv' as const,
        csv: [headers.join(','), ...rows].join('\n'),
      };
    }

    const officersMap = new Map<
      string,
      { id: string; username: string; full_name: string; role: string }
    >();
    for (const log of enrichedAll) {
      if (log.officer?.id && !officersMap.has(log.officer.id)) {
        officersMap.set(log.officer.id, {
          id: log.officer.id,
          username: log.officer.username,
          full_name: log.officer.full_name,
          role: log.officer.role,
        });
      }
    }

    const summary = {
      total_events: enrichedAll.length,
      filtered_events: filtered.length,
      facility_actions_count: enrichedAll.filter((l) =>
        matchesAuditActionCategoryFilter(l.action_category, 'FACILITIES')
      ).length,
      slot_actions_count: enrichedAll.filter((l) =>
        matchesAuditActionCategoryFilter(l.action_category, 'SLOTS')
      ).length,
      payment_actions_count: enrichedAll.filter((l) =>
        matchesAuditActionCategoryFilter(l.action_category, 'PAYMENTS')
      ).length,
      account_actions_count: enrichedAll.filter((l) =>
        matchesAuditActionCategoryFilter(l.action_category, 'ACCOUNTS')
      ).length,
      officers: Array.from(officersMap.values()),
    };

    const totalRecords = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
    const offset = (query.page - 1) * query.limit;
    const paginated = filtered.slice(offset, offset + query.limit);

    return {
      format: 'json' as const,
      summary,
      pagination: {
        page: query.page,
        limit: query.limit,
        total_records: totalRecords,
        total_pages: totalPages,
      },
      audit_logs: paginated,
    };
  }

  /**
   * GET /api/admin/payments (`STAFF_ADMIN` only)
   * Filterable admin financial ledger with structured pricing breakdown
   * (Base Fee, Govt/Police Concession Discount, Taxable Subtotal, GST, Final Total Paid),
   * live KPI aggregation synced with Dashboard monthly revenue, and optional CSV export.
   */
  static async listPayments(query: AdminPaymentsQuery) {
    const allPayments = await prisma.payment.findMany({
      where: {
        ...(query.payment_mode ? { payment_mode: query.payment_mode } : {}),
        ...(query.reference_type ? { reference_type: query.reference_type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
            role: true,
          },
        },
        recorded_by_officer: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Compute global monthly settled revenue using the shared helper so Dashboard & Payments stay synced
    const allSettledForDashboardSync =
      query.payment_mode || query.reference_type || query.status
        ? await prisma.payment.findMany({
            where: { status: PaymentStatus.SETTLED },
          })
        : allPayments.filter((p) => p.status === PaymentStatus.SETTLED);
    const syncedMonthlyRevenue = computeMonthlySettledRevenue(allSettledForDashboardSync);

    // Local cache for tariff lookups (supports both Prisma & minimal mocked tests that only implement findUnique)
    const tariffCache = new Map<string, any | null>();
    const lookupTariff = async (
      facilityId: string | null,
      userCategory: UserCategory,
      bookingType: BookingType
    ) => {
      if (!facilityId) return null;
      const cacheKey = `${facilityId}|${userCategory}|${bookingType}`;
      if (tariffCache.has(cacheKey)) {
        return tariffCache.get(cacheKey);
      }
      const found = await prisma.tariff.findUnique({
        where: {
          uq_tariff_facility_category_type: {
            facility_id: facilityId,
            user_category: userCategory,
            booking_type: bookingType,
          },
        },
      });
      tariffCache.set(cacheKey, found ?? null);
      return found ?? null;
    };

    const enrichedPayments = await Promise.all(
      allPayments.map(async (p: any) => {
        const userCategory =
          p.user?.role === UserRole.GOVT_PERSONNEL
            ? UserCategory.GOVT_PERSONNEL
            : UserCategory.PUBLIC;

        let facilityId: string | null = null;
        let facilityCode: string | null = null;
        let facilityName: string | null = null;
        let passOrBookingCode: string | null = null;
        let bookingType: BookingType = BookingType.FULL_COURT;
        let units = 1;
        let referenceDetails: Record<string, unknown> | null = null;

        if (p.reference_type === PaymentReferenceType.MEMBERSHIP) {
          bookingType = BookingType.MONTHLY_PASS;
          const membership = await prisma.membership.findUnique({
            where: { id: p.reference_id },
            include: { facility: true },
          });
          if (membership) {
            facilityId = membership.facility_id;
            facilityCode = membership.facility?.code ?? FacilityCode.SYNTHETIC_TRACK;
            facilityName = membership.facility?.name ?? 'Synthetic Athletic Track';
            passOrBookingCode = membership.pass_code;
            units = Math.max(1, Number(membership.duration_months ?? 1));
            referenceDetails = {
              pass_code: membership.pass_code,
              duration_months: membership.duration_months,
              session_window: membership.session_window,
              status: membership.status,
              start_date: membership.start_date ? formatDateOnly(membership.start_date) : null,
              end_date: membership.end_date ? formatDateOnly(membership.end_date) : null,
            };
          }
        } else {
          const booking = await prisma.slotBooking.findUnique({
            where: { id: p.reference_id },
            include: { facility: true },
          });
          if (booking) {
            facilityId = booking.facility_id;
            facilityCode = booking.facility?.code ?? FacilityCode.POLICE_TURF;
            facilityName = booking.facility?.name ?? 'Sports Facility';
            passOrBookingCode = booking.booking_code;
            bookingType =
              booking.court_partition === CourtPartition.FULL
                ? BookingType.FULL_COURT
                : BookingType.HALF_COURT;
            const sMins = timeToMinutes(formatDateToTime(booking.start_time));
            const eMins = timeToMinutes(formatDateToTime(booking.end_time));
            units = Math.max(1, (eMins - sMins) / 60);
            referenceDetails = {
              booking_code: booking.booking_code,
              booking_date: formatDateOnly(booking.booking_date),
              start_time: formatDateToTime(booking.start_time),
              end_time: formatDateToTime(booking.end_time),
              court_partition: booking.court_partition,
              status: booking.status,
            };
          }
        }

        const [userTariff, publicTariff] = await Promise.all([
          lookupTariff(facilityId, userCategory, bookingType),
          userCategory === UserCategory.GOVT_PERSONNEL
            ? lookupTariff(facilityId, UserCategory.PUBLIC, bookingType)
            : Promise.resolve(null),
        ]);

        const taxableSubtotal = round2(Number(p.base_amount ?? 0));
        const gstAmount = round2(Number(p.gst_amount ?? 0));
        const finalTotalPaid = round2(Number(p.total_amount ?? 0));

        const configuredGstRate = userTariff?.gst_percent
          ? Number(userTariff.gst_percent)
          : publicTariff?.gst_percent
            ? Number(publicTariff.gst_percent)
            : taxableSubtotal > 0
              ? round2((gstAmount / taxableSubtotal) * 100)
              : 18;

        let baseFee = taxableSubtotal;
        let concessionDiscount = 0;

        if (userCategory === UserCategory.GOVT_PERSONNEL) {
          let standardPublicBase: number | null = null;
          if (publicTariff) {
            standardPublicBase = round2(Number(publicTariff.base_price) * units);
          } else if (facilityCode) {
            const fallbackUnit =
              STANDARD_PUBLIC_UNIT_RATES[`${facilityCode}|${bookingType}`];
            if (fallbackUnit !== undefined) {
              standardPublicBase = round2(fallbackUnit * units);
            }
          }

          if (standardPublicBase !== null && standardPublicBase > taxableSubtotal) {
            baseFee = standardPublicBase;
            concessionDiscount = round2(baseFee - taxableSubtotal);
          }
        }

        const concessionPercent =
          baseFee > 0 && concessionDiscount > 0
            ? Math.round((concessionDiscount / baseFee) * 1000) / 10
            : 0;

        return {
          ...p,
          base_amount: taxableSubtotal.toFixed(2),
          gst_amount: gstAmount.toFixed(2),
          total_amount: finalTotalPaid.toFixed(2),
          user_category: userCategory,
          pass_or_booking_code: passOrBookingCode,
          facility_code: facilityCode,
          facility_name: facilityName,
          reference_details: referenceDetails,
          pricing_breakdown: {
            base_fee: baseFee.toFixed(2),
            concession_discount: concessionDiscount.toFixed(2),
            concession_percent: concessionPercent,
            taxable_subtotal: taxableSubtotal.toFixed(2),
            gst_rate: configuredGstRate,
            gst_amount: gstAmount.toFixed(2),
            final_total_paid: finalTotalPaid.toFixed(2),
          },
        };
      })
    );

    const fromTimestamp = query.from_date
      ? new Date(`${query.from_date}T00:00:00.000Z`).getTime()
      : null;
    const toTimestamp = query.to_date
      ? new Date(`${query.to_date}T23:59:59.999Z`).getTime()
      : null;

    const filtered = enrichedPayments.filter((p) => {
      if (query.facility_code && p.facility_code !== query.facility_code) {
        return false;
      }
      if (query.user_category && p.user_category !== query.user_category) {
        return false;
      }
      if (fromTimestamp !== null && new Date(p.created_at).getTime() < fromTimestamp) {
        return false;
      }
      if (toTimestamp !== null && new Date(p.created_at).getTime() > toTimestamp) {
        return false;
      }
      if (query.search) {
        const q = query.search.toLowerCase();
        const matchesReceipt = String(p.receipt_no ?? '').toLowerCase().includes(q);
        const matchesCode = String(p.pass_or_booking_code ?? '').toLowerCase().includes(q);
        const matchesUser =
          String(p.user?.username ?? '').toLowerCase().includes(q) ||
          String(p.user?.full_name ?? '').toLowerCase().includes(q);
        const matchesFacility =
          String(p.facility_name ?? '').toLowerCase().includes(q) ||
          String(p.facility_code ?? '').toLowerCase().includes(q);
        if (!matchesReceipt && !matchesCode && !matchesUser && !matchesFacility) {
          return false;
        }
      }
      return true;
    });

    if (query.format === 'csv') {
      const headers = [
        'receipt_no',
        'booking_or_pass_ref',
        'created_at',
        'member_name',
        'member_username',
        'user_category',
        'facility_code',
        'facility_name',
        'reference_type',
        'payment_mode',
        'base_fee',
        'concession_discount',
        'taxable_subtotal',
        'gst_rate_percent',
        'gst_amount',
        'final_total_paid',
        'status',
      ];
      const rows = filtered.map((p) =>
        [
          escapeCsvCell(p.receipt_no),
          escapeCsvCell(p.pass_or_booking_code ?? p.reference_id),
          escapeCsvCell(new Date(p.created_at).toISOString()),
          escapeCsvCell(p.user?.full_name ?? ''),
          escapeCsvCell(p.user?.username ?? ''),
          escapeCsvCell(p.user_category),
          escapeCsvCell(p.facility_code ?? ''),
          escapeCsvCell(p.facility_name ?? ''),
          escapeCsvCell(p.reference_type),
          escapeCsvCell(p.payment_mode),
          escapeCsvCell(p.pricing_breakdown.base_fee),
          escapeCsvCell(p.pricing_breakdown.concession_discount),
          escapeCsvCell(p.pricing_breakdown.taxable_subtotal),
          escapeCsvCell(p.pricing_breakdown.gst_rate),
          escapeCsvCell(p.pricing_breakdown.gst_amount),
          escapeCsvCell(p.pricing_breakdown.final_total_paid),
          escapeCsvCell(p.status),
        ].join(',')
      );

      return {
        format: 'csv' as const,
        csv: [headers.join(','), ...rows].join('\n'),
      };
    }

    const settledOnly = filtered.filter((p) => p.status === PaymentStatus.SETTLED);
    const pendingOnly = filtered.filter(
      (p) => p.status === PaymentStatus.PENDING_RECONCILIATION
    );
    const failedOrRefundedOnly = filtered.filter(
      (p) => p.status === PaymentStatus.FAILED || p.status === PaymentStatus.REFUNDED
    );

    const sumBreakdown = (
      items: typeof filtered,
      selector: (item: (typeof filtered)[number]) => number
    ) => round2(items.reduce((acc, item) => acc + selector(item), 0)).toFixed(2);

    const concessionTransactionsCount = settledOnly.filter(
      (p) => Number(p.pricing_breakdown.concession_discount) > 0
    ).length;

    const totalTaxableSubtotal = sumBreakdown(settledOnly, (p) =>
      Number(p.pricing_breakdown.taxable_subtotal)
    );
    const totalGstCollected = sumBreakdown(settledOnly, (p) =>
      Number(p.pricing_breakdown.gst_amount)
    );
    const totalRevenue = sumBreakdown(settledOnly, (p) =>
      Number(p.pricing_breakdown.final_total_paid)
    );

    const summary = {
      total_transactions: settledOnly.length,
      total_records: filtered.length,
      completed_transactions_count: settledOnly.length,
      pending_transactions_count: pendingOnly.length,
      failed_or_refunded_count: failedOrRefundedOnly.length,
      pending_amount: sumBreakdown(pendingOnly, (p) =>
        Number(p.pricing_breakdown.final_total_paid)
      ),
      total_gross_base_fee: sumBreakdown(settledOnly, (p) =>
        Number(p.pricing_breakdown.base_fee)
      ),
      total_concessions_applied: sumBreakdown(settledOnly, (p) =>
        Number(p.pricing_breakdown.concession_discount)
      ),
      concession_transactions_count: concessionTransactionsCount,
      total_base_amount: totalTaxableSubtotal,
      total_taxable_subtotal: totalTaxableSubtotal,
      total_gst_amount: totalGstCollected,
      gst_collected: totalGstCollected,
      total_revenue: totalRevenue,
      online_gateway_revenue: sumBreakdown(
        settledOnly.filter((p) => p.payment_mode === PaymentMode.ONLINE_GATEWAY),
        (p) => Number(p.pricing_breakdown.final_total_paid)
      ),
      office_receipt_revenue: sumBreakdown(
        settledOnly.filter((p) => p.payment_mode === PaymentMode.OFFICE_RECEIPT),
        (p) => Number(p.pricing_breakdown.final_total_paid)
      ),
      membership_revenue: sumBreakdown(
        settledOnly.filter((p) => p.reference_type === PaymentReferenceType.MEMBERSHIP),
        (p) => Number(p.pricing_breakdown.final_total_paid)
      ),
      slot_booking_revenue: sumBreakdown(
        settledOnly.filter((p) => p.reference_type === PaymentReferenceType.SLOT_BOOKING),
        (p) => Number(p.pricing_breakdown.final_total_paid)
      ),
      public_revenue: sumBreakdown(
        settledOnly.filter((p) => p.user_category === UserCategory.PUBLIC),
        (p) => Number(p.pricing_breakdown.final_total_paid)
      ),
      govt_revenue: sumBreakdown(
        settledOnly.filter((p) => p.user_category === UserCategory.GOVT_PERSONNEL),
        (p) => Number(p.pricing_breakdown.final_total_paid)
      ),
      monthly_revenue: syncedMonthlyRevenue.toFixed(2),
    };

    let availableFacilities: Array<{ code: string; name: string }> = [];
    if (typeof (prisma.facility as any).findMany === 'function') {
      const facs = await prisma.facility.findMany({ orderBy: { name: 'asc' } });
      availableFacilities = facs.map((f: any) => ({
        code: String(f.code),
        name: String(f.name),
      }));
    } else {
      const seen = new Map<string, string>();
      for (const p of enrichedPayments) {
        if (p.facility_code && !seen.has(p.facility_code)) {
          seen.set(p.facility_code, p.facility_name ?? p.facility_code);
        }
      }
      availableFacilities = Array.from(seen.entries()).map(([code, name]) => ({
        code,
        name,
      }));
    }

    return {
      format: 'json' as const,
      summary,
      facilities: availableFacilities,
      payments: filtered,
    };
  }

  /**
   * GET /api/admin/reports/financial (`STAFF_ADMIN` only)
   * Aggregated revenue report grouped by facility, payment mode (`ONLINE_GATEWAY` vs `OFFICE_RECEIPT`),
   * and user category (`PUBLIC` vs `GOVT_PERSONNEL`) (supports `?format=csv` export).
   */
  static async getFinancialReport(query: FinancialReportQuery) {
    const settledPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.SETTLED,
        ...(query.payment_mode ? { payment_mode: query.payment_mode } : {}),
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
      orderBy: { created_at: 'desc' },
    });

    const fromTimestamp = query.from_date
      ? new Date(`${query.from_date}T00:00:00.000Z`).getTime()
      : null;
    const toTimestamp = query.to_date
      ? new Date(`${query.to_date}T23:59:59.999Z`).getTime()
      : null;

    // Resolve facility and user_category for each settled payment
    const resolvedItems: Array<{
      id: string;
      receipt_no: string;
      created_at: Date;
      reference_type: PaymentReferenceType;
      pass_or_booking_code: string;
      facility_code: FacilityCode;
      facility_name: string;
      payment_mode: PaymentMode;
      user_category: UserCategory;
      base_amount: number;
      gst_amount: number;
      total_amount: number;
      status: PaymentStatus;
    }> = [];

    for (const p of settledPayments) {
      const createdMs = new Date(p.created_at).getTime();
      if (fromTimestamp !== null && createdMs < fromTimestamp) continue;
      if (toTimestamp !== null && createdMs > toTimestamp) continue;

      const userCategory =
        p.user?.role === UserRole.GOVT_PERSONNEL
          ? UserCategory.GOVT_PERSONNEL
          : UserCategory.PUBLIC;

      if (query.user_category && userCategory !== query.user_category) {
        continue;
      }

      let facilityCode: FacilityCode = FacilityCode.SYNTHETIC_TRACK;
      let facilityName = 'Kannur City Police Sports Facility';
      let passOrBookingCode = p.reference_id;

      if (p.reference_type === PaymentReferenceType.MEMBERSHIP) {
        const m = await prisma.membership.findUnique({
          where: { id: p.reference_id },
          include: { facility: true },
        });
        if (m) {
          passOrBookingCode = m.pass_code;
          facilityCode = m.facility?.code ?? FacilityCode.SYNTHETIC_TRACK;
          facilityName = m.facility?.name ?? facilityName;
        }
      } else {
        const b = await prisma.slotBooking.findUnique({
          where: { id: p.reference_id },
          include: { facility: true },
        });
        if (b) {
          passOrBookingCode = b.booking_code;
          facilityCode = b.facility?.code ?? FacilityCode.POLICE_TURF;
          facilityName = b.facility?.name ?? facilityName;
        }
      }

      if (query.facility_code && facilityCode !== query.facility_code) {
        continue;
      }

      resolvedItems.push({
        id: p.id,
        receipt_no: p.receipt_no,
        created_at: p.created_at,
        reference_type: p.reference_type,
        pass_or_booking_code: passOrBookingCode,
        facility_code: facilityCode,
        facility_name: facilityName,
        payment_mode: p.payment_mode,
        user_category: userCategory,
        base_amount: Number(p.base_amount),
        gst_amount: Number(p.gst_amount),
        total_amount: Number(p.total_amount),
        status: p.status,
      });
    }

    const aggregateGroup = (items: typeof resolvedItems) => {
      const base =
        Math.round(items.reduce((sum, i) => sum + i.base_amount, 0) * 100) / 100;
      const gst =
        Math.round(items.reduce((sum, i) => sum + i.gst_amount, 0) * 100) / 100;
      const total =
        Math.round(items.reduce((sum, i) => sum + i.total_amount, 0) * 100) / 100;
      return {
        transaction_count: items.length,
        base_amount: base.toFixed(2),
        gst_amount: gst.toFixed(2),
        total_amount: total.toFixed(2),
      };
    };

    const overallSummary = aggregateGroup(resolvedItems);

    const allFacilityCodes: FacilityCode[] = [
      FacilityCode.SYNTHETIC_TRACK,
      FacilityCode.FOOTBALL_GROUND,
      FacilityCode.POLICE_TURF,
      FacilityCode.BADMINTON_COURT,
    ];

    const byFacility: Record<
      FacilityCode,
      {
        facility_code: FacilityCode;
        transaction_count: number;
        base_amount: string;
        gst_amount: string;
        total_amount: string;
      }
    > = {} as any;

    for (const code of allFacilityCodes) {
      const groupItems = resolvedItems.filter((i) => i.facility_code === code);
      byFacility[code] = {
        facility_code: code,
        ...aggregateGroup(groupItems),
      };
    }

    const byPaymentMode = {
      [PaymentMode.ONLINE_GATEWAY]: {
        payment_mode: PaymentMode.ONLINE_GATEWAY,
        ...aggregateGroup(
          resolvedItems.filter((i) => i.payment_mode === PaymentMode.ONLINE_GATEWAY)
        ),
      },
      [PaymentMode.OFFICE_RECEIPT]: {
        payment_mode: PaymentMode.OFFICE_RECEIPT,
        ...aggregateGroup(
          resolvedItems.filter((i) => i.payment_mode === PaymentMode.OFFICE_RECEIPT)
        ),
      },
    };

    const byUserCategory = {
      [UserCategory.PUBLIC]: {
        user_category: UserCategory.PUBLIC,
        ...aggregateGroup(
          resolvedItems.filter((i) => i.user_category === UserCategory.PUBLIC)
        ),
      },
      [UserCategory.GOVT_PERSONNEL]: {
        user_category: UserCategory.GOVT_PERSONNEL,
        ...aggregateGroup(
          resolvedItems.filter((i) => i.user_category === UserCategory.GOVT_PERSONNEL)
        ),
      },
    };

    // Detailed multi-dimensional breakdown (facility + payment_mode + user_category)
    const breakdownMap = new Map<string, typeof resolvedItems>();
    for (const item of resolvedItems) {
      const key = `${item.facility_code}|${item.payment_mode}|${item.user_category}`;
      const bucket = breakdownMap.get(key) ?? [];
      bucket.push(item);
      breakdownMap.set(key, bucket);
    }

    const detailedBreakdown = Array.from(breakdownMap.entries()).map(([key, bucket]) => {
      const [facility_code, payment_mode, user_category] = key.split('|') as [
        FacilityCode,
        PaymentMode,
        UserCategory,
      ];
      return {
        facility_code,
        payment_mode,
        user_category,
        ...aggregateGroup(bucket),
      };
    });

    if (query.format === 'csv') {
      const headers = [
        'receipt_no',
        'created_at',
        'facility_code',
        'reference_type',
        'pass_or_booking_code',
        'user_category',
        'payment_mode',
        'base_amount',
        'gst_amount',
        'total_amount',
        'status',
      ];
      const rows = resolvedItems.map((item) =>
        [
          escapeCsvCell(item.receipt_no),
          escapeCsvCell(new Date(item.created_at).toISOString()),
          escapeCsvCell(item.facility_code),
          escapeCsvCell(item.reference_type),
          escapeCsvCell(item.pass_or_booking_code),
          escapeCsvCell(item.user_category),
          escapeCsvCell(item.payment_mode),
          escapeCsvCell(item.base_amount.toFixed(2)),
          escapeCsvCell(item.gst_amount.toFixed(2)),
          escapeCsvCell(item.total_amount.toFixed(2)),
          escapeCsvCell(item.status),
        ].join(',')
      );

      return {
        format: 'csv' as const,
        csv: [headers.join(','), ...rows].join('\n'),
      };
    }

    return {
      format: 'json' as const,
      report: {
        generated_at: new Date().toISOString(),
        filters: {
          from_date: query.from_date ?? null,
          to_date: query.to_date ?? null,
          facility_code: query.facility_code ?? 'ALL',
          payment_mode: query.payment_mode ?? 'ALL',
          user_category: query.user_category ?? 'ALL',
        },
        overall_summary: overallSummary,
        by_facility: byFacility,
        by_payment_mode: byPaymentMode,
        by_user_category: byUserCategory,
        detailed_breakdown: detailedBreakdown,
      },
    };
  }

  /**
   * GET /api/admin/dashboard-overview (`STAFF_ADMIN` only)
   * Returns KPI summary metrics, today's bookings schedule, and recent self-registered active members.
   */
  static async getDashboardOverview() {
    const todayStr = formatDateOnly(new Date());

    const [memberUsers, facilities, allBookings, activeBlocks, settledPayments] =
      await Promise.all([
        prisma.user.findMany({
          where: {
            role: {
              in: [UserRole.PUBLIC, UserRole.GOVT_PERSONNEL],
            },
          },
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
            role: true,
            account_status: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        }),
        prisma.facility.findMany({
          orderBy: { code: 'asc' },
        }),
        prisma.slotBooking.findMany({
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                role: true,
              },
            },
            facility: true,
          },
          orderBy: [{ booking_date: 'desc' }, { start_time: 'asc' }],
        }),
        prisma.authorityBlock.findMany({
          where: { is_active: true },
        }),
        prisma.payment.findMany({
          where: { status: PaymentStatus.SETTLED },
        }),
      ]);

    const todaysBookingsRaw = allBookings
      .filter((b) => formatDateOnly(b.booking_date) === todayStr)
      .sort((a, b) => {
        const aMins = timeToMinutes(formatDateToTime(a.start_time));
        const bMins = timeToMinutes(formatDateToTime(b.start_time));
        return aMins - bMins;
      });

    const todaysConfirmed = todaysBookingsRaw.filter(
      (b) => b.status === SlotBookingStatus.CONFIRMED
    );
    const todaysActiveBookings = todaysBookingsRaw.filter(
      (b) =>
        b.status === SlotBookingStatus.CONFIRMED ||
        b.status === SlotBookingStatus.PENDING_PAYMENT
    );

    const todaysBlocks = activeBlocks.filter(
      (blk) => formatDateOnly(blk.block_date) === todayStr
    );

    // Compute daily slot utilization across active hourly-bookable facilities using live managed slots
    const activeFacilities = facilities.filter(
      (f) => getFacilityOperationalStatus(f) === 'ACTIVE'
    );
    const maintenanceFacilitiesCount = facilities.filter(
      (f) => getFacilityOperationalStatus(f) === 'MAINTENANCE'
    ).length;
    const closedFacilitiesCount = facilities.filter(
      (f) => getFacilityOperationalStatus(f) === 'CLOSED'
    ).length;

    const getCourtCount = (f: any) =>
      f.court_count ?? getFacilityDefaultsByCode(f.code).court_count;
    const totalCourtsCount = facilities.reduce((sum, f) => sum + getCourtCount(f), 0);
    const activeCourtsCount = activeFacilities.reduce((sum, f) => sum + getCourtCount(f), 0);

    const hourlyFacilities = activeFacilities.filter((f: any) => {
      const mode = f.booking_mode ?? getFacilityDefaultsByCode(f.code).booking_mode;
      return mode !== 'MONTHLY_MEMBERSHIP_ONLY' && f.code !== FacilityCode.SYNTHETIC_TRACK;
    });

    let totalDailySlots = 0;
    let occupiedDailySlots = 0;

    for (const fac of hourlyFacilities) {
      const facBookings = todaysActiveBookings.filter((b) => b.facility_id === fac.id);
      const facBlocks = todaysBlocks.filter((blk) => blk.facility_id === fac.id);
      const facSlots = await getSlotsForFacilityOnDate(fac, todayStr);

      for (const slot of facSlots) {
        totalDailySlots += 1;
        const isBooked = facBookings.some((b) =>
          doTimeRangesOverlap(slot.start_time, slot.end_time, b.start_time, b.end_time)
        );
        const isBlocked =
          slot.status === 'BLOCKED_MAINTENANCE' ||
          slot.status === 'RESERVED_DEPARTMENT' ||
          facBlocks.some((blk) =>
            doTimeRangesOverlap(slot.start_time, slot.end_time, blk.start_time, blk.end_time)
          );

        if (isBooked || isBlocked) {
          occupiedDailySlots += 1;
        }
      }
    }

    const slotUtilizationRate =
      totalDailySlots > 0 ? Math.round((occupiedDailySlots / totalDailySlots) * 100) : 0;

    const syncedMonthlyRevenue = computeMonthlySettledRevenue(settledPayments);

    const allHourlyFacilities = facilities.filter((f: any) => {
      const mode = f.booking_mode ?? getFacilityDefaultsByCode(f.code).booking_mode;
      return mode !== 'MONTHLY_MEMBERSHIP_ONLY' && f.code !== FacilityCode.SYNTHETIC_TRACK;
    });

    const facilityBookingsBreakdown = allHourlyFacilities.map((fac) => ({
      facility_code: fac.code,
      facility_name: fac.name,
      operational_status: getFacilityOperationalStatus(fac),
      confirmed_count: todaysConfirmed.filter((b) => b.facility_id === fac.id).length,
    }));

    const todaysBookingsFormatted = todaysBookingsRaw.map((b) => ({
      id: b.id,
      booking_code: b.booking_code,
      member_name: b.user?.full_name ?? b.user?.username ?? 'Portal Member',
      member_username: b.user?.username ?? 'member',
      member_role: b.user?.role ?? UserRole.PUBLIC,
      facility_code: b.facility?.code ?? FacilityCode.POLICE_TURF,
      facility_name: b.facility?.name ?? 'Sports Facility',
      booking_date: formatDateOnly(b.booking_date),
      start_time: formatDateToTime(b.start_time),
      end_time: formatDateToTime(b.end_time),
      court_partition: b.court_partition,
      total_amount: Number(b.total_amount).toFixed(2),
      status: b.status,
    }));

    const recentMemberSignups = memberUsers.slice(0, 8).map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      account_status: u.account_status,
      created_at: u.created_at,
    }));

    return {
      date: todayStr,
      kpis: {
        total_registered_members: memberUsers.length,
        active_members_count: memberUsers.filter(
          (u) => u.account_status === AccountStatus.ACTIVE
        ).length,
        public_members_count: memberUsers.filter((u) => u.role === UserRole.PUBLIC).length,
        govt_members_count: memberUsers.filter(
          (u) => u.role === UserRole.GOVT_PERSONNEL
        ).length,
        todays_confirmed_bookings: todaysConfirmed.length,
        todays_total_bookings: todaysActiveBookings.length,
        active_facilities_count: activeFacilities.length,
        total_facilities_count: facilities.length,
        maintenance_facilities_count: maintenanceFacilitiesCount,
        closed_facilities_count: closedFacilitiesCount,
        active_courts_count: activeCourtsCount,
        total_courts_count: totalCourtsCount,
        bookable_courts_count: hourlyFacilities.length,
        slot_utilization_rate: slotUtilizationRate,
        todays_booked_slots_count: occupiedDailySlots,
        todays_total_slots_count: totalDailySlots,
        monthly_revenue: syncedMonthlyRevenue.toFixed(2),
        facility_bookings_breakdown: facilityBookingsBreakdown,
      },
      todays_bookings: todaysBookingsFormatted,
      recent_member_signups: recentMemberSignups,
    };
  }

  /**
   * GET /api/admin/bookings (`STAFF_ADMIN` only)
   * Filterable listing of all court & facility slot bookings.
   */
  static async listBookings(query: AdminBookingsQuery) {
    const todayStr = formatDateOnly(new Date());

    const allBookings = await prisma.slotBooking.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            role: true,
          },
        },
        facility: true,
      },
      orderBy: [{ booking_date: 'desc' }, { start_time: 'asc' }],
    });

    const filtered = allBookings.filter((b) => {
      if (query.date && formatDateOnly(b.booking_date) !== query.date) {
        return false;
      }
      if (query.facility_code && b.facility?.code !== query.facility_code) {
        return false;
      }
      if (query.status && b.status !== query.status) {
        return false;
      }
      if (query.search) {
        const q = query.search.toLowerCase();
        const matchesCode = b.booking_code.toLowerCase().includes(q);
        const matchesName = (b.user?.full_name ?? '').toLowerCase().includes(q);
        const matchesUsername = (b.user?.username ?? '').toLowerCase().includes(q);
        const matchesFacility = (b.facility?.name ?? '').toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesUsername && !matchesFacility) {
          return false;
        }
      }
      return true;
    });

    const summary = {
      total_bookings: allBookings.length,
      confirmed_count: allBookings.filter((b) => b.status === SlotBookingStatus.CONFIRMED).length,
      pending_payment_count: allBookings.filter(
        (b) => b.status === SlotBookingStatus.PENDING_PAYMENT
      ).length,
      cancelled_count: allBookings.filter(
        (b) =>
          b.status === SlotBookingStatus.CANCELLED || b.status === SlotBookingStatus.REFUNDED
      ).length,
      todays_confirmed_count: allBookings.filter(
        (b) =>
          formatDateOnly(b.booking_date) === todayStr &&
          b.status === SlotBookingStatus.CONFIRMED
      ).length,
    };

    const formatted = filtered.map((b) => ({
      id: b.id,
      booking_code: b.booking_code,
      member_name: b.user?.full_name ?? b.user?.username ?? 'Portal Member',
      member_username: b.user?.username ?? 'member',
      member_role: b.user?.role ?? UserRole.PUBLIC,
      facility_code: b.facility?.code ?? FacilityCode.POLICE_TURF,
      facility_name: b.facility?.name ?? 'Sports Facility',
      booking_date: formatDateOnly(b.booking_date),
      start_time: formatDateToTime(b.start_time),
      end_time: formatDateToTime(b.end_time),
      court_partition: b.court_partition,
      total_amount: Number(b.total_amount).toFixed(2),
      status: b.status,
      created_at: b.created_at,
    }));

    return {
      summary,
      bookings: formatted,
    };
  }

  /**
   * GET /api/admin/members (`STAFF_ADMIN` only)
   * Returns the active self-registered Member Directory with bookings & pass summaries.
   */
  static async listMembers(query: AdminMembersQuery) {
    const [memberUsers, allBookings, allMemberships] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.PUBLIC, UserRole.GOVT_PERSONNEL],
          },
        },
        select: {
          id: true,
          username: true,
          full_name: true,
          email: true,
          role: true,
          account_status: true,
          gender: true,
          date_of_birth: true,
          parent_name: true,
          present_address: true,
          city_locality: true,
          pin_code: true,
          permanent_address: true,
          designation: true,
          office_address: true,
          track_purpose: true,
          is_registered_sportsperson: true,
          sport_discipline: true,
          association_details: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.slotBooking.findMany({
        select: {
          user_id: true,
          status: true,
        },
      }),
      prisma.membership.findMany({
        include: {
          facility: true,
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const enriched = memberUsers.map((u) => {
      const confirmedBookings = allBookings.filter(
        (b) => b.user_id === u.id && b.status === SlotBookingStatus.CONFIRMED
      ).length;
      const activePass = allMemberships.find(
        (m) => m.user_id === u.id && m.status === MembershipStatus.ACTIVE
      );

      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        account_status: u.account_status,
        gender: u.gender ?? null,
        date_of_birth: u.date_of_birth ?? null,
        parent_name: u.parent_name ?? null,
        present_address: u.present_address ?? null,
        city_locality: u.city_locality ?? null,
        pin_code: u.pin_code ?? null,
        permanent_address: u.permanent_address ?? null,
        designation: u.designation ?? null,
        office_address: u.office_address ?? null,
        track_purpose: u.track_purpose ?? null,
        is_registered_sportsperson: Boolean(u.is_registered_sportsperson),
        sport_discipline: u.sport_discipline ?? null,
        association_details: u.association_details ?? null,
        created_at: u.created_at,
        confirmed_bookings_count: confirmedBookings,
        active_pass_code: activePass?.pass_code ?? null,
        active_pass_plan: activePass
          ? `${activePass.facility?.name ?? 'Synthetic Track'} (${activePass.duration_months} Mo)`
          : null,
      };
    });

    const filtered = enriched.filter((m) => {
      if (query.role && m.role !== query.role) return false;
      if (query.account_status && m.account_status !== query.account_status) return false;
      if (query.gender && m.gender !== query.gender) return false;
      if (query.search) {
        const q = query.search.toLowerCase();
        const matchesName = m.full_name.toLowerCase().includes(q);
        const matchesUsername = m.username.toLowerCase().includes(q);
        const matchesEmail = (m.email ?? '').toLowerCase().includes(q);
        const matchesPass = (m.active_pass_code ?? '').toLowerCase().includes(q);
        const matchesLocality = (m.city_locality ?? '').toLowerCase().includes(q);
        const matchesAddress = (m.present_address ?? '').toLowerCase().includes(q);
        const matchesPin = (m.pin_code ?? '').toLowerCase().includes(q);
        const matchesDesignation = (m.designation ?? '').toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesUsername &&
          !matchesEmail &&
          !matchesPass &&
          !matchesLocality &&
          !matchesAddress &&
          !matchesPin &&
          !matchesDesignation
        ) {
          return false;
        }
      }
      return true;
    });

    return {
      summary: {
        total_members: memberUsers.length,
        active_count: memberUsers.filter((u) => u.account_status === AccountStatus.ACTIVE)
          .length,
        public_count: memberUsers.filter((u) => u.role === UserRole.PUBLIC).length,
        govt_count: memberUsers.filter((u) => u.role === UserRole.GOVT_PERSONNEL).length,
        active_track_passes: allMemberships.filter(
          (m) => m.status === MembershipStatus.ACTIVE
        ).length,
      },
      members: filtered,
    };
  }

  /**
   * GET /api/admin/facilities?date=YYYY-MM-DD (`STAFF_ADMIN` only)
   * Lists all sports facilities with pricing, operational status, and live date-based slots & booking counts.
   */
  static async listFacilitiesWithSlots(query: AdminFacilitiesQuery) {
    const targetDateStr = query.date ?? formatDateOnly(new Date());
    const targetDateObj = parseDateOnly(targetDateStr);
    const db = prisma as any;

    const [allFacilities, dateBookings, dateBlocks] = await Promise.all([
      db.facility.findMany({
        include: { tariffs: true },
        orderBy: { name: 'asc' },
      }),
      prisma.slotBooking.findMany({
        where: {
          booking_date: targetDateObj,
          status: {
            in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT],
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
          block_date: targetDateObj,
          is_active: true,
        },
      }),
    ]);

    const enrichedAll = await Promise.all(
      allFacilities.map((fac: any) =>
        formatFacilityWithSchedule(fac, targetDateStr, dateBookings, dateBlocks)
      )
    );

    const activeFacilitiesList = enrichedAll.filter(
      (f) => f.operational_status === 'ACTIVE'
    );
    const totalSlotsToday = activeFacilitiesList.reduce(
      (sum, f) => sum + f.stats.total_slots,
      0
    );
    const bookedOrBlockedSlotsToday = activeFacilitiesList.reduce(
      (sum, f) => sum + f.stats.occupied_slots,
      0
    );

    const filtered = enrichedAll.filter((f) => {
      if (query.status && f.operational_status !== query.status) return false;
      if (query.search) {
        const q = query.search.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesCat = f.category.toLowerCase().includes(q);
        const matchesCode = String(f.code).toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesCode) return false;
      }
      return true;
    });

    return {
      date: targetDateStr,
      summary: {
        total_facilities: enrichedAll.length,
        active_facilities: activeFacilitiesList.length,
        maintenance_facilities: enrichedAll.filter(
          (f) => f.operational_status === 'MAINTENANCE'
        ).length,
        closed_facilities: enrichedAll.filter(
          (f) => f.operational_status === 'CLOSED'
        ).length,
        total_courts: enrichedAll.reduce((sum, f) => sum + f.court_count, 0),
        active_courts: activeFacilitiesList.reduce((sum, f) => sum + f.court_count, 0),
        total_slots_today: totalSlotsToday,
        booked_or_blocked_slots_today: bookedOrBlockedSlotsToday,
        slot_utilization_rate:
          totalSlotsToday > 0
            ? Math.round((bookedOrBlockedSlotsToday / totalSlotsToday) * 100)
            : 0,
      },
      facilities: filtered,
    };
  }

  /**
   * GET /api/admin/facilities/:facilityId/schedule?date=YYYY-MM-DD (`STAFF_ADMIN` only)
   */
  static async getFacilitySchedule(facilityIdOrCode: string, dateStr?: string) {
    const targetDateStr = dateStr ?? formatDateOnly(new Date());
    const targetDateObj = parseDateOnly(targetDateStr);

    const facility = await findFacilityByIdOrCode(facilityIdOrCode);
    if (!facility) {
      throw new AppError(
        `Facility '${facilityIdOrCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const [dateBookings, dateBlocks] = await Promise.all([
      prisma.slotBooking.findMany({
        where: {
          facility_id: facility.id,
          booking_date: targetDateObj,
          status: {
            in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT],
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
          block_date: targetDateObj,
          is_active: true,
        },
      }),
    ]);

    const formatted = await formatFacilityWithSchedule(
      facility,
      targetDateStr,
      dateBookings,
      dateBlocks
    );

    return {
      date: targetDateStr,
      facility: formatted,
    };
  }

  /**
   * POST /api/admin/facilities (`STAFF_ADMIN` only)
   * Creates a new sports facility with tariffs and default recurring daily time slots.
   */
  static async createFacility(
    officer: AuthenticatedUser,
    input: CreateFacilityInput,
    ipAddress: string
  ) {
    const startMins = timeToMinutes(input.operating_start);
    const endMins = timeToMinutes(input.operating_end);
    if (endMins <= startMins) {
      throw new AppError(
        'Operating end time must be strictly after operating start time.',
        400,
        'INVALID_OPERATING_HOURS'
      );
    }

    const db = prisma as any;
    const baseCode = input.code ?? generateFacilityCodeFromName(input.name);
    const existingFacilities: any[] = await db.facility.findMany();

    let resolvedCode = baseCode;
    let suffix = 2;
    while (existingFacilities.some((f) => String(f.code) === resolvedCode)) {
      if (input.code) {
        throw new AppError(
          `A facility with code '${input.code}' already exists.`,
          409,
          'DUPLICATE_FACILITY_CODE'
        );
      }
      resolvedCode = `${baseCode.slice(0, 35)}_${suffix}`;
      suffix += 1;
    }

    const createdFacility = await db.facility.create({
      data: {
        code: resolvedCode,
        name: input.name,
        category: input.category,
        court_count: input.court_count,
        court_unit_label: input.court_unit_label,
        operational_status: input.operational_status,
        max_capacity_per_slot: input.max_capacity_per_slot,
        booking_mode: input.booking_mode,
        description: input.description,
        operating_start: parseTimeToDate(input.operating_start),
        operating_end: parseTimeToDate(input.operating_end),
        slot_duration_mins: input.slot_duration_mins,
        daily_user_hour_cap: input.daily_user_hour_cap,
        monthly_member_cap: input.monthly_member_cap ?? null,
        is_partitionable: input.is_partitionable,
      },
    });

    const primaryBookingType: BookingType =
      input.booking_mode === 'MONTHLY_MEMBERSHIP_ONLY'
        ? BookingType.MONTHLY_PASS
        : BookingType.FULL_COURT;

    const tariffPayloads: Array<{
      facility_id: string;
      user_category: UserCategory;
      booking_type: BookingType;
      base_price: string;
      gst_percent: string;
      is_active: boolean;
    }> = [
      {
        facility_id: createdFacility.id,
        user_category: UserCategory.PUBLIC,
        booking_type: primaryBookingType,
        base_price: input.public_rate.toFixed(2),
        gst_percent: '18.00',
        is_active: true,
      },
      {
        facility_id: createdFacility.id,
        user_category: UserCategory.GOVT_PERSONNEL,
        booking_type: primaryBookingType,
        base_price: input.govt_rate.toFixed(2),
        gst_percent: '18.00',
        is_active: true,
      },
    ];

    if (input.is_partitionable) {
      if (input.half_court_public_rate !== undefined && input.half_court_public_rate !== null) {
        tariffPayloads.push({
          facility_id: createdFacility.id,
          user_category: UserCategory.PUBLIC,
          booking_type: BookingType.HALF_COURT,
          base_price: input.half_court_public_rate.toFixed(2),
          gst_percent: '18.00',
          is_active: true,
        });
      }
      if (input.half_court_govt_rate !== undefined && input.half_court_govt_rate !== null) {
        tariffPayloads.push({
          facility_id: createdFacility.id,
          user_category: UserCategory.GOVT_PERSONNEL,
          booking_type: BookingType.HALF_COURT,
          base_price: input.half_court_govt_rate.toFixed(2),
          gst_percent: '18.00',
          is_active: true,
        });
      }
    }

    for (const t of tariffPayloads) {
      await db.tariff.create({ data: t });
    }

    // Seed initial recurring daily time slots matching the facility operating hours
    const slotDelegate = getManagedSlotDelegate();
    const step = input.slot_duration_mins || 60;
    if (slotDelegate && typeof slotDelegate.create === 'function') {
      for (let current = startMins; current + step <= endMins; current += step) {
        await slotDelegate.create({
          data: {
            facility_id: createdFacility.id,
            slot_date: null,
            start_time: parseTimeToDate(minutesToTime(current)),
            end_time: parseTimeToDate(minutesToTime(current + step)),
            max_capacity: input.max_capacity_per_slot,
            status: 'OPEN',
            block_reason: null,
            court_partition: CourtPartition.FULL,
          },
        });
      }
    }

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'FACILITY_CREATED',
      actionDescription: `Officer '${officer.username}' created facility '${createdFacility.name}' (${createdFacility.code}) with status '${input.operational_status}'.`,
      targetRefId: createdFacility.code,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'FACILITY',
        facility_id: createdFacility.id,
        facility_code: createdFacility.code,
        facility_name: createdFacility.name,
        code: createdFacility.code,
        category: input.category,
        court_count: input.court_count,
        operational_status: input.operational_status,
        max_capacity_per_slot: input.max_capacity_per_slot,
        public_rate: input.public_rate,
        govt_rate: input.govt_rate,
        reason: `Added new venue (${input.category}) • Public ₹${input.public_rate} / Govt ₹${input.govt_rate}`,
      },
      ipAddress,
    });

    const todayStr = formatDateOnly(new Date());
    const reloaded = await findFacilityByIdOrCode(createdFacility.id);
    const formatted = await formatFacilityWithSchedule(reloaded, todayStr, [], []);

    return { facility: formatted };
  }

  /**
   * PATCH /api/admin/facilities/:id (`STAFF_ADMIN` only)
   * Updates facility name, operational status, max capacity, operating hours, and fee rates.
   */
  static async updateFacility(
    facilityIdOrCode: string,
    officer: AuthenticatedUser,
    input: UpdateFacilityInput,
    ipAddress: string
  ) {
    const existing = await findFacilityByIdOrCode(facilityIdOrCode);
    if (!existing) {
      throw new AppError(
        `Facility '${facilityIdOrCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const nextStartStr = input.operating_start ?? formatDateToTime(existing.operating_start);
    const nextEndStr = input.operating_end ?? formatDateToTime(existing.operating_end);
    if (timeToMinutes(nextEndStr) <= timeToMinutes(nextStartStr)) {
      throw new AppError(
        'Operating end time must be strictly after operating start time.',
        400,
        'INVALID_OPERATING_HOURS'
      );
    }

    const defaults = getFacilityDefaultsByCode(existing.code);
    const prevMaxCap = existing.max_capacity_per_slot ?? defaults.max_capacity_per_slot;
    const nextBookingMode: FacilityBookingMode =
      input.booking_mode ?? existing.booking_mode ?? defaults.booking_mode;
    const nextIsPartitionable =
      input.is_partitionable !== undefined ? input.is_partitionable : Boolean(existing.is_partitionable);

    const db = prisma as any;
    const updatePayload: Record<string, unknown> = {};
    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.category !== undefined) updatePayload.category = input.category;
    if (input.court_count !== undefined) updatePayload.court_count = input.court_count;
    if (input.court_unit_label !== undefined) updatePayload.court_unit_label = input.court_unit_label;
    if (input.operational_status !== undefined) {
      updatePayload.operational_status = input.operational_status;
    }
    if (input.max_capacity_per_slot !== undefined) {
      updatePayload.max_capacity_per_slot = input.max_capacity_per_slot;
    }
    if (input.operating_start !== undefined) {
      updatePayload.operating_start = parseTimeToDate(input.operating_start);
    }
    if (input.operating_end !== undefined) {
      updatePayload.operating_end = parseTimeToDate(input.operating_end);
    }
    if (input.slot_duration_mins !== undefined) {
      updatePayload.slot_duration_mins = input.slot_duration_mins;
    }
    if (input.daily_user_hour_cap !== undefined) {
      updatePayload.daily_user_hour_cap = input.daily_user_hour_cap;
    }
    if (input.monthly_member_cap !== undefined) {
      updatePayload.monthly_member_cap = input.monthly_member_cap;
    }
    if (input.is_partitionable !== undefined) {
      updatePayload.is_partitionable = input.is_partitionable;
    }
    if (input.booking_mode !== undefined) {
      updatePayload.booking_mode = input.booking_mode;
    }
    if (input.description !== undefined) {
      updatePayload.description = input.description;
    }

    const updatedFacility = await db.facility.update({
      where: { id: existing.id },
      data: updatePayload,
    });

    const primaryBookingType =
      nextBookingMode === 'MONTHLY_MEMBERSHIP_ONLY'
        ? BookingType.MONTHLY_PASS
        : BookingType.FULL_COURT;

    const upsertTariffRate = async (
      userCategory: UserCategory,
      bookingType: BookingType,
      rate: number
    ) => {
      await db.tariff.upsert({
        where: {
          uq_tariff_facility_category_type: {
            facility_id: existing.id,
            user_category: userCategory,
            booking_type: bookingType,
          },
        },
        update: {
          base_price: rate.toFixed(2),
          is_active: true,
        },
        create: {
          facility_id: existing.id,
          user_category: userCategory,
          booking_type: bookingType,
          base_price: rate.toFixed(2),
          gst_percent: '18.00',
          is_active: true,
        },
      });
    };

    if (input.public_rate !== undefined) {
      await upsertTariffRate(UserCategory.PUBLIC, primaryBookingType, input.public_rate);
    }
    if (input.govt_rate !== undefined) {
      await upsertTariffRate(UserCategory.GOVT_PERSONNEL, primaryBookingType, input.govt_rate);
    }
    if (nextIsPartitionable) {
      if (input.half_court_public_rate !== undefined && input.half_court_public_rate !== null) {
        await upsertTariffRate(
          UserCategory.PUBLIC,
          BookingType.HALF_COURT,
          input.half_court_public_rate
        );
      }
      if (input.half_court_govt_rate !== undefined && input.half_court_govt_rate !== null) {
        await upsertTariffRate(
          UserCategory.GOVT_PERSONNEL,
          BookingType.HALF_COURT,
          input.half_court_govt_rate
        );
      }
    }

    // Propagate updated facility default max capacity to standard slots that matched previous default
    if (
      input.max_capacity_per_slot !== undefined &&
      input.max_capacity_per_slot !== prevMaxCap
    ) {
      const slotDelegate = getManagedSlotDelegate();
      if (slotDelegate && typeof slotDelegate.findMany === 'function') {
        const facSlots: FacilitySlotRecord[] = await slotDelegate.findMany({
          where: { facility_id: existing.id },
        });
        for (const s of facSlots) {
          if (s.max_capacity === prevMaxCap) {
            await slotDelegate.update({
              where: { id: s.id },
              data: { max_capacity: input.max_capacity_per_slot },
            });
          }
        }
      }
    }

    const pricingSummaryParts: string[] = [];
    if (input.public_rate !== undefined) pricingSummaryParts.push(`Public ₹${input.public_rate}`);
    if (input.govt_rate !== undefined) pricingSummaryParts.push(`Govt ₹${input.govt_rate}`);
    if (input.half_court_public_rate !== undefined && input.half_court_public_rate !== null) {
      pricingSummaryParts.push(`Half Public ₹${input.half_court_public_rate}`);
    }
    if (input.half_court_govt_rate !== undefined && input.half_court_govt_rate !== null) {
      pricingSummaryParts.push(`Half Govt ₹${input.half_court_govt_rate}`);
    }
    const updateReason =
      pricingSummaryParts.length > 0
        ? `Updated ${Object.keys(input).join(', ')} (${pricingSummaryParts.join(' / ')})`
        : `Updated facility configuration (${Object.keys(input).join(', ')})`;

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'FACILITY_UPDATED',
      actionDescription: `Officer '${officer.username}' updated facility '${updatedFacility.name}' (${updatedFacility.code}).`,
      targetRefId: updatedFacility.code,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'FACILITY',
        facility_id: existing.id,
        facility_code: updatedFacility.code,
        facility_name: updatedFacility.name,
        updated_fields: Object.keys(input),
        operational_status: getFacilityOperationalStatus(updatedFacility),
        ...(input.public_rate !== undefined ? { public_rate: input.public_rate } : {}),
        ...(input.govt_rate !== undefined ? { govt_rate: input.govt_rate } : {}),
        reason: updateReason,
      },
      ipAddress,
    });

    const todayStr = formatDateOnly(new Date());
    const todayDateObj = parseDateOnly(todayStr);
    const [reloaded, dateBookings, dateBlocks] = await Promise.all([
      findFacilityByIdOrCode(existing.id),
      prisma.slotBooking.findMany({
        where: {
          facility_id: existing.id,
          booking_date: todayDateObj,
          status: { in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT] },
        },
        include: {
          user: { select: { id: true, username: true, full_name: true, role: true } },
        },
      }),
      prisma.authorityBlock.findMany({
        where: { facility_id: existing.id, block_date: todayDateObj, is_active: true },
      }),
    ]);

    const formatted = await formatFacilityWithSchedule(
      reloaded,
      todayStr,
      dateBookings,
      dateBlocks
    );
    return { facility: formatted };
  }

  /**
   * PATCH /api/admin/facilities/:id/status (`STAFF_ADMIN` only)
   * Quick-toggles a facility's operational status (ACTIVE | MAINTENANCE | CLOSED).
   */
  static async updateFacilityStatus(
    facilityIdOrCode: string,
    officer: AuthenticatedUser,
    input: UpdateFacilityStatusInput,
    ipAddress: string
  ) {
    const existing = await findFacilityByIdOrCode(facilityIdOrCode);
    if (!existing) {
      throw new AppError(
        `Facility '${facilityIdOrCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const previousStatus = getFacilityOperationalStatus(existing);
    const db = prisma as any;
    const updatedFacility = await db.facility.update({
      where: { id: existing.id },
      data: { operational_status: input.operational_status },
    });

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'FACILITY_STATUS_UPDATED',
      actionDescription: `Officer '${officer.username}' changed operational status of '${updatedFacility.name}' from '${previousStatus}' to '${input.operational_status}'.${input.reason ? ` Reason: ${input.reason}` : ''}`,
      targetRefId: updatedFacility.code,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'FACILITY',
        facility_id: existing.id,
        facility_code: updatedFacility.code,
        facility_name: updatedFacility.name,
        previous_status: previousStatus,
        new_status: input.operational_status,
        reason:
          input.reason?.trim() ||
          `Operational status changed from ${previousStatus} to ${input.operational_status}`,
      },
      ipAddress,
    });

    const todayStr = formatDateOnly(new Date());
    const todayDateObj = parseDateOnly(todayStr);
    const [reloaded, dateBookings, dateBlocks] = await Promise.all([
      findFacilityByIdOrCode(existing.id),
      prisma.slotBooking.findMany({
        where: {
          facility_id: existing.id,
          booking_date: todayDateObj,
          status: { in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT] },
        },
        include: {
          user: { select: { id: true, username: true, full_name: true, role: true } },
        },
      }),
      prisma.authorityBlock.findMany({
        where: { facility_id: existing.id, block_date: todayDateObj, is_active: true },
      }),
    ]);

    const formatted = await formatFacilityWithSchedule(
      reloaded,
      todayStr,
      dateBookings,
      dateBlocks
    );
    return { facility: formatted };
  }

  /**
   * POST /api/admin/facilities/:facilityId/slots (`STAFF_ADMIN` only)
   * Creates a new time slot for the selected facility.
   */
  static async createFacilitySlot(
    facilityIdOrCode: string,
    officer: AuthenticatedUser,
    input: CreateFacilitySlotInput,
    ipAddress: string
  ) {
    const facility = await findFacilityByIdOrCode(facilityIdOrCode);
    if (!facility) {
      throw new AppError(
        `Facility '${facilityIdOrCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const startMins = timeToMinutes(input.start_time);
    const endMins = timeToMinutes(input.end_time);
    if (endMins <= startMins) {
      throw new AppError(
        'Slot end_time must be strictly after start_time.',
        400,
        'INVALID_SLOT_TIME_RANGE'
      );
    }

    const slotDate = input.slot_date ?? null;
    if (slotDate) {
      parseDateOnly(slotDate);
    }

    const slotDelegate = getManagedSlotDelegate();
    if (!slotDelegate || typeof slotDelegate.create !== 'function') {
      throw new AppError(
        'Managed slot storage is not initialized.',
        500,
        'SLOT_STORAGE_UNAVAILABLE'
      );
    }

    const startTimeDate = parseTimeToDate(input.start_time);
    const endTimeDate = parseTimeToDate(input.end_time);

    const existingSlots: FacilitySlotRecord[] = await slotDelegate.findMany({
      where: { facility_id: facility.id },
    });

    const conflictingSlot = existingSlots.find((s) => {
      const sameScope =
        s.slot_date === null || slotDate === null || s.slot_date === slotDate;
      return sameScope && doTimeRangesOverlap(startTimeDate, endTimeDate, s.start_time, s.end_time);
    });

    if (conflictingSlot) {
      throw new AppError(
        `A time slot (${formatDateToTime(conflictingSlot.start_time)} - ${formatDateToTime(conflictingSlot.end_time)}) already overlaps the requested window (${input.start_time} - ${input.end_time}).`,
        409,
        'DUPLICATE_SLOT_WINDOW'
      );
    }

    const defaults = getFacilityDefaultsByCode(facility.code);
    const maxCapacity =
      input.max_capacity ?? facility.max_capacity_per_slot ?? defaults.max_capacity_per_slot;

    const createdSlot: FacilitySlotRecord = await slotDelegate.create({
      data: {
        facility_id: facility.id,
        slot_date: slotDate,
        start_time: startTimeDate,
        end_time: endTimeDate,
        max_capacity: maxCapacity,
        status: input.status,
        block_reason:
          input.status === 'OPEN'
            ? null
            : input.block_reason?.trim() ||
              (input.status === 'BLOCKED_MAINTENANCE'
                ? 'Scheduled facility maintenance'
                : 'Reserved for Kannur City Police department'),
        court_partition: input.court_partition,
      },
    });

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'FACILITY_SLOT_CREATED',
      actionDescription: `Officer '${officer.username}' created time slot ${input.start_time}-${input.end_time} (cap: ${maxCapacity}) on '${facility.name}'.`,
      targetRefId: createdSlot.id,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'SLOT',
        slot_id: createdSlot.id,
        facility_id: facility.id,
        facility_code: facility.code,
        facility_name: facility.name,
        slot_date: slotDate,
        start_time: input.start_time,
        end_time: input.end_time,
        max_capacity: maxCapacity,
        status: input.status,
        block_reason: createdSlot.block_reason,
        reason:
          createdSlot.block_reason ||
          `Created ${slotDate ? `date-specific (${slotDate})` : 'recurring daily'} slot ${input.start_time}-${input.end_time} with max capacity ${maxCapacity}.`,
      },
      ipAddress,
    });

    const targetDateStr = slotDate ?? formatDateOnly(new Date());
    const targetDateObj = parseDateOnly(targetDateStr);
    const [dateBookings, dateBlocks] = await Promise.all([
      prisma.slotBooking.findMany({
        where: {
          facility_id: facility.id,
          booking_date: targetDateObj,
          status: { in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT] },
        },
        include: {
          user: { select: { id: true, username: true, full_name: true, role: true } },
        },
      }),
      prisma.authorityBlock.findMany({
        where: { facility_id: facility.id, block_date: targetDateObj, is_active: true },
      }),
    ]);

    return {
      slot: buildEnrichedFacilitySlot(createdSlot, facility, dateBookings, dateBlocks),
    };
  }

  /**
   * PATCH /api/admin/facilities/:facilityId/slots/:slotId (`STAFF_ADMIN` only)
   * Edits time slot timing, capacity, or status.
   */
  static async updateFacilitySlot(
    facilityIdOrCode: string,
    slotId: string,
    officer: AuthenticatedUser,
    input: UpdateFacilitySlotInput,
    ipAddress: string
  ) {
    const facility = await findFacilityByIdOrCode(facilityIdOrCode);
    if (!facility) {
      throw new AppError(
        `Facility '${facilityIdOrCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const slotDelegate = getManagedSlotDelegate();
    const existingSlot: FacilitySlotRecord | null = slotDelegate
      ? await slotDelegate.findUnique({ where: { id: slotId } })
      : null;

    if (!existingSlot || existingSlot.facility_id !== facility.id) {
      throw new AppError(`Time slot '${slotId}' not found.`, 404, 'SLOT_NOT_FOUND');
    }

    const nextStartStr = input.start_time ?? formatDateToTime(existingSlot.start_time);
    const nextEndStr = input.end_time ?? formatDateToTime(existingSlot.end_time);
    if (timeToMinutes(nextEndStr) <= timeToMinutes(nextStartStr)) {
      throw new AppError(
        'Slot end_time must be strictly after start_time.',
        400,
        'INVALID_SLOT_TIME_RANGE'
      );
    }

    const nextStartDate = parseTimeToDate(nextStartStr);
    const nextEndDate = parseTimeToDate(nextEndStr);

    const siblingSlots: FacilitySlotRecord[] = await slotDelegate.findMany({
      where: { facility_id: facility.id },
    });

    const overlapOther = siblingSlots.find((s) => {
      if (s.id === existingSlot.id) return false;
      const sameScope =
        s.slot_date === null ||
        existingSlot.slot_date === null ||
        s.slot_date === existingSlot.slot_date;
      return sameScope && doTimeRangesOverlap(nextStartDate, nextEndDate, s.start_time, s.end_time);
    });

    if (overlapOther) {
      throw new AppError(
        `Updated timing (${nextStartStr} - ${nextEndStr}) overlaps existing slot (${formatDateToTime(overlapOther.start_time)} - ${formatDateToTime(overlapOther.end_time)}).`,
        409,
        'SLOT_TIME_OVERLAP'
      );
    }

    const targetDateStr = input.date ?? existingSlot.slot_date ?? formatDateOnly(new Date());
    const targetDateObj = parseDateOnly(targetDateStr);

    const activeDateBookings = await prisma.slotBooking.findMany({
      where: {
        facility_id: facility.id,
        booking_date: targetDateObj,
        status: { in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT] },
      },
      include: {
        user: { select: { id: true, username: true, full_name: true, role: true } },
      },
    });

    const currentSlotBookings = activeDateBookings.filter((b) =>
      doTimeRangesOverlap(existingSlot.start_time, existingSlot.end_time, b.start_time, b.end_time)
    );

    if (
      input.max_capacity !== undefined &&
      input.max_capacity < currentSlotBookings.length
    ) {
      throw new AppError(
        `Cannot reduce capacity to ${input.max_capacity}: ${currentSlotBookings.length} active booking(s) already exist on ${targetDateStr}.`,
        409,
        'CAPACITY_BELOW_ACTIVE_BOOKINGS'
      );
    }

    const nextStatus: ManagedSlotStatus = input.status ?? existingSlot.status;
    const nextReason =
      nextStatus === 'OPEN'
        ? null
        : input.block_reason !== undefined
          ? input.block_reason
          : existingSlot.block_reason;

    const updatedSlot: FacilitySlotRecord = await slotDelegate.update({
      where: { id: existingSlot.id },
      data: {
        start_time: nextStartDate,
        end_time: nextEndDate,
        max_capacity: input.max_capacity ?? existingSlot.max_capacity,
        status: nextStatus,
        block_reason: nextReason,
      },
    });

    // If explicitly setting status to OPEN via edit drawer, also clear active blocks on targetDateStr
    if (input.status === 'OPEN') {
      const dateBlocks = await prisma.authorityBlock.findMany({
        where: { facility_id: facility.id, block_date: targetDateObj, is_active: true },
      });
      for (const blk of dateBlocks) {
        if (doTimeRangesOverlap(updatedSlot.start_time, updatedSlot.end_time, blk.start_time, blk.end_time)) {
          await prisma.authorityBlock.update({
            where: { id: blk.id },
            data: { is_active: false },
          });
        }
      }
    }

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'FACILITY_SLOT_UPDATED',
      actionDescription: `Officer '${officer.username}' updated time slot '${existingSlot.id}' on '${facility.name}' to ${nextStartStr}-${nextEndStr} (cap: ${updatedSlot.max_capacity}, status: ${updatedSlot.status}).`,
      targetRefId: existingSlot.id,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'SLOT',
        slot_id: existingSlot.id,
        facility_id: facility.id,
        facility_code: facility.code,
        facility_name: facility.name,
        previous_start_time: formatDateToTime(existingSlot.start_time),
        previous_end_time: formatDateToTime(existingSlot.end_time),
        previous_max_capacity: existingSlot.max_capacity,
        start_time: nextStartStr,
        end_time: nextEndStr,
        max_capacity: updatedSlot.max_capacity,
        status: updatedSlot.status,
        block_reason: updatedSlot.block_reason,
        reason:
          updatedSlot.block_reason ||
          `Updated slot to ${nextStartStr}-${nextEndStr} (capacity ${updatedSlot.max_capacity}, status ${updatedSlot.status}).`,
      },
      ipAddress,
    });

    const refreshedBlocks = await prisma.authorityBlock.findMany({
      where: { facility_id: facility.id, block_date: targetDateObj, is_active: true },
    });

    return {
      slot: buildEnrichedFacilitySlot(
        updatedSlot,
        facility,
        activeDateBookings,
        refreshedBlocks
      ),
    };
  }

  /**
   * PATCH /api/admin/facilities/:facilityId/slots/:slotId/block (`STAFF_ADMIN` only)
   * Toggles block/unblock for a slot on a specific date with optional reason and block type.
   */
  static async toggleFacilitySlotBlock(
    facilityIdOrCode: string,
    slotId: string,
    officer: AuthenticatedUser,
    input: ToggleSlotBlockInput,
    ipAddress: string
  ) {
    const facility = await findFacilityByIdOrCode(facilityIdOrCode);
    if (!facility) {
      throw new AppError(
        `Facility '${facilityIdOrCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const slotDelegate = getManagedSlotDelegate();
    const slot: FacilitySlotRecord | null = slotDelegate
      ? await slotDelegate.findUnique({ where: { id: slotId } })
      : null;

    if (!slot || slot.facility_id !== facility.id) {
      throw new AppError(`Time slot '${slotId}' not found.`, 404, 'SLOT_NOT_FOUND');
    }

    const targetDateStr = input.date ?? slot.slot_date ?? formatDateOnly(new Date());
    const targetDateObj = parseDateOnly(targetDateStr);
    const db = prisma as any;

    const existingBlocks = await prisma.authorityBlock.findMany({
      where: {
        facility_id: facility.id,
        block_date: targetDateObj,
        is_active: true,
      },
    });
    const overlappingBlocks = existingBlocks.filter((blk) =>
      doTimeRangesOverlap(slot.start_time, slot.end_time, blk.start_time, blk.end_time)
    );

    let activeBlockRecord: any = null;
    let updatedSlot: FacilitySlotRecord = slot;

    if (input.blocked) {
      const activeBookings = await prisma.slotBooking.findMany({
        where: {
          facility_id: facility.id,
          booking_date: targetDateObj,
          status: { in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT] },
        },
      });
      const overlappingBookings = activeBookings.filter((b) =>
        doTimeRangesOverlap(slot.start_time, slot.end_time, b.start_time, b.end_time)
      );
      const overlappingConfirmed = overlappingBookings.filter(
        (b) => b.status === SlotBookingStatus.CONFIRMED
      );

      if (overlappingConfirmed.length > 0 && !input.force_override) {
        throw new AppError(
          `Cannot block slot: ${overlappingConfirmed.length} CONFIRMED booking(s) exist (${overlappingConfirmed.map((b) => b.booking_code).join(', ')}). Confirm override to cancel existing reservations.`,
          409,
          'CONFIRMED_BOOKING_CONFLICT',
          {
            conflicting_bookings: overlappingConfirmed.map((b) => ({
              id: b.id,
              booking_code: b.booking_code,
              start_time: formatDateToTime(b.start_time),
              end_time: formatDateToTime(b.end_time),
              status: b.status,
            })),
          }
        );
      }

      if (input.force_override) {
        for (const conflict of overlappingBookings) {
          await prisma.slotBooking.update({
            where: { id: conflict.id },
            data: { status: SlotBookingStatus.CANCELLED },
          });
        }
      }

      // Deactivate any prior overlapping block on this date to avoid duplicate active blocks
      for (const blk of overlappingBlocks) {
        await prisma.authorityBlock.update({
          where: { id: blk.id },
          data: { is_active: false },
        });
      }

      const resolvedReason =
        input.reason?.trim() ||
        (input.block_status === 'BLOCKED_MAINTENANCE'
          ? 'Scheduled facility maintenance'
          : 'Reserved for Kannur City Police department');

      activeBlockRecord = await db.authorityBlock.create({
        data: {
          facility_id: facility.id,
          block_date: targetDateObj,
          start_time: slot.start_time,
          end_time: slot.end_time,
          court_partition: slot.court_partition ?? CourtPartition.FULL,
          internal_reason: resolvedReason,
          block_type: input.block_status,
          created_by_officer_id: officer.id,
          is_active: true,
        },
      });

      if (slot.slot_date === targetDateStr) {
        updatedSlot = await slotDelegate.update({
          where: { id: slot.id },
          data: {
            status: input.block_status,
            block_reason: resolvedReason,
          },
        });
      }

      await recordAuditLog({
        officerId: officer.id,
        actionCategory: 'FACILITY_SLOT_BLOCKED',
        actionDescription: `Officer '${officer.username}' marked slot ${formatDateToTime(slot.start_time)}-${formatDateToTime(slot.end_time)} on '${facility.name}' (${targetDateStr}) as ${input.block_status}. Reason: ${resolvedReason}`,
        targetRefId: slot.id,
        details: {
          officer_username: officer.username,
          officer_role: officer.role,
          target_entity: 'SLOT',
          slot_id: slot.id,
          block_id: activeBlockRecord.id,
          facility_id: facility.id,
          facility_code: facility.code,
          facility_name: facility.name,
          date: targetDateStr,
          start_time: formatDateToTime(slot.start_time),
          end_time: formatDateToTime(slot.end_time),
          block_type: input.block_status,
          block_status: input.block_status,
          reason: resolvedReason,
          force_override: input.force_override,
        },
        ipAddress,
      });
    } else {
      const previousBlockType =
        overlappingBlocks.length > 0
          ? inferBlockType(overlappingBlocks[0])
          : slot.status !== 'OPEN'
            ? slot.status
            : null;
      const previousBlockReason =
        overlappingBlocks[0]?.internal_reason ?? slot.block_reason ?? null;

      for (const blk of overlappingBlocks) {
        await prisma.authorityBlock.update({
          where: { id: blk.id },
          data: { is_active: false },
        });
      }

      if (slot.status !== 'OPEN') {
        updatedSlot = await slotDelegate.update({
          where: { id: slot.id },
          data: { status: 'OPEN', block_reason: null },
        });
      }

      const unblockReason =
        input.reason?.trim() ||
        (previousBlockReason
          ? `Cleared block (${previousBlockReason}) and reopened slot.`
          : 'Time slot unblocked and reopened for bookings.');

      await recordAuditLog({
        officerId: officer.id,
        actionCategory: 'FACILITY_SLOT_UNBLOCKED',
        actionDescription: `Officer '${officer.username}' unblocked slot ${formatDateToTime(slot.start_time)}-${formatDateToTime(slot.end_time)} on '${facility.name}' (${targetDateStr}).`,
        targetRefId: slot.id,
        details: {
          officer_username: officer.username,
          officer_role: officer.role,
          target_entity: 'SLOT',
          slot_id: slot.id,
          facility_id: facility.id,
          facility_code: facility.code,
          facility_name: facility.name,
          date: targetDateStr,
          start_time: formatDateToTime(slot.start_time),
          end_time: formatDateToTime(slot.end_time),
          previous_block_type: previousBlockType,
          previous_reason: previousBlockReason,
          deactivated_blocks: overlappingBlocks.map((b) => b.id),
          reason: unblockReason,
        },
        ipAddress,
      });
    }

    const [dateBookings, dateBlocks] = await Promise.all([
      prisma.slotBooking.findMany({
        where: {
          facility_id: facility.id,
          booking_date: targetDateObj,
          status: { in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT] },
        },
        include: {
          user: { select: { id: true, username: true, full_name: true, role: true } },
        },
      }),
      prisma.authorityBlock.findMany({
        where: { facility_id: facility.id, block_date: targetDateObj, is_active: true },
      }),
    ]);

    return {
      slot: buildEnrichedFacilitySlot(updatedSlot, facility, dateBookings, dateBlocks),
      authority_block: activeBlockRecord,
    };
  }

  /**
   * DELETE /api/admin/facilities/:facilityId/slots/:slotId (`STAFF_ADMIN` only)
   * Deletes a time slot if and only if no active (CONFIRMED / PENDING_PAYMENT) bookings exist on it.
   */
  static async deleteFacilitySlot(
    facilityIdOrCode: string,
    slotId: string,
    officer: AuthenticatedUser,
    ipAddress: string,
    dateStr?: string
  ) {
    const facility = await findFacilityByIdOrCode(facilityIdOrCode);
    if (!facility) {
      throw new AppError(
        `Facility '${facilityIdOrCode}' not found.`,
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    const slotDelegate = getManagedSlotDelegate();
    const slot: FacilitySlotRecord | null = slotDelegate
      ? await slotDelegate.findUnique({ where: { id: slotId } })
      : null;

    if (!slot || slot.facility_id !== facility.id) {
      throw new AppError(`Time slot '${slotId}' not found.`, 404, 'SLOT_NOT_FOUND');
    }

    const activeFacilityBookings = await prisma.slotBooking.findMany({
      where: {
        facility_id: facility.id,
        status: {
          in: [SlotBookingStatus.CONFIRMED, SlotBookingStatus.PENDING_PAYMENT],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
    });

    const overlappingActiveBookings = activeFacilityBookings.filter((b) => {
      if (slot.slot_date && formatDateOnly(b.booking_date) !== slot.slot_date) {
        return false;
      }
      return doTimeRangesOverlap(slot.start_time, slot.end_time, b.start_time, b.end_time);
    });

    if (overlappingActiveBookings.length > 0) {
      throw new AppError(
        `Cannot delete time slot (${formatDateToTime(slot.start_time)} - ${formatDateToTime(slot.end_time)}): ${overlappingActiveBookings.length} active booking(s) exist (${overlappingActiveBookings.map((b) => b.booking_code).join(', ')}).`,
        409,
        'SLOT_HAS_ACTIVE_BOOKINGS',
        {
          active_bookings_count: overlappingActiveBookings.length,
          bookings: overlappingActiveBookings.map((b) => ({
            id: b.id,
            booking_code: b.booking_code,
            booking_date: formatDateOnly(b.booking_date),
            member_name: b.user?.full_name ?? b.user?.username ?? 'Portal Member',
            status: b.status,
          })),
        }
      );
    }

    await slotDelegate.delete({ where: { id: slot.id } });

    // Deactivate active blocks attached to the deleted slot window on target date (if any)
    const cleanupDateStr = slot.slot_date ?? dateStr ?? formatDateOnly(new Date());
    const cleanupDateObj = parseDateOnly(cleanupDateStr);
    const activeBlocks = await prisma.authorityBlock.findMany({
      where: {
        facility_id: facility.id,
        block_date: cleanupDateObj,
        is_active: true,
      },
    });
    for (const blk of activeBlocks) {
      if (doTimeRangesOverlap(slot.start_time, slot.end_time, blk.start_time, blk.end_time)) {
        await prisma.authorityBlock.update({
          where: { id: blk.id },
          data: { is_active: false },
        });
      }
    }

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'FACILITY_SLOT_DELETED',
      actionDescription: `Officer '${officer.username}' deleted time slot ${formatDateToTime(slot.start_time)}-${formatDateToTime(slot.end_time)} from '${facility.name}'.`,
      targetRefId: slot.id,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'SLOT',
        deleted_slot_id: slot.id,
        facility_id: facility.id,
        facility_code: facility.code,
        facility_name: facility.name,
        start_time: formatDateToTime(slot.start_time),
        end_time: formatDateToTime(slot.end_time),
        slot_date: slot.slot_date,
        reason: `Removed unbooked time slot ${formatDateToTime(slot.start_time)}-${formatDateToTime(slot.end_time)} from ${facility.name}.`,
      },
      ipAddress,
    });

    return {
      deleted_slot_id: slot.id,
      facility_id: facility.id,
    };
  }
}
