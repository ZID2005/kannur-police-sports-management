import {
  AccountStatus,
  CourtPartition,
  FacilityCode,
  PaymentMode,
  PaymentReferenceType,
  PaymentStatus,
  SlotBookingStatus,
  UserCategory,
  UserRole,
  VerificationType,
} from '@prisma/client';
import { prisma } from '../../config/database';
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
  AdminGateLogsQuery,
  CreateAuthorityBlockInput,
  FinancialReportQuery,
  UpdateUserStatusInput,
} from './admin.schema';

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
        block_id: createdBlock.id,
        facility_code: facility.code,
        block_date: input.block_date,
        start_time: input.start_time,
        end_time: resolvedEndTimeStr,
        court_partition: requestedPartition,
        internal_reason: input.internal_reason,
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
        block_id: existingBlock.id,
        facility_id: existingBlock.facility_id,
        facility_code: existingBlock.facility?.code ?? null,
        block_date: formatDateOnly(existingBlock.block_date),
        start_time: formatDateToTime(existingBlock.start_time),
        end_time: formatDateToTime(existingBlock.end_time),
        court_partition: existingBlock.court_partition,
        internal_reason: existingBlock.internal_reason,
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
        target_user_id: targetUser.id,
        username: targetUser.username,
        previous_status: previousStatus,
        new_status: input.account_status,
        ban_reason: input.ban_reason,
      },
      ipAddress,
    });

    return { user: updatedUser };
  }

  /**
   * GET /api/admin/gate-logs (`STAFF_ADMIN` or `GATE_OFFICER`)
   * Filterable gate telemetry & manual override logs.
   */
  static async listGateLogs(query: AdminGateLogsQuery) {
    let targetFacilityId: string | undefined;
    if (query.facility_code) {
      const fac = await prisma.facility.findUnique({
        where: { code: query.facility_code },
      });
      if (!fac) {
        throw new AppError(
          `Facility '${query.facility_code}' not found.`,
          404,
          'FACILITY_NOT_FOUND'
        );
      }
      targetFacilityId = fac.id;
    }

    const allLogs = await prisma.gateLog.findMany({
      where: {
        ...(targetFacilityId ? { facility_id: targetFacilityId } : {}),
        ...(query.verification_type
          ? { verification_type: query.verification_type }
          : {}),
        ...(query.access_granted !== undefined
          ? { access_granted: query.access_granted }
          : {}),
      },
      include: {
        facility: true,
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            role: true,
          },
        },
        verified_by_officer: {
          select: {
            id: true,
            username: true,
            full_name: true,
            role: true,
          },
        },
      },
      orderBy: { scanned_at: 'desc' },
    });

    const fromTimestamp = query.from_date
      ? new Date(`${query.from_date}T00:00:00.000Z`).getTime()
      : null;
    const toTimestamp = query.to_date
      ? new Date(`${query.to_date}T23:59:59.999Z`).getTime()
      : null;

    const filtered = allLogs.filter((log) => {
      if (
        query.pass_or_booking_code &&
        log.pass_or_booking_code.toLowerCase() !==
          query.pass_or_booking_code.toLowerCase()
      ) {
        return false;
      }
      const scannedMs = new Date(log.scanned_at).getTime();
      if (fromTimestamp !== null && scannedMs < fromTimestamp) return false;
      if (toTimestamp !== null && scannedMs > toTimestamp) return false;
      return true;
    });

    const summary = {
      total_scans: filtered.length,
      granted_count: filtered.filter((l) => l.access_granted).length,
      rejected_count: filtered.filter((l) => !l.access_granted).length,
      manual_override_count: filtered.filter(
        (l) => l.verification_type === VerificationType.MANUAL_OVERRIDE
      ).length,
      biometric_verified_count: filtered.filter((l) => l.stage2_biometric_passed).length,
    };

    const totalRecords = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
    const offset = (query.page - 1) * query.limit;
    const paginated = filtered.slice(offset, offset + query.limit);

    return {
      summary,
      pagination: {
        page: query.page,
        limit: query.limit,
        total_records: totalRecords,
        total_pages: totalPages,
      },
      gate_logs: paginated,
    };
  }

  /**
   * GET /api/admin/audit-logs (`STAFF_ADMIN` only)
   * Paginated, filterable query of the immutable `audit_logs` ledger (supports `?format=csv` export).
   */
  static async listAuditLogs(query: AdminAuditLogsQuery) {
    const allAuditLogs = await prisma.auditLog.findMany({
      where: {
        ...(query.action_category ? { action_category: query.action_category } : {}),
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

    const fromTimestamp = query.from_date
      ? new Date(`${query.from_date}T00:00:00.000Z`).getTime()
      : null;
    const toTimestamp = query.to_date
      ? new Date(`${query.to_date}T23:59:59.999Z`).getTime()
      : null;

    const filtered = allAuditLogs.filter((log) => {
      const createdMs = new Date(log.created_at).getTime();
      if (fromTimestamp !== null && createdMs < fromTimestamp) return false;
      if (toTimestamp !== null && createdMs > toTimestamp) return false;

      if (query.search) {
        const q = query.search.toLowerCase();
        const matchesDesc = log.action_description.toLowerCase().includes(q);
        const matchesCat = log.action_category.toLowerCase().includes(q);
        const matchesRef = (log.target_ref_id ?? '').toLowerCase().includes(q);
        const matchesOfficer = (log.officer?.username ?? '').toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesRef && !matchesOfficer) {
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
          escapeCsvCell(l.officer?.username ?? ''),
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

    const totalRecords = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / query.limit));
    const offset = (query.page - 1) * query.limit;
    const paginated = filtered.slice(offset, offset + query.limit);

    return {
      format: 'json' as const,
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
}
