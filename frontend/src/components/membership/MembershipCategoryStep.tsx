import { membershipCategories } from '@/data/mockData';
import type { MembershipApplicantCategoryId } from '@/types/membership';

interface MembershipCategoryStepProps {
  selectedCategory: MembershipApplicantCategoryId | null;
  onSelectCategory: (category: MembershipApplicantCategoryId) => void;
  onContinue: () => void;
}

export function MembershipCategoryStep({
  selectedCategory,
  onSelectCategory,
  onContinue,
}: MembershipCategoryStepProps) {
  return (
    <section className="w-full lg:col-span-8 flex flex-col">
      <div className="mb-7 md:mb-8">
        <h1 className="font-title-portal text-[32px] leading-[38px] md:text-[44px] md:leading-[52px] font-bold text-on-surface tracking-tight mb-2">
          Who is applying?
        </h1>
        <p className="font-body-default text-[15px] md:text-body-default text-tertiary">
          Choose the category that applies to you.
        </p>
      </div>

      {/* Stacked Choice Cards */}
      <div
        aria-label="Applicant category selection"
        role="radiogroup"
        className="flex flex-col gap-4 md:gap-6 mb-6"
      >
        {membershipCategories.map((option) => {
          const isSelected = selectedCategory === option.id;

          return (
            <div
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectCategory(option.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onSelectCategory(option.id);
                }
              }}
              className={`group relative w-full rounded-[24px] md:rounded-[36px] p-5 md:p-8 cursor-pointer transition-all duration-300 flex items-start md:items-center justify-between gap-4 md:gap-6 outline-none ${
                isSelected
                  ? 'bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_0_0_2px_#0053cd,0_0_24px_rgba(0,83,205,0.18),inset_0_1px_0_0_rgba(255,255,255,0.95)]'
                  : 'bg-surface-container-lowest/60 backdrop-blur-xl shadow-[0_16px_36px_rgba(17,20,24,0.03),inset_0_1px_0_0_rgba(255,255,255,0.8)] hover:-translate-y-1 hover:bg-surface-container-lowest/80 hover:shadow-[0_16px_36px_-8px_rgba(31,111,255,0.16),0_0_0_1px_rgba(31,111,255,0.30),inset_0_1px_2px_rgba(255,255,255,0.95)]'
              }`}
            >
              <div className="flex items-start md:items-center gap-4 md:gap-6 min-w-0 flex-1">
                <div
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-[16px] md:rounded-[22px] flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] group-hover:scale-105 transition-transform duration-300 ${
                    isSelected
                      ? 'bg-secondary-fixed/50 text-primary'
                      : 'bg-secondary-fixed/40 text-primary group-hover:bg-secondary-fixed/70'
                  }`}
                >
                  {option.iconName === 'person' ? (
                    <svg
                      className="w-6 h-6 md:w-7 md:h-7 stroke-current"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6 md:w-7 md:h-7 stroke-current"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      viewBox="0 0 24 24"
                    >
                      <rect height="16" rx="3" width="18" x="3" y="4" />
                      <circle cx="12" cy="10" r="3" />
                      <path d="M7 17a5 5 0 0 1 10 0" />
                    </svg>
                  )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-headline-card text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-semibold text-on-surface mb-1">
                    {option.title}
                  </span>
                  <p className="font-label-primary text-[13px] md:text-label-primary text-tertiary pr-2 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </div>

              {/* Radio / Checkmark Indicator */}
              {isSelected ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(0,83,205,0.3)] mt-0.5 md:mt-0">
                  <svg
                    className="w-3.5 h-3.5 stroke-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full shadow-[0_0_0_1.5px_#9CA3AF] flex items-center justify-center shrink-0 bg-surface-container-lowest/40 mt-0.5 md:mt-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <button
        type="button"
        disabled={!selectedCategory}
        onClick={onContinue}
        className={`w-full h-14 rounded-[22px] bg-[#1F6FFF] text-white font-body-medium text-body-medium shadow-[0_8px_24px_rgba(0,83,205,0.28),inset_0_1px_1px_rgba(255,255,255,0.25)] transition-all flex items-center justify-center select-none ${
          selectedCategory
            ? 'hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer'
            : 'opacity-30 cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </section>
  );
}
