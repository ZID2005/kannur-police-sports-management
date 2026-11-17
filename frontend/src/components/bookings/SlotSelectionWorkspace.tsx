import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type {
  BookingDateOption,
  BookingPortalMeta,
  BookingTimeSlot,
} from '@/types/bookings';

interface SlotSelectionWorkspaceProps {
  meta: BookingPortalMeta;
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
  dates,
  selectedDateId,
  onSelectDate,
  slots,
  selectedSlotId,
  onSelectSlot,
  hourlyRate,
}: SlotSelectionWorkspaceProps) {
  const morningSlots = slots.filter((s) => s.session === 'morning');
  const eveningSlots = slots.filter((s) => s.session === 'evening');
  const formattedRate = `₹${hourlyRate.toLocaleString('en-IN')}`;

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
    const isSelected = slot.id === selectedSlotId;

    if (slot.status !== 'available') {
      const opacityClass = slot.status === 'maintenance' ? 'opacity-60' : 'opacity-75';
      return (
        <div
          key={slot.id}
          className={`p-space-md rounded-2xl bg-surface-container-high/60 flex flex-col justify-between h-24 ${opacityClass}`}
        >
          <span className="font-label-meta text-label-meta font-semibold text-outline">
            {slot.timeLabel}
          </span>
          <div className="flex items-center gap-1 text-on-surface-variant whitespace-nowrap">
            <MaterialIcon name="lock" className="text-[16px] text-outline" />
            <span className="font-caption text-caption text-outline">Already Booked</span>
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
          className="relative p-space-md rounded-2xl bg-primary text-on-primary shadow-[0_12px_28px_rgba(0,83,205,0.38)] flex flex-col justify-between h-24 ring-2 ring-primary-container text-left transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="font-label-meta text-label-meta font-semibold text-white whitespace-nowrap">
              {slot.timeLabel}
            </span>
            <MaterialIcon
              name="check_circle"
              className="text-white text-[20px] shrink-0"
              filled
            />
          </div>
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="font-caption text-caption text-white/90 font-medium whitespace-nowrap">
              {slot.sessionTag}
            </span>
            <span className="font-label-meta text-label-meta font-bold text-white whitespace-nowrap shrink-0">
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
        className="p-space-md rounded-2xl bg-white/80 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between h-24 text-left group active:scale-[0.99]"
      >
        <span className="font-label-meta text-label-meta font-semibold text-on-surface">
          {slot.timeLabel}
        </span>
        <div className="flex items-center justify-between gap-1 w-full">
          <span className="font-caption text-caption font-semibold text-primary whitespace-nowrap">
            {formattedRate}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold whitespace-nowrap shrink-0">
            Available
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="lg:col-span-8 flex flex-col gap-space-lg">
      {/* Date Selector Card */}
      <div className="w-full rounded-3xl bg-white/60 backdrop-blur-2xl p-space-lg shadow-[0_12px_32px_rgba(31,111,255,0.06)] flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <MaterialIcon name="calendar_month" className="text-primary text-[24px]" />
            <h2 className="font-headline-card text-headline-card text-on-surface">
              Select Date &amp; Playing Slot
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-high/60 px-space-md py-1.5 rounded-full">
            <span className="font-label-primary text-label-primary font-medium text-on-surface">
              {meta.calendarMonthLabel}
            </span>
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Previous day"
                onClick={handlePrevDate}
                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/80 transition-all"
              >
                <MaterialIcon name="chevron_left" className="text-[18px]" />
              </button>
              <button
                type="button"
                aria-label="Next day"
                onClick={handleNextDate}
                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/80 transition-all"
              >
                <MaterialIcon name="chevron_right" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal 7-Day Date Picker Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-space-xs overflow-x-auto pb-1">
          {dates.map((date) => {
            if (date.isPast) {
              return (
                <button
                  key={date.id}
                  type="button"
                  disabled
                  className="flex flex-col items-center justify-center py-space-sm px-2 rounded-2xl bg-surface-container-low/40 opacity-40 cursor-not-allowed text-center whitespace-nowrap"
                >
                  <span className="font-caption text-caption text-outline">{date.dayShort}</span>
                  <span className="font-headline-card text-headline-card text-outline">
                    {date.dateNum}
                  </span>
                  <span className="font-caption text-[11px] text-outline mt-0.5 whitespace-nowrap">
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
                className={
                  isSelected
                    ? 'flex flex-col items-center justify-center py-space-sm px-2 rounded-2xl bg-primary text-on-primary text-center shadow-[0_8px_20px_rgba(0,83,205,0.35)] scale-[1.04] transition-all whitespace-nowrap'
                    : 'flex flex-col items-center justify-center py-space-sm px-2 rounded-2xl bg-white/50 hover:bg-white/90 text-center shadow-xs transition-all whitespace-nowrap active:scale-[0.99]'
                }
              >
                <span
                  className={
                    isSelected
                      ? 'font-caption text-caption text-on-primary/80 font-medium'
                      : 'font-caption text-caption text-on-surface-variant'
                  }
                >
                  {date.dayShort}
                </span>
                <span
                  className={
                    isSelected
                      ? 'font-headline-card text-headline-card text-on-primary font-bold'
                      : 'font-headline-card text-headline-card text-on-surface'
                  }
                >
                  {date.dateNum}
                </span>
                <span
                  className={
                    isSelected
                      ? 'font-caption text-[11px] text-on-primary/90 font-medium mt-0.5 whitespace-nowrap'
                      : 'font-caption text-[11px] text-primary mt-0.5 whitespace-nowrap'
                  }
                >
                  {date.slotsCountLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots Grid Container */}
      <div className="w-full rounded-3xl bg-white/60 backdrop-blur-2xl p-space-lg shadow-[0_12px_32px_rgba(31,111,255,0.06)] flex flex-col gap-space-lg">
        {/* Morning Session */}
        <div className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <MaterialIcon name="wb_sunny" className="text-amber-500 text-[20px]" />
              <span className="font-body-medium text-body-medium text-on-surface font-semibold">
                {meta.morningTitle}
              </span>
              <span className="font-caption text-caption text-on-surface-variant">
                {meta.morningRange}
              </span>
            </div>
            <span className="font-caption text-caption text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-medium">
              {meta.morningBadge}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-sm">
            {morningSlots.map(renderSlotButton)}
          </div>
        </div>

        {/* Afternoon & Evening Session */}
        <div className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-xs">
            <div className="flex items-center gap-space-xs">
              <MaterialIcon name="nightlight" className="text-indigo-500 text-[20px]" />
              <span className="font-body-medium text-body-medium text-on-surface font-semibold">
                {meta.eveningTitle}
              </span>
              <span className="font-caption text-caption text-on-surface-variant">
                {meta.eveningRange}
              </span>
            </div>
            <span className="font-caption text-caption text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-medium">
              {meta.eveningBadge}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-sm">
            {eveningSlots.map(renderSlotButton)}
          </div>
        </div>

        {/* Slot Policy Micro-banner */}
        <div className="flex items-center gap-space-sm bg-surface-container-low/70 p-space-sm rounded-2xl text-on-surface-variant">
          <MaterialIcon name="info" className="text-primary text-[20px]" />
          <span className="font-caption text-caption">{meta.slotPolicyNotice}</span>
        </div>
      </div>
    </div>
  );
}
