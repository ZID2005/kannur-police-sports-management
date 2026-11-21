import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CreditCard,
  Edit3,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { AuthUser } from '@/api/client';
import { useLanguage } from '@/context/LanguageContext';
import { membershipGenderOptions, membershipSessionOptions } from '@/data/mockData';
import type {
  MembershipOnboardingFormData,
  MembershipOnboardingStep,
  MembershipPricingSummary,
} from '@/types/membership';

interface MembershipReviewStepProps {
  user: AuthUser | null;
  trackName: string;
  formData: MembershipOnboardingFormData;
  pricing: MembershipPricingSummary;
  isGovt: boolean;
  isTrackUnavailable: boolean;
  submitting: boolean;
  errorMessage: string | null;
  declarationError?: string;
  onToggleDeclaration: (accepted: boolean) => void;
  onJumpToStep: (step: MembershipOnboardingStep) => void;
  onBack: () => void;
  onActivate: () => void;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDobDisplay(isoDate: string): string {
  if (!isoDate) return '—';
  const dt = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function MembershipReviewStep({
  user,
  trackName,
  formData,
  pricing,
  isGovt,
  isTrackUnavailable,
  submitting,
  errorMessage,
  declarationError,
  onToggleDeclaration,
  onJumpToStep,
  onBack,
  onActivate,
}: MembershipReviewStepProps) {
  const { lang, t } = useLanguage();

  const genderMeta = membershipGenderOptions.find((g) => g.value === formData.gender);
  const sessionMeta = membershipSessionOptions.find((s) => s.id === formData.sessionWindow);

  const formattedPresentAddress = [
    formData.presentAddress.trim(),
    formData.cityLocality.trim(),
    formData.pinCode.trim() ? `PIN ${formData.pinCode.trim()}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <section className="lg:col-span-8 w-full flex flex-col gap-5 membership-step-enter">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#165DF5]">
          {t('Step 3 of 3 • Review & Instant Activation', 'ഘട്ടം 3 / 3 • പരിശോധനയും സജീവമാക്കലും')}
        </p>
        <h1 className="font-display text-[28px] sm:text-[34px] font-extrabold text-[#0F172A] tracking-[-0.03em] leading-[1.1]">
          {t('Review & Activate Membership', 'വിവരങ്ങൾ പരിശോധിച്ച് സജീവമാക്കുക')}
        </h1>
        <p className="text-[14px] text-[#475569]">
          {t(
            'Verify your member details, chosen track plan, and official GST breakdown below. Your membership becomes ACTIVE immediately upon checkout.',
            'നിങ്ങളുടെ വിവരങ്ങളും പ്ലാനും GST ഫീസും പരിശോധിക്കുക. പണമടച്ചാലുടൻ അംഗത്വം സജീവമാകും.',
          )}
        </p>
      </div>

      {/* Card 1: Member Demographics & Personal Details */}
      <article className="rounded-[24px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)]">
        <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
              <User className="w-4 h-4" />
            </span>
            <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
              {t('Member Profile & Demographics', 'അംഗ പ്രൊഫൈലും വ്യക്തിഗത വിവരങ്ങളും')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(1)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#165DF5] hover:text-[#0F50DC]"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('Edit', 'തിരുത്തുക')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13.5px]">
          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Full Name', 'പൂർണ്ണനാമം')}
            </span>
            <span className="font-semibold text-[#0F172A] mt-0.5 block">
              {user?.full_name ?? t('Sign in required', 'സൈൻ ഇൻ ആവശ്യമാണ്')}
            </span>
          </div>

          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Account Category', 'അക്കൗണ്ട് വിഭാഗം')}
            </span>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-slate-100 text-[#334155]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#165DF5]" />
              {isGovt ? t('Govt / Police', 'സർക്കാർ / പോലീസ്') : t('General Public', 'പൊതുജനം')}
            </span>
          </div>

          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Gender', 'ലിംഗം')}
            </span>
            <span className="font-semibold text-[#0F172A] mt-0.5 block">
              {genderMeta ? (lang === 'ML' ? genderMeta.labelMl : genderMeta.label) : '—'}
            </span>
          </div>

          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Date of Birth', 'ജനനത്തീയതി')}
            </span>
            <span className="font-semibold text-[#0F172A] mt-0.5 block">
              {formatDobDisplay(formData.dateOfBirth)}
            </span>
          </div>

          {formData.parentName.trim() && (
            <div className="sm:col-span-2">
              <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                {t("Father's or Mother's Name", 'പിതാവിന്റെ / മാതാവിന്റെ പേര്')}
              </span>
              <span className="font-medium text-[#0F172A] mt-0.5 block">
                {formData.parentName.trim()}
              </span>
            </div>
          )}
        </div>
      </article>

      {/* Card 2: Address & Track Profile */}
      <article className="rounded-[24px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)]">
        <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </span>
            <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
              {t('Residential Address & Track Profile', 'താമസ വിലാസവും ട്രാക്ക് വിവരങ്ങളും')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(1)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#165DF5] hover:text-[#0F50DC]"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('Edit', 'തിരുത്തുക')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13.5px]">
          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Present Address', 'താമസ വിലാസം')}
            </span>
            <span className="text-[#0F172A] mt-0.5 block leading-relaxed">
              {formattedPresentAddress || '—'}
            </span>
          </div>

          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Permanent Address', 'സ്ഥിര വിലാസം')}
            </span>
            <span className="text-[#0F172A] mt-0.5 block leading-relaxed">
              {formData.sameAsPresent
                ? t('Same as present address', 'താമസ വിലാസത്തിന് സമാനം')
                : formData.permanentAddress.trim() || '—'}
            </span>
          </div>

          {isGovt && (
            <>
              <div>
                <span className="flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                  <Building2 className="w-3 h-3 text-[#165DF5]" />
                  {t('Designation / Rank', 'തസ്തിക')}
                </span>
                <span className="font-semibold text-[#0F172A] mt-0.5 block">
                  {formData.designation.trim() || '—'}
                </span>
              </div>

              <div>
                <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
                  {t('Office / Station Address', 'ഓഫീസ് വിലാസം')}
                </span>
                <span className="text-[#0F172A] mt-0.5 block leading-relaxed">
                  {formData.officeAddress.trim() || '—'}
                </span>
              </div>
            </>
          )}

          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Purpose of Track Use', 'ട്രാക്ക് ഉപയോഗ ലക്ഷ്യം')}
            </span>
            <span className="text-[#0F172A] mt-0.5 block">{formData.trackPurpose.trim() || '—'}</span>
          </div>

          <div>
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Registered Sportsperson', 'രജിസ്റ്റർ ചെയ്ത കായികതാരം')}
            </span>
            <span className="text-[#0F172A] mt-0.5 block">
              {formData.isRegisteredSportsperson
                ? `${t('Yes', 'അതെ')} — ${formData.sportDiscipline.trim()}${
                    formData.associationDetails.trim()
                      ? ` (${formData.associationDetails.trim()})`
                      : ''
                  }`
                : t('No', 'ഇല്ല')}
            </span>
          </div>
        </div>
      </article>

      {/* Card 3: Chosen Plan & Official GST Breakdown */}
      <article className="rounded-[24px] bg-white/95 backdrop-blur-2xl border border-slate-200/85 p-5 sm:p-6 shadow-[0_14px_36px_-18px_rgba(15,23,42,0.1)] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                {t('Selected Plan & GST Fee Summary', 'തിരഞ്ഞെടുത്ത പ്ലാനും GST ഫീസും')}
              </h2>
              <p className="text-[12px] text-[#64748B]">{trackName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(2)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#165DF5] hover:text-[#0F50DC]"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('Change Plan', 'പ്ലാൻ മാറ്റുക')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13.5px]">
          <div className="rounded-[14px] bg-slate-50 border border-slate-200/75 px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Duration', 'കാലാവധി')}
            </span>
            <p className="font-display font-bold text-[#0F172A] mt-0.5">
              {formData.selectedMonths}{' '}
              {formData.selectedMonths === 1
                ? t('Month (30 Days)', 'മാസം (30 ദിവസം)')
                : t(`Months (${formData.selectedMonths * 30} Days)`, `മാസം (${formData.selectedMonths * 30} ദിവസം)`)}
            </p>
          </div>
          <div className="rounded-[14px] bg-slate-50 border border-slate-200/75 px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#64748B]">
              {t('Daily Session Window', 'പ്രതിദിന സെഷൻ')}
            </span>
            <p className="font-display font-bold text-[#0F172A] mt-0.5">
              {sessionMeta ? (lang === 'ML' ? sessionMeta.labelMl : sessionMeta.label) : formData.sessionWindow}{' '}
              <span className="text-[12px] font-normal text-[#64748B]">
                ({sessionMeta?.hoursLabel})
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-[16px] bg-slate-50/90 border border-slate-200/75 p-4 flex flex-col gap-2 text-[13.5px]">
          <div className="flex items-center justify-between text-[#475569]">
            <span>{t('Base Fee', 'അടിസ്ഥാന ഫീസ്')}</span>
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
              {t('Total Payable Now', 'ഇപ്പോൾ അടയ്‌ക്കേണ്ട തുക')}
            </span>
            <span className="font-display text-[24px] font-extrabold text-[#165DF5] tabular-nums">
              {formatInr(pricing.totalPayable)}
            </span>
          </div>
        </div>
      </article>

      {/* Card 4: Member Declaration & Instant Activation Consent */}
      <article
        className={`rounded-[22px] bg-white/90 border p-5 shadow-sm ${
          declarationError ? 'border-red-300 bg-red-50/40' : 'border-slate-200/85'
        }`}
      >
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <span className="relative flex items-center justify-center mt-0.5 shrink-0">
            <input
              id="onboard-declaration"
              type="checkbox"
              checked={formData.declarationAccepted}
              onChange={(e) => onToggleDeclaration(e.target.checked)}
              className="peer sr-only"
            />
            <span className="w-[20px] h-[20px] rounded-[6px] border border-slate-300 bg-white peer-checked:bg-[#165DF5] peer-checked:border-[#165DF5] transition-all flex items-center justify-center">
              <Check
                className={`w-3.5 h-3.5 text-white transition-transform ${
                  formData.declarationAccepted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
                strokeWidth={3}
              />
            </span>
          </span>
          <span className="text-[13.5px] text-[#334155] leading-relaxed">
            <strong className="text-[#0F172A]">
              {t(
                'I confirm that the onboarding details provided above are accurate and agree to the Kannur City Police Sports Complex track rules and code of conduct.',
                'മുകളിൽ നൽകിയ വിവരങ്ങൾ ശരിയാണെന്നും കണ്ണൂർ സിറ്റി പോലീസ് സ്പോർട്സ് കോംപ്ലക്സ് നിയമങ്ങൾ പാലിക്കാമെന്നും ഞാൻ സ്ഥിരീകരിക്കുന്നു.',
              )}
            </strong>
            <span className="block text-[12px] text-[#64748B] mt-1">
              {t(
                'Completing checkout activates your Synthetic Track membership immediately and issues an official printable GST fee receipt.',
                'പണമടയ്ക്കൽ പൂർത്തിയാക്കുന്നതോടെ അംഗത്വം ഉടൻ സജീവമാകുകയും പ്രിന്റ് ചെയ്യാവുന്ന GST രസീത് ലഭിക്കുകയും ചെയ്യും.',
              )}
            </span>
          </span>
        </label>
        {declarationError && (
          <p className="text-[12px] font-semibold text-[#DC2626] mt-2 pl-8">{declarationError}</p>
        )}
      </article>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-[16px] bg-rose-50 border border-rose-200 px-4 py-3 text-[13px] font-medium text-rose-800"
        >
          {errorMessage}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="btn-glass !h-12 px-6 text-[14px] inline-flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('Back to Plan', 'പ്ലാനിലേക്ക്')}</span>
        </button>

        <button
          type="button"
          disabled={submitting || isTrackUnavailable}
          onClick={onActivate}
          className={`btn-primary !h-12 px-7 text-[14.5px] inline-flex items-center justify-center gap-2 ${
            submitting || isTrackUnavailable ? 'opacity-55 cursor-not-allowed' : ''
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('Activating Membership...', 'അംഗത്വം സജീവമാക്കുന്നു...')}</span>
            </>
          ) : isTrackUnavailable ? (
            <>
              <Lock className="w-4 h-4" />
              <span>{t('Enrollment Temporarily Paused', 'രജിസ്ട്രേഷൻ താൽക്കാലികമായി നിർത്തി')}</span>
            </>
          ) : user ? (
            <>
              <CreditCard className="w-4 h-4" />
              <span className="tabular-nums">
                {t('Activate & Pay', 'സജീവമാക്കി പണമടയ്ക്കുക')} ({formatInr(pricing.totalPayable)})
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>{t('Sign in to Activate', 'സൈൻ ഇൻ ചെയ്ത് സജീവമാക്കുക')}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
