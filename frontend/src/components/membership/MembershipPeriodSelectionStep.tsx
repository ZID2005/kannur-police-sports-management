import type { ApiMembership, BackendSessionWindow } from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import {
  membershipCategories,
  membershipFacilitySummary,
  membershipMediaAssets,
  membershipPeriodOptions,
  membershipStatusTimeline,
} from '@/data/mockData';
import type {
  MembershipFormData,
  MembershipPeriodOption,
  MembershipStatusTimelineItem,
} from '@/types/membership';

interface MembershipPeriodSelectionStepProps {
  formData: MembershipFormData;
  onSelectMonths: (months: 1 | 2 | 3 | 6) => void;
  onBack: () => void;
  onProceedToPayment: () => void;
  liveMembership?: ApiMembership | null;
  monthlyMemberCap?: number;
  liveMonthlyBasePrice?: number;
  sessionWindow?: BackendSessionWindow;
  onChangeSessionWindow?: (window: BackendSessionWindow) => void;
  onViewActivePass?: () => void;
}

export function MembershipPeriodSelectionStep({
  formData,
  onSelectMonths,
  onBack,
  onProceedToPayment,
  liveMembership,
  monthlyMemberCap = 300,
  liveMonthlyBasePrice,
  sessionWindow = 'MORNING',
  onChangeSessionWindow,
  onViewActivePass,
}: MembershipPeriodSelectionStepProps) {
  const isGovt = formData.category === 'government';
  const baseMonthlyStd = 500;
  const effectiveMonthly =
    liveMonthlyBasePrice ?? (isGovt ? 250 : 500);

  const computedOptions: MembershipPeriodOption[] = membershipPeriodOptions.map((opt) => {
    const months = liveMembership ? (liveMembership.duration_months as 1 | 2 | 3 | 6) : opt.months;
    const baseFee = baseMonthlyStd * opt.months;
    const discountedBase = effectiveMonthly * opt.months;
    const discount = Math.max(0, baseFee - discountedBase);
    const gst = Math.round(discountedBase * 0.18 * 100) / 100;
    const total = Math.round((discountedBase + gst) * 100) / 100;
    const capPercent = Math.min(100, Math.round((opt.enrolled / monthlyMemberCap) * 100));

    return {
      ...opt,
      capacity: monthlyMemberCap,
      capacityPercent: capPercent,
      baseFee,
      discount,
      gst,
      total,
      ...(liveMembership && opt.months === months && liveMembership.calculated_tariff
        ? {
            gst: Number(liveMembership.calculated_tariff.gst_amount),
            total: Number(liveMembership.calculated_tariff.total_amount),
          }
        : {}),
    };
  });

  const activeMonths = (liveMembership?.duration_months ?? formData.selectedMonths) as 1 | 2 | 3 | 6;
  const selectedPeriod: MembershipPeriodOption =
    computedOptions.find((p) => p.months === activeMonths) ?? computedOptions[2];

  const categoryMeta =
    membershipCategories.find((c) => c.id === formData.category) ?? membershipCategories[1];

  const liveTimeline: MembershipStatusTimelineItem[] = liveMembership
    ? [
        {
          id: 'submitted',
          title: 'Application submitted',
          subtitle: `${liveMembership.pass_code} • ${new Date(
            liveMembership.created_at
          ).toLocaleDateString('en-IN')}`,
          status: 'completed',
        },
        {
          id: 'verified',
          title: 'Officer Verification & Clearance',
          subtitle:
            liveMembership.officer_remarks ||
            (liveMembership.status === 'PENDING_APPROVAL'
              ? 'Pending officer verification at Kannur Police HQ'
              : `Status: ${liveMembership.status}`),
          verifiedTag: liveMembership.reviewed_by_officer
            ? `Reviewed by ${liveMembership.reviewed_by_officer.full_name}`
            : undefined,
          status: liveMembership.status === 'PENDING_APPROVAL' ? 'current' : 'completed',
        },
        {
          id: 'approved',
          title:
            liveMembership.status === 'REJECTED'
              ? 'Application Rejected'
              : liveMembership.status === 'SUSPENDED'
                ? 'Membership Suspended'
                : 'Officer Approval & Payment Unlock',
          subtitle:
            liveMembership.status === 'APPROVED_UNPAID'
              ? 'Approved! Fee settlement unlocked.'
              : liveMembership.status === 'ACTIVE'
                ? 'Payment settled and pass active.'
                : 'Payment locked until STAFF_ADMIN approval.',
          badgeText:
            liveMembership.status === 'APPROVED_UNPAID'
              ? 'Approved — Payment Unlocked'
              : liveMembership.status === 'ACTIVE'
                ? 'Active QR Credential Issued'
                : liveMembership.status,
          status:
            liveMembership.status === 'APPROVED_UNPAID' || liveMembership.status === 'ACTIVE'
              ? 'done_all'
              : 'current',
        },
        {
          id: 'payment',
          title: 'Period & Payment',
          subtitle:
            liveMembership.status === 'ACTIVE'
              ? 'Pass activated for turnstile access'
              : liveMembership.status === 'APPROVED_UNPAID'
                ? 'Ready for online treasury settlement'
                : 'Waiting for officer approval',
          badgeText: liveMembership.status === 'APPROVED_UNPAID' ? 'Current' : undefined,
          status: liveMembership.status === 'ACTIVE' ? 'completed' : 'current',
        },
      ]
    : membershipStatusTimeline;

  const isPaymentLocked = Boolean(
    liveMembership &&
      liveMembership.status !== 'APPROVED_UNPAID' &&
      liveMembership.status !== 'ACTIVE'
  );
  const isAlreadyActive = liveMembership?.status === 'ACTIVE';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Stepper Status Tracker */}
      <aside className="lg:col-span-4 w-full">
        <div className="rounded-3xl bg-surface-container-lowest/65 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(0,83,205,0.08)] p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-label-meta text-label-meta uppercase tracking-wider text-primary font-semibold">
              Verification Record
            </span>
            <h2 className="font-headline-card text-headline-card text-on-surface">
              Application status
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="font-label-meta text-label-meta text-tertiary">
                {membershipFacilitySummary.facilitySubtitle} •{' '}
                {liveMembership?.pass_code ?? membershipFacilitySummary.applicationId}
              </p>
            </div>
          </div>

          {/* Progress Stepper List */}
          <div className="relative flex flex-col gap-0 py-2">
            {/* Connecting Line Behind Badges */}
            <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-secondary-fixed/50 z-0" />

            {liveTimeline.map((item, idx) => {
              const isLast = idx === liveTimeline.length - 1;
              return (
                <div
                  key={item.id}
                  className={`relative z-10 flex items-start gap-4 ${isLast ? '' : 'pb-7'}`}
                >
                  {item.status === 'current' ? (
                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-[0_4px_16px_rgba(0,83,205,0.25)]">
                      <div className="w-5 h-5 rounded-full bg-primary-fixed flex items-center justify-center animate-pulse">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,83,205,0.22)]">
                      <MaterialIcon
                        name={item.status === 'done_all' ? 'done_all' : 'check'}
                        filled
                        className="text-[20px]"
                      />
                    </div>
                  )}

                  <div className="flex flex-col pt-1">
                    {item.status === 'current' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-label-primary text-label-primary font-bold text-primary">
                            {item.title}
                          </span>
                          {item.badgeText && (
                            <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-caption text-caption font-semibold">
                              {item.badgeText}
                            </span>
                          )}
                        </div>
                        <span className="font-caption text-caption text-tertiary mt-0.5">
                          {item.subtitle}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-label-primary text-label-primary font-semibold text-on-surface">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="font-caption text-caption text-tertiary mt-0.5">
                            {item.subtitle}
                          </span>
                        )}
                        {item.verifiedTag && (
                          <div className="inline-flex items-center gap-1.5 mt-1 text-primary">
                            <MaterialIcon name="verified" className="text-[14px]" />
                            <span className="font-caption text-caption font-medium">
                              {item.verifiedTag}
                            </span>
                          </div>
                        )}
                        {item.badgeText && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="font-caption text-caption font-semibold">
                              {item.badgeText}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Official Security Guarantee Note */}
          <div className="mt-2 rounded-2xl bg-surface-container/60 p-4 flex items-start gap-3 shadow-inner">
            <MaterialIcon name="verified_user" className="text-primary text-[20px] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-label-meta text-label-meta font-semibold text-on-surface">
                Official KCP Sports Council
              </span>
              <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
                Direct clearance issued under Regulation Section 14-B. Valid exclusively for
                certified district synthetic tracks.
              </p>
            </div>
          </div>

          {/* Track Specifications / Quick Glance */}
          <div className="rounded-2xl bg-surface-container-low/80 p-4 flex flex-col gap-3">
            <span className="font-label-meta text-label-meta font-semibold text-tertiary uppercase tracking-wider">
              Facility Specs
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-surface-container-lowest/80 flex flex-col">
                <span className="font-caption text-caption text-tertiary">Track Surface</span>
                <span className="font-label-primary text-label-primary font-semibold text-on-surface mt-0.5">
                  {membershipFacilitySummary.trackSurface}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-lowest/80 flex flex-col">
                <span className="font-caption text-caption text-tertiary">Operating Hours</span>
                <span className="font-label-primary text-label-primary font-semibold text-on-surface mt-0.5">
                  {membershipFacilitySummary.operatingHours}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Column: Main Content Flow */}
      <section className="lg:col-span-8 flex flex-col gap-6">
        {/* Header Grouping */}
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container">
            <MaterialIcon name="sports_score" className="text-[16px]" />
            <span className="font-label-meta text-label-meta font-semibold">
              {membershipFacilitySummary.stadiumBadge}
            </span>
          </div>
          <h1 className="font-title-portal text-[28px] md:text-title-portal text-on-surface tracking-tight font-bold">
            Select membership period
          </h1>
          <p className="font-body-default text-[15px] md:text-body-default text-on-surface-variant">
            {liveMembership?.status === 'APPROVED_UNPAID'
              ? `Application ${liveMembership.pass_code} is approved. Settle fee payment to activate your QR pass.`
              : liveMembership?.status === 'ACTIVE'
                ? `Membership ${liveMembership.pass_code} is active. View your signed QR turnstile credential.`
                : liveMembership
                  ? `Application ${liveMembership.pass_code} is ${liveMembership.status.replace('_', ' ')}. Payment unlocks after officer approval.`
                  : 'Choose your duration and session window to submit for officer approval.'}
          </p>
        </div>

        {/* Card 1: Applicant & Category Summary Ribbon */}
        <div className="rounded-3xl bg-surface-container-lowest/70 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(0,83,205,0.06)] p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                className="w-16 h-16 rounded-2xl object-cover shadow-[0_4px_14px_rgba(0,83,205,0.15)] bg-surface-container-high"
                alt={membershipMediaAssets.statusPortraitStep5Alt}
                src={membershipMediaAssets.statusPortraitStep5Url}
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                <MaterialIcon name="local_police" className="text-[14px]" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-headline-card text-headline-card text-on-surface font-bold">
                  {formData.fullName}
                </h3>
                <span className="font-label-meta text-label-meta px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                  {formData.category === 'public' ? 'General Member' : 'Sub-Inspector'}
                </span>
              </div>
              <span className="font-label-primary text-label-primary text-tertiary mt-0.5">
                {membershipFacilitySummary.stationBadge}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-1.5 pt-3 md:pt-0 border-t md:border-t-0 border-surface-variant/40">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed">
              <MaterialIcon name="verified" filled className="text-[16px] text-primary" />
              <span className="font-label-meta text-label-meta font-semibold">
                {membershipFacilitySummary.subsidyLabel}
              </span>
            </div>
            <span className="font-caption text-caption text-tertiary">
              Category: {categoryMeta.reviewLabel}
            </span>
          </div>
        </div>

        {/* Card 2: Select Duration & Slot Capacity */}
        <div className="rounded-3xl bg-surface-container-lowest/70 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(0,83,205,0.06)] p-6 md:p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-col">
              <h2 className="font-headline-card text-headline-card text-on-surface">
                Select Duration &amp; Slot Capacity
              </h2>
              <span className="font-caption text-caption text-tertiary">
                Official {monthlyMemberCap}-member safety cap applied per time period
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {onChangeSessionWindow && !liveMembership && (
                <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-full">
                  {(['MORNING', 'EVENING', 'BOTH'] as const).map((win) => (
                    <button
                      key={win}
                      type="button"
                      onClick={() => onChangeSessionWindow(win)}
                      className={`px-2.5 py-1 rounded-full font-caption text-caption transition ${
                        sessionWindow === win
                          ? 'bg-primary text-on-primary font-semibold'
                          : 'text-tertiary hover:text-on-surface'
                      }`}
                    >
                      {win}
                    </button>
                  ))}
                </div>
              )}
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant">
                <MaterialIcon name="speed" className="text-[16px] text-primary" />
                <span className="font-label-meta text-label-meta font-medium">
                  Real-time enrollment
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Duration Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {computedOptions.map((option) => {
              const isSelected = option.months === selectedPeriod.months;

              return (
                <button
                  key={option.months}
                  type="button"
                  onClick={() => onSelectMonths(option.months)}
                  className={`text-left p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between gap-4 group relative overflow-hidden ${
                    isSelected
                      ? 'bg-primary-fixed/30 shadow-[0_8px_24px_rgba(0,83,205,0.12)]'
                      : 'bg-surface-container-low/70 hover:bg-surface-container-lowest shadow-sm'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                  )}

                  <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-headline-card text-headline-card font-bold transition-colors ${
                            isSelected
                              ? 'text-primary'
                              : 'text-on-surface group-hover:text-primary'
                          }`}
                        >
                          {option.label}
                        </span>
                        {option.recommended && (
                          <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-caption text-caption font-semibold shadow-sm">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-label-meta text-label-meta mt-0.5 ${
                          isSelected ? 'text-on-surface-variant' : 'text-tertiary'
                        }`}
                      >
                        {option.validity}
                      </span>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-primary shadow-sm' : 'bg-surface-container'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isSelected ? 'bg-on-primary' : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full pt-2">
                    <div className="flex items-center justify-between text-caption font-caption">
                      <span className="text-tertiary">Capacity</span>
                      <span className="text-on-surface font-semibold">
                        {option.enrolled} / {option.capacity} members
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isSelected ? 'bg-primary' : 'bg-secondary'
                        }`}
                        style={{ width: `${option.capacityPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`font-label-meta text-label-meta ${
                          isSelected ? 'text-primary font-bold' : 'text-on-surface font-semibold'
                        }`}
                      >
                        ₹{option.total.toLocaleString('en-IN')}{' '}
                        <span className="font-caption text-caption text-tertiary font-normal">
                          subsidized
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-caption text-caption text-primary ${
                          isSelected ? 'font-semibold' : 'font-medium'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Slots available
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 3: Fee Calculation Breakdown */}
        <div className="rounded-3xl bg-surface-container-lowest/70 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(0,83,205,0.06)] p-6 md:p-8 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-variant/40">
            <h2 className="font-headline-card text-headline-card text-on-surface font-bold">
              Fee Calculation Breakdown
            </h2>
            <span className="font-label-meta text-label-meta px-3 py-1 rounded-full bg-surface-container text-tertiary font-medium">
              {selectedPeriod.tierBadge}
            </span>
          </div>

          <div className="flex flex-col gap-3 py-1">
            {/* Base Track Fee */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-body-default text-body-default text-on-surface">
                  Base Track Fee
                </span>
                <span className="font-caption text-caption text-tertiary">
                  (₹500/month × {selectedPeriod.months} month
                  {selectedPeriod.months > 1 ? 's' : ''})
                </span>
              </div>
              <span className="font-body-medium text-body-medium font-semibold text-on-surface">
                ₹{selectedPeriod.baseFee.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Concession */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-body-default text-body-default text-primary font-medium">
                  Departmental Personnel Concession
                </span>
                <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-semibold">
                  50% OFF
                </span>
              </div>
              <span className="font-body-medium text-body-medium font-semibold text-primary">
                -₹{selectedPeriod.discount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* GST & Maintenance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-body-default text-body-default text-on-surface">
                  GST &amp; Facility Maintenance Fee
                </span>
                <span className="font-caption text-caption text-tertiary">(18%)</span>
              </div>
              <span className="font-body-medium text-body-medium font-semibold text-on-surface">
                +₹{selectedPeriod.gst.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Total Bar */}
            <div className="mt-4 pt-4 border-t border-surface-variant/40 flex items-center justify-between bg-surface-container-low/50 p-4 rounded-2xl">
              <div className="flex flex-col">
                <span className="font-label-meta text-label-meta uppercase tracking-wider text-tertiary font-semibold">
                  Total Payable Amount
                </span>
                <span className="font-caption text-caption text-tertiary">
                  Inclusive of municipal sports fund and insurance
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-title-portal text-title-portal font-bold text-primary">
                  ₹{selectedPeriod.total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Muted Helper Note */}
          <div className="flex items-start gap-2.5 pt-1 text-tertiary">
            <MaterialIcon name="receipt_long" className="text-[18px] shrink-0 mt-0.5 text-primary" />
            <p className="font-caption text-caption leading-relaxed">
              Official e-receipt and printable membership barcode card generated immediately after
              payment confirmation. Access pass is integrated with biometric turnstiles at Pavilion
              Gate 2.
            </p>
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto h-14 px-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-xl text-on-surface font-label-primary text-label-primary font-semibold hover:bg-surface-container-lowest transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,83,205,0.06)] active:scale-[0.985]"
          >
            <MaterialIcon name="arrow_back" className="text-[20px]" />
            <span>Back</span>
          </button>

          {isAlreadyActive ? (
            <button
              type="button"
              onClick={onViewActivePass ?? onProceedToPayment}
              className="w-full sm:w-auto min-w-[300px] h-14 px-10 rounded-2xl bg-primary text-on-primary font-label-primary text-label-primary font-semibold hover:bg-primary-container transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(0,83,205,0.28)] hover:shadow-[0_12px_28px_rgba(0,83,205,0.35)] active:scale-[0.985] group"
            >
              <span>View Active QR Pass ({liveMembership?.pass_code})</span>
              <MaterialIcon
                name="qr_code_2"
                className="text-[20px] transition-transform group-hover:translate-x-1"
              />
            </button>
          ) : (
            <button
              type="button"
              disabled={isPaymentLocked}
              onClick={onProceedToPayment}
              className={`w-full sm:w-auto min-w-[300px] h-14 px-10 rounded-2xl font-label-primary text-label-primary font-semibold transition-all duration-200 flex items-center justify-center gap-3 group ${
                isPaymentLocked
                  ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-75'
                  : 'bg-primary text-on-primary hover:bg-primary-container shadow-[0_8px_24px_rgba(0,83,205,0.28)] hover:shadow-[0_12px_28px_rgba(0,83,205,0.35)] active:scale-[0.985]'
              }`}
            >
              <span>
                {isPaymentLocked
                  ? `Awaiting Officer Approval (${liveMembership?.status})`
                  : `Proceed to Payment (₹${selectedPeriod.total.toLocaleString('en-IN')})`}
              </span>
              <MaterialIcon
                name={isPaymentLocked ? 'lock' : 'lock_open'}
                className="text-[20px] transition-transform group-hover:translate-x-1"
              />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
