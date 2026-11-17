import {
  AccountStatus,
  FacilityCode,
  MembershipStatus,
  PaymentReferenceType,
  SessionWindow,
  SlotBookingStatus,
  VerificationType,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AuthenticatedUser } from '../../types/express';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLogger';
import {
  signOfflineCacheManifest,
  verifyQrTokenHash,
} from '../../utils/qrToken';
import {
  formatDateOnly,
  formatDateToTime,
  parseDateOnly,
  timeToMinutes,
} from '../../utils/time';
import {
  BatchSyncGateLogsInput,
  ManualOverrideInput,
  SyncCacheQuery,
  VerifyGateEntryInput,
} from './gate.schema';

/**
 * Helper to resolve default session window display bounds for Synthetic Track memberships.
 */
function getSessionWindowTimes(window: SessionWindow): {
  start_time: string;
  end_time: string;
} {
  switch (window) {
    case SessionWindow.MORNING:
      return { start_time: '05:00', end_time: '10:00' };
    case SessionWindow.EVENING:
      return { start_time: '15:00', end_time: '21:00' };
    case SessionWindow.BOTH:
    default:
      return { start_time: '05:00', end_time: '21:00' };
  }
}

export class GateService {
  /**
   * GET /api/gate/sync-cache (`GATE_OFFICER` or `STAFF_ADMIN`, optional `?facility=CODE`)
   * Returns a signed lightweight JSON manifest of all `ACTIVE` memberships and today's
   * `CONFIRMED` slot bookings so the gate browser can validate entries offline.
   */
  static async getOfflineSyncCache(query: SyncCacheQuery) {
    const todayDateStr = query.date ?? formatDateOnly(new Date());
    const targetDateObj = parseDateOnly(todayDateStr);

    let targetFacilityId: string | undefined;
    if (query.facility) {
      const fac = await prisma.facility.findUnique({
        where: { code: query.facility },
      });
      if (!fac) {
        throw new AppError(
          `Facility '${query.facility}' not found.`,
          404,
          'FACILITY_NOT_FOUND'
        );
      }
      targetFacilityId = fac.id;
    }

    const [activeMemberships, confirmedBookings] = await Promise.all([
      prisma.membership.findMany({
        where: {
          status: MembershipStatus.ACTIVE,
          ...(targetFacilityId ? { facility_id: targetFacilityId } : {}),
        },
        include: {
          facility: true,
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              role: true,
              account_status: true,
              profile_photo_url: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.slotBooking.findMany({
        where: {
          status: SlotBookingStatus.CONFIRMED,
          ...(targetFacilityId ? { facility_id: targetFacilityId } : {}),
          ...(query.date ? { booking_date: targetDateObj } : {}),
        },
        include: {
          facility: true,
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              role: true,
              account_status: true,
              profile_photo_url: true,
            },
          },
        },
        orderBy: [{ booking_date: 'asc' }, { start_time: 'asc' }],
      }),
    ]);

    // Filter out expired memberships or bookings before today (when no explicit date query was passed)
    const validMemberships = activeMemberships.filter((m) => {
      if (m.user && m.user.account_status !== AccountStatus.ACTIVE) return false;
      if (m.end_date && formatDateOnly(m.end_date) < todayDateStr) return false;
      return true;
    });

    const validBookings = confirmedBookings.filter((b) => {
      if (b.user && b.user.account_status !== AccountStatus.ACTIVE) return false;
      if (query.date) {
        return formatDateOnly(b.booking_date) === todayDateStr;
      }
      return formatDateOnly(b.booking_date) >= todayDateStr;
    });

    const membershipEntries = validMemberships.map((m) => {
      const facilityCode = m.facility?.code ?? FacilityCode.SYNTHETIC_TRACK;
      const windowTimes = getSessionWindowTimes(m.session_window);
      return {
        reference_type: PaymentReferenceType.MEMBERSHIP,
        pass_or_booking_code: m.pass_code,
        qr_token_hash: m.qr_token_hash,
        facility_code: facilityCode,
        user_id: m.user_id,
        user_full_name: m.user?.full_name ?? '',
        user_role: m.user?.role ?? 'PUBLIC',
        profile_photo_url: m.user?.profile_photo_url ?? null,
        session_window: m.session_window,
        start_time: windowTimes.start_time,
        end_time: windowTimes.end_time,
        valid_from: m.start_date ? formatDateOnly(m.start_date) : todayDateStr,
        valid_until: m.end_date ? formatDateOnly(m.end_date) : todayDateStr,
        requires_biometric: facilityCode === FacilityCode.SYNTHETIC_TRACK,
      };
    });

    const bookingEntries = validBookings.map((b) => {
      const facilityCode = b.facility?.code ?? FacilityCode.POLICE_TURF;
      const bookingDateFormatted = formatDateOnly(b.booking_date);
      return {
        reference_type: PaymentReferenceType.SLOT_BOOKING,
        pass_or_booking_code: b.booking_code,
        qr_token_hash: b.qr_token_hash,
        facility_code: facilityCode,
        user_id: b.user_id,
        user_full_name: b.user?.full_name ?? '',
        user_role: b.user?.role ?? 'PUBLIC',
        profile_photo_url: b.user?.profile_photo_url ?? null,
        session_window: null,
        start_time: formatDateToTime(b.start_time),
        end_time: formatDateToTime(b.end_time),
        valid_from: bookingDateFormatted,
        valid_until: bookingDateFormatted,
        court_partition: b.court_partition,
        requires_biometric: facilityCode === FacilityCode.SYNTHETIC_TRACK,
      };
    });

    const entries = [...membershipEntries, ...bookingEntries];
    const generatedAt = new Date().toISOString();

    const manifestPayload = {
      manifest_version: '1.0',
      generated_at: generatedAt,
      target_date: todayDateStr,
      facility_filter: query.facility ?? 'ALL',
      total_entries: entries.length,
      active_memberships_count: membershipEntries.length,
      confirmed_bookings_count: bookingEntries.length,
      entries,
    };

    const manifestSignature = signOfflineCacheManifest(manifestPayload);

    return {
      ...manifestPayload,
      manifest_signature: manifestSignature,
    };
  }

  /**
   * POST /api/gate/verify (`GATE_OFFICER` or `STAFF_ADMIN`)
   * Validates `qr_token` or `pass_or_booking_code`, facility match, active status,
   * and validity date/time window.
   * Enforces:
   * - SYNTHETIC_TRACK: 2-stage (`QR_AND_BIOMETRIC`) requiring both stage1_qr_passed && stage2_biometric_passed.
   * - FOOTBALL_GROUND, POLICE_TURF, BADMINTON_COURT: 1-stage (`QR_ONLY`) with stage2_biometric_passed = false.
   * Logs every attempt (granted or rejected) into `gate_logs`.
   */
  static async verifyGateEntry(
    officer: AuthenticatedUser,
    input: VerifyGateEntryInput
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

    const isSyntheticTrack = facility.code === FacilityCode.SYNTHETIC_TRACK;
    const verificationType = isSyntheticTrack
      ? VerificationType.QR_AND_BIOMETRIC
      : VerificationType.QR_ONLY;

    const scanTime = input.scan_timestamp ? new Date(input.scan_timestamp) : new Date();
    const scanDateStr = formatDateOnly(scanTime);

    // 1. Lookup target membership or slot booking by pass_or_booking_code or qr_token
    let matchedMembership: any = null;
    let matchedBooking: any = null;

    if (input.pass_or_booking_code) {
      matchedMembership = await prisma.membership.findUnique({
        where: { pass_code: input.pass_or_booking_code },
        include: {
          facility: true,
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              role: true,
              account_status: true,
              profile_photo_url: true,
            },
          },
        },
      });

      if (!matchedMembership) {
        matchedBooking = await prisma.slotBooking.findUnique({
          where: { booking_code: input.pass_or_booking_code },
          include: {
            facility: true,
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                role: true,
                account_status: true,
                profile_photo_url: true,
              },
            },
          },
        });
      }
    } else if (input.qr_token) {
      matchedMembership = await prisma.membership.findFirst({
        where: { qr_token_hash: input.qr_token },
        include: {
          facility: true,
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              role: true,
              account_status: true,
              profile_photo_url: true,
            },
          },
        },
      });

      if (!matchedMembership) {
        matchedBooking = await prisma.slotBooking.findFirst({
          where: { qr_token_hash: input.qr_token },
          include: {
            facility: true,
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                role: true,
                account_status: true,
                profile_photo_url: true,
              },
            },
          },
        });
      }
    }

    let stage1QrPassed = false;
    let failureReason: string | null = null;
    let resolvedUserId: string | null = null;
    let resolvedCode = input.pass_or_booking_code ?? input.qr_token ?? 'UNKNOWN_CODE';
    let holderSummary: any = null;

    if (!matchedMembership && !matchedBooking) {
      stage1QrPassed = false;
      failureReason = 'Invalid or unrecognized QR token / pass or booking code.';
    } else if (matchedMembership) {
      resolvedCode = matchedMembership.pass_code;
      resolvedUserId = matchedMembership.user_id;
      const memberFacilityCode =
        matchedMembership.facility?.code ?? FacilityCode.SYNTHETIC_TRACK;

      holderSummary = {
        reference_type: PaymentReferenceType.MEMBERSHIP,
        pass_or_booking_code: matchedMembership.pass_code,
        user_id: matchedMembership.user_id,
        full_name: matchedMembership.user?.full_name ?? null,
        username: matchedMembership.user?.username ?? null,
        role: matchedMembership.user?.role ?? null,
        profile_photo_url: matchedMembership.user?.profile_photo_url ?? null,
        session_window: matchedMembership.session_window,
        status: matchedMembership.status,
      };

      const tokenToVerify = input.qr_token ?? matchedMembership.qr_token_hash;
      const hasValidCryptoToken =
        Boolean(matchedMembership.qr_token_hash) &&
        tokenToVerify === matchedMembership.qr_token_hash &&
        verifyQrTokenHash(matchedMembership.qr_token_hash, {
          passOrBookingCode: matchedMembership.pass_code,
          userId: matchedMembership.user_id,
          facilityCode: memberFacilityCode,
        });

      if (input.stage1_qr_passed === false) {
        stage1QrPassed = false;
        failureReason = 'Stage 1 QR scan marked as failed by gate scanner.';
      } else if (matchedMembership.facility_id !== facility.id) {
        stage1QrPassed = false;
        failureReason = `Facility mismatch: pass '${matchedMembership.pass_code}' is issued for ${memberFacilityCode}, not ${facility.code}.`;
      } else if (matchedMembership.status !== MembershipStatus.ACTIVE) {
        stage1QrPassed = false;
        failureReason = `Membership '${matchedMembership.pass_code}' is not ACTIVE (current status: ${matchedMembership.status}).`;
      } else if (!hasValidCryptoToken) {
        stage1QrPassed = false;
        failureReason = 'Cryptographic QR token signature verification failed.';
      } else if (
        matchedMembership.user &&
        matchedMembership.user.account_status !== AccountStatus.ACTIVE
      ) {
        stage1QrPassed = false;
        failureReason = `Pass holder account status is ${matchedMembership.user.account_status}.`;
      } else if (
        (matchedMembership.start_date &&
          scanDateStr < formatDateOnly(matchedMembership.start_date)) ||
        (matchedMembership.end_date &&
          scanDateStr > formatDateOnly(matchedMembership.end_date))
      ) {
        stage1QrPassed = false;
        failureReason = `Membership pass '${matchedMembership.pass_code}' is outside its valid date window (${matchedMembership.start_date ? formatDateOnly(matchedMembership.start_date) : 'N/A'} to ${matchedMembership.end_date ? formatDateOnly(matchedMembership.end_date) : 'N/A'}).`;
      } else {
        stage1QrPassed = true;
      }
    } else if (matchedBooking) {
      resolvedCode = matchedBooking.booking_code;
      resolvedUserId = matchedBooking.user_id;
      const bookingFacilityCode =
        matchedBooking.facility?.code ?? FacilityCode.POLICE_TURF;
      const bookingDateStr = formatDateOnly(matchedBooking.booking_date);
      const bookingStartStr = formatDateToTime(matchedBooking.start_time);
      const bookingEndStr = formatDateToTime(matchedBooking.end_time);

      holderSummary = {
        reference_type: PaymentReferenceType.SLOT_BOOKING,
        pass_or_booking_code: matchedBooking.booking_code,
        user_id: matchedBooking.user_id,
        full_name: matchedBooking.user?.full_name ?? null,
        username: matchedBooking.user?.username ?? null,
        role: matchedBooking.user?.role ?? null,
        profile_photo_url: matchedBooking.user?.profile_photo_url ?? null,
        booking_date: bookingDateStr,
        start_time: bookingStartStr,
        end_time: bookingEndStr,
        court_partition: matchedBooking.court_partition,
        status: matchedBooking.status,
      };

      const tokenToVerify = input.qr_token ?? matchedBooking.qr_token_hash;
      const hasValidCryptoToken =
        Boolean(matchedBooking.qr_token_hash) &&
        tokenToVerify === matchedBooking.qr_token_hash &&
        verifyQrTokenHash(matchedBooking.qr_token_hash, {
          passOrBookingCode: matchedBooking.booking_code,
          userId: matchedBooking.user_id,
          facilityCode: bookingFacilityCode,
        });

      if (input.stage1_qr_passed === false) {
        stage1QrPassed = false;
        failureReason = 'Stage 1 QR scan marked as failed by gate scanner.';
      } else if (matchedBooking.facility_id !== facility.id) {
        stage1QrPassed = false;
        failureReason = `Facility mismatch: booking '${matchedBooking.booking_code}' is for ${bookingFacilityCode}, not ${facility.code}.`;
      } else if (matchedBooking.status !== SlotBookingStatus.CONFIRMED) {
        stage1QrPassed = false;
        failureReason = `Slot booking '${matchedBooking.booking_code}' is not CONFIRMED (current status: ${matchedBooking.status}).`;
      } else if (!hasValidCryptoToken) {
        stage1QrPassed = false;
        failureReason = 'Cryptographic QR token signature verification failed.';
      } else if (
        matchedBooking.user &&
        matchedBooking.user.account_status !== AccountStatus.ACTIVE
      ) {
        stage1QrPassed = false;
        failureReason = `Booking holder account status is ${matchedBooking.user.account_status}.`;
      } else if (bookingDateStr < scanDateStr) {
        stage1QrPassed = false;
        failureReason = `Slot booking '${matchedBooking.booking_code}' is for a past date (${bookingDateStr}).`;
      } else if (input.scan_timestamp) {
        // When an explicit scan_timestamp is provided, enforce exact date and time window
        const scanMins = timeToMinutes(formatDateToTime(scanTime));
        const slotStartMins = timeToMinutes(bookingStartStr);
        const slotEndMins = timeToMinutes(bookingEndStr);
        if (bookingDateStr !== scanDateStr || scanMins < slotStartMins || scanMins > slotEndMins) {
          stage1QrPassed = false;
          failureReason = `Scan timestamp is outside scheduled slot window (${bookingDateStr} ${bookingStartStr}-${bookingEndStr}).`;
        } else {
          stage1QrPassed = true;
        }
      } else {
        stage1QrPassed = true;
      }
    }

    // 2. Enforce Facility-Specific Verification Rules:
    //    - SYNTHETIC_TRACK: Requires BOTH stage1_qr_passed === true AND stage2_biometric_passed === true (QR_AND_BIOMETRIC)
    //    - FOOTBALL_GROUND, POLICE_TURF, BADMINTON_COURT: Grants entry immediately at stage1_qr_passed === true (QR_ONLY, stage2_biometric_passed = false)
    let stage2BiometricPassed = false;
    let accessGranted = false;

    if (isSyntheticTrack) {
      if (!stage1QrPassed) {
        stage2BiometricPassed = false;
        accessGranted = false;
      } else if (input.stage2_biometric_passed === true) {
        stage2BiometricPassed = true;
        accessGranted = true;
        failureReason = null;
      } else {
        stage2BiometricPassed = false;
        accessGranted = false;
        failureReason =
          'Biometric verification required for Synthetic Track: Stage 2 biometric check failed or was not completed.';
      }
    } else {
      // QR_ONLY facilities: FOOTBALL_GROUND, POLICE_TURF, BADMINTON_COURT
      stage2BiometricPassed = false;
      if (stage1QrPassed) {
        accessGranted = true;
        failureReason = null;
      } else {
        accessGranted = false;
      }
    }

    // 3. Log every attempt (granted or rejected) into `gate_logs`
    const gateLog = await prisma.gateLog.create({
      data: {
        facility_id: facility.id,
        gate_name: input.gate_name,
        user_id: resolvedUserId,
        pass_or_booking_code: resolvedCode,
        verification_type: verificationType,
        stage1_qr_passed: stage1QrPassed,
        stage2_biometric_passed: stage2BiometricPassed,
        access_granted: accessGranted,
        failure_or_override_reason: failureReason,
        verified_by_officer_id: officer.id,
        scanned_at: scanTime,
      },
      include: {
        facility: true,
        verified_by_officer: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
    });

    return {
      access_granted: accessGranted,
      verification_type: verificationType,
      stage1_qr_passed: stage1QrPassed,
      stage2_biometric_passed: stage2BiometricPassed,
      failure_or_override_reason: failureReason,
      holder: holderSummary,
      gate_log: gateLog,
    };
  }

  /**
   * POST /api/gate/manual-override (`GATE_OFFICER` or `STAFF_ADMIN`)
   * Grants manual gate entry during sensor/scanner failure with a mandatory `override_reason`,
   * recording to BOTH `gate_logs` (`verification_type = 'MANUAL_OVERRIDE'`) and immutable `audit_logs`.
   */
  static async manualOverride(
    officer: AuthenticatedUser,
    input: ManualOverrideInput,
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

    let resolvedUserId = input.user_id ?? null;

    if (!resolvedUserId) {
      const membership = await prisma.membership.findUnique({
        where: { pass_code: input.pass_or_booking_code },
        select: { user_id: true },
      });
      if (membership) {
        resolvedUserId = membership.user_id;
      } else {
        const booking = await prisma.slotBooking.findUnique({
          where: { booking_code: input.pass_or_booking_code },
          select: { user_id: true },
        });
        if (booking) {
          resolvedUserId = booking.user_id;
        }
      }
    }

    const gateLog = await prisma.gateLog.create({
      data: {
        facility_id: facility.id,
        gate_name: input.gate_name,
        user_id: resolvedUserId,
        pass_or_booking_code: input.pass_or_booking_code,
        verification_type: VerificationType.MANUAL_OVERRIDE,
        stage1_qr_passed: input.stage1_qr_passed,
        stage2_biometric_passed: input.stage2_biometric_passed,
        access_granted: true,
        failure_or_override_reason: input.override_reason,
        verified_by_officer_id: officer.id,
      },
      include: {
        facility: true,
        verified_by_officer: {
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
      actionCategory: 'GATE_MANUAL_OVERRIDE',
      actionDescription: `Officer '${officer.username}' granted MANUAL_OVERRIDE gate entry at ${facility.code} (${input.gate_name}) for '${input.pass_or_booking_code}'. Reason: ${input.override_reason}`,
      targetRefId: input.pass_or_booking_code,
      details: {
        gate_log_id: gateLog.id,
        facility_id: facility.id,
        facility_code: facility.code,
        gate_name: input.gate_name,
        pass_or_booking_code: input.pass_or_booking_code,
        user_id: resolvedUserId,
        verification_type: VerificationType.MANUAL_OVERRIDE,
        override_reason: input.override_reason,
      },
      ipAddress,
    });

    return {
      access_granted: true,
      verification_type: VerificationType.MANUAL_OVERRIDE,
      override_reason: input.override_reason,
      gate_log: gateLog,
    };
  }

  /**
   * POST /api/gate/batch-sync (`GATE_OFFICER` or `STAFF_ADMIN`)
   * Reconciles offline-queued gate scan logs when connectivity returns and writes them to `gate_logs`.
   */
  static async batchSyncLogs(
    officer: AuthenticatedUser,
    input: BatchSyncGateLogsInput,
    ipAddress: string
  ) {
    const createdLogs: any[] = [];

    for (const item of input.logs) {
      const facility = await prisma.facility.findUnique({
        where: { code: item.facility_code },
      });

      if (!facility) {
        throw new AppError(
          `Facility '${item.facility_code}' in batch-sync payload not found.`,
          404,
          'FACILITY_NOT_FOUND'
        );
      }

      let resolvedUserId = item.user_id ?? null;
      if (!resolvedUserId) {
        const membership = await prisma.membership.findUnique({
          where: { pass_code: item.pass_or_booking_code },
          select: { user_id: true },
        });
        if (membership) {
          resolvedUserId = membership.user_id;
        } else {
          const booking = await prisma.slotBooking.findUnique({
            where: { booking_code: item.pass_or_booking_code },
            select: { user_id: true },
          });
          if (booking) {
            resolvedUserId = booking.user_id;
          }
        }
      }

      const isSyntheticTrack = facility.code === FacilityCode.SYNTHETIC_TRACK;
      const resolvedVerificationType =
        item.verification_type ??
        (isSyntheticTrack
          ? VerificationType.QR_AND_BIOMETRIC
          : VerificationType.QR_ONLY);

      const resolvedStage2 =
        resolvedVerificationType === VerificationType.QR_ONLY
          ? false
          : item.stage2_biometric_passed;

      const resolvedAccessGranted =
        item.access_granted !== undefined
          ? item.access_granted
          : resolvedVerificationType === VerificationType.MANUAL_OVERRIDE
            ? true
            : isSyntheticTrack
              ? item.stage1_qr_passed && resolvedStage2
              : item.stage1_qr_passed;

      const created = await prisma.gateLog.create({
        data: {
          facility_id: facility.id,
          gate_name: item.gate_name,
          user_id: resolvedUserId,
          pass_or_booking_code: item.pass_or_booking_code,
          verification_type: resolvedVerificationType,
          stage1_qr_passed: item.stage1_qr_passed,
          stage2_biometric_passed: resolvedStage2,
          access_granted: resolvedAccessGranted,
          failure_or_override_reason: item.failure_or_override_reason ?? null,
          verified_by_officer_id: officer.id,
          scanned_at: item.scanned_at ? new Date(item.scanned_at) : new Date(),
        },
        include: {
          facility: true,
        },
      });

      createdLogs.push(created);
    }

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'GATE_OFFLINE_BATCH_SYNC',
      actionDescription: `Officer '${officer.username}' synchronized ${createdLogs.length} offline gate scan log(s).`,
      targetRefId: officer.id,
      details: {
        synced_count: createdLogs.length,
        codes: createdLogs.map((l) => l.pass_or_booking_code),
      },
      ipAddress,
    });

    return {
      synced_count: createdLogs.length,
      gate_logs: createdLogs,
    };
  }
}
