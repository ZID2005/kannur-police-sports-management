import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Lock,
  Moon,
  ShieldAlert,
  Sun,
  Wrench,
} from 'lucide-react';
import type { FacilityOperationalStatus } from '@/api/client';
import { useLanguage } from '@/context/LanguageContext';
import type {
  BookingDateOption,
  BookingPortalMeta,
  BookingTimeSlot,
} from '@/types/bookings';

interface SlotSelectionWorkspaceProps {
  meta: BookingPortalMeta;
  venueName: string;
  venueOperationalStatus: FacilityOperationalStatus;
  loadingSlots?: boolean;
  dailyCapInfo?: { usedHours: number; capHours: number } | null;
  dates: BookingDateOption[];
  selectedDateId: string;
  onSelectDate: (dateId: string) => void;
  slots: BookingTimeSlot[];
  selectedSlotId: string;
  onSelectSlot: (slotId: string) => void;
  hourlyRate: number;
}

export function SlotSelectionWorkspace({
  meta,
  venueName,
  venueOperationalStatus,
  loadingSlots = false,
  dailyCapInfo,
  dates,
  selectedDateId,
  onSelectDate,
  slots,
  selectedSlotId,
  onSelectSlot,
  hourlyRate,
}: SlotSelectionWorkspaceProps) {
  const { t } = useLanguage();
  const morningSlots = slots.filter((s) => s.session === 'morning');
  const eveningSlots = slots.filter((s) => s.session === 'evening');
  const formattedRate = `₹${hourlyRate.toLocaleString('en-IN')}`;
  const isVenueUnavailable = venueOperationalStatus !== 'ACTIVE';
  const capReached =
    Boolean(dailyCapInfo) &&
    (dailyCapInfo?.usedHours ?? 0) >= (dailyCapInfo?.capHours ?? Number.POSITIVE_INFINITY);

  const selectableDates = dates.filter((d) => !d.isPast);
  const currentIdx = selectableDates.findIndex((d) => d.id === selectedDateId);

  const handlePrevDate = () => {
    if (currentIdx > 0) {
      onSelectDate(selectableDates[currentIdx - 1].id);
    }
  };

  const handleNextDate = () => {
    if (currentIdx >= 0 && currentIdx < selectableDates.length - 1) {
      onSelectDate(selectableDates[currentIdx + 1].id);
    }
  };

  const renderSlotButton = (slot: BookingTimeSlot) => {
    const isSelected = slot.id === selectedSlotId && slot.status === 'available' && !isVenueUnavailable;

    if (slot.status === 'blocked_maintenance') {
      return (
        <div
          key={slot.id}
          title={slot.operationalReason ?? slot.operationalLabel ?? 'Blocked for Maintenance'}
          className="px-3.5 py-2.5 rounded-[14px] bg-amber-50/85 border border-amber-200/90 flex flex-col justify-between min-h-[88px] select-none cursor-not-allowed"
        >
          <span className="text-[12.5px] font-semibold text-amber-900/80 tabular-nums tracking-[-0.01em]">
            {slot.timeLabel}
          </span>
          <div className="flex flex-col gap-0.5 mt-1">
            <div className="flex items-center gap-1.5 text-amber-800">
              <Wrench className="w-3.5 h-3.5 shrink-0" strokeWidth={2.1} />
              <span className="text-[11px] font-bold truncate">
                {slot.operationalLabel || t('Blocked for Maintenance', 'അറ്റകുറ്റപ്പണി തടസ്സം')}
              </span>
            </div>
            {slot.operationalReason && (
              <span className="text-[10.5px] text-amber-700/90 truncate">
                {slot.operationalReason}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (slot.status === 'reserved_department') {
      return (
        <div
          key={slot.id}
          title={slot.operationalReason ?? slot.operationalLabel ?? 'Reserved for Department'}
          className="px-3.5 py-2.5 rounded-[14px] bg-indigo-50/85 border border-indigo-200/90 flex flex-col justify-between min-h-[88px] select-none cursor-not-allowed"
        >
          <span className="text-[12.5px] font-semibold text-indigo-900/80 tabular-nums tracking-[-0.01em]">
            {slot.timeLabel}
          </span>
          <div className="flex flex-col gap-0.5 mt-1">
            <div className="flex items-center gap-1.5 text-indigo-800">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" strokeWidth={2.1} />
              <span className="text-[11px] font-bold truncate">
                {slot.operationalLabel || t('Reserved for Department', 'വകുപ്പിനായി സംവരണം')}
              </span>
            </div>
            {slot.operationalReason && (
              <span className="text-[10.5px] text-indigo-700/90 truncate">
                {slot.operationalReason}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (slot.status === 'facility_unavailable' || isVenueUnavailable) {
      return (
        <div
          key={slot.id}
          className="px-3.5 py-2.5 rounded-[14px] bg-slate-100/85 border border-slate-200/80 flex flex-col justify-between min-h-[88px] opacity-75 select-none cursor-not-allowed"
        >
          <span className="text-[12.5px] font-semibold text-[#64748B] tabular-nums tracking-[-0.01em]">
            {slot.timeLabel}
          </span>
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span className="text-[11px] font-semibold truncate">
              {venueOperationalStatus === 'CLOSED'
                ? t('Venue Closed', 'വേദി അടച്ചിരിക്കുന്നു')
                : t('Under Maintenance', 'അറ്റകുറ്റപ്പണിയിൽ')}
            </span>
          </div>
        </div>
      );
    }

    if (slot.status !== 'available') {
      return (
        <div
          key={slot.id}
          className="px-3.5 py-2.5 rounded-[14px] bg-slate-100/80 border border-slate-200/75 flex flex-col justify-between min-h-[88px] opacity-75 select-none cursor-not-allowed"
        >
          <span className="text-[12.5px] font-semibold text-[#94A3B8] tabular-nums tracking-[-0.01em]">
            {slot.timeLabel}
          </span>
          <div className="flex items-center gap-1.5 text-[#94A3B8]">
            <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span className="text-[11.5px] font-medium">
              {t('Already Booked', 'ബുക്ക് ചെയ്തുകഴിഞ്ഞു')}
            </span>
          </div>
        </div>
      );
    }

    if (isSelected) {
      return (
        <button
          key={slot.id}
          type="button"
          onClick={() => onSelectSlot(slot.id)}
          className="relative px-3.5 py-2.5 rounded-[14px] bg-[#165DF5] border border-[#0F49C7] text-white shadow-[0_10px_24px_-8px_rgba(22,93,245,0.48),inset_0_1px_0_rgba(255,255,255,0.2)] flex flex-col justify-between min-h-[88px] text-left transition-all duration-200 active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-[12.5px] font-semibold text-white tabular-nums tracking-[-0.01em] whitespace-nowrap">
              {slot.timeLabel}
            </span>
            <span className="bookings-pop w-[18px] h-[18px] rounded-full bg-white text-[#165DF5] flex items-center justify-center shrink-0">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-[11.5px] text-blue-100 font-medium truncate">
              {slot.sessionTag}
            </span>
            <span className="text-[13px] font-bold text-white tabular-nums whitespace-nowrap shrink-0">
              {formattedRate}
            </span>
          </div>
        </button>
      );
    }

    return (
      <button
        key={slot.id}
        type="button"
        onClick={() => onSelectSlot(slot.id)}
        className="px-3.5 py-2.5 rounded-[14px] bg-white border border-slate-200/90 hover:border-[#165DF5]/70 hover:shadow-[0_8px_20px_-10px_rgba(22,93,245,0.26)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[88px] text-left group active:scale-[0.99]"
      >
        <span className="text-[12.5px] font-semibold text-[#0F172A] group-hover:text-[#165DF5] transition-colors tabular-nums tracking-[-0.01em] whitespace-nowrap">
          {slot.timeLabel}
        </span>
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-[12.5px] font-bold text-[#0F172A] tabular-nums whitespace-nowrap">
            {formattedRate}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-semibold whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t('Available', 'ലഭ്യമാണ്')}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div
      style={{ animationDelay: '260ms' }}
      className="bookings-rise lg:col-span-8 flex flex-col"
    >
      {/* Unified Schedule & Slot Selection Card */}
      <div className="w-full rounded-[24px] bg-white/85 backdrop-blur-2xl border border-slate-200/85 shadow-[0_18px_44px_-18px_rgba(15,23,42,0.1)] overflow-hidden flex flex-col">
        {/* Section 1: Date Picker Header & 7-Day Calendar Strip */}
        <div className="p-5 md:p-6 border-b border-slate-200/75 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center shrink-0">
                <CalendarDays className="w-[18px] h-[18px]" strokeWidth={2} />
              </span>
              <div>
                <h2 className="font-display text-[18px] md:text-[19px] font-bold text-[#0F172A] tracking-[-0.02em] leading-tight">
                  {t('Select Date & Playing Slot', 'തീയതിയും സമയവും തിരഞ്ഞെടുക്കുക')}
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  {t(
                    'Pick a date below to view live court availability',
                    'തത്സമയ കോർട്ട് ലഭ്യത കാണാൻ താഴെ ഒരു തീയതി തിരഞ്ഞെടുക്കുക',
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dailyCapInfo && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11.5px] font-semibold tabular-nums ${
                    capReached
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-slate-100 border-slate-200 text-[#334155]'
                  }`}
                >
                  {t('Daily cap:', 'പ്രതിദിന പരിധി:')} {dailyCapInfo.usedHours}/{dailyCapInfo.capHours}h
                </span>
              )}

              {/* Month & Day Stepper Pill */}
              <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 pl-3.5 pr-1.5 py-1 rounded-full">
                <span className="text-[13px] font-semibold text-[#0F172A] tabular-nums">
                  {meta.calendarMonthLabel}
                </span>
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    aria-label="Previous day"
                    onClick={handlePrevDate}
                    disabled={currentIdx <= 0}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#475569] hover:text-[#0F172A] hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next day"
                    onClick={handleNextDate}
                    disabled={currentIdx < 0 || currentIdx >= selectableDates.length - 1}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#475569] hover:text-[#0F172A] hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal 7-Day Date Strip */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {dates.map((date) => {
              if (date.isPast) {
                return (
                  <button
                    key={date.id}
                    type="button"
                    disabled
                    className="flex flex-col items-center justify-center py-2.5 px-2 rounded-[14px] bg-slate-50 border border-slate-200/60 opacity-45 cursor-not-allowed text-center"
                  >
                    <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-[0.04em]">
                      {date.dayShort}
                    </span>
                    <span className="font-display text-[18px] font-bold text-[#94A3B8] tabular-nums mt-0.5 leading-none">
                      {date.dateNum}
                    </span>
                    <span className="text-[10.5px] font-medium text-[#94A3B8] mt-1.5">
                      {date.slotsCountLabel}
                    </span>
                  </button>
                );
              }

              const isSelected = date.id === selectedDateId;
              return (
                <button
                  key={date.id}
                  type="button"
                  onClick={() => onSelectDate(date.id)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[14px] text-center transition-all duration-200 active:scale-[0.98] ${
                    isSelected
                      ? 'bg-[#165DF5] border border-[#0F49C7] text-white shadow-[0_8px_20px_-6px_rgba(22,93,245,0.45)] -translate-y-0.5'
                      : 'bg-white border border-slate-200/90 hover:border-[#165DF5]/60 hover:bg-blue-50/30 hover:-translate-y-0.5 text-[#0F172A]'
                  }`}
                >
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.04em] ${
                      isSelected ? 'text-blue-100' : 'text-[#64748B]'
                    }`}
                  >
                    {date.dayShort}
                  </span>
                  <span
                    className={`font-display text-[19px] font-bold tabular-nums mt-0.5 leading-none ${
                      isSelected ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    {date.dateNum}
                  </span>
                  <span
                    className={`text-[10.5px] font-semibold mt-1.5 whitespace-nowrap ${
                      isSelected ? 'text-white/95' : 'text-[#165DF5]'
                    }`}
                  >
                    {date.slotsCountLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Morning & Evening Time Slots */}
        <div key={selectedDateId} className="p-5 md:p-6 flex flex-col gap-6">
          {capReached && !isVenueUnavailable && (
            <div className="rounded-[14px] bg-rose-50 border border-rose-200 px-4 py-3 text-[13px] text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                {t(
                  `You have reached the daily booking limit (${dailyCapInfo?.capHours} hrs/day) for ${venueName} on this date. Choose another date or venue to book more hours.`,
                  `ഈ തീയതിയിൽ ${venueName}-ൽ നിങ്ങളുടെ പ്രതിദിന ബുക്കിംഗ് പരിധി (${dailyCapInfo?.capHours} മണിക്കൂർ) പൂർത്തിയായി. മറ്റൊരു തീയതിയോ വേദിയോ തിരഞ്ഞെടുക്കുക.`,
                )}
              </span>
            </div>
          )}

          {loadingSlots && slots.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-[#64748B]">
              <Loader2 className="w-6 h-6 animate-spin text-[#165DF5]" />
              <span className="text-[13.5px] font-medium">
                {t('Loading live time slots...', 'തത്സമയ സ്ലോട്ടുകൾ ലോഡ് ചെയ്യുന്നു...')}
              </span>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-10 text-center rounded-[16px] bg-slate-50 border border-slate-200/80 px-4">
              <p className="font-display text-[15px] font-bold text-[#0F172A]">
                {t('No hourly slots scheduled for this date', 'ഈ തീയതിയിൽ സ്ലോട്ടുകളൊന്നും ലഭ്യമല്ല')}
              </p>
              <p className="text-[13px] text-[#64748B] mt-1">
                {t(
                  'Try selecting another date or another active sports venue.',
                  'ദയവായി മറ്റൊരു തീയതിയോ വേദിയോ തിരഞ്ഞെടുക്കുക.',
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Morning Session */}
              {morningSlots.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center">
                        <Sun className="w-4 h-4" strokeWidth={2} />
                      </span>
                      <span className="font-display text-[15.5px] font-bold text-[#0F172A] tracking-[-0.015em]">
                        {t(meta.morningTitle, 'പ്രഭാത സെഷനുകൾ')}
                      </span>
                      <span className="text-[12.5px] text-[#64748B] tabular-nums">
                        {meta.morningRange}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#165DF5]/10 text-[#0F50DC] text-[11.5px] font-semibold tabular-nums">
                      {meta.morningBadge}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {morningSlots.map(renderSlotButton)}
                  </div>
                </div>
              )}

              {morningSlots.length > 0 && eveningSlots.length > 0 && (
                <div className="h-px bg-slate-200/70" />
              )}

              {/* Afternoon & Evening Session */}
              {eveningSlots.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/70 text-indigo-600 flex items-center justify-center">
                        <Moon className="w-4 h-4" strokeWidth={2} />
                      </span>
                      <span className="font-display text-[15.5px] font-bold text-[#0F172A] tracking-[-0.015em]">
                        {t(meta.eveningTitle, 'ഉച്ചയ്ക്ക് ശേഷവും വൈകുന്നേരവും')}
                      </span>
                      <span className="text-[12.5px] text-[#64748B] tabular-nums">
                        {meta.eveningRange}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-[11.5px] font-semibold">
                      {t(meta.eveningBadge, 'ഫ്ലഡ്‌ലൈറ്റ് സജീവം')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {eveningSlots.map(renderSlotButton)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Section 3: Clean Integrated Policy Footer */}
        <div className="px-5 md:px-6 py-3.5 bg-slate-50/90 border-t border-slate-200/75 flex items-start sm:items-center gap-2.5 text-[#475569]">
          <Info className="w-4 h-4 text-[#165DF5] shrink-0 mt-0.5 sm:mt-0" strokeWidth={2} />
          <span className="text-[12.5px] leading-relaxed">{meta.slotPolicyNotice}</span>
        </div>
      </div>
    </div>
  );
}
