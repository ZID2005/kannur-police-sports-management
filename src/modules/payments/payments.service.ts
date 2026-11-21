import crypto from 'crypto';
import {
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
import { AuthenticatedUser } from '../../types/express';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLogger';
import {
  formatDateOnly,
  formatDateToTime,
  parseDateOnly,
  timeToMinutes,
} from '../../utils/time';
import {
  AdminPaymentFilterQuery,
  OfficeReceiptInput,
  SettlePaymentInput,
} from './payments.schema';

type DbTxClient = Pick<
  typeof prisma,
  'membership' | 'slotBooking' | 'payment' | 'tariff' | 'user' | 'facility'
>;

/**
 * Generates a unique receipt number in the format `RCP-KCP-2026-XXXX`.
 */
async function generateUniqueReceiptNo(tx: DbTxClient): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const randomSuffix = crypto.randomInt(1000, 10000).toString();
    const candidate = `RCP-KCP-2026-${randomSuffix}`;
    const existing = await tx.payment.findUnique({
      where: { receipt_no: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }
  const fallbackHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `RCP-KCP-2026-${fallbackHex}`;
}

/**
 * Computes and validates `base_amount`, `gst_amount` (18% GST), and `total_amount`
 * (`total_amount = base_amount + gst_amount`).
 */
function verifyAndResolveAmounts(
  expectedBase: number,
  expectedGst: number,
  expectedTotal: number,
  input: { base_amount?: number; gst_amount?: number; total_amount?: number },
  gstPercent = 18
) {
  const resolvedBase =
    input.base_amount !== undefined
      ? Math.round(input.base_amount * 100) / 100
      : expectedBase;
  const resolvedGst =
    input.gst_amount !== undefined
      ? Math.round(input.gst_amount * 100) / 100
      : expectedGst;
  const resolvedTotal =
    input.total_amount !== undefined
      ? Math.round(input.total_amount * 100) / 100
      : expectedTotal;

  const computedGst = Math.round(resolvedBase * (gstPercent / 100) * 100) / 100;
  const computedTotalSum = Math.round((resolvedBase + resolvedGst) * 100) / 100;

  if (
    Math.abs(resolvedGst - computedGst) > 0.01 ||
    Math.abs(resolvedTotal - computedTotalSum) > 0.01
  ) {
    throw new AppError(
      `Invalid GST or total calculation: ${gstPercent}% GST on base_amount (${resolvedBase.toFixed(2)}) must equal ${computedGst.toFixed(2)}, and total_amount must equal base_amount + gst_amount (${computedTotalSum.toFixed(2)}).`,
      400,
      'INVALID_GST_CALCULATION'
    );
  }

  if (
    Math.abs(resolvedBase - expectedBase) > 0.01 ||
    Math.abs(resolvedTotal - expectedTotal) > 0.01
  ) {
    throw new AppError(
      `Payment amount mismatch against official tariff. Expected base_amount=${expectedBase.toFixed(2)}, gst_amount=${expectedGst.toFixed(2)}, total_amount=${expectedTotal.toFixed(2)}.`,
      400,
      'PAYMENT_AMOUNT_MISMATCH'
    );
  }

  return {
    baseAmount: resolvedBase,
    gstAmount: resolvedGst,
    totalAmount: resolvedTotal,
  };
}

/**
 * Internal helper that executes a payment settlement and confirmation receipt issuance inside a Prisma transaction.
 */
async function executeSettlementTransaction(
  tx: DbTxClient,
  params: {
    actor: AuthenticatedUser;
    paymentMode: PaymentMode;
    recordedByOfficerId: string | null;
    input: {
      reference_type: PaymentReferenceType;
      reference_id?: string;
      pass_or_booking_code?: string;
      base_amount?: number;
      gst_amount?: number;
      total_amount?: number;
    };
  }
) {
  const { actor, paymentMode, recordedByOfficerId, input } = params;

  if (input.reference_type === PaymentReferenceType.MEMBERSHIP) {
    const membership = input.reference_id
      ? await tx.membership.findUnique({
          where: { id: input.reference_id },
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
          },
        })
      : await tx.membership.findUnique({
          where: { pass_code: input.pass_or_booking_code! },
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
          },
        });

    if (!membership) {
      throw new AppError(
        `Membership record '${input.reference_id ?? input.pass_or_booking_code}' not found.`,
        404,
        'MEMBERSHIP_NOT_FOUND'
      );
    }

    if (
      paymentMode === PaymentMode.ONLINE_GATEWAY &&
      membership.user_id !== actor.id &&
      actor.role !== UserRole.STAFF_ADMIN
    ) {
      throw new AppError(
        'You are not authorized to settle payment for another user’s membership.',
        403,
        'FORBIDDEN_PAYMENT_ACCESS'
      );
    }

    if (membership.status === MembershipStatus.ACTIVE) {
      throw new AppError(
        `Membership '${membership.pass_code}' is already settled and ACTIVE.`,
        409,
        'ALREADY_PAID'
      );
    }

    if (membership.status !== MembershipStatus.APPROVED_UNPAID) {
      throw new AppError(
        `Membership '${membership.pass_code}' is in '${membership.status}' status. Only 'APPROVED_UNPAID' memberships can be settled.`,
        400,
        'MEMBERSHIP_NOT_ELIGIBLE_FOR_PAYMENT'
      );
    }

    const existingSettled = await tx.payment.findFirst({
      where: {
        reference_type: PaymentReferenceType.MEMBERSHIP,
        reference_id: membership.id,
        status: PaymentStatus.SETTLED,
      },
    });

    if (existingSettled) {
      throw new AppError(
        `A settled payment (${existingSettled.receipt_no}) already exists for membership '${membership.pass_code}'.`,
        409,
        'DUPLICATE_PAYMENT'
      );
    }

    const userRole = membership.user?.role ?? UserRole.PUBLIC;
    const userCategory =
      userRole === UserRole.GOVT_PERSONNEL
        ? UserCategory.GOVT_PERSONNEL
        : UserCategory.PUBLIC;

    const [tariff, publicTariff] = await Promise.all([
      tx.tariff.findUnique({
        where: {
          uq_tariff_facility_category_type: {
            facility_id: membership.facility_id,
            user_category: userCategory,
            booking_type: BookingType.MONTHLY_PASS,
          },
        },
      }),
      userCategory === UserCategory.GOVT_PERSONNEL
        ? tx.tariff.findUnique({
            where: {
              uq_tariff_facility_category_type: {
                facility_id: membership.facility_id,
                user_category: UserCategory.PUBLIC,
                booking_type: BookingType.MONTHLY_PASS,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const monthlyBasePrice = Number(
      tariff?.base_price ?? (userCategory === UserCategory.GOVT_PERSONNEL ? 250 : 500)
    );
    const gstPercent = Number(tariff?.gst_percent ?? 18);
    const expectedBase = Math.round(monthlyBasePrice * membership.duration_months * 100) / 100;
    const expectedGst = Math.round(expectedBase * (gstPercent / 100) * 100) / 100;
    const expectedTotal = Math.round((expectedBase + expectedGst) * 100) / 100;

    const { baseAmount, gstAmount, totalAmount } = verifyAndResolveAmounts(
      expectedBase,
      expectedGst,
      expectedTotal,
      input,
      gstPercent
    );

    const stdMonthlyPublic = Number(publicTariff?.base_price ?? 500);
    const stdMembershipBase =
      userCategory === UserCategory.GOVT_PERSONNEL &&
      stdMonthlyPublic * membership.duration_months > baseAmount
        ? Math.round(stdMonthlyPublic * membership.duration_months * 100) / 100
        : baseAmount;
    const membershipConcession = Math.max(
      0,
      Math.round((stdMembershipBase - baseAmount) * 100) / 100
    );
    const membershipConcessionPct =
      stdMembershipBase > 0 && membershipConcession > 0
        ? Math.round((membershipConcession / stdMembershipBase) * 1000) / 10
        : 0;
    const membershipPricingBreakdown = {
      base_fee: stdMembershipBase.toFixed(2),
      concession_discount: membershipConcession.toFixed(2),
      concession_percent: membershipConcessionPct,
      taxable_subtotal: baseAmount.toFixed(2),
      gst_rate: gstPercent,
      gst_amount: gstAmount.toFixed(2),
      final_total_paid: totalAmount.toFixed(2),
    };

    const receiptNo = await generateUniqueReceiptNo(tx);
    const facilityCode = membership.facility?.code ?? FacilityCode.SYNTHETIC_TRACK;

    const todayStr = formatDateOnly(new Date());
    const startDate = parseDateOnly(todayStr);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + membership.duration_months);

    const createdPayment = await tx.payment.create({
      data: {
        receipt_no: receiptNo,
        reference_type: PaymentReferenceType.MEMBERSHIP,
        reference_id: membership.id,
        user_id: membership.user_id,
        payment_mode: paymentMode,
        base_amount: baseAmount.toFixed(2),
        gst_amount: gstAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        status: PaymentStatus.SETTLED,
        recorded_by_officer_id: recordedByOfficerId,
      },
    });

    const activatedMembership = await tx.membership.update({
      where: { id: membership.id },
      data: {
        start_date: startDate,
        end_date: endDate,
        status: MembershipStatus.ACTIVE,
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
      },
    });

    return {
      payment: {
        ...createdPayment,
        user_category: userCategory,
        pass_or_booking_code: activatedMembership.pass_code,
        facility_code: facilityCode,
        facility_name: activatedMembership.facility?.name ?? 'Synthetic Athletic Track',
        pricing_breakdown: membershipPricingBreakdown,
      },
      receipt: {
        receipt_no: createdPayment.receipt_no,
        reference_type: PaymentReferenceType.MEMBERSHIP,
        reference_id: activatedMembership.id,
        booking_or_pass_code: activatedMembership.pass_code,
        facility_code: facilityCode,
        facility_name: activatedMembership.facility?.name ?? 'Synthetic Athletic Track',
        status: activatedMembership.status,
        user_category: userCategory,
        payment_mode: paymentMode,
        start_date: formatDateOnly(startDate),
        end_date: formatDateOnly(endDate),
        duration_months: activatedMembership.duration_months,
        session_window: activatedMembership.session_window,
        pricing_breakdown: membershipPricingBreakdown,
        issued_at: createdPayment.created_at,
      },
      membership: {
        ...activatedMembership,
        start_date_formatted: formatDateOnly(startDate),
        end_date_formatted: formatDateOnly(endDate),
        pricing_breakdown: membershipPricingBreakdown,
      },
    };
  }

  // Reference Type === SLOT_BOOKING
  const booking = input.reference_id
    ? await tx.slotBooking.findUnique({
        where: { id: input.reference_id },
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
        },
      })
    : await tx.slotBooking.findUnique({
        where: { booking_code: input.pass_or_booking_code! },
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
        },
      });

  if (!booking) {
    throw new AppError(
      `Slot booking '${input.reference_id ?? input.pass_or_booking_code}' not found.`,
      404,
      'BOOKING_NOT_FOUND'
    );
  }

  if (
    paymentMode === PaymentMode.ONLINE_GATEWAY &&
    booking.user_id !== actor.id &&
    actor.role !== UserRole.STAFF_ADMIN
  ) {
    throw new AppError(
      'You are not authorized to settle payment for another user’s slot booking.',
      403,
      'FORBIDDEN_PAYMENT_ACCESS'
    );
  }

  if (booking.status === SlotBookingStatus.CONFIRMED) {
    throw new AppError(
      `Slot booking '${booking.booking_code}' is already settled and CONFIRMED.`,
      409,
      'ALREADY_PAID'
    );
  }

  if (booking.status !== SlotBookingStatus.PENDING_PAYMENT) {
    throw new AppError(
      `Slot booking '${booking.booking_code}' is in '${booking.status}' status. Only 'PENDING_PAYMENT' bookings can be settled.`,
      400,
      'BOOKING_NOT_ELIGIBLE_FOR_PAYMENT'
    );
  }

  const existingSettled = await tx.payment.findFirst({
    where: {
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: booking.id,
      status: PaymentStatus.SETTLED,
    },
  });

  if (existingSettled) {
    throw new AppError(
      `A settled payment (${existingSettled.receipt_no}) already exists for slot booking '${booking.booking_code}'.`,
      409,
      'DUPLICATE_PAYMENT'
    );
  }

  const userRole = booking.user?.role ?? UserRole.PUBLIC;
  const userCategory =
    userRole === UserRole.GOVT_PERSONNEL
      ? UserCategory.GOVT_PERSONNEL
      : UserCategory.PUBLIC;
  const bookingType =
    booking.court_partition === CourtPartition.FULL
      ? BookingType.FULL_COURT
      : BookingType.HALF_COURT;

  const [tariff, publicTariff] = await Promise.all([
    tx.tariff.findUnique({
      where: {
        uq_tariff_facility_category_type: {
          facility_id: booking.facility_id,
          user_category: userCategory,
          booking_type: bookingType,
        },
      },
    }),
    userCategory === UserCategory.GOVT_PERSONNEL
      ? tx.tariff.findUnique({
          where: {
            uq_tariff_facility_category_type: {
              facility_id: booking.facility_id,
              user_category: UserCategory.PUBLIC,
              booking_type: bookingType,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const startMins = timeToMinutes(formatDateToTime(booking.start_time));
  const endMins = timeToMinutes(formatDateToTime(booking.end_time));
  const hours = Math.max(1, (endMins - startMins) / 60);

  let expectedBase: number;
  let expectedGst: number;
  let expectedTotal: number;
  let resolvedGstPercent = 18;

  if (tariff) {
    const hourlyBase = Number(tariff.base_price);
    resolvedGstPercent = Number(tariff.gst_percent ?? 18);
    expectedBase = Math.round(hourlyBase * hours * 100) / 100;
    expectedGst = Math.round(expectedBase * (resolvedGstPercent / 100) * 100) / 100;
    expectedTotal = Math.round((expectedBase + expectedGst) * 100) / 100;
  } else {
    expectedTotal = Math.round(Number(booking.total_amount) * 100) / 100;
    expectedBase = Math.round((expectedTotal / 1.18) * 100) / 100;
    expectedGst = Math.round((expectedTotal - expectedBase) * 100) / 100;
  }

  const { baseAmount, gstAmount, totalAmount } = verifyAndResolveAmounts(
    expectedBase,
    expectedGst,
    expectedTotal,
    input,
    resolvedGstPercent
  );

  const stdBookingBase =
    userCategory === UserCategory.GOVT_PERSONNEL &&
    publicTariff &&
    Math.round(Number(publicTariff.base_price) * hours * 100) / 100 > baseAmount
      ? Math.round(Number(publicTariff.base_price) * hours * 100) / 100
      : baseAmount;
  const bookingConcession = Math.max(0, Math.round((stdBookingBase - baseAmount) * 100) / 100);
  const bookingConcessionPct =
    stdBookingBase > 0 && bookingConcession > 0
      ? Math.round((bookingConcession / stdBookingBase) * 1000) / 10
      : 0;
  const bookingPricingBreakdown = {
    base_fee: stdBookingBase.toFixed(2),
    concession_discount: bookingConcession.toFixed(2),
    concession_percent: bookingConcessionPct,
    taxable_subtotal: baseAmount.toFixed(2),
    gst_rate: resolvedGstPercent,
    gst_amount: gstAmount.toFixed(2),
    final_total_paid: totalAmount.toFixed(2),
  };

  const receiptNo = await generateUniqueReceiptNo(tx);
  const facilityCode = booking.facility?.code ?? FacilityCode.POLICE_TURF;

  const createdPayment = await tx.payment.create({
    data: {
      receipt_no: receiptNo,
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: booking.id,
      user_id: booking.user_id,
      payment_mode: paymentMode,
      base_amount: baseAmount.toFixed(2),
      gst_amount: gstAmount.toFixed(2),
      total_amount: totalAmount.toFixed(2),
      status: PaymentStatus.SETTLED,
      recorded_by_officer_id: recordedByOfficerId,
    },
  });

  const confirmedBooking = await tx.slotBooking.update({
    where: { id: booking.id },
    data: {
      status: SlotBookingStatus.CONFIRMED,
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
    },
  });

  return {
    payment: {
      ...createdPayment,
      user_category: userCategory,
      pass_or_booking_code: confirmedBooking.booking_code,
      facility_code: facilityCode,
      facility_name: confirmedBooking.facility?.name ?? 'Sports Facility',
      pricing_breakdown: bookingPricingBreakdown,
    },
    receipt: {
      receipt_no: createdPayment.receipt_no,
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: confirmedBooking.id,
      booking_or_pass_code: confirmedBooking.booking_code,
      facility_code: facilityCode,
      facility_name: confirmedBooking.facility?.name ?? 'Sports Facility',
      status: confirmedBooking.status,
      user_category: userCategory,
      payment_mode: paymentMode,
      booking_date: formatDateOnly(confirmedBooking.booking_date),
      start_time: formatDateToTime(confirmedBooking.start_time),
      end_time: formatDateToTime(confirmedBooking.end_time),
      court_partition: confirmedBooking.court_partition,
      pricing_breakdown: bookingPricingBreakdown,
      issued_at: createdPayment.created_at,
    },
    slot_booking: {
      ...confirmedBooking,
      booking_date_formatted: formatDateOnly(confirmedBooking.booking_date),
      start_time_formatted: formatDateToTime(confirmedBooking.start_time),
      end_time_formatted: formatDateToTime(confirmedBooking.end_time),
      pricing_breakdown: bookingPricingBreakdown,
    },
  };
}

/**
 * Enriches a list of Payment records with their referenced Membership or SlotBooking metadata
 * and structured pricing breakdown.
 */
async function enrichPaymentRecords(
  payments: any[],
  options: { userRoleOverride?: UserRole } = {}
) {
  return Promise.all(
    payments.map(async (p) => {
      const resolvedRole = options.userRoleOverride ?? p.user?.role ?? UserRole.PUBLIC;
      const userCategory =
        resolvedRole === UserRole.GOVT_PERSONNEL
          ? UserCategory.GOVT_PERSONNEL
          : UserCategory.PUBLIC;

      const taxableSubtotal = Math.round(Number(p.base_amount ?? 0) * 100) / 100;
      const gstAmount = Math.round(Number(p.gst_amount ?? 0) * 100) / 100;
      const finalTotalPaid = Math.round(Number(p.total_amount ?? 0) * 100) / 100;

      if (p.reference_type === PaymentReferenceType.MEMBERSHIP) {
        const membership = await prisma.membership.findUnique({
          where: { id: p.reference_id },
          include: { facility: true },
        });
        const publicTariff =
          membership && userCategory === UserCategory.GOVT_PERSONNEL
            ? await prisma.tariff.findUnique({
                where: {
                  uq_tariff_facility_category_type: {
                    facility_id: membership.facility_id,
                    user_category: UserCategory.PUBLIC,
                    booking_type: BookingType.MONTHLY_PASS,
                  },
                },
              })
            : null;
        const months = Math.max(1, Number(membership?.duration_months ?? 1));
        const stdBase =
          userCategory === UserCategory.GOVT_PERSONNEL &&
          publicTariff &&
          Math.round(Number(publicTariff.base_price) * months * 100) / 100 > taxableSubtotal
            ? Math.round(Number(publicTariff.base_price) * months * 100) / 100
            : taxableSubtotal;
        const conc = Math.max(0, Math.round((stdBase - taxableSubtotal) * 100) / 100);
        const concPct = stdBase > 0 && conc > 0 ? Math.round((conc / stdBase) * 1000) / 10 : 0;
        const gstRate =
          taxableSubtotal > 0 ? Math.round((gstAmount / taxableSubtotal) * 1000) / 10 : 18;

        const baseRecord: Record<string, any> = {
          ...p,
          user_category: userCategory,
          pass_or_booking_code: membership?.pass_code ?? null,
          facility_code: membership?.facility?.code ?? null,
          facility_name: membership?.facility?.name ?? null,
          pricing_breakdown: {
            base_fee: stdBase.toFixed(2),
            concession_discount: conc.toFixed(2),
            concession_percent: concPct,
            taxable_subtotal: taxableSubtotal.toFixed(2),
            gst_rate: gstRate,
            gst_amount: gstAmount.toFixed(2),
            final_total_paid: finalTotalPaid.toFixed(2),
          },
          reference_details: membership
            ? {
                pass_code: membership.pass_code,
                duration_months: membership.duration_months,
                session_window: membership.session_window,
                status: membership.status,
                start_date: membership.start_date
                  ? formatDateOnly(membership.start_date)
                  : null,
                end_date: membership.end_date ? formatDateOnly(membership.end_date) : null,
              }
            : null,
        };
        return baseRecord;
      }

      const booking = await prisma.slotBooking.findUnique({
        where: { id: p.reference_id },
        include: { facility: true },
      });
      const bookingType =
        booking?.court_partition === CourtPartition.FULL
          ? BookingType.FULL_COURT
          : BookingType.HALF_COURT;
      const publicTariff =
        booking && userCategory === UserCategory.GOVT_PERSONNEL
          ? await prisma.tariff.findUnique({
              where: {
                uq_tariff_facility_category_type: {
                  facility_id: booking.facility_id,
                  user_category: UserCategory.PUBLIC,
                  booking_type: bookingType,
                },
              },
            })
          : null;
      const hours = booking
        ? Math.max(
            1,
            (timeToMinutes(formatDateToTime(booking.end_time)) -
              timeToMinutes(formatDateToTime(booking.start_time))) /
              60
          )
        : 1;
      const stdBase =
        userCategory === UserCategory.GOVT_PERSONNEL &&
        publicTariff &&
        Math.round(Number(publicTariff.base_price) * hours * 100) / 100 > taxableSubtotal
          ? Math.round(Number(publicTariff.base_price) * hours * 100) / 100
          : taxableSubtotal;
      const conc = Math.max(0, Math.round((stdBase - taxableSubtotal) * 100) / 100);
      const concPct = stdBase > 0 && conc > 0 ? Math.round((conc / stdBase) * 1000) / 10 : 0;
      const gstRate =
        taxableSubtotal > 0 ? Math.round((gstAmount / taxableSubtotal) * 1000) / 10 : 18;

      const baseRecord: Record<string, any> = {
        ...p,
        user_category: userCategory,
        pass_or_booking_code: booking?.booking_code ?? null,
        facility_code: booking?.facility?.code ?? null,
        facility_name: booking?.facility?.name ?? null,
        pricing_breakdown: {
          base_fee: stdBase.toFixed(2),
          concession_discount: conc.toFixed(2),
          concession_percent: concPct,
          taxable_subtotal: taxableSubtotal.toFixed(2),
          gst_rate: gstRate,
          gst_amount: gstAmount.toFixed(2),
          final_total_paid: finalTotalPaid.toFixed(2),
        },
        reference_details: booking
          ? {
              booking_code: booking.booking_code,
              booking_date: formatDateOnly(booking.booking_date),
              start_time: formatDateToTime(booking.start_time),
              end_time: formatDateToTime(booking.end_time),
              court_partition: booking.court_partition,
              status: booking.status,
            }
          : null,
      };
      return baseRecord;
    })
  );
}

export class PaymentsService {
  /**
   * POST /api/payments/settle
   * Settles an eligible MEMBERSHIP (APPROVED_UNPAID) or SLOT_BOOKING (PENDING_PAYMENT)
   * via ONLINE_GATEWAY inside a Prisma transaction and issues a structured booking confirmation receipt.
   */
  static async settleOnlinePayment(user: AuthenticatedUser, input: SettlePaymentInput) {
    const runTx = async (tx: DbTxClient) =>
      executeSettlementTransaction(tx, {
        actor: user,
        paymentMode: PaymentMode.ONLINE_GATEWAY,
        recordedByOfficerId: null,
        input,
      });

    if (typeof (prisma as any).$transaction === 'function') {
      return prisma.$transaction(async (tx) => runTx(tx));
    }
    return runTx(prisma);
  }

  /**
   * POST /api/admin/payments/office-receipt (`STAFF_ADMIN` only)
   * Records an offline/treasury challan payment (`OFFICE_RECEIPT`), activates the corresponding
   * Membership or Slot Booking, and writes an immutable entry to `audit_logs`.
   */
  static async recordOfficeReceipt(
    officer: AuthenticatedUser,
    input: OfficeReceiptInput,
    ipAddress: string
  ) {
    const runTx = async (tx: DbTxClient) =>
      executeSettlementTransaction(tx, {
        actor: officer,
        paymentMode: PaymentMode.OFFICE_RECEIPT,
        recordedByOfficerId: officer.id,
        input,
      });

    const result =
      typeof (prisma as any).$transaction === 'function'
        ? await prisma.$transaction(async (tx) => runTx(tx))
        : await runTx(prisma);

    await recordAuditLog({
      officerId: officer.id,
      actionCategory: 'OFFICE_RECEIPT_PAYMENT',
      actionDescription: `Officer '${officer.username}' recorded OFFICE_RECEIPT '${result.payment.receipt_no}' (INR ${result.payment.total_amount}) for ${input.reference_type} '${result.receipt.booking_or_pass_code}'.`,
      targetRefId: result.payment.receipt_no,
      details: {
        officer_username: officer.username,
        officer_role: officer.role,
        target_entity: 'PAYMENT',
        payment_id: result.payment.id,
        receipt_no: result.payment.receipt_no,
        payment_mode: PaymentMode.OFFICE_RECEIPT,
        reference_type: result.payment.reference_type,
        reference_id: result.payment.reference_id,
        pass_or_booking_code: result.receipt.booking_or_pass_code,
        facility_code: result.receipt.facility_code,
        user_id: result.payment.user_id,
        base_amount: String(result.payment.base_amount),
        gst_amount: String(result.payment.gst_amount),
        total_amount: String(result.payment.total_amount),
        treasury_challan_no: input.treasury_challan_no ?? null,
        remarks: input.remarks ?? null,
        reason:
          input.remarks ??
          (input.treasury_challan_no
            ? `Treasury challan ${input.treasury_challan_no} verified and settled.`
            : 'Offline office payment receipt recorded and settled.'),
      },
      ipAddress,
    });

    return result;
  }

  /**
   * GET /api/payments/my
   * Returns the logged-in user's receipt history with pass/booking details.
   */
  static async getMyPayments(user: AuthenticatedUser) {
    const payments = await prisma.payment.findMany({
      where: { user_id: user.id },
      include: {
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

    const enriched = await enrichPaymentRecords(payments, {
      userRoleOverride: user.role,
    });
    return { payments: enriched };
  }

  /**
   * GET /api/admin/payments (`STAFF_ADMIN` only)
   * Filterable admin payment ledger with revenue summary KPIs.
   */
  static async listAdminPayments(filters: AdminPaymentFilterQuery) {
    const allPayments = await prisma.payment.findMany({
      where: {
        ...(filters.payment_mode ? { payment_mode: filters.payment_mode } : {}),
        ...(filters.reference_type ? { reference_type: filters.reference_type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
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

    const enriched = await enrichPaymentRecords(allPayments);

    const fromTimestamp = filters.from_date
      ? new Date(`${filters.from_date}T00:00:00.000Z`).getTime()
      : null;
    const toTimestamp = filters.to_date
      ? new Date(`${filters.to_date}T23:59:59.999Z`).getTime()
      : null;

    const filtered = enriched.filter((p) => {
      if (filters.facility_code && p.facility_code !== filters.facility_code) {
        return false;
      }
      if (fromTimestamp !== null && new Date(p.created_at).getTime() < fromTimestamp) {
        return false;
      }
      if (toTimestamp !== null && new Date(p.created_at).getTime() > toTimestamp) {
        return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesReceipt = p.receipt_no.toLowerCase().includes(q);
        const matchesCode = (p.pass_or_booking_code ?? '').toLowerCase().includes(q);
        const matchesUser =
          (p.user?.username ?? '').toLowerCase().includes(q) ||
          (p.user?.full_name ?? '').toLowerCase().includes(q);
        if (!matchesReceipt && !matchesCode && !matchesUser) {
          return false;
        }
      }
      return true;
    });

    const settledOnly = filtered.filter((p) => p.status === PaymentStatus.SETTLED);

    const sumField = (items: any[], field: 'base_amount' | 'gst_amount' | 'total_amount') =>
      (
        Math.round(
          items.reduce((acc, item) => acc + Number(item[field] ?? 0), 0) * 100
        ) / 100
      ).toFixed(2);

    const summary = {
      total_transactions: settledOnly.length,
      total_base_amount: sumField(settledOnly, 'base_amount'),
      total_gst_amount: sumField(settledOnly, 'gst_amount'),
      total_revenue: sumField(settledOnly, 'total_amount'),
      online_gateway_revenue: sumField(
        settledOnly.filter((p) => p.payment_mode === PaymentMode.ONLINE_GATEWAY),
        'total_amount'
      ),
      office_receipt_revenue: sumField(
        settledOnly.filter((p) => p.payment_mode === PaymentMode.OFFICE_RECEIPT),
        'total_amount'
      ),
      membership_revenue: sumField(
        settledOnly.filter((p) => p.reference_type === PaymentReferenceType.MEMBERSHIP),
        'total_amount'
      ),
      slot_booking_revenue: sumField(
        settledOnly.filter((p) => p.reference_type === PaymentReferenceType.SLOT_BOOKING),
        'total_amount'
      ),
    };

    return {
      summary,
      payments: filtered,
    };
  }
}
