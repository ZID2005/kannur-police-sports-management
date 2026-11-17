import crypto from 'crypto';
import {
  BookingType,
  FacilityCode,
  MembershipStatus,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AuthenticatedUser } from '../../types/express';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLogger';
import {
  AdminMembershipFilterQuery,
  ApplyMembershipInput,
  ReviewMembershipInput,
} from './memberships.schema';

const SYNTHETIC_TRACK_DEFAULT_CAP = 300;

/**
 * Generates a unique pass code in the format:
 * - PUBLIC: `KCP-PUB-2026-XXXX`
 * - GOVT_PERSONNEL: `KCP-GOV-2026-XXXX`
 */
async function generateUniquePassCode(role: UserRole): Promise<string> {
  const prefix = role === UserRole.GOVT_PERSONNEL ? 'KCP-GOV-2026' : 'KCP-PUB-2026';

  for (let attempt = 0; attempt < 20; attempt++) {
    const randomSuffix = crypto.randomInt(1000, 10000).toString();
    const candidate = `${prefix}-${randomSuffix}`;
    const existing = await prisma.membership.findUnique({
      where: { pass_code: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  const fallbackHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${fallbackHex}`;
}

/**
 * Computes the tariff breakdown (`base_price * duration_months` + 18% GST)
 * for a Synthetic Track membership.
 */
function calculateMembershipFee(
  basePriceDecimal: unknown,
  gstPercentDecimal: unknown,
  durationMonths: number
) {
  const monthlyBasePrice = Number(basePriceDecimal ?? 500);
  const gstPercent = Number(gstPercentDecimal ?? 18);
  const baseTotal = Math.round(monthlyBasePrice * durationMonths * 100) / 100;
  const gstAmount = Math.round(baseTotal * (gstPercent / 100) * 100) / 100;
  const totalAmount = Math.round((baseTotal + gstAmount) * 100) / 100;

  return {
    monthly_base_price: monthlyBasePrice.toFixed(2),
    duration_months: durationMonths,
    base_amount: baseTotal.toFixed(2),
    gst_percent: gstPercent.toFixed(2),
    gst_amount: gstAmount.toFixed(2),
    total_amount: totalAmount.toFixed(2),
  };
}

/**
 * Builds a structured status timeline for a membership dossier.
 */
function buildStatusTimeline(membership: {
  status: MembershipStatus;
  created_at: Date;
  reviewed_by_officer_id: string | null;
  officer_remarks: string | null;
  start_date: Date | null;
  end_date: Date | null;
}) {
  const steps = [
    {
      stage: 'APPLICATION_SUBMITTED',
      completed: true,
      timestamp: membership.created_at,
      description: 'Application submitted for officer verification.',
    },
    {
      stage: 'OFFICER_VERIFICATION',
      completed:
        membership.status !== MembershipStatus.PENDING_APPROVAL ||
        Boolean(membership.officer_remarks),
      status: membership.status,
      officer_remarks: membership.officer_remarks,
      description:
        membership.status === MembershipStatus.PENDING_APPROVAL
          ? membership.officer_remarks
            ? `Revision requested by officer: ${membership.officer_remarks}`
            : 'Awaiting review by Kannur City Police Sports Administration.'
          : `Reviewed with status: ${membership.status}`,
    },
    {
      stage: 'PAYMENT_UNLOCK',
      completed:
        membership.status === MembershipStatus.APPROVED_UNPAID ||
        membership.status === MembershipStatus.ACTIVE,
      payment_locked:
        membership.status !== MembershipStatus.APPROVED_UNPAID &&
        membership.status !== MembershipStatus.ACTIVE,
      description:
        membership.status === MembershipStatus.APPROVED_UNPAID
          ? 'Approved by officer. Payment is unlocked and awaiting settlement.'
          : membership.status === MembershipStatus.ACTIVE
            ? 'Payment settled and pass activated.'
            : 'Payment remains locked until officer approval.',
    },
  ];

  return steps;
}

export class MembershipsService {
  /**
   * POST /api/memberships/apply
   * Applies for a Synthetic Track membership (1 to 6 months).
   */
  static async applyForMembership(user: AuthenticatedUser, input: ApplyMembershipInput) {
    if (user.role !== UserRole.PUBLIC && user.role !== UserRole.GOVT_PERSONNEL) {
      throw new AppError(
        "Only 'PUBLIC' and 'GOVT_PERSONNEL' users can apply for Synthetic Track memberships.",
        403,
        'INELIGIBLE_ROLE_FOR_MEMBERSHIP'
      );
    }

    if (user.role === UserRole.GOVT_PERSONNEL && !input.govt_service_proof_url) {
      throw new AppError(
        'Government personnel applicants must provide a valid govt_service_proof_url document link for concession verification.',
        400,
        'GOVT_SERVICE_PROOF_REQUIRED'
      );
    }

    const facility = await prisma.facility.findUnique({
      where: { code: FacilityCode.SYNTHETIC_TRACK },
    });

    if (!facility) {
      throw new AppError(
        'Synthetic Track facility record not found.',
        404,
        'FACILITY_NOT_FOUND'
      );
    }

    // 1. Prevent duplicate open applications (PENDING_APPROVAL, APPROVED_UNPAID, or ACTIVE) for the same user
    const existingOpenMembership = await prisma.membership.findFirst({
      where: {
        user_id: user.id,
        facility_id: facility.id,
        status: {
          in: [
            MembershipStatus.PENDING_APPROVAL,
            MembershipStatus.APPROVED_UNPAID,
            MembershipStatus.ACTIVE,
          ],
        },
      },
    });

    if (existingOpenMembership) {
      throw new AppError(
        `You already have an open Synthetic Track membership application or active pass (${existingOpenMembership.pass_code} — status: ${existingOpenMembership.status}).`,
        409,
        'DUPLICATE_OPEN_MEMBERSHIP'
      );
    }

    // 2. Check active capacity: count memberships with status IN ('ACTIVE', 'APPROVED_UNPAID')
    const memberCap = facility.monthly_member_cap ?? SYNTHETIC_TRACK_DEFAULT_CAP;
    const activeOrApprovedCount = await prisma.membership.count({
      where: {
        facility_id: facility.id,
        status: {
          in: [MembershipStatus.ACTIVE, MembershipStatus.APPROVED_UNPAID],
        },
      },
    });

    if (activeOrApprovedCount >= memberCap) {
      throw new AppError(
        `Synthetic Track monthly membership capacity (${memberCap} active/approved members) has been reached. Applications are currently paused.`,
        409,
        'CAPACITY_FULL'
      );
    }

    // 3. Lookup tariff for user category
    const userCategory =
      user.role === UserRole.GOVT_PERSONNEL ? UserCategory.GOVT_PERSONNEL : UserCategory.PUBLIC;

    const tariff = await prisma.tariff.findUnique({
      where: {
        uq_tariff_facility_category_type: {
          facility_id: facility.id,
          user_category: userCategory,
          booking_type: BookingType.MONTHLY_PASS,
        },
      },
    });

    const passCode = await generateUniquePassCode(user.role);

    const createdMembership = await prisma.membership.create({
      data: {
        pass_code: passCode,
        user_id: user.id,
        facility_id: facility.id,
        duration_months: input.duration_months,
        session_window: input.session_window,
        govt_service_proof_url: input.govt_service_proof_url ?? null,
        status: MembershipStatus.PENDING_APPROVAL,
      },
      include: {
        facility: true,
      },
    });

    const feeCalculation = calculateMembershipFee(
      tariff?.base_price ?? (userCategory === UserCategory.GOVT_PERSONNEL ? '250.00' : '500.00'),
      tariff?.gst_percent ?? '18.00',
      createdMembership.duration_months
    );

    return {
      membership: {
        ...createdMembership,
        payment_locked: true,
        calculated_tariff: feeCalculation,
        status_timeline: buildStatusTimeline(createdMembership),
      },
    };
  }

  /**
   * GET /api/memberships/my
   * Returns the logged-in user's memberships, status timeline, and calculated tariff fee.
   */
  static async getMyMemberships(user: AuthenticatedUser) {
    const userCategory =
      user.role === UserRole.GOVT_PERSONNEL ? UserCategory.GOVT_PERSONNEL : UserCategory.PUBLIC;

    const memberships = await prisma.membership.findMany({
      where: { user_id: user.id },
      include: {
        facility: true,
        reviewed_by_officer: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const enriched = await Promise.all(
      memberships.map(async (m) => {
        const tariff = await prisma.tariff.findUnique({
          where: {
            uq_tariff_facility_category_type: {
              facility_id: m.facility_id,
              user_category: userCategory,
              booking_type: BookingType.MONTHLY_PASS,
            },
          },
        });

        const fee = calculateMembershipFee(
          tariff?.base_price ?? (userCategory === UserCategory.GOVT_PERSONNEL ? '250.00' : '500.00'),
          tariff?.gst_percent ?? '18.00',
          m.duration_months
        );

        return {
          ...m,
          payment_locked: m.status !== MembershipStatus.APPROVED_UNPAID,
          payment_unlocked: m.status === MembershipStatus.APPROVED_UNPAID,
          calculated_tariff: fee,
          status_timeline: buildStatusTimeline(m),
        };
      })
    );

    return { memberships: enriched };
  }

  /**
   * GET /api/admin/memberships (`STAFF_ADMIN` only)
   * Filterable dossier queue with applicant profile, service proof URL, and status.
   */
  static async listAdminMemberships(filters: AdminMembershipFilterQuery) {
    const allMemberships = await prisma.membership.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.session_window ? { session_window: filters.session_window } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
            role: true,
            account_status: true,
            profile_photo_url: true,
          },
        },
        facility: true,
        reviewed_by_officer: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Apply role & text search filters cleanly (compatible with both SQL and in-memory test stores)
    const filtered = allMemberships.filter((m) => {
      if (filters.role && m.user?.role !== filters.role) {
        return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesCode = m.pass_code.toLowerCase().includes(q);
        const matchesUsername = m.user?.username.toLowerCase().includes(q) ?? false;
        const matchesName = m.user?.full_name.toLowerCase().includes(q) ?? false;
        if (!matchesCode && !matchesUsername && !matchesName) {
          return false;
        }
      }
      return true;
    });

    const facility = await prisma.facility.findUnique({
      where: { code: FacilityCode.SYNTHETIC_TRACK },
    });

    const activeCount = facility
      ? await prisma.membership.count({
          where: {
            facility_id: facility.id,
            status: {
              in: [MembershipStatus.ACTIVE, MembershipStatus.APPROVED_UNPAID],
            },
          },
        })
      : 0;

    const memberCap = facility?.monthly_member_cap ?? SYNTHETIC_TRACK_DEFAULT_CAP;

    return {
      capacity: {
        active_and_approved_count: activeCount,
        monthly_member_cap: memberCap,
        remaining_slots: Math.max(0, memberCap - activeCount),
      },
      memberships: filtered,
    };
  }

  /**
   * GET /api/admin/memberships/:id (`STAFF_ADMIN` only)
   * Returns a single membership dossier with applicant profile and service proof URL.
   */
  static async getAdminMembershipById(membershipId: string) {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
            role: true,
            account_status: true,
            profile_photo_url: true,
          },
        },
        facility: true,
        reviewed_by_officer: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
    });

    if (!membership) {
      throw new AppError(
        `Membership dossier '${membershipId}' not found.`,
        404,
        'MEMBERSHIP_NOT_FOUND'
      );
    }

    const userCategory =
      membership.user?.role === UserRole.GOVT_PERSONNEL
        ? UserCategory.GOVT_PERSONNEL
        : UserCategory.PUBLIC;

    const tariff = await prisma.tariff.findUnique({
      where: {
        uq_tariff_facility_category_type: {
          facility_id: membership.facility_id,
          user_category: userCategory,
          booking_type: BookingType.MONTHLY_PASS,
        },
      },
    });

    const calculatedTariff = calculateMembershipFee(
      tariff?.base_price ?? (userCategory === UserCategory.GOVT_PERSONNEL ? '250.00' : '500.00'),
      tariff?.gst_percent ?? '18.00',
      membership.duration_months
    );

    return {
      membership: {
        ...membership,
        calculated_tariff: calculatedTariff,
        status_timeline: buildStatusTimeline(membership),
      },
    };
  }

  /**
   * POST /api/admin/memberships/:id/review (`STAFF_ADMIN` only)
   * Actions: APPROVE, REJECT, REQUEST_REVISION, SUSPEND.
   * Requires non-empty officer_remarks and writes an immutable entry to `audit_logs`.
   */
  static async reviewMembership(
    membershipId: string,
    officer: AuthenticatedUser,
    input: ReviewMembershipInput,
    ipAddress: string
  ) {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        facility: true,
      },
    });

    if (!membership) {
      throw new AppError(
        `Membership application '${membershipId}' not found.`,
        404,
        'MEMBERSHIP_NOT_FOUND'
      );
    }

    const previousStatus = membership.status;
    let nextStatus: MembershipStatus;

    switch (input.action) {
      case 'APPROVE': {
        if (membership.status !== MembershipStatus.PENDING_APPROVAL) {
          throw new AppError(
            `Cannot APPROVE membership in '${membership.status}' state. Only 'PENDING_APPROVAL' applications can be approved.`,
            400,
            'INVALID_MEMBERSHIP_TRANSITION'
          );
        }

        // Re-verify 300-member capacity before unlocking APPROVED_UNPAID
        const memberCap =
          membership.facility?.monthly_member_cap ?? SYNTHETIC_TRACK_DEFAULT_CAP;
        const activeOrApprovedCount = await prisma.membership.count({
          where: {
            facility_id: membership.facility_id,
            status: {
              in: [MembershipStatus.ACTIVE, MembershipStatus.APPROVED_UNPAID],
            },
          },
        });

        if (activeOrApprovedCount >= memberCap) {
          throw new AppError(
            `Cannot approve membership: Synthetic Track capacity of ${memberCap} active/approved members is full.`,
            409,
            'CAPACITY_FULL'
          );
        }

        nextStatus = MembershipStatus.APPROVED_UNPAID;
        break;
      }

      case 'REJECT': {
        if (
          membership.status !== MembershipStatus.PENDING_APPROVAL &&
          membership.status !== MembershipStatus.APPROVED_UNPAID
        ) {
          throw new AppError(
            `Cannot REJECT membership in '${membership.status}' state.`,
            400,
            'INVALID_MEMBERSHIP_TRANSITION'
          );
        }
        nextStatus = MembershipStatus.REJECTED;
        break;
      }

      case 'REQUEST_REVISION': {
        if (membership.status !== MembershipStatus.PENDING_APPROVAL) {
          throw new AppError(
            `Cannot REQUEST_REVISION for membership in '${membership.status}' state.`,
            400,
            'INVALID_MEMBERSHIP_TRANSITION'
          );
        }
        nextStatus = MembershipStatus.PENDING_APPROVAL;
        break;
      }

      case 'SUSPEND': {
        if (membership.status === MembershipStatus.REJECTED) {
          throw new AppError(
            `Cannot SUSPEND a rejected membership application.`,
            400,
            'INVALID_MEMBERSHIP_TRANSITION'
          );
        }
        nextStatus = MembershipStatus.SUSPENDED;
        break;
      }
    }

    const updatedMembership = await prisma.membership.update({
      where: { id: membership.id },
      data: {
        status: nextStatus,
        reviewed_by_officer_id: officer.id,
        officer_remarks: input.officer_remarks,
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
        reviewed_by_officer: {
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
      actionCategory: 'MEMBERSHIP_REVIEW',
      actionDescription: `Officer '${officer.username}' executed '${input.action}' on Synthetic Track membership '${membership.pass_code}' (${previousStatus} -> ${nextStatus}). Remarks: ${input.officer_remarks}`,
      targetRefId: membership.pass_code,
      details: {
        membership_id: membership.id,
        pass_code: membership.pass_code,
        applicant_user_id: membership.user_id,
        action: input.action,
        previous_status: previousStatus,
        new_status: nextStatus,
        officer_remarks: input.officer_remarks,
      },
      ipAddress,
    });

    return {
      membership: {
        ...updatedMembership,
        payment_unlocked: updatedMembership.status === MembershipStatus.APPROVED_UNPAID,
        status_timeline: buildStatusTimeline(updatedMembership),
      },
    };
  }
}
