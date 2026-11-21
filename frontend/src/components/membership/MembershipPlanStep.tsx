import { ArrowLeft, ArrowRight, Check, Clock, ShieldCheck } from 'lucide-react';
import type { BackendSessionWindow } from '@/api/client';
import { useLanguage } from '@/context/LanguageContext';
import { membershipDurationOptions, membershipSessionOptions } from '@/data/mockData';
import type {
  MembershipDurationMonths,
  MembershipOnboardingFormData,
  MembershipPricingSummary,
} from '@/types/membership';

interface MembershipPlanStepProps {
  formData: MembershipOnboardingFormData;
  pricing: MembershipPricingSummary;
  isGovt: boolean;
  isTrackUnavailable: boolean;
  onSelectMonths: (months: MembershipDurationMonths) => void;
  onSelectSession: (session: BackendSessionWindow) => void;
  onBack: () => void;
  onContinue: () => void;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function MembershipPlanStep({
  formData,
  pricing,
  isGovt,
  isTrackUnavailable,
  onSelectMonths,
  onSelectSession,
  onBack,
  onContinue,
}: MembershipPlanStepProps) {
  const { lang, t } = useLanguage();

  return (
    <section className="lg:col-span-8 w-full flex flex-col gap-5 membership-step-enter">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#165DF5]">
          {t('Step 2 of 3 • Plan & Daily Session', 'ഘട്ടം 2 / 3 • പ്ലാനും സെഷനും')}
        </p>
        <h1 className="font-display text-[28px] sm:text-[34px] font-extrabold text-[#0F172A] tracking-[-0.03em] leading-[1.1]">
          {t('Choose Plan & Daily Track Session', 'കാലാവധിയും പ്രതിദിന സെഷനും തിരഞ്ഞെടുക്കുക')}
        </h1>
        <p className="text-[14px] text-[#475569]">
          {t(
            'Select your membership duration and preferred daily training window. Your official GST fee breakdown updates live below.',
            'നിങ്ങളുടെ അംഗത്വ കാലാവധിയും പരിശീലന സമയവും തിരഞ്ഞെടുക്കുക. GST ഫീസ് വിവരങ്ങൾ താഴെ തത്സമയം കാണാം.',
          )}
        </p>
      </div>

      {/* Card 1: Duration Selection */}
      <div className="rounded-[24px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)]">
        <h2 className="font-display text-[18px] font-bold text-[#0F172A] mb-3.5">
          {t('1. Membership Duration', '1. അംഗത്വ കാലാവധി')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {membershipDurationOptions.map((opt) => {
            const isSelected = formData.selectedMonths === opt.months;
            const estNet = pricing.monthlyNet * opt.months;
            return (
              <button
                key={opt.months}
                type="button"
                disabled={isTrackUnavailable}
                onClick={() => onSelectMonths(opt.months)}
                className={`relative p-4 rounded-[18px] border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-[#165DF5] border-[#0F49C7] text-white shadow-[0_10px_24px_-8px_rgba(22,93,245,0.45)]'
                    : 'bg-white border-slate-200/90 hover:border-[#165DF5]/60 text-[#0F172A]'
                } ${isTrackUnavailable ? 'opacity-55 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display text-[16px] font-bold">
                    {lang === 'ML' ? opt.labelMl : opt.label}
                  </span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-white text-[#165DF5] flex items-center justify-center shrink-0 membership-pop">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div>
                  <p className={`text-[11.5px] ${isSelected ? 'text-blue-100' : 'text-[#64748B]'}`}>
                    {opt.daysLabel}
                    {opt.recommended ? ` • ${t('Popular', 'ജനപ്രിയം')}` : ''}
                  </p>
                  <p
                    className={`text-[14.5px] font-bold tabular-nums mt-1 ${
                      isSelected ? 'text-white' : 'text-[#165DF5]'
                    }`}
                  >
                    ₹{estNet.toLocaleString('en-IN')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 2: Daily Session Window */}
      <div className="rounded-[24px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)]">
        <h2 className="font-display text-[18px] font-bold text-[#0F172A] mb-3.5">
          {t('2. Daily Track Session Window', '2. പ്രതിദിന പരിശീലന സമയം')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {membershipSessionOptions.map((opt) => {
            const isSelected = formData.sessionWindow === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={isTrackUnavailable}
                onClick={() => onSelectSession(opt.id)}
                className={`p-4 rounded-[18px] border text-left transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-[#165DF5]/8 border-[#165DF5] ring-2 ring-[#165DF5]/15'
                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                } ${isTrackUnavailable ? 'opacity-55 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[14.5px] font-bold text-[#0F172A]">
                    {lang === 'ML' ? opt.labelMl : opt.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[#165DF5]" strokeWidth={2.5} />}
                </div>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[#64748B] tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-[#165DF5]" />
                  {opt.hoursLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 3: Live Fee Summary */}
      <div className="rounded-[24px] bg-white/95 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-display text-[18px] font-bold text-[#0F172A]">
            {t('Live Fee Summary', 'തത്സമയ ഫീസ് സംഗ്രഹം')}
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-bold border ${
              isGovt
                ? 'bg-blue-50 border-blue-200 text-[#0F50DC]'
                : 'bg-slate-100 border-slate-200 text-[#334155]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isGovt ? t('Govt / Police', 'സർക്കാർ / പോലീസ്') : t('General Public', 'പൊതുജനം')}
          </span>
        </div>

        <div className="rounded-[16px] bg-slate-50/90 border border-slate-200/75 p-4 flex flex-col gap-2.5 text-[13.5px]">
          <div className="flex items-center justify-between text-[#475569]">
            <span>
              {t('Base Fee', 'അടിസ്ഥാന ഫീസ്')} ({formData.selectedMonths}{' '}
              {formData.selectedMonths === 1 ? 'mo' : 'mos'})
            </span>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              {formatInr(pricing.baseFee)}
            </span>
          </div>

          {(pricing.concessionDiscount > 0 || isGovt) && (
            <div className="flex items-center justify-between text-emerald-700">
              <span className="font-medium">
                {t('Govt / Police Concession', 'സർക്കാർ / പോലീസ് ഇളവ്')} (
                {pricing.concessionPercent}%)
              </span>
              <span className="font-semibold tabular-nums">
                −{formatInr(pricing.concessionDiscount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[#475569]">
            <span>{t('Taxable Subtotal', 'നികുതി ബാധകമായ തുക')}</span>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              {formatInr(pricing.taxableSubtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#475569]">
            <span>GST ({pricing.gstPercent}%)</span>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              {formatInr(pricing.gstAmount)}
            </span>
          </div>

          <div className="mt-1 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between">
            <span className="font-bold text-[#0F172A]">
              {t('Total Payable', 'ആകെ അടയ്‌ക്കേണ്ട തുക')}
            </span>
            <span className="font-display text-[24px] font-extrabold text-[#165DF5] tabular-nums">
              {formatInr(pricing.totalPayable)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="btn-glass !h-12 px-6 text-[14px] inline-flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('Back to Details', 'വിവരങ്ങളിലേക്ക്')}</span>
        </button>

        <button
          type="button"
          disabled={isTrackUnavailable}
          onClick={onContinue}
          className={`btn-primary !h-12 px-7 text-[14.5px] inline-flex items-center justify-center gap-2 ${
            isTrackUnavailable ? 'opacity-55 cursor-not-allowed' : ''
          }`}
        >
          <span>{t('Review & Activate', 'പരിശോധിച്ച് തുടരുക')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
