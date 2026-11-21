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
      const publicTariffByType = new Map<string, number>();
      for (const t of facility.tariffs) {
        if (t.user_category === UserCategory.PUBLIC) {
          publicTariffByType.set(t.booking_type, Number(t.base_price));
        }
      }

      const categoryTariffs = facility.tariffs
        .filter((t) => t.user_category === userCategory)
        .map((t) => {
          const basePrice = Math.round(Number(t.base_price) * 100) / 100;
          const standardBasePrice =
            userCategory === UserCategory.GOVT_PERSONNEL &&
            publicTariffByType.has(t.booking_type) &&
            (publicTariffByType.get(t.booking_type) ?? 0) > basePrice
              ? Math.round((publicTariffByType.get(t.booking_type) ?? basePrice) * 100) / 100
              : basePrice;
          const concessionDiscount = Math.max(
            0,
            Math.round((standardBasePrice - basePrice) * 100) / 100
          );
          const concessionPercent =
            standardBasePrice > 0 && concessionDiscount > 0
              ? Math.round((concessionDiscount / standardBasePrice) * 1000) / 10
              : 0;
          const gstPercent = Number(t.gst_percent);
          const gstAmount = Math.round(basePrice * (gstPercent / 100) * 100) / 100;
          const totalPrice = Math.round((basePrice + gstAmount) * 100) / 100;

          return {
            id: t.id,
            user_category: t.user_category,
            booking_type: t.booking_type,
            base_price: basePrice.toFixed(2),
            standard_base_price: standardBasePrice.toFixed(2),
            concession_discount: concessionDiscount.toFixed(2),
            concession_percent: concessionPercent,
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
        category: (facility as any).category ?? null,
        court_count: (facility as any).court_count ?? null,
        court_unit_label: (facility as any).court_unit_label ?? null,
        operational_status: (facility as any).operational_status ?? 'ACTIVE',
        max_capacity_per_slot: (facility as any).max_capacity_per_slot ?? null,
        description: (facility as any).description ?? null,
        operating_start: formatDateToTime(facility.operating_start),
        operating_end: formatDateToTime(facility.operating_end),
        slot_duration_mins: facility.slot_duration_mins,
        daily_user_hour_cap: facility.daily_user_hour_cap,
        monthly_member_cap: facility.monthly_member_cap,
        is_partitionable: facility.is_partitionable,
        booking_mode:
          (facility as any).booking_mode ??
          (facility.code === FacilityCode.SYNTHETIC_TRACK
            ? 'MONTHLY_MEMBERSHIP_ONLY'
            : 'HOURLY_SLOTS'),
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
   * Member/public slot availability endpoint for a facility on `dateStr`.
   * - Syncs live facility operational status (`ACTIVE`, `MAINTENANCE`, `CLOSED`) and
   *   managed Admin slot controls (`BLOCKED_MAINTENANCE`, `RESERVED_DEPARTMENT`).
   * - Preserves strict confidential masking for uncategorized authority blocks created
   *   via legacy `/api/admin/slots/block` (returns ONLY `ALREADY_BOOKED` with zero internal_reason leak).
   */
  static async getPublicFacilitySlots(facilityCode: string, dateStr: string) {
    const targetDate = parseDateOnly(dateStr);

    const facility = await prisma.facility.findUnique({
      where: { code: facilityCode as FacilityCode },
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
      }),
    ]);

    const startMins = timeToMinutes(formatDateToTime(facility.operating_start));
    const endMins = timeToMinutes(formatDateToTime(facility.operating_end));
    const stepMins = facility.slot_duration_mins || 60;
    const facilityOperationalStatus: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED' =
      (facility as any).operational_status === 'MAINTENANCE' ||
      (facility as any).operational_status === 'CLOSED'
        ? (facility as any).operational_status
        : 'ACTIVE';
    const isFacilityClosedOrMaintenance = facilityOperationalStatus !== 'ACTIVE';

    const applicablePartitions = facility.is_partitionable
      ? [CourtPartition.FULL, CourtPartition.HALF_A, CourtPartition.HALF_B]
      : [CourtPartition.FULL];

    const slotDelegate = (prisma as any).facilitySlot;
    let slotWindows: Array<{
      start_time: string;
      end_time: string;
      baseStatus: 'OPEN' | 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT';
      blockReason: string | null;
    }> = [];

    if (slotDelegate && typeof slotDelegate.findMany === 'function') {
      const managedSlots: any[] = await slotDelegate.findMany({
        where: { facility_id: facility.id },
        orderBy: { start_time: 'asc' },
      });
      slotWindows = managedSlots
        .filter((s) => s.slot_date === null || s.slot_date === dateStr)
        .map((s) => ({
          start_time: formatDateToTime(s.start_time),
          end_time: formatDateToTime(s.end_time),
          baseStatus:
            s.status === 'BLOCKED_MAINTENANCE' || s.status === 'RESERVED_DEPARTMENT'
              ? s.status
              : 'OPEN',
          blockReason: s.block_reason ?? null,
        }));
    } else {
      for (let current = startMins; current + stepMins <= endMins; current += stepMins) {
        slotWindows.push({
          start_time: minutesToTime(current),
          end_time: minutesToTime(current + stepMins),
          baseStatus: 'OPEN',
          blockReason: null,
        });
      }
    }

    type PartitionOperationalStatus =
      | 'OPEN'
      | 'BOOKED'
      | 'BLOCKED_MAINTENANCE'
      | 'RESERVED_DEPARTMENT'
      | 'FACILITY_MAINTENANCE'
      | 'FACILITY_CLOSED';

    const labelForOperationalStatus = (st: PartitionOperationalStatus): string | null => {
      switch (st) {
        case 'BLOCKED_MAINTENANCE':
          return 'Blocked for Maintenance';
        case 'RESERVED_DEPARTMENT':
          return 'Reserved for Department';
        case 'FACILITY_MAINTENANCE':
          return 'Venue Under Maintenance';
        case 'FACILITY_CLOSED':
          return 'Venue Closed';
        default:
          return null;
      }
    };

    const slots = [];

    for (const win of slotWindows) {
      const slotStartStr = win.start_time;
      const slotEndStr = win.end_time;
      const slotStartDate = parseTimeToDate(slotStartStr);
      const slotEndDate = parseTimeToDate(slotEndStr);

      const partitionsMap: Record<
        string,
        {
          partition: CourtPartition;
          status: 'AVAILABLE' | 'ALREADY_BOOKED';
          operational_status: PartitionOperationalStatus;
          operational_label: string | null;
          operational_reason: string | null;
        }
      > = {};

      for (const partition of applicablePartitions) {
        const conflictingSet = getConflictingPartitions(partition);

        const hasBookingConflict = activeBookings.some(
          (b) =>
            conflictingSet.includes(b.court_partition) &&
            doTimeRangesOverlap(slotStartDate, slotEndDate, b.start_time, b.end_time)
        );

        const matchingBlock = activeBlocks.find(
          (blk) =>
            conflictingSet.includes(blk.court_partition) &&
            doTimeRangesOverlap(slotStartDate, slotEndDate, blk.start_time, blk.end_time)
        );

        const managedBlockType =
          matchingBlock &&
          ((matchingBlock as any).block_type === 'BLOCKED_MAINTENANCE' ||
            (matchingBlock as any).block_type === 'RESERVED_DEPARTMENT')
            ? ((matchingBlock as any).block_type as 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT')
            : null;

        let operationalStatus: PartitionOperationalStatus = 'OPEN';
        let operationalReason: string | null = null;

        if (isFacilityClosedOrMaintenance) {
          operationalStatus =
            facilityOperationalStatus === 'MAINTENANCE'
              ? 'FACILITY_MAINTENANCE'
              : 'FACILITY_CLOSED';
        } else if (managedBlockType) {
          operationalStatus = managedBlockType;
          operationalReason =
            typeof (matchingBlock as any).internal_reason === 'string' &&
            (matchingBlock as any).internal_reason.trim().length > 0
              ? (matchingBlock as any).internal_reason.trim()
              : labelForOperationalStatus(managedBlockType);
        } else if (
          win.baseStatus === 'BLOCKED_MAINTENANCE' ||
          win.baseStatus === 'RESERVED_DEPARTMENT'
        ) {
          operationalStatus = win.baseStatus;
          operationalReason = win.blockReason || labelForOperationalStatus(win.baseStatus);
        } else if (hasBookingConflict || Boolean(matchingBlock)) {
          // Legacy uncategorized authority blocks remain strictly masked as BOOKED / ALREADY_BOOKED
          operationalStatus = 'BOOKED';
        }

        const isUnavailable = operationalStatus !== 'OPEN';

        partitionsMap[partition] = {
          partition,
          status: isUnavailable ? 'ALREADY_BOOKED' : 'AVAILABLE',
          operational_status: operationalStatus,
          operational_label: labelForOperationalStatus(operationalStatus),
          operational_reason: operationalReason,
        };
      }

      const allPartitionsUnavailable = applicablePartitions.every(
        (p) => partitionsMap[p].status === 'ALREADY_BOOKED'
      );

      const fullPartitionEntry = partitionsMap[CourtPartition.FULL] ?? partitionsMap[applicablePartitions[0]];
      let slotOperationalStatus: PartitionOperationalStatus = 'OPEN';
      let slotOperationalReason: string | null = null;

      if (allPartitionsUnavailable) {
        slotOperationalStatus = fullPartitionEntry.operational_status;
        slotOperationalReason = fullPartitionEntry.operational_reason;
      }

      slots.push({
        start_time: slotStartStr,
        end_time: slotEndStr,
        status: allPartitionsUnavailable ? ('ALREADY_BOOKED' as const) : ('AVAILABLE' as const),
        operational_status: slotOperationalStatus,
        operational_label: labelForOperationalStatus(slotOperationalStatus),
        operational_reason: slotOperationalReason,
        partitions: partitionsMap,
      });
    }

    return {
      facility: {
        id: facility.id,
        code: facility.code,
        name: facility.name,
        category: (facility as any).category ?? null,
        court_count: (facility as any).court_count ?? null,
        operational_status: facilityOperationalStatus,
        booking_mode:
          (facility as any).booking_mode ??
          (facility.code === FacilityCode.SYNTHETIC_TRACK
            ? 'MONTHLY_MEMBERSHIP_ONLY'
            : 'HOURLY_SLOTS'),
        description: (facility as any).description ?? null,
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
  static async getAdminFacilitySlots(facilityCode: string, dateStr: string) {
    const targetDate = parseDateOnly(dateStr);

    const facility = await prisma.facility.findUnique({
      where: { code: facilityCode as FacilityCode },
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
