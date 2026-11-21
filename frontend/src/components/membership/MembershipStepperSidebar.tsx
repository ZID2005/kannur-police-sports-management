import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ReceiptText, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { membershipOnboardingSteps } from '@/data/mockData';
import type { MembershipOnboardingStep } from '@/types/membership';

interface MembershipStepperSidebarProps {
  currentStep: MembershipOnboardingStep;
  maxReachedStep: MembershipOnboardingStep;
  monthlyCap: number;
  isGovt: boolean;
  onSelectStep: (step: MembershipOnboardingStep) => void;
}

export function MembershipStepperSidebar({
  currentStep,
  maxReachedStep,
  monthlyCap,
  isGovt,
  onSelectStep,
}: MembershipStepperSidebarProps) {
  const { lang, t } = useLanguage();

  return (
    <aside className="w-full lg:col-span-4 flex-shrink-0">
      {/* Mobile Progress Header */}
      <div className="lg:hidden mb-5 rounded-[22px] bg-white/90 backdrop-blur-xl border border-slate-200/85 p-4 shadow-sm">
        <div className="flex items-center justify-between w-full mb-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#64748B] hover:text-[#165DF5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Back to home', 'ഹോമിലേക്ക്')}</span>
          </Link>
          <span className="text-[12.5px] font-bold text-[#165DF5]">
            {t(`Step ${currentStep} of 3`, `ഘട്ടം ${currentStep} / 3`)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full">
          {membershipOnboardingSteps.map((item) => {
            const canClick = item.step <= maxReachedStep;
            const isActiveOrDone = item.step <= currentStep;
            return (
              <button
                key={item.step}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onSelectStep(item.step)}
                aria-label={`Step ${item.step}: ${item.label}`}
                className="flex flex-col gap-1.5 text-left disabled:cursor-default"
              >
                <span
                  className={`h-1.5 rounded-full transition-colors ${
                    isActiveOrDone ? 'bg-[#165DF5]' : 'bg-slate-200'
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold truncate ${
                    item.step === currentStep
                      ? 'text-[#0F172A]'
                      : isActiveOrDone
                        ? 'text-[#475569]'
                        : 'text-[#94A3B8]'
                  }`}
                >
                  {item.step}. {lang === 'ML' ? item.labelMl : item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Light-Surface Glass Stepper Card */}
      <div className="hidden lg:flex w-full rounded-[28px] p-7 bg-white/90 backdrop-blur-2xl border border-slate-200/85 shadow-[0_18px_46px_-20px_rgba(15,23,42,0.12)] flex-col sticky top-24">
        <div className="flex flex-col mb-7">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#165DF5]">
            {t('Synthetic 400m Track', 'സിന്തറ്റിക് 400m ട്രാക്ക്')}
          </span>
          <h2 className="font-display text-[21px] font-extrabold text-[#0F172A] tracking-[-0.02em] mt-1">
            {t('Membership Onboarding', 'അംഗത്വ രജിസ്ട്രേഷൻ')}
          </h2>
          <p className="text-[13px] text-[#64748B] mt-1">
            {t(`Step ${currentStep} of 3 • ${monthlyCap}-Member Cap`, `ഘട്ടം ${currentStep} / 3 • ${monthlyCap} അംഗ പരിധി`)}
          </p>
        </div>

        <div className="relative flex flex-col gap-6">
          {/* Vertical Connecting Line */}
          <div className="absolute left-[19px] top-5 bottom-5 w-[2px] bg-slate-200/90" />

          {membershipOnboardingSteps.map((item) => {
            const isCompleted = item.step < currentStep;
            const isActive = item.step === currentStep;
            const canClick = item.step <= maxReachedStep;

            return (
              <button
                key={item.step}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onSelectStep(item.step)}
                className={`relative z-10 flex items-start gap-3.5 text-left group focus:outline-none ${
                  canClick ? 'cursor-pointer' : 'cursor-default opacity-65'
                }`}
              >
                {isCompleted ? (
                  <div className="w-10 h-10 rounded-full bg-[#165DF5] text-white flex items-center justify-center shadow-[0_6px_16px_-4px_rgba(22,93,245,0.45)] shrink-0 transition-transform group-hover:scale-105">
                    <Check className="w-5 h-5" strokeWidth={2.6} />
                  </div>
                ) : isActive ? (
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-[#165DF5] flex items-center justify-center shadow-[0_0_0_4px_rgba(22,93,245,0.12)] shrink-0">
                    <span className="w-3 h-3 rounded-full bg-[#165DF5]" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-300 text-[#64748B] flex items-center justify-center shrink-0 text-[13px] font-bold">
                    {item.step}
                  </div>
                )}

                <div className="flex flex-col pt-0.5 min-w-0">
                  <span
                    className={`text-[14.5px] leading-snug ${
                      isActive
                        ? 'font-bold text-[#0F172A]'
                        : isCompleted
                          ? 'font-semibold text-[#1E293B]'
                          : 'font-medium text-[#64748B]'
                    }`}
                  >
                    {lang === 'ML' ? item.labelMl : item.label}
                  </span>
                  <span
                    className={`text-[12px] mt-0.5 leading-snug ${
                      isActive ? 'text-[#165DF5] font-medium' : 'text-[#64748B]'
                    }`}
                  >
                    {isCompleted
                      ? t('Completed', 'പൂർത്തിയായി')
                      : lang === 'ML'
                        ? item.subtitleMl
                        : item.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Instant Activation Guarantee Plate */}
        <div className="mt-8 rounded-[18px] bg-slate-50/95 border border-slate-200/80 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center shrink-0">
              <ReceiptText className="w-4 h-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-[12.5px] font-bold text-[#0F172A]">
                {t('Instant Self-Service Activation', 'ഉടൻ സജീവമാകുന്ന അംഗത്വം')}
              </span>
              <p className="text-[11.5px] text-[#64748B] mt-0.5 leading-relaxed">
                {t(
                  'Complete onboarding and settle your GST fee online for immediate active status with a printable official receipt.',
                  'വിവരങ്ങൾ നൽകി GST ഫീസ് അടയ്ക്കുന്നതോടെ ഉടൻ അംഗത്വം സജീവമാകുകയും പ്രിന്റ് ചെയ്യാവുന്ന രസീത് ലഭിക്കുകയും ചെയ്യും.',
                )}
              </p>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200/80 flex items-center gap-2 text-[11.5px] font-semibold text-[#334155]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#165DF5] shrink-0" />
            <span>
              {isGovt
                ? t('Govt / Police 50% Concession Active', 'സർക്കാർ / പോലീസ് 50% ഇളവ് സജീവം')
                : t('Standard Public Track Tariff', 'സാധാരണ പൊതുജന നിരക്ക്')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
