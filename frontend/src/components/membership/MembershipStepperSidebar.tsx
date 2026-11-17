import { Link } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { membershipCategories, membershipSteps } from '@/data/mockData';
import type { MembershipApplicantCategoryId, MembershipWizardStep } from '@/types/membership';

interface MembershipStepperSidebarProps {
  currentStep: 1 | 2 | 3 | 4;
  selectedCategory: MembershipApplicantCategoryId | null;
  onSelectStep?: (step: MembershipWizardStep) => void;
}

export function MembershipStepperSidebar({
  currentStep,
  selectedCategory,
  onSelectStep,
}: MembershipStepperSidebarProps) {
  const categoryMeta = membershipCategories.find((c) => c.id === selectedCategory);

  const getStepSublabel = (stepNum: 1 | 2 | 3 | 4, isCompleted: boolean, isActive: boolean): string | null => {
    if (currentStep === 1 || currentStep === 2) {
      return null;
    }
    if (currentStep === 3) {
      if (stepNum === 1) return categoryMeta?.stepSubtitle ?? 'Kerala Police Personnel';
      if (stepNum === 2) return categoryMeta?.detailsSubtitle ?? 'PEN & Station Verified';
      if (stepNum === 3) return 'In progress';
      if (stepNum === 4) return 'Final authorization';
    }
    if (currentStep === 4) {
      if (isCompleted) return 'Completed';
      if (isActive) return 'In progress';
    }
    return null;
  };

  return (
    <aside className="w-full lg:col-span-4 lg:w-full flex-shrink-0">
      {/* Mobile Progress Header (from mobile_membership_step_1 & step_2 exports) */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center justify-between w-full mb-3.5">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[14px] font-medium text-[#4B5563] hover:text-[#1F6FFF] transition-colors group"
          >
            <MaterialIcon
              name="chevron_left"
              className="text-[18px] text-[#4B5563] group-hover:text-[#1F6FFF] transition-transform group-hover:-translate-x-0.5"
            />
            <span>Back to home</span>
          </Link>
          <span className="text-[13px] font-medium text-[#6B7280]">Step {currentStep} of 4</span>
        </div>
        <div className="grid grid-cols-4 gap-2 w-full">
          {[1, 2, 3, 4].map((segment) => (
            <button
              key={segment}
              type="button"
              aria-label={`Go to step ${segment}`}
              onClick={() => onSelectStep?.(segment as MembershipWizardStep)}
              className={`h-1.5 rounded-full transition-colors ${
                segment <= currentStep ? 'bg-[#1F6FFF]' : 'bg-[#D1D5DB]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop Liquid Glass Stepper Card */}
      <div className="hidden lg:flex w-full rounded-[36px] p-8 bg-surface-container-lowest/60 backdrop-blur-[40px] shadow-[0_20px_40px_rgba(31,111,255,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)] flex-col relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-surface-container-lowest/80 pointer-events-none" />

        <div className="flex flex-col mb-10">
          <h2 className="font-headline-card text-[22px] leading-[30px] font-bold text-on-surface tracking-tight">
            Apply for membership
          </h2>
          <p className="font-label-primary text-label-primary text-tertiary mt-1">
            Synthetic Track · Step {currentStep} of 4
          </p>
        </div>

        <div className="relative flex flex-col gap-7">
          {/* Continuous Connecting Vertical Line */}
          <div
            className={`absolute left-5 top-5 bottom-5 w-[2px] -z-0 ${
              currentStep === 4 ? 'bg-primary' : 'bg-[#E1E5EE]'
            }`}
          />

          {membershipSteps.map((item) => {
            const isCompleted = item.step < currentStep;
            const isActive = item.step === currentStep;
            const sublabel = getStepSublabel(item.step, isCompleted, isActive);

            return (
              <button
                key={item.step}
                type="button"
                onClick={() => onSelectStep?.(item.step)}
                className={`relative z-10 flex items-center gap-4 text-left group focus:outline-none ${
                  !isCompleted && !isActive && currentStep === 3 ? 'opacity-70' : ''
                }`}
              >
                {isCompleted ? (
                  <div className="w-10 h-10 rounded-full bg-[#1F6FFF] flex items-center justify-center shadow-[0_4px_12px_rgba(31,111,255,0.28)] shrink-0 transition-transform group-hover:scale-105">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.4"
                      viewBox="0 0 20 20"
                    >
                      <polyline points="4 10.5 8 14.5 16 6.5" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-[0_0_0_2px_#1F6FFF,0_0_18px_rgba(31,111,255,0.35)] shrink-0">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#1F6FFF]" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-container-lowest/80 shadow-[0_0_0_1.5px_#C2C6D8] flex items-center justify-center shrink-0">
                    {currentStep >= 2 && (
                      <span className="font-label-meta text-label-meta text-secondary font-medium">
                        {item.step}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-col min-w-0">
                  <span
                    className={
                      isActive
                        ? 'font-body-medium text-body-medium text-on-surface font-semibold leading-tight'
                        : isCompleted
                          ? 'font-body-medium text-body-medium text-on-surface leading-tight'
                          : 'font-body-default text-body-default text-tertiary leading-tight'
                    }
                  >
                    {item.label}
                  </span>
                  {sublabel && (
                    <span
                      className={`font-caption text-caption mt-0.5 ${
                        isActive ? 'text-primary font-medium' : 'text-tertiary'
                      }`}
                    >
                      {sublabel}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Security Badge info plate shown on Step 3 & Step 4 */}
        {currentStep === 3 && (
          <div className="mt-10 rounded-2xl bg-surface-container-lowest/70 backdrop-blur-xl p-4 flex items-start gap-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]">
            <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0 text-primary">
              <MaterialIcon name="verified_user" className="text-[18px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-primary text-label-primary font-semibold text-on-surface">
                Official KCP portal
              </span>
              <p className="font-caption text-caption text-tertiary mt-0.5 leading-relaxed">
                Identity verification operates under Kerala Police Cyber Safety Directives 2024.
              </p>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="mt-10 pt-6 bg-surface-container-lowest/40 rounded-2xl p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-start gap-3">
            <MaterialIcon name="verified_user" className="text-primary text-[20px] flex-shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-label-meta text-label-meta text-on-surface font-semibold">
                Departmental verification
              </span>
              <span className="font-caption text-caption text-tertiary mt-0.5 leading-relaxed">
                Identity linked with Kerala Police Personnel Identification system.
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
