import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  membershipsApi,
  paymentsApi,
  type ApiMembership,
  type ApiPaymentRecord,
  type ApiSettlePaymentResponse,
} from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { DigitalMembershipCard } from '@/components/bookings/DigitalMembershipCard';
import { PassRightSidebar } from '@/components/bookings/PassRightSidebar';
import { useAuth } from '@/context/AuthContext';
import { passDefaultData } from '@/data/mockData';
import { ACTIVATED_PASS_STORAGE_KEY } from '@/pages/public/membership/MembershipPage';
import type { PassData } from '@/types/bookings';
import '@/styles/bookings.css';

function formatPassDate(dateStr?: string | null): string {
  if (!dateStr) return 'Active';
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatInr(amount?: string | number | null): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function MembershipPassPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liveMembership, setLiveMembership] = useState<ApiMembership | null>(null);
  const [livePayment, setLivePayment] = useState<ApiPaymentRecord | null>(null);
  const [qrTokenOverride, setQrTokenOverride] = useState<string | null>(null);

  useEffect(() => {
    const stateSettled = (location.state as ApiSettlePaymentResponse | null) ?? null;
    if (stateSettled?.membership) {
      setLiveMembership(stateSettled.membership);
      setLivePayment(stateSettled.payment);
      setQrTokenOverride(stateSettled.qr_pass?.qr_token_hash ?? null);
      return;
    }

    try {
      const storedRaw = window.sessionStorage.getItem(ACTIVATED_PASS_STORAGE_KEY);
      if (storedRaw) {
        const parsed = JSON.parse(storedRaw) as ApiSettlePaymentResponse;
        if (parsed.membership) {
          setLiveMembership(parsed.membership);
          setLivePayment(parsed.payment);
          setQrTokenOverride(parsed.qr_pass?.qr_token_hash ?? null);
        }
      }
    } catch {
      // Ignore storage parse failure
    }

    if (!user) return;
    let active = true;

    Promise.all([
      membershipsApi.getMy().catch(() => ({ memberships: [] as ApiMembership[] })),
      paymentsApi.getMy().catch(() => ({ payments: [] as ApiPaymentRecord[] })),
    ]).then(([memRes, payRes]) => {
      if (!active) return;
      const activePass =
        memRes.memberships.find((m) => m.status === 'ACTIVE') ??
        memRes.memberships[0] ??
        null;
      if (activePass) {
        setLiveMembership(activePass);
        setQrTokenOverride(activePass.qr_token_hash ?? null);
        const matchingPayment =
          payRes.payments.find(
            (p) => p.reference_type === 'MEMBERSHIP' && p.reference_id === activePass.id
          ) ?? null;
        if (matchingPayment) setLivePayment(matchingPayment);
      }
    });

    return () => {
      active = false;
    };
  }, [location.state, user]);

  const resolvedPass = useMemo<PassData>(() => {
    if (!liveMembership) return passDefaultData;

    const memberName = user?.full_name ?? passDefaultData.memberName;
    const isGovt = user?.role === 'GOVT_PERSONNEL';
    const qrToken = qrTokenOverride || liveMembership.qr_token_hash || passDefaultData.qrSeed;
    const receiptTotal = livePayment
      ? formatInr(livePayment.total_amount)
      : liveMembership.calculated_tariff
        ? formatInr(liveMembership.calculated_tariff.total_amount)
        : passDefaultData.receiptAmount;
    const baseAmt = livePayment
      ? formatInr(livePayment.base_amount)
      : liveMembership.calculated_tariff
        ? formatInr(liveMembership.calculated_tariff.base_amount)
        : '₹0.00';
    const gstAmt = livePayment
      ? formatInr(livePayment.gst_amount)
      : liveMembership.calculated_tariff
        ? formatInr(liveMembership.calculated_tariff.gst_amount)
        : '₹0.00';

    const sessionLabel =
      liveMembership.session_window === 'MORNING'
        ? '05:00 AM - 10:00 AM'
        : liveMembership.session_window === 'EVENING'
          ? '03:00 PM - 09:00 PM'
          : '05:00 AM - 09:00 PM';

    return {
      ...passDefaultData,
      passReference: `Pass Ref: ${liveMembership.pass_code}`,
      vaultRecordText: livePayment
        ? `Receipt: ${livePayment.receipt_no}`
        : 'Departmental Record Active',
      statusTag: liveMembership.status,
      memberName,
      departmentalCode: isGovt ? 'GOVT-CONCESSION' : 'CITIZEN-PASS',
      designation: isGovt
        ? 'Government Personnel • 50% Subsidized Tariff'
        : 'General Public • Synthetic Track Member',
      memberId: liveMembership.pass_code,
      liveStatusText: liveMembership.status === 'ACTIVE' ? 'LIVE' : liveMembership.status,
      details: [
        {
          id: 'facility',
          label: 'Facility Access',
          value: liveMembership.facility?.name ?? 'Synthetic 400m Athletic Track',
          subtext: 'Kannur Police Parade Grounds • Gate 2',
        },
        {
          id: 'validity',
          label: 'Validity Period',
          value: `${formatPassDate(liveMembership.start_date)} – ${formatPassDate(
            liveMembership.end_date
          )}`,
          subtext: `${liveMembership.duration_months} Month(s) Subscription`,
          highlightSubtext: true,
        },
        {
          id: 'session',
          label: 'Session Window',
          value: `${liveMembership.session_window} SESSION`,
          subtext: sessionLabel,
        },
        {
          id: 'gate-protocol',
          label: 'Gate Clearance Rule',
          value: '2-Stage (QR + Biometric)',
          subtext: 'Mandatory Turnstile Dual Verification',
        },
      ],
      barcodeCaption: liveMembership.pass_code,
      qrSeed: qrToken,
      qrDescription: `Signed HMAC Token: ${qrToken.slice(0, 18)}...`,
      receiptAmount: receiptTotal,
      challanTotal: receiptTotal,
      challanRows: [
        { label: 'Pass Code', value: liveMembership.pass_code, isMono: true },
        {
          label: 'Receipt No.',
          value: livePayment?.receipt_no ?? 'Settled',
          isMono: true,
        },
        {
          label: 'Payment Mode',
          value: livePayment?.payment_mode ?? 'ONLINE_GATEWAY',
        },
        { label: 'Base Fee', value: baseAmt },
        { label: 'GST (18%)', value: gstAmt },
      ],
    };
  }, [liveMembership, livePayment, qrTokenOverride, user]);

  const handleActionToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="bookings-page-container flex flex-col w-full bg-transparent font-body-default text-body-default text-on-surface relative">
      {/* Sub-navigation Back to Home Breadcrumb Strip */}
      <div className="w-full bg-surface-container-lowest/40 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-2 flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 font-label-meta text-label-meta text-tertiary hover:text-primary transition-colors group"
          >
            <MaterialIcon
              name="chevron_left"
              className="text-[16px] transition-transform group-hover:-translate-x-0.5"
            />
            <span>Back to home</span>
          </Link>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mx-auto px-6 md:px-12 py-8 flex flex-col gap-8">
        {/* GovVault Reference Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-lowest/70 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-secondary-container/40 flex items-center justify-center text-primary">
              <MaterialIcon name="verified_user" className="text-[17px]" filled />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label-meta text-label-meta font-semibold text-on-surface">
                {resolvedPass.passReference}
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="font-label-meta text-label-meta text-tertiary">
                {resolvedPass.vaultRecordText}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high/60">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-caption text-caption font-medium text-primary">
              {resolvedPass.syncBadgeText}
            </span>
          </div>
        </div>

        {/* Payment & Activation Confirmation */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-surface-container-lowest/90 via-surface-container-lowest/75 to-surface-container-lowest/90 backdrop-blur-2xl p-6 md:p-8 shadow-[0_12px_32px_rgba(0,83,205,0.06)]">
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-secondary-container/30 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-on-primary shadow-[0_8px_20px_rgba(0,83,205,0.28)]">
              <MaterialIcon name="check_circle" className="text-[36px]" filled />
            </div>
            <div className="flex flex-col gap-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="font-label-meta text-label-meta font-bold uppercase tracking-wider text-primary">
                  {resolvedPass.authTag}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-caption text-caption font-semibold">
                  {resolvedPass.statusTag}
                </span>
              </div>
              <h1 className="font-title-portal text-title-portal-mobile md:text-title-portal text-on-surface tracking-tight">
                {resolvedPass.confirmationTitle}
              </h1>
              <p className="font-body-default text-body-default text-on-surface-variant">
                {resolvedPass.confirmationDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Dual-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <DigitalMembershipCard pass={resolvedPass} />
          <PassRightSidebar pass={resolvedPass} onActionToast={handleActionToast} />
        </div>
      </div>

      {/* Interactive Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bookings-toast-enter">
          <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-xl">
            <MaterialIcon
              name="check_circle"
              className="text-emerald-400 text-[20px]"
              filled
            />
            <span className="font-label-primary text-label-primary">
              {toastMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
