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
  UpdateMembershipPeriodInput,
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

    if (
      !input.instant_checkout &&
      user.role === UserRole.GOVT_PERSONNEL &&
      !input.govt_service_proof_url
    ) {
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

    const opStatus = (facility as any).operational_status ?? 'ACTIVE';
    if (opStatus !== 'ACTIVE') {
      throw new AppError(
        `Facility '${facility.name}' is currently ${opStatus === 'MAINTENANCE' ? 'under maintenance' : 'closed'} and unavailable for new memberships.`,
        409,
        'FACILITY_UNAVAILABLE'
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

    const [tariff, publicTariff] = await Promise.all([
      prisma.tariff.findUnique({
        where: {
          uq_tariff_facility_category_type: {
            facility_id: facility.id,
            user_category: userCategory,
            booking_type: BookingType.MONTHLY_PASS,
          },
        },
      }),
      userCategory === UserCategory.GOVT_PERSONNEL
        ? prisma.tariff.findUnique({
            where: {
              uq_tariff_facility_category_type: {
                facility_id: facility.id,
                user_category: UserCategory.PUBLIC,
                booking_type: BookingType.MONTHLY_PASS,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const passCode = await generateUniquePassCode(user.role);
    const initialStatus = input.instant_checkout
      ? MembershipStatus.APPROVED_UNPAID
      : MembershipStatus.PENDING_APPROVAL;

    // Persist any submitted benign onboarding fields onto the member's persistent User profile
    const userOnboardingPatch: Record<string, unknown> = {};
    if (input.gender !== undefined) userOnboardingPatch.gender = input.gender;
    if (input.date_of_birth !== undefined) userOnboardingPatch.date_of_birth = input.date_of_birth;
    if (input.parent_name !== undefined) userOnboardingPatch.parent_name = input.parent_name;
    if (input.present_address !== undefined) {
      userOnboardingPatch.present_address = input.present_address;
    }
    if (input.city_locality !== undefined) userOnboardingPatch.city_locality = input.city_locality;
    if (input.pin_code !== undefined) userOnboardingPatch.pin_code = input.pin_code;
    if (input.permanent_address !== undefined) {
      userOnboardingPatch.permanent_address = input.permanent_address;
    }
    if (input.designation !== undefined) userOnboardingPatch.designation = input.designation;
    if (input.office_address !== undefined) {
      userOnboardingPatch.office_address = input.office_address;
    }
    if (input.track_purpose !== undefined) userOnboardingPatch.track_purpose = input.track_purpose;
    if (input.is_registered_sportsperson !== undefined) {
      userOnboardingPatch.is_registered_sportsperson = input.is_registered_sportsperson;
      if (input.is_registered_sportsperson === false) {
        userOnboardingPatch.sport_discipline = null;
        userOnboardingPatch.association_details = null;
      }
    }
    if (input.sport_discipline !== undefined && input.is_registered_sportsperson !== false) {
      userOnboardingPatch.sport_discipline = input.sport_discipline;
    }
    if (input.association_details !== undefined && input.is_registered_sportsperson !== false) {
      userOnboardingPatch.association_details = input.association_details;
    }

    if (Object.keys(userOnboardingPatch).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: userOnboardingPatch,
      });
    }

    const createdMembership = await prisma.membership.create({
      data: {
        pass_code: passCode,
        user_id: user.id,
        facility_id: facility.id,
        duration_months: input.duration_months,
        session_window: input.session_window,
        govt_service_proof_url: input.govt_service_proof_url ?? null,
        track_purpose: input.track_purpose ?? null,
        is_registered_sportsperson: input.is_registered_sportsperson ?? false,
        sport_discipline:
          input.is_registered_sportsperson === false ? null : (input.sport_discipline ?? null),
        association_details:
          input.is_registered_sportsperson === false ? null : (input.association_details ?? null),
        declaration_accepted: input.declaration_accepted ?? false,
        status: initialStatus,
      },
      include: {
        facility: true,
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
            role: true,
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
          },
        },
      },
    });

    const feeCalculation = calculateMembershipFee(
      tariff?.base_price ?? (userCategory === UserCategory.GOVT_PERSONNEL ? '250.00' : '500.00'),
      tariff?.gst_percent ?? '18.00',
      createdMembership.duration_months
    );

    const standardMonthlyBase = Number(publicTariff?.base_price ?? 500);
    const taxableSubtotal = Number(feeCalculation.base_amount);
    const standardBaseFee =
      userCategory === UserCategory.GOVT_PERSONNEL &&
      standardMonthlyBase * createdMembership.duration_months > taxableSubtotal
        ? Math.round(standardMonthlyBase * createdMembership.duration_months * 100) / 100
        : taxableSubtotal;
    const concessionDiscount = Math.max(
      0,
      Math.round((standardBaseFee - taxableSubtotal) * 100) / 100
    );
    const concessionPercent =
      standardBaseFee > 0 && concessionDiscount > 0
        ? Math.round((concessionDiscount / standardBaseFee) * 1000) / 10
        : 0;

    return {
      membership: {
        ...createdMembership,
        payment_locked: !input.instant_checkout,
        payment_unlocked: input.instant_checkout,
        calculated_tariff: feeCalculation,
        pricing_breakdown: {
          base_fee: standardBaseFee.toFixed(2),
          concession_discount: concessionDiscount.toFixed(2),
          concession_percent: concessionPercent,
          taxable_subtotal: taxableSubtotal.toFixed(2),
          gst_rate: Number(feeCalculation.gst_percent),
          gst_amount: feeCalculation.gst_amount,
          final_total_paid: feeCalculation.total_amount,
        },
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
        const [tariff, publicTariff] = await Promise.all([
          prisma.tariff.findUnique({
            where: {
              uq_tariff_facility_category_type: {
                facility_id: m.facility_id,
                user_category: userCategory,
                booking_type: BookingType.MONTHLY_PASS,
              },
            },
          }),
          userCategory === UserCategory.GOVT_PERSONNEL
            ? prisma.tariff.findUnique({
                where: {
                  uq_tariff_facility_category_type: {
                    facility_id: m.facility_id,
                    user_category: UserCategory.PUBLIC,
                    booking_type: BookingType.MONTHLY_PASS,
                  },
                },
              })
            : Promise.resolve(null),
        ]);

        const fee = calculateMembershipFee(
          tariff?.base_price ?? (userCategory === UserCategory.GOVT_PERSONNEL ? '250.00' : '500.00'),
          tariff?.gst_percent ?? '18.00',
          m.duration_months
        );

        const standardMonthlyBase = Number(publicTariff?.base_price ?? 500);
        const taxableSubtotal = Number(fee.base_amount);
        const standardBaseFee =
          userCategory === UserCategory.GOVT_PERSONNEL &&
          standardMonthlyBase * m.duration_months > taxableSubtotal
            ? Math.round(standardMonthlyBase * m.duration_months * 100) / 100
            : taxableSubtotal;
        const concessionDiscount = Math.max(
          0,
          Math.round((standardBaseFee - taxableSubtotal) * 100) / 100
        );
        const concessionPercent =
          standardBaseFee > 0 && concessionDiscount > 0
            ? Math.round((concessionDiscount / standardBaseFee) * 1000) / 10
            : 0;

        return {
          ...m,
          user_category: userCategory,
          payment_locked: m.status !== MembershipStatus.APPROVED_UNPAID,
          payment_unlocked: m.status === MembershipStatus.APPROVED_UNPAID,
          calculated_tariff: fee,
          pricing_breakdown: {
            base_fee: standardBaseFee.toFixed(2),
            concession_discount: concessionDiscount.toFixed(2),
            concession_percent: concessionPercent,
            taxable_subtotal: taxableSubtotal.toFixed(2),
            gst_rate: Number(fee.gst_percent),
            gst_amount: fee.gst_amount,
            final_total_paid: fee.total_amount,
          },
          status_timeline: buildStatusTimeline(m),
        };
      })
    );

    return { memberships: enriched };
  }

  /**
   * PATCH /api/memberships/:id/period
   * Allows the applicant to update duration_months and/or session_window
   * while the membership is PENDING_APPROVAL or APPROVED_UNPAID (before payment settlement).
   */
  static async updateMembershipPeriod(
    membershipId: string,
    user: AuthenticatedUser,
    input: UpdateMembershipPeriodInput
  ) {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
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
    });

    if (!membership) {
      throw new AppError(
        `Membership application '${membershipId}' not found.`,
        404,
        'MEMBERSHIP_NOT_FOUND'
      );
    }

    if (membership.user_id !== user.id) {
      throw new AppError(
        'You are not authorized to modify another user’s membership application.',
        403,
        'FORBIDDEN_MEMBERSHIP_ACCESS'
      );
    }

    if (
      membership.status !== MembershipStatus.PENDING_APPROVAL &&
      membership.status !== MembershipStatus.APPROVED_UNPAID
    ) {
      throw new AppError(
        `Membership period cannot be changed once status is '${membership.status}'.`,
        400,
        'MEMBERSHIP_PERIOD_LOCKED'
      );
    }

    const updatedMembership = await prisma.membership.update({
      where: { id: membership.id },
      data: {
        ...(input.duration_months !== undefined ? { duration_months: input.duration_months } : {}),
        ...(input.session_window !== undefined ? { session_window: input.session_window } : {}),
      },
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
    });

    const userCategory =
      user.role === UserRole.GOVT_PERSONNEL ? UserCategory.GOVT_PERSONNEL : UserCategory.PUBLIC;

    const tariff = await prisma.tariff.findUnique({
      where: {
        uq_tariff_facility_category_type: {
          facility_id: updatedMembership.facility_id,
          user_category: userCategory,
          booking_type: BookingType.MONTHLY_PASS,
        },
      },
    });

    const feeCalculation = calculateMembershipFee(
      tariff?.base_price ?? (userCategory === UserCategory.GOVT_PERSONNEL ? '250.00' : '500.00'),
      tariff?.gst_percent ?? '18.00',
      updatedMembership.duration_months
    );

    return {
      membership: {
        ...updatedMembership,
        payment_locked: updatedMembership.status !== MembershipStatus.APPROVED_UNPAID,
        payment_unlocked: updatedMembership.status === MembershipStatus.APPROVED_UNPAID,
        calculated_tariff: feeCalculation,
        status_timeline: buildStatusTimeline(updatedMembership),
      },
    };
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
