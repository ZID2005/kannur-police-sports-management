import { useEffect, useState } from 'react';
import type { ApiMembership } from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import {
  membershipCategories,
  membershipFacilitySummary,
  membershipMediaAssets,
  membershipNetBankingBanks,
  membershipPeriodOptions,
  membershipSupportedUpiApps,
} from '@/data/mockData';
import type {
  MembershipFormData,
  MembershipPaymentMethodTab,
  MembershipPeriodOption,
} from '@/types/membership';

interface MembershipPaymentGatewayStepProps {
  formData: MembershipFormData;
  onCancel: () => void;
  onPaymentSuccess: () => void;
  liveMembership?: ApiMembership | null;
  onSettlePayment?: () => Promise<boolean>;
}

export function MembershipPaymentGatewayStep({
  formData,
  onCancel,
  onPaymentSuccess,
  liveMembership,
  onSettlePayment,
}: MembershipPaymentGatewayStepProps) {
  const [activeTab, setActiveTab] = useState<MembershipPaymentMethodTab>('upi');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(9 * 60 + 42);
  const [vpaInput, setVpaInput] = useState<string>('');
  const [vpaError, setVpaError] = useState<boolean>(false);
  const [vpaStatus, setVpaStatus] = useState<'idle' | 'verifying' | 'verified'>('idle');
  const [selectedBankId, setSelectedBankId] = useState<string>('sbi');
  const [debitName, setDebitName] = useState<string>(formData.fullName.toUpperCase());
  const [debitNumber, setDebitNumber] = useState<string>('');
  const [debitExpiry, setDebitExpiry] = useState<string>('');
  const [debitCvv, setDebitCvv] = useState<string>('');
  const [creditName, setCreditName] = useState<string>('');
  const [creditNumber, setCreditNumber] = useState<string>('');
  const [creditExpiry, setCreditExpiry] = useState<string>('');
  const [creditCvv, setCreditCvv] = useState<string>('');
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'sanctioned'>('idle');

  const activeMonths = liveMembership?.duration_months ?? formData.selectedMonths;
  const basePeriod: MembershipPeriodOption =
    membershipPeriodOptions.find((p) => p.months === activeMonths) ??
    membershipPeriodOptions[2];

  const selectedPeriod: MembershipPeriodOption = liveMembership?.calculated_tariff
    ? {
        ...basePeriod,
        baseFee: 500 * activeMonths,
        discount: Math.max(0, 500 * activeMonths - Number(liveMembership.calculated_tariff.base_amount)),
        gst: Number(liveMembership.calculated_tariff.gst_amount),
        total: Number(liveMembership.calculated_tariff.total_amount),
      }
    : basePeriod;

  const categoryMeta =
    membershipCategories.find((c) => c.id === formData.category) ?? membershipCategories[1];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return 'Expired. Refresh QR.';
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs} mins`;
  };

  const handleVerifyVpa = () => {
    const trimmed = vpaInput.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setVpaError(true);
      window.setTimeout(() => setVpaError(false), 2500);
      return;
    }
    setVpaError(false);
    setVpaStatus('verifying');
    window.setTimeout(() => {
      setVpaStatus('verified');
    }, 600);
  };

  const handleSubmitPayment = async () => {
    if (paymentState !== 'idle') return;
    setPaymentState('processing');
    if (onSettlePayment) {
      const ok = await onSettlePayment();
      if (!ok) {
        setPaymentState('idle');
        return;
      }
      setPaymentState('sanctioned');
      onPaymentSuccess();
      return;
    }
    window.setTimeout(() => {
      setPaymentState('sanctioned');
      window.setTimeout(() => {
        onPaymentSuccess();
      }, 450);
    }, 700);
  };

  const formattedTotal = selectedPeriod.total.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col w-full">
      {/* Interactive Sub-header context trail */}
      <div className="w-full mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-meta text-label-meta font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Step 3 of 3 • Final Checkout
          </span>
          <span className="hidden sm:inline-block font-label-meta text-label-meta text-outline">
            Session ID: {membershipFacilitySummary.sessionId}
          </span>
        </div>
        <div className="flex items-center gap-2 font-label-meta text-label-meta text-tertiary">
          <MaterialIcon name="verified_user" className="text-[16px] text-primary" />
          <span className="font-medium">256-bit GovVault Encryption</span>
        </div>
      </div>

      {/* Main Container 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Payment & Order Summary Card (5 Cols) */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          {/* Summary Glassmorphic Card */}
          <div className="relative overflow-hidden rounded-[32px] bg-surface-container-lowest/60 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(0,83,205,0.08)] p-6 md:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

            {/* Card Header & Badge */}
            <div className="flex items-start justify-between pb-6 mb-6">
              <div>
                <span className="font-label-meta text-label-meta text-primary font-semibold uppercase tracking-wider">
                  Facility Pass
                </span>
                <h2 className="font-headline-card text-headline-card text-on-surface mt-1">
                  Membership Summary
                </h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-secondary-container/50 flex items-center justify-center text-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
                <MaterialIcon name="sports_score" className="text-[26px]" />
              </div>
            </div>

            {/* Facility Preview Miniature */}
            <div className="relative rounded-2xl overflow-hidden mb-6 p-4 bg-surface-container-low/70 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm">
                <img
                  className="w-full h-full object-cover"
                  alt={membershipMediaAssets.facilityAerialTrackAlt}
                  src={membershipMediaAssets.facilityAerialTrackUrl}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-caption text-caption text-primary font-semibold uppercase">
                    {membershipFacilitySummary.trackCode}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  <span className="font-caption text-caption text-tertiary">
                    {membershipFacilitySummary.environment}
                  </span>
                </div>
                <p className="font-body-medium text-body-medium font-semibold text-on-surface truncate">
                  {membershipFacilitySummary.facilityName}
                </p>
                <p className="font-label-meta text-label-meta text-tertiary truncate">
                  {membershipFacilitySummary.location}
                </p>
              </div>
            </div>

            {/* Membership Specs Matrix */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                    <MaterialIcon name="calendar_month" className="text-[18px]" />
                  </div>
                  <div>
                    <span className="block font-caption text-caption text-tertiary">Duration</span>
                    <span className="font-label-primary text-label-primary text-on-surface font-semibold">
                      {selectedPeriod.label} ({selectedPeriod.validity})
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-semibold">
                  {selectedPeriod.quarterTag}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                    <MaterialIcon name="badge" className="text-[18px]" />
                  </div>
                  <div>
                    <span className="block font-caption text-caption text-tertiary">
                      Registered Officer
                    </span>
                    <span className="font-label-primary text-label-primary text-on-surface font-semibold">
                      {formData.fullName} ({liveMembership?.pass_code ?? `PEN: ${membershipFacilitySummary.penNumber}`})
                    </span>
                  </div>
                </div>
                <MaterialIcon name="check_circle" className="text-primary text-[20px]" />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                    <MaterialIcon name="policy" className="text-[18px]" />
                  </div>
                  <div>
                    <span className="block font-caption text-caption text-tertiary">
                      Quota Category
                    </span>
                    <span className="font-label-primary text-label-primary text-on-surface font-semibold">
                      {categoryMeta.reviewLabel}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-primary-fixed-dim/40 text-on-primary-fixed-variant font-caption text-caption font-bold">
                  50% SUB
                </span>
              </div>
            </div>

            {/* Cost Breakdown List */}
            <div className="p-5 rounded-2xl bg-surface-container-low/60 space-y-3 mb-6">
              <div className="flex justify-between items-center font-label-primary text-label-primary">
                <span className="text-on-surface-variant">
                  Standard Track Base Fee ({selectedPeriod.daysLabel})
                </span>
                <span className="text-on-surface font-medium">
                  ₹{selectedPeriod.baseFee.toLocaleString('en-IN')}.00
                </span>
              </div>
              <div className="flex justify-between items-center font-label-primary text-label-primary">
                <span className="text-primary flex items-center gap-1 font-medium">
                  <MaterialIcon name="local_offer" className="text-[16px]" />
                  Department Concession
                </span>
                <span className="text-primary font-semibold">
                  -₹{selectedPeriod.discount.toLocaleString('en-IN')}.00
                </span>
              </div>
              <div className="flex justify-between items-center font-label-primary text-label-primary">
                <span className="text-on-surface-variant flex items-center gap-1">
                  Turf Maintenance &amp; GST (18%)
                  <MaterialIcon
                    name="info"
                    className="text-[14px] text-outline cursor-help"
                  />
                </span>
                <span className="text-on-surface font-medium">
                  ₹{selectedPeriod.gst.toLocaleString('en-IN')}.00
                </span>
              </div>
              <div className="h-px w-full bg-outline-variant/30 my-2" />
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="block font-headline-card text-headline-card font-bold text-on-surface">
                    Total Amount Due
                  </span>
                  <span className="font-caption text-caption text-tertiary">
                    Inclusive of municipal athletic levy
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-title-portal text-title-portal font-bold text-primary tracking-tight">
                    ₹{formattedTotal}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Guarantee Strip */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-lowest/80 text-on-surface-variant">
              <MaterialIcon name="verified" className="text-primary text-[22px]" />
              <p className="font-caption text-caption leading-snug">
                Official registration sanctioned by{' '}
                <strong>District Police Headquarters, Kannur</strong>. Instant e-receipt valid for
                tax reimbursement.
              </p>
            </div>
          </div>

          {/* Compliance and Security Module */}
          <div className="rounded-3xl bg-surface-container-lowest/40 backdrop-blur-xl p-5 shadow-[0_4px_16px_rgba(0,83,205,0.03)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary-fixed/50 flex items-center justify-center text-secondary">
                <MaterialIcon name="enhanced_encryption" className="text-[20px]" />
              </div>
              <div>
                <p className="font-label-primary text-label-primary font-semibold text-on-surface">
                  Cyber Safety Compliance
                </p>
                <p className="font-caption text-caption text-tertiary">
                  Adheres to Kerala Police Cyber Safety Directives 2024
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-center p-2 rounded-xl bg-surface-container-lowest/60">
                <MaterialIcon name="lock" className="text-[18px] text-primary mb-0.5" />
                <p className="font-caption text-caption font-medium text-on-surface-variant">
                  256-Bit SSL
                </p>
              </div>
              <div className="text-center p-2 rounded-xl bg-surface-container-lowest/60">
                <MaterialIcon name="account_balance" className="text-[18px] text-primary mb-0.5" />
                <p className="font-caption text-caption font-medium text-on-surface-variant">
                  Treasury Reg.
                </p>
              </div>
              <div className="text-center p-2 rounded-xl bg-surface-container-lowest/60">
                <MaterialIcon name="receipt_long" className="text-[18px] text-primary mb-0.5" />
                <p className="font-caption text-caption font-medium text-on-surface-variant">
                  e-Challan
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Interactive Payment Checkout Card (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-[32px] bg-surface-container-lowest/60 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(0,83,205,0.08)] p-6 md:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

            {/* Section Title */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-1">
                <h1 className="font-headline-card text-headline-card text-on-surface font-bold">
                  Select Payment Method
                </h1>
                <span className="inline-flex items-center gap-1 font-label-meta text-label-meta text-primary font-semibold">
                  <MaterialIcon name="format_image_left" className="text-[16px]" />
                  Safe &amp; Encrypted
                </span>
              </div>
              <p className="font-body-default text-body-default text-tertiary">
                All transactions are authenticated via the secure treasury payment gateway.
              </p>
            </div>

            {/* Payment Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-container-low/80 mb-8 overflow-x-auto">
              {(
                [
                  { id: 'upi', label: 'UPI / QR', icon: 'qr_code_2' },
                  { id: 'debit', label: 'Debit Card', icon: 'credit_card' },
                  { id: 'credit', label: 'Credit Card', icon: 'credit_card_heart' },
                  { id: 'netbanking', label: 'Net Banking', icon: 'account_balance' },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-label-primary text-label-primary transition-all duration-200 ${
                      isActive
                        ? 'font-semibold bg-primary text-on-primary shadow-[0_4px_14px_rgba(0,83,205,0.24)]'
                        : 'font-medium text-tertiary hover:text-on-surface'
                    }`}
                  >
                    <MaterialIcon name={tab.icon} className="text-[20px]" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: UPI & QR Code */}
            {activeTab === 'upi' && (
              <div className="flex flex-col space-y-8">
                {/* Dynamic QR Code Card */}
                <div className="p-6 md:p-8 rounded-3xl bg-surface-container-lowest/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] flex flex-col md:flex-row items-center gap-8">
                  <div className="relative group flex-shrink-0">
                    <div className="w-52 h-52 rounded-2xl bg-surface-container-lowest p-4 shadow-[0_12px_32px_rgba(0,83,205,0.12)] flex flex-col items-center justify-center relative overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]">
                      <svg
                        className="w-full h-full text-on-surface"
                        fill="none"
                        viewBox="0 0 160 160"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect fill="currentColor" height="40" rx="6" width="40" x="10" y="10" />
                        <rect fill="#ffffff" height="24" rx="3" width="24" x="18" y="18" />
                        <rect fill="currentColor" height="12" rx="2" width="12" x="24" y="24" />
                        <rect fill="currentColor" height="40" rx="6" width="40" x="110" y="10" />
                        <rect fill="#ffffff" height="24" rx="3" width="24" x="118" y="18" />
                        <rect fill="currentColor" height="12" rx="2" width="12" x="124" y="24" />
                        <rect fill="currentColor" height="40" rx="6" width="40" x="10" y="110" />
                        <rect fill="#ffffff" height="24" rx="3" width="24" x="18" y="118" />
                        <rect fill="currentColor" height="12" rx="2" width="12" x="24" y="124" />
                        <rect fill="currentColor" height="8" rx="1.5" width="8" x="58" y="14" />
                        <rect fill="currentColor" height="8" rx="1.5" width="8" x="72" y="14" />
                        <rect fill="currentColor" height="8" rx="1.5" width="12" x="88" y="14" />
                        <rect fill="currentColor" height="8" rx="1.5" width="16" x="58" y="28" />
                        <rect fill="currentColor" height="14" rx="1.5" width="8" x="80" y="28" />
                        <rect fill="currentColor" height="6" rx="1" width="6" x="94" y="32" />
                        <rect fill="currentColor" height="4" width="4" x="54" y="24" />
                        <rect fill="currentColor" height="4" width="4" x="54" y="32" />
                        <rect fill="currentColor" height="4" width="4" x="54" y="40" />
                        <rect fill="currentColor" height="4" width="4" x="24" y="54" />
                        <rect fill="currentColor" height="4" width="4" x="32" y="54" />
                        <rect fill="currentColor" height="4" width="4" x="40" y="54" />
                        <rect fill="currentColor" height="14" rx="2" width="14" x="62" y="54" />
                        <rect fill="currentColor" height="18" rx="1.5" width="8" x="84" y="50" />
                        <rect fill="currentColor" height="8" rx="1.5" width="14" x="98" y="54" />
                        <rect fill="currentColor" height="8" rx="1.5" width="18" x="120" y="56" />
                        <rect fill="currentColor" height="14" rx="1.5" width="8" x="144" y="60" />
                        <rect fill="currentColor" height="8" rx="1.5" width="10" x="14" y="68" />
                        <rect fill="currentColor" height="8" rx="1.5" width="14" x="32" y="70" />
                        <rect fill="currentColor" height="12" rx="1.5" width="10" x="52" y="74" />
                        <rect fill="currentColor" height="12" rx="2" width="20" x="70" y="74" />
                        <rect fill="currentColor" height="14" rx="2" width="16" x="96" y="68" />
                        <rect fill="currentColor" height="8" rx="1.5" width="14" x="118" y="72" />
                        <rect fill="currentColor" height="8" rx="1.5" width="14" x="56" y="94" />
                        <rect fill="currentColor" height="16" rx="1.5" width="10" x="76" y="92" />
                        <rect fill="currentColor" height="8" rx="1.5" width="14" x="92" y="90" />
                        <rect fill="currentColor" height="10" rx="1.5" width="22" x="112" y="90" />
                        <rect fill="currentColor" height="16" rx="1.5" width="12" x="140" y="82" />
                        <rect fill="currentColor" height="10" rx="1.5" width="18" x="58" y="112" />
                        <rect fill="currentColor" height="8" rx="1.5" width="10" x="82" y="114" />
                        <rect fill="currentColor" height="20" rx="1.5" width="8" x="98" y="106" />
                        <rect fill="currentColor" height="10" rx="1.5" width="16" x="112" y="108" />
                        <rect fill="currentColor" height="18" rx="2" width="16" x="134" y="112" />
                        <rect fill="currentColor" height="16" rx="1.5" width="10" x="58" y="130" />
                        <rect fill="currentColor" height="10" rx="1.5" width="18" x="74" y="130" />
                        <rect fill="currentColor" height="12" rx="2" width="24" x="98" y="134" />
                        <rect fill="currentColor" height="10" rx="1.5" width="14" x="128" y="138" />
                        <circle cx="80" cy="80" fill="#0053cd" r="14" />
                        <path
                          d="M74 80L78 84L86 76"
                          stroke="#ffffff"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                        />
                      </svg>
                      <div className="absolute bottom-1 text-[9px] font-semibold text-outline uppercase tracking-wider">
                        Kannur City Police
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-75 animate-pulse" />
                  </div>

                  {/* QR Instructions & Countdowns */}
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container font-label-meta text-label-meta font-medium">
                      <MaterialIcon name="schedule" className="text-[16px] text-primary animate-spin" />
                      <span>
                        QR active for{' '}
                        <strong className="text-primary font-bold">
                          {formatCountdown(remainingSeconds)}
                        </strong>
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline-card text-headline-card font-bold text-on-surface">
                        Scan with any UPI App
                      </h3>
                      <p className="font-body-default text-body-default text-tertiary mt-1">
                        Open your preferred banking application and point camera at the screen.
                      </p>
                    </div>
                    {/* Supported Apps Pills */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                      {membershipSupportedUpiApps.map((app) => (
                        <span
                          key={app}
                          className="px-3 py-1.5 rounded-full bg-surface-container-lowest/80 text-on-surface font-label-meta text-label-meta font-medium shadow-sm"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Divider with subtle text */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="w-full h-px bg-outline-variant/30" />
                  <span className="absolute px-4 bg-surface-container-lowest/80 backdrop-blur-md rounded-full font-label-meta text-label-meta text-tertiary font-semibold uppercase tracking-wider">
                    Or Pay via VPA ID
                  </span>
                </div>

                {/* UPI ID / VPA Input Section */}
                <div className="space-y-2">
                  <label
                    className="block font-label-primary text-label-primary font-medium text-on-surface"
                    htmlFor="vpa-field"
                  >
                    Enter UPI ID / Virtual Payment Address
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="vpa-field"
                      type="text"
                      value={vpaInput}
                      onChange={(e) => {
                        setVpaInput(e.target.value);
                        if (vpaStatus === 'verified') setVpaStatus('idle');
                      }}
                      placeholder="e.g., officer@oksbi or anil.kumar@paytm"
                      className={`w-full h-14 pl-12 pr-36 rounded-2xl bg-surface-container-lowest/70 backdrop-blur-md text-on-surface placeholder:text-outline/70 font-body-default text-body-default focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] ${
                        vpaError ? 'ring-2 ring-error' : ''
                      }`}
                    />
                    <MaterialIcon
                      name="alternate_email"
                      className="absolute left-4 text-tertiary pointer-events-none text-[22px]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyVpa}
                      className={`absolute right-2 px-5 py-2.5 rounded-xl font-label-meta text-label-meta font-semibold transition-all shadow-sm flex items-center gap-1.5 ${
                        vpaStatus === 'verified'
                          ? 'bg-primary text-on-primary'
                          : 'bg-secondary-container text-on-secondary-container hover:bg-primary hover:text-on-primary'
                      }`}
                    >
                      {vpaStatus === 'verifying' ? (
                        <>
                          <MaterialIcon name="refresh" className="text-[16px] animate-spin" />
                          <span>Verifying</span>
                        </>
                      ) : vpaStatus === 'verified' ? (
                        <>
                          <MaterialIcon name="check" className="text-[16px]" />
                          <span>Verified</span>
                        </>
                      ) : (
                        <span>Verify &amp; Pay</span>
                      )}
                    </button>
                  </div>
                  <p className="font-caption text-caption text-tertiary flex items-center gap-1.5 pt-1">
                    <MaterialIcon name="info" className="text-[14px] text-primary" />
                    A collect request will be sent directly to your registered UPI application.
                  </p>
                </div>

                {/* Official Processing Directive Note */}
                <div className="p-4 rounded-2xl bg-surface-container-low/50 flex items-start gap-3">
                  <MaterialIcon
                    name="verified_user"
                    className="text-primary text-[20px] flex-shrink-0 mt-0.5"
                  />
                  <p className="font-caption text-caption text-tertiary leading-relaxed">
                    Transaction reference will be automatically linked to your{' '}
                    <strong>KCP Sports ID {membershipFacilitySummary.sportsId}</strong>. Official
                    electronic receipt and printable barcode gate pass will be generated upon
                    instantaneous success confirmation.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: Debit Card */}
            {activeTab === 'debit' && (
              <div className="flex flex-col space-y-5">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="debit-name"
                      className="block font-label-primary text-label-primary font-medium text-on-surface mb-1"
                    >
                      Cardholder Name
                    </label>
                    <input
                      id="debit-name"
                      type="text"
                      value={debitName}
                      onChange={(e) => setDebitName(e.target.value)}
                      className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest/70 text-on-surface font-body-default focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="debit-number"
                      className="block font-label-primary text-label-primary font-medium text-on-surface mb-1"
                    >
                      Debit Card Number
                    </label>
                    <input
                      id="debit-number"
                      type="text"
                      value={debitNumber}
                      onChange={(e) => setDebitNumber(e.target.value)}
                      placeholder="XXXX XXXX XXXX XXXX"
                      className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest/70 text-on-surface font-body-default focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="debit-expiry"
                        className="block font-label-primary text-label-primary font-medium text-on-surface mb-1"
                      >
                        Expiry Date
                      </label>
                      <input
                        id="debit-expiry"
                        type="text"
                        value={debitExpiry}
                        onChange={(e) => setDebitExpiry(e.target.value)}
                        placeholder="MM / YY"
                        className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest/70 text-on-surface font-body-default focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="debit-cvv"
                        className="block font-label-primary text-label-primary font-medium text-on-surface mb-1"
                      >
                        CVV / CVC
                      </label>
                      <input
                        id="debit-cvv"
                        type="password"
                        maxLength={3}
                        value={debitCvv}
                        onChange={(e) => setDebitCvv(e.target.value)}
                        placeholder="•••"
                        className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest/70 text-on-surface font-body-default focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Credit Card */}
            {activeTab === 'credit' && (
              <div className="flex flex-col space-y-5">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="credit-name"
                      className="block font-label-primary text-label-primary font-medium text-on-surface mb-1"
                    >
                      Cardholder Name
                    </label>
                    <input
                      id="credit-name"
                      type="text"
                      value={creditName}
                      onChange={(e) => setCreditName(e.target.value)}
                      placeholder="Name as embossed on credit card"
                      className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest/70 text-on-surface font-body-default focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="credit-number"
                      className="block font-label-primary text-label-primary font-medium text-on-surface mb-1"
                    >
                      Credit Card Number
                    </label>
                    <input
                      id="credit-number"
                      type="text"
                      value={creditNumber}
                      onChange={(e) => setCreditNumber(e.target.value)}
                      placeholder="4111 •••• •••• ••••"
                      className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest/70 text-on-surface font-body-default focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="credit-expiry"
                        className="block font-label-primary text-label-primary font-medium text-on-surface mb-1"
                      >
                        Expiry Date
                      </label>
                      <input
                        id="credit-expiry"
                        type="text"
                        value={creditExpiry}
                        onChange={(e) => setCreditExpiry(e.target.value)}
                        placeholder="MM / YY"
                        className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest/70 text-on-surface font-body-default focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="credit-cvv"
                        className="block font-label-primary text-label-primary font-medium text-on-surface mb-1"
                      >
                        CVV
                      </label>
                      <input
                        id="credit-cvv"
                        type="password"
                        maxLength={4}
                        value={creditCvv}
                        onChange={(e) => setCreditCvv(e.target.value)}
                        placeholder="•••"
                        className="w-full h-14 px-4 rounded-2xl bg-surface-container-lowest/70 text-on-surface font-body-default focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Net Banking */}
            {activeTab === 'netbanking' && (
              <div className="flex flex-col space-y-4">
                <p className="font-body-default text-body-default text-tertiary">
                  Select official authorized government depository partner bank:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {membershipNetBankingBanks.map((bank) => {
                    const isSelected = selectedBankId === bank.id;
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBankId(bank.id)}
                        className={`p-4 rounded-2xl text-left transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'bg-primary-fixed/40 border-primary shadow-sm'
                            : 'bg-surface-container-lowest/70 border-transparent hover:border-primary/40'
                        }`}
                      >
                        <span className="font-label-primary text-label-primary font-semibold text-on-surface">
                          {bank.name}
                        </span>
                        <MaterialIcon name="account_balance" className="text-primary text-[20px]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Primary Actions Footer */}
            <div className="pt-8 mt-6 flex flex-col-reverse sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-8 h-14 rounded-[22px] bg-surface-container-lowest/60 hover:bg-surface-container-lowest/90 text-on-surface font-label-primary text-label-primary font-semibold transition-all duration-200 active:scale-[0.985] text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={paymentState !== 'idle'}
                onClick={handleSubmitPayment}
                className={`flex-1 w-full h-14 rounded-[22px] text-on-primary font-body-medium text-body-medium font-semibold flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(0,83,205,0.28)] transition-all duration-200 ${
                  paymentState === 'sanctioned'
                    ? 'bg-secondary'
                    : 'bg-primary hover:bg-primary-container hover:shadow-[0_12px_28px_rgba(0,83,205,0.36)] hover:-translate-y-0.5 active:scale-[0.985]'
                }`}
              >
                {paymentState === 'processing' ? (
                  <>
                    <MaterialIcon name="progress_activity" className="text-[20px] animate-spin" />
                    <span>Authenticating Treasury Node...</span>
                  </>
                ) : paymentState === 'sanctioned' ? (
                  <>
                    <MaterialIcon name="check_circle" className="text-[20px]" />
                    <span>Payment Sanctioned!</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="lock" className="text-[20px]" />
                    <span>Pay Securely ₹{formattedTotal}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security Guarantee Strip */}
          <div className="flex items-center justify-between px-6 py-2 text-tertiary">
            <div className="flex items-center gap-2 font-caption text-caption">
              <MaterialIcon name="account_balance_wallet" className="text-[16px] text-outline" />
              <span>Electronic Challan generated under Section 43B IT Act</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-caption text-caption text-outline">Portal Version 4.12.8</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
