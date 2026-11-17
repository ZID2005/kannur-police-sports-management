import { useState } from 'react';
import type {
  CourtScopeFilterId,
  CourtScopeFilterOption,
  FacilityDateOption,
} from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface FacilityDateFilterBarProps {
  dateOptions: FacilityDateOption[];
  selectedDateIndex: number;
  onSelectDateIndex: (index: number) => void;
  courtScopeOptions: CourtScopeFilterOption[];
  selectedScope: CourtScopeFilterId;
  onSelectScope: (scope: CourtScopeFilterId) => void;
}

export function FacilityDateFilterBar({
  dateOptions,
  selectedDateIndex,
  onSelectDateIndex,
  courtScopeOptions,
  selectedScope,
  onSelectScope,
}: FacilityDateFilterBarProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const currentDate = dateOptions[selectedDateIndex] ?? dateOptions[0];

  const handlePrevDate = () => {
    const prevIndex = selectedDateIndex > 0 ? selectedDateIndex - 1 : dateOptions.length - 1;
    onSelectDateIndex(prevIndex);
  };

  const handleNextDate = () => {
    const nextIndex = selectedDateIndex < dateOptions.length - 1 ? selectedDateIndex + 1 : 0;
    onSelectDateIndex(nextIndex);
  };

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-2xl p-space-md shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
      {/* Date Navigator */}
      <div className="relative flex items-center gap-space-xs sm:gap-space-sm w-full lg:w-auto justify-between lg:justify-start">
        <button
          type="button"
          onClick={handlePrevDate}
          className="h-10 px-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-meta text-label-meta font-medium flex items-center gap-1 transition-all"
        >
          <MaterialIcon name="chevron_left" className="text-[18px]" />
          <span className="hidden sm:inline">Yesterday</span>
        </button>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container text-on-surface shadow-inner">
          <MaterialIcon name="calendar_today" className="text-[18px] text-primary" />
          <span className="font-label-primary text-label-primary font-bold">
            {currentDate.label}
          </span>
          <span className="font-label-meta text-label-meta text-on-surface-variant">
            {currentDate.dayName}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextDate}
          className="h-10 px-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-meta text-label-meta font-medium flex items-center gap-1 transition-all"
        >
          <span className="hidden sm:inline">Tomorrow</span>
          <MaterialIcon name="chevron_right" className="text-[18px]" />
        </button>

        <button
          type="button"
          onClick={() => setIsDatePickerOpen((prev) => !prev)}
          className="h-10 px-3.5 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-1.5 font-label-meta text-label-meta"
        >
          <MaterialIcon name="edit_calendar" className="text-[16px]" />
          <span>Pick Date</span>
        </button>

        {isDatePickerOpen && (
          <div className="absolute top-12 right-0 z-30 w-64 rounded-2xl bg-surface-container-lowest p-2 shadow-xl border border-surface-container-high flex flex-col gap-1">
            {dateOptions.map((option, idx) => {
              const isSelected = idx === selectedDateIndex;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelectDateIndex(idx);
                    setIsDatePickerOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left font-label-meta text-label-meta flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-primary text-on-primary font-semibold'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`font-caption text-caption ${
                      isSelected ? 'text-primary-fixed' : 'text-on-surface-variant'
                    }`}
                  >
                    {option.dayName}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Court Scope Filter */}
      <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
        {courtScopeOptions.map((scopeOption) => {
          const isActive = scopeOption.id === selectedScope;
          return (
            <button
              key={scopeOption.id}
              type="button"
              onClick={() => onSelectScope(scopeOption.id)}
              className={
                isActive
                  ? 'px-3.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-meta text-label-meta font-semibold shadow-sm whitespace-nowrap'
                  : 'px-3.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface font-label-meta text-label-meta font-medium transition-colors whitespace-nowrap'
              }
            >
              {scopeOption.label}
            </button>
          );
        })}
      </div>

      {/* Visual Legend of Slot States */}
      <div className="flex items-center gap-4 flex-wrap text-caption font-caption text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary-container" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Authority Blocked</span>
        </div>
      </div>
    </div>
  );
}
