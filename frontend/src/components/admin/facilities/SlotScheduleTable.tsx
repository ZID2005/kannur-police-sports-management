import { Fragment, useMemo, useState } from 'react';
import type {
  ApiAdminFacility,
  ApiManagedSlot,
  EffectiveSlotStatus,
  FacilityOperationalStatus,
} from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { getConciseFacilityName, getFacilityIcon } from './FacilityDirectoryCard';

export type SlotFilterChipId = 'ALL' | 'AVAILABLE' | 'FULL' | 'BLOCKED';
type ScheduleViewMode = 'grid' | 'table';

interface SlotScheduleTableProps {
  facility: ApiAdminFacility;
  selectedDate: string;
  isUpdatingStatus: boolean;
  onChangeDate: (isoDate: string) => void;
  onChangeFacilityStatus: (facilityId: string, nextStatus: FacilityOperationalStatus) => void;
  onEditFacility: (facility: ApiAdminFacility) => void;
  onRestoreFacilityActive: (facilityId: string) => void;
  onOpenAddSlot: () => void;
  onOpenEditSlot: (slot: ApiManagedSlot) => void;
  onBlockSlot: (
    slot: ApiManagedSlot,
    payload: {
      block_status: 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT';
      reason: string;
      force_override?: boolean;
    }
  ) => Promise<void>;
  onUnblockSlot: (slot: ApiManagedSlot) => Promise<void>;
  onDeleteSlot: (slot: ApiManagedSlot) => Promise<void>;
  busySlotId: string | null;
}

const BLOCK_REASON_PRESETS = [
  'Court resurfacing',
  'Police event',
  'Floodlight servicing',
  'Departmental drill',
];

const FACILITY_STATUS_SEGMENTS: Array<{
  value: FacilityOperationalStatus;
  label: string;
  dotClass: string;
  activeClass: string;
}> = [
  {
    value: 'ACTIVE',
    label: 'Active',
    dotClass: 'bg-emerald-500',
    activeClass: 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-200/80',
  },
  {
    value: 'MAINTENANCE',
    label: 'Maintenance',
    dotClass: 'bg-amber-500',
    activeClass: 'bg-white text-amber-800 shadow-xs ring-1 ring-amber-200/80',
  },
  {
    value: 'CLOSED',
    label: 'Closed',
    dotClass: 'bg-rose-500',
    activeClass: 'bg-white text-rose-700 shadow-xs ring-1 ring-rose-200/80',
  },
];

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

function getDurationMins(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function getTimeOfDayBucket(startHhmm: string): 'MORNING' | 'AFTERNOON' | 'EVENING' {
  const hour = Number.parseInt(startHhmm.split(':')[0] ?? '0', 10);
  if (hour < 12) return 'MORNING';
  if (hour < 17) return 'AFTERNOON';
  return 'EVENING';
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const dt = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  dt.setDate(dt.getDate() + deltaDays);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayIso(): string {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatReadableDate(isoDate: string): string {
  const dt = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getSlotStatusMeta(status: EffectiveSlotStatus, bookedCount: number) {
  switch (status) {
    case 'OPEN':
      if (bookedCount > 0) {
        return {
          label: 'Partially Booked',
          shortLabel: 'Booked',
          badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200/80',
          dotClass: 'bg-sky-500',
          cardClass: 'bg-white border-sky-200/90 shadow-[0_6px_20px_-14px_rgba(14,165,233,0.35)]',
          stripeClass: 'bg-sky-500',
        };
      }
      return {
        label: 'Open',
        shortLabel: 'Open',
        badgeClass: 'bg-emerald-50/90 text-emerald-700 border border-emerald-200/75',
        dotClass: 'bg-emerald-500',
        cardClass: 'bg-white border-slate-200/85 hover:border-slate-300',
        stripeClass: 'bg-emerald-400/75',
      };
    case 'FULL':
      return {
        label: 'Fully Booked',
        shortLabel: 'Full',
        badgeClass: 'bg-[#EFF5FF] text-[#165DF5] border border-[#BFDBFE]',
        dotClass: 'bg-[#165DF5]',
        cardClass: 'bg-[#F8FBFF] border-[#BFDBFE] shadow-[0_8px_22px_-16px_rgba(22,93,245,0.4)]',
        stripeClass: 'bg-[#165DF5]',
      };
    case 'BLOCKED_MAINTENANCE':
      return {
        label: 'Maintenance',
        shortLabel: 'Maintenance',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/85',
        dotClass: 'bg-amber-500',
        cardClass: 'bg-amber-50/35 border-amber-200/85',
        stripeClass: 'bg-amber-500',
      };
    case 'RESERVED_DEPARTMENT':
      return {
        label: 'Dept Reserved',
        shortLabel: 'Dept Reserved',
        badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/85',
        dotClass: 'bg-indigo-500',
        cardClass: 'bg-indigo-50/35 border-indigo-200/85',
        stripeClass: 'bg-indigo-500',
      };
  }
}

function getFacilityStatusNotice(status: FacilityOperationalStatus) {
  if (status === 'MAINTENANCE') {
    return {
      title: 'Facility Under Maintenance',
      message:
        'Public online bookings are temporarily paused while this venue is in Maintenance mode. You can still configure and inspect slots below.',
      boxClass: 'bg-amber-50/90 border-amber-200/90 text-amber-950',
      iconClass: 'text-amber-600',
      icon: 'build_circle',
    };
  }
  return {
    title: 'Facility Closed',
    message:
      'This venue is currently marked Closed and hidden from active reservations. Restore it to Active when ready to reopen.',
    boxClass: 'bg-rose-50/90 border-rose-200/90 text-rose-950',
    iconClass: 'text-rose-600',
    icon: 'block',
  };
}

export function SlotScheduleTable({
  facility,
  selectedDate,
  isUpdatingStatus,
  onChangeDate,
  onChangeFacilityStatus,
  onEditFacility,
  onRestoreFacilityActive,
  onOpenAddSlot,
  onOpenEditSlot,
  onBlockSlot,
  onUnblockSlot,
  onDeleteSlot,
  busySlotId,
}: SlotScheduleTableProps) {
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('grid');
  const [filterChip, setFilterChip] = useState<SlotFilterChipId>('ALL');
  const [blockingSlotId, setBlockingSlotId] = useState<string | null>(null);
  const [blockType, setBlockType] = useState<'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT'>(
    'BLOCKED_MAINTENANCE'
  );
  const [blockReason, setBlockReason] = useState('');
  const [forceOverride, setForceOverride] = useState(false);

  const [confirmDeleteSlotId, setConfirmDeleteSlotId] = useState<string | null>(null);
  const [deleteWarningSlotId, setDeleteWarningSlotId] = useState<string | null>(null);

  const todayIso = getTodayIso();
  const displayName = getConciseFacilityName(facility);
  const iconName = getFacilityIcon(facility.code, facility.category);

  const counts = {
    ALL: facility.slots.length,
    AVAILABLE: facility.slots.filter((s) => s.status === 'OPEN').length,
    FULL: facility.slots.filter((s) => s.status === 'FULL').length,
    BLOCKED: facility.slots.filter(
      (s) => s.status === 'BLOCKED_MAINTENANCE' || s.status === 'RESERVED_DEPARTMENT'
    ).length,
  };

  const visibleSlots = useMemo(
    () =>
      facility.slots.filter((slot) => {
        if (filterChip === 'AVAILABLE') return slot.status === 'OPEN';
        if (filterChip === 'FULL') return slot.status === 'FULL';
        if (filterChip === 'BLOCKED') {
          return (
            slot.status === 'BLOCKED_MAINTENANCE' || slot.status === 'RESERVED_DEPARTMENT'
          );
        }
        return true;
      }),
    [facility.slots, filterChip]
  );

  const groupedSessions = useMemo(() => {
    const groups: Array<{
      id: 'MORNING' | 'AFTERNOON' | 'EVENING';
      label: string;
      range: string;
      icon: string;
      slots: ApiManagedSlot[];
    }> = [
      { id: 'MORNING', label: 'Morning Sessions', range: '05:00 AM – 12:00 PM', icon: 'wb_twilight', slots: [] },
      { id: 'AFTERNOON', label: 'Afternoon Sessions', range: '12:00 PM – 05:00 PM', icon: 'light_mode', slots: [] },
      { id: 'EVENING', label: 'Evening Sessions', range: '05:00 PM – 10:00 PM', icon: 'nights_stay', slots: [] },
    ];
    for (const slot of visibleSlots) {
      const bucket = getTimeOfDayBucket(slot.start_time);
      const group = groups.find((g) => g.id === bucket);
      if (group) group.slots.push(slot);
    }
    return groups.filter((g) => g.slots.length > 0);
  }, [visibleSlots]);

  const openInlineBlockPanel = (slot: ApiManagedSlot) => {
    setConfirmDeleteSlotId(null);
    setDeleteWarningSlotId(null);
    if (blockingSlotId === slot.id) {
      setBlockingSlotId(null);
      return;
    }
    setBlockingSlotId(slot.id);
    setBlockType('BLOCKED_MAINTENANCE');
    setBlockReason('');
    setForceOverride(false);
  };

  const handleConfirmBlock = async (slot: ApiManagedSlot) => {
    await onBlockSlot(slot, {
      block_status: blockType,
      reason: blockReason.trim(),
      force_override: forceOverride,
    });
    setBlockingSlotId(null);
    setBlockReason('');
    setForceOverride(false);
  };

  const handleDeleteClick = (slot: ApiManagedSlot) => {
    setBlockingSlotId(null);
    if (slot.active_bookings_count > 0) {
      setConfirmDeleteSlotId(null);
      setDeleteWarningSlotId((prev) => (prev === slot.id ? null : slot.id));
      return;
    }
    setDeleteWarningSlotId(null);
    setConfirmDeleteSlotId((prev) => (prev === slot.id ? null : slot.id));
  };

  const handleConfirmDelete = async (slot: ApiManagedSlot) => {
    await onDeleteSlot(slot);
    setConfirmDeleteSlotId(null);
  };

  const rateSuffix = facility.pricing.unit === 'per_month' ? '/mo' : '/hr';

  const renderInlineActionPanels = (slot: ApiManagedSlot) => {
    const isBusy = busySlotId === slot.id;
    const hasActiveBookings = slot.active_bookings_count > 0;
    const isBlockPanelOpen = blockingSlotId === slot.id;
    const isDeleteConfirmOpen = confirmDeleteSlotId === slot.id;
    const isDeleteWarningOpen = deleteWarningSlotId === slot.id;

    if (!isBlockPanelOpen && !isDeleteWarningOpen && !isDeleteConfirmOpen) {
      return null;
    }

    return (
      <div className="admin-panel-expand flex flex-col gap-2.5">
        {isBlockPanelOpen && (
          <div className="rounded-2xl bg-amber-50/75 border border-amber-200/90 p-4 flex flex-col gap-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <MaterialIcon name="lock_clock" className="text-[16px]" />
                </div>
                <span className="font-display text-[13.5px] font-bold text-[#0F172A]">
                  Block {formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)}
                </span>
                <span className="text-[12px] text-slate-500 font-medium">on {selectedDate}</span>
              </div>

              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-amber-200/80">
                <button
                  type="button"
                  onClick={() => setBlockType('BLOCKED_MAINTENANCE')}
                  className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                    blockType === 'BLOCKED_MAINTENANCE'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Maintenance
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType('RESERVED_DEPARTMENT')}
                  className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                    blockType === 'RESERVED_DEPARTMENT'
                      ? 'bg-[#165DF5] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Department Reserved
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Optional short reason (e.g., Court resurfacing or Police event)"
                className="flex-1 h-9 px-3.5 rounded-xl bg-white border border-slate-200 text-[#0F172A] text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleConfirmBlock(slot)}
                  className="h-9 px-4 rounded-xl bg-[#165DF5] hover:bg-[#0053CD] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  <MaterialIcon name="check" className="text-[16px]" />
                  <span>Confirm Block</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBlockingSlotId(null)}
                  className="h-9 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[12.5px] font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">Presets:</span>
                {BLOCK_REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBlockReason(preset)}
                    className="px-2.5 py-0.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600 text-[11px] font-medium transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {hasActiveBookings && (
                <label className="inline-flex items-center gap-2 text-[12px] text-amber-900 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceOverride}
                    onChange={(e) => setForceOverride(e.target.checked)}
                    className="rounded border-amber-400 text-[#165DF5] focus:ring-[#165DF5]"
                  />
                  <span>
                    Override &amp; cancel {slot.active_bookings_count} active booking(s)
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {isDeleteWarningOpen && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-50/85 border border-amber-200/90 px-4 py-3">
            <div className="flex items-start gap-2.5 text-amber-950">
              <MaterialIcon name="warning" className="text-[18px] text-amber-600 shrink-0 mt-0.5" />
              <span className="text-[12.5px] font-medium leading-relaxed">
                <strong>Deletion protected:</strong> This slot has {slot.active_bookings_count}{' '}
                active booking(s) (
                <span className="font-mono text-[11.5px]">
                  {slot.bookings.map((b) => b.booking_code).join(', ')}
                </span>
                ). Cancel or reassign active reservations first.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteWarningSlotId(null)}
              className="self-end sm:self-auto px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-amber-200 text-slate-700 text-[12px] font-semibold shrink-0 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {isDeleteConfirmOpen && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-rose-50/85 border border-rose-200/90 px-4 py-3">
            <div className="flex items-center gap-2.5 text-rose-950">
              <MaterialIcon name="delete_forever" className="text-[19px] text-rose-600 shrink-0" />
              <span className="text-[12.5px] font-medium">
                Permanently delete{' '}
                <strong>
                  {formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)}
                </strong>{' '}
                from {displayName}?
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleConfirmDelete(slot)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold transition-colors disabled:opacity-50"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteSlotId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      aria-labelledby="slot-schedule-heading"
      style={{ animationDelay: '220ms' }}
      className="admin-animate-enter admin-surface-card rounded-[26px] p-5 sm:p-7 flex flex-col gap-6"
    >
      {/* Selected Facility Command Header */}
      <div className="flex flex-col gap-5 pb-5 border-b border-slate-200/80">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
          {/* Venue Title & Official Name */}
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] flex items-center justify-center shrink-0 mt-0.5">
              <MaterialIcon name={iconName} className="text-[24px]" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] text-[11px] font-semibold">
                  {facility.category}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 text-[11px] font-semibold">
                  {facility.court_count} {facility.court_unit_label}
                </span>
              </div>
              <h2
                id="slot-schedule-heading"
                className="font-display text-[21px] sm:text-[23px] font-extrabold text-[#0F172A] tracking-[-0.025em] leading-tight"
              >
                {displayName}
              </h2>
              {facility.name !== displayName && (
                <p className="text-[12.5px] text-slate-500 font-medium truncate">{facility.name}</p>
              )}
            </div>
          </div>

          {/* Right Controls: Live Status Switch + Edit + Add Slot */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div
              role="group"
              aria-label={`Operational status for ${facility.name}`}
              className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80"
            >
              {FACILITY_STATUS_SEGMENTS.map((seg) => {
                const active = facility.operational_status === seg.value;
                return (
                  <button
                    key={seg.value}
                    type="button"
                    disabled={isUpdatingStatus || active}
                    onClick={() => onChangeFacilityStatus(facility.id, seg.value)}
                    className={`h-8 px-3 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 transition-all disabled:cursor-default ${
                      active
                        ? seg.activeClass
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                    } ${isUpdatingStatus && !active ? 'opacity-50' : ''}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${seg.dotClass}`} />
                    <span>{seg.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onEditFacility(facility)}
              className="admin-btn-secondary !h-10 px-3.5 inline-flex items-center gap-1.5"
            >
              <MaterialIcon name="tune" className="text-[17px] text-slate-500" />
              <span>Configure</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddSlot}
              className="admin-btn-primary !h-10 px-4 inline-flex items-center gap-1.5"
            >
              <MaterialIcon name="add_circle" className="text-[18px]" />
              <span>Add Time Slot</span>
            </button>
          </div>
        </div>

        {/* Structured Tariff & Operations Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Operating Hours
            </span>
            <span className="text-[13.5px] font-bold text-[#0F172A] tabular-nums">
              {formatTime12h(facility.operating_start)} – {formatTime12h(facility.operating_end)}
            </span>
            <span className="text-[11.5px] text-slate-500">
              {facility.slot_duration_mins} min intervals
            </span>
          </div>

          <div className="flex flex-col gap-0.5 lg:border-l lg:border-slate-200/80 lg:pl-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Public Tariff
            </span>
            <span className="text-[13.5px] font-bold text-[#0F172A] tabular-nums">
              ₹{facility.pricing.public_rate.toLocaleString('en-IN')}
              <span className="text-[12px] font-medium text-slate-400">{rateSuffix}</span>
            </span>
            <span className="text-[11.5px] text-slate-500 tabular-nums">
              {facility.is_partitionable && facility.pricing.half_court_public_rate !== null
                ? `Half court ₹${facility.pricing.half_court_public_rate.toLocaleString('en-IN')}`
                : 'Standard rate (+18% GST)'}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 lg:border-l lg:border-slate-200/80 lg:pl-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Govt / Police Concession
            </span>
            <span className="text-[13.5px] font-bold text-[#165DF5] tabular-nums">
              ₹{facility.pricing.govt_rate.toLocaleString('en-IN')}
              <span className="text-[12px] font-medium text-blue-400">{rateSuffix}</span>
            </span>
            <span className="text-[11.5px] text-slate-500 tabular-nums">
              {facility.is_partitionable && facility.pricing.half_court_govt_rate !== null
                ? `Half court ₹${facility.pricing.half_court_govt_rate.toLocaleString('en-IN')}`
                : 'Subsidized department tariff'}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 lg:border-l lg:border-slate-200/80 lg:pl-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Slot Capacity &amp; Cap
            </span>
            <span className="text-[13.5px] font-bold text-[#0F172A] tabular-nums">
              {facility.max_capacity_per_slot}{' '}
              {facility.booking_mode === 'MONTHLY_MEMBERSHIP_ONLY' ? 'Runners' : 'Bookings'} / slot
            </span>
            <span className="text-[11.5px] text-slate-500 tabular-nums">
              Daily cap: {facility.daily_user_hour_cap} hrs/member
            </span>
          </div>
        </div>

        {facility.description && (
          <div className="flex items-center gap-2 text-[12.5px] text-slate-500">
            <MaterialIcon name="info" className="text-[16px] text-slate-400 shrink-0" />
            <p className="leading-relaxed">{facility.description}</p>
          </div>
        )}
      </div>

      {/* Maintenance / Closed Facility Banner */}
      {facility.operational_status !== 'ACTIVE' &&
        (() => {
          const notice = getFacilityStatusNotice(facility.operational_status);
          return (
            <div
              role="status"
              className={`rounded-2xl border px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${notice.boxClass}`}
            >
              <div className="flex items-start gap-2.5">
                <MaterialIcon
                  name={notice.icon}
                  className={`text-[20px] shrink-0 mt-0.5 ${notice.iconClass}`}
                />
                <div className="flex flex-col">
                  <span className="font-display text-[13.5px] font-bold">{notice.title}</span>
                  <span className="text-[12.5px] opacity-85">{notice.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRestoreFacilityActive(facility.id)}
                className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white text-[#0F172A] border border-slate-200/90 text-[12.5px] font-semibold shadow-xs hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Restore to Active
              </button>
            </div>
          );
        })()}

      {/* Unified Schedule Toolbar: Date Navigator + Filter Segments + Grid/Table Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        {/* Integrated Date Navigator */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-0.5">
            <button
              type="button"
              onClick={() => onChangeDate(shiftIsoDate(selectedDate, -1))}
              aria-label="Previous day"
              className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-[#0F172A] hover:bg-white inline-flex items-center gap-0.5 text-[12.5px] font-semibold transition-all"
            >
              <MaterialIcon name="chevron_left" className="text-[18px]" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeDate(todayIso)}
              className={`h-8 px-3 rounded-lg text-[12.5px] font-semibold transition-all ${
                selectedDate === todayIso
                  ? 'bg-white text-[#165DF5] shadow-xs ring-1 ring-slate-200/70'
                  : 'text-slate-600 hover:text-[#0F172A] hover:bg-white/70'
              }`}
            >
              Today
            </button>

            <div className="relative flex items-center mx-0.5">
              <MaterialIcon
                name="calendar_today"
                className="absolute left-2.5 text-[15px] text-[#165DF5] pointer-events-none"
              />
              <input
                type="date"
                aria-label="Select schedule date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) onChangeDate(e.target.value);
                }}
                className="h-8 pl-8 pr-2.5 rounded-lg bg-white border border-slate-200/90 text-[#0F172A] text-[12.5px] font-semibold tabular-nums outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => onChangeDate(shiftIsoDate(selectedDate, 1))}
              aria-label="Next day"
              className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-[#0F172A] hover:bg-white inline-flex items-center gap-0.5 text-[12.5px] font-semibold transition-all"
            >
              <span className="hidden sm:inline">Next</span>
              <MaterialIcon name="chevron_right" className="text-[18px]" />
            </button>
          </div>

          <span className="text-[13px] font-semibold text-slate-500 hidden sm:inline">
            {formatReadableDate(selectedDate)}
          </span>
        </div>

        {/* Right: Segmented Filters + View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          <div
            role="tablist"
            aria-label="Filter slots by availability status"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 overflow-x-auto scrollbar-none max-w-full"
          >
            {(
              [
                { id: 'ALL', label: 'All', count: counts.ALL },
                { id: 'AVAILABLE', label: 'Open', count: counts.AVAILABLE },
                { id: 'FULL', label: 'Full', count: counts.FULL },
                { id: 'BLOCKED', label: 'Blocked', count: counts.BLOCKED },
              ] as const
            ).map((chip) => {
              const active = filterChip === chip.id;
              return (
                <button
                  key={chip.id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setFilterChip(chip.id)}
                  className={`h-8 px-3 rounded-lg text-[12.5px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-[#165DF5] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0F172A] hover:bg-white/75'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200/75 text-slate-700'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid vs Table Switch */}
          <div
            role="group"
            aria-label="Schedule display mode"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              title="Timeline Grid View"
              className={`h-8 px-2.5 rounded-lg inline-flex items-center gap-1 text-[12px] font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MaterialIcon name="grid_view" className="text-[16px]" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              title="Table View"
              className={`h-8 px-2.5 rounded-lg inline-flex items-center gap-1 text-[12px] font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MaterialIcon name="view_list" className="text-[16px]" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {visibleSlots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-14 px-6 text-center flex flex-col items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center">
            <MaterialIcon name="event_busy" className="text-[22px]" />
          </div>
          <p className="font-display text-[15px] font-bold text-[#0F172A]">
            {facility.slots.length === 0
              ? 'No time slots configured yet'
              : 'No time slots match this filter'}
          </p>
          <p className="text-[13px] text-slate-500 max-w-md">
            {facility.slots.length === 0
              ? 'Use "Add Time Slot" above to define the daily availability windows for this venue.'
              : 'Switch back to "All" or select another status segment to inspect the full day schedule.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* MODERN TIMELINE GRID VIEW — Grouped by Morning / Afternoon / Evening */
        <div className="flex flex-col gap-6">
          {groupedSessions.map((group) => {
            const activePanelSlot = group.slots.find(
              (s) =>
                blockingSlotId === s.id ||
                confirmDeleteSlotId === s.id ||
                deleteWarningSlotId === s.id
            );

            return (
              <div key={group.id} className="flex flex-col gap-3">
                {/* Session Group Divider */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-500 flex items-center justify-center">
                      <MaterialIcon name={group.icon} className="text-[16px]" />
                    </div>
                    <h3 className="font-display text-[13.5px] font-bold text-[#0F172A] tracking-tight">
                      {group.label}
                    </h3>
                    <span className="text-[12px] text-slate-400 font-medium hidden sm:inline">
                      {group.range}
                    </span>
                  </div>
                  <span className="text-[11.5px] font-semibold text-slate-400 tabular-nums">
                    {group.slots.length} {group.slots.length === 1 ? 'slot' : 'slots'}
                  </span>
                </div>

                {/* Slot Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {group.slots.map((slot, idx) => {
                    const statusMeta = getSlotStatusMeta(slot.status, slot.booked_count);
                    const isBlocked =
                      slot.status === 'BLOCKED_MAINTENANCE' ||
                      slot.status === 'RESERVED_DEPARTMENT';
                    const occupancyPct =
                      slot.max_capacity > 0
                        ? Math.min(100, Math.round((slot.booked_count / slot.max_capacity) * 100))
                        : 0;
                    const durationMins = getDurationMins(slot.start_time, slot.end_time);
                    const isBusy = busySlotId === slot.id;
                    const hasActiveBookings = slot.active_bookings_count > 0;
                    const isPanelTarget =
                      blockingSlotId === slot.id ||
                      confirmDeleteSlotId === slot.id ||
                      deleteWarningSlotId === slot.id;

                    return (
                      <div
                        key={slot.id}
                        style={{ animationDelay: `${Math.min(idx * 30, 180)}ms` }}
                        className={`admin-row-enter admin-slot-card relative rounded-2xl border p-4 pl-5 flex flex-col justify-between gap-3 overflow-hidden ${
                          statusMeta.cardClass
                        } ${isPanelTarget ? 'ring-2 ring-[#165DF5]/40 border-[#165DF5]' : ''}`}
                      >
                        {/* Left Semantic Accent Stripe */}
                        <div
                          className={`absolute inset-y-3 left-0 w-[3.5px] rounded-r-full ${statusMeta.stripeClass}`}
                        />

                        {/* Top: Time + Status Pill */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-display text-[14.5px] font-bold text-[#0F172A] tracking-tight tabular-nums">
                              {formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 font-medium mt-0.5">
                              <span>{durationMins} min</span>
                              {slot.slot_date && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#165DF5] font-semibold">
                                    {slot.slot_date}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 ${statusMeta.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                            {statusMeta.shortLabel}
                          </span>
                        </div>

                        {/* Middle: Occupancy Meter OR Block Note + Booking Pills */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[12px] tabular-nums">
                            <span className="font-semibold text-slate-700">
                              {slot.booked_count} / {slot.max_capacity} booked
                            </span>
                            <span className="text-slate-400 font-medium">{occupancyPct}%</span>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                occupancyPct >= 100
                                  ? 'bg-[#165DF5]'
                                  : occupancyPct > 0
                                    ? 'bg-sky-500'
                                    : 'bg-slate-200'
                              }`}
                              style={{ width: `${occupancyPct}%` }}
                            />
                          </div>

                          {slot.block_reason && (
                            <p className="text-[12px] text-slate-600 bg-white/80 border border-slate-200/70 rounded-xl px-2.5 py-1.5 line-clamp-2">
                              {slot.block_reason}
                            </p>
                          )}

                          {slot.bookings.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {slot.bookings.slice(0, 2).map((b) => (
                                <span
                                  key={b.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200/85 text-[11px] text-slate-600 shadow-2xs"
                                >
                                  <span className="font-semibold text-[#0F172A]">
                                    {b.member_name}
                                  </span>
                                  <span className="font-mono text-[10px] text-[#165DF5]">
                                    {b.booking_code}
                                  </span>
                                  {facility.is_partitionable && (
                                    <span className="text-[10px] text-slate-400">
                                      ({b.court_partition === 'FULL' ? 'Full' : b.court_partition.replace('_', ' ')})
                                    </span>
                                  )}
                                </span>
                              ))}
                              {slot.bookings.length > 2 && (
                                <span className="px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-500">
                                  +{slot.bookings.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bottom Quiet Action Bar */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/90">
                          {isBlocked ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onUnblockSlot(slot)}
                              className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[12px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              <MaterialIcon name="lock_open" className="text-[14px]" />
                              <span>Unblock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openInlineBlockPanel(slot)}
                              className={`h-7 px-2.5 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50 ${
                                blockingSlotId === slot.id
                                  ? 'bg-amber-500 text-white'
                                  : 'text-slate-500 hover:text-amber-800 hover:bg-amber-50'
                              }`}
                            >
                              <MaterialIcon name="block" className="text-[14px]" />
                              <span>Block</span>
                            </button>
                          )}

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onOpenEditSlot(slot)}
                              className="h-7 px-2.5 rounded-lg text-slate-500 hover:text-[#165DF5] hover:bg-[#EFF5FF] text-[12px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              <MaterialIcon name="edit" className="text-[14px]" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteClick(slot)}
                              title={
                                hasActiveBookings
                                  ? `Protected: ${slot.active_bookings_count} active booking(s) exist`
                                  : 'Delete time slot'
                              }
                              className={`h-7 w-7 rounded-lg inline-flex items-center justify-center transition-colors disabled:opacity-50 ${
                                hasActiveBookings
                                  ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                                  : confirmDeleteSlotId === slot.id
                                    ? 'bg-rose-600 text-white'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <MaterialIcon
                                name={hasActiveBookings ? 'lock' : 'delete'}
                                className="text-[15px]"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Inline Expanded Action Panel for Active Slot in This Group */}
                {activePanelSlot && renderInlineActionPanels(activePanelSlot)}
              </div>
            );
          })}
        </div>
      ) : (
        /* REFINED EXECUTIVE LIST / TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-200/85 bg-white">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold uppercase tracking-[0.06em]">
                <th scope="col" className="py-3.5 px-5">
                  Time Window
                </th>
                <th scope="col" className="py-3.5 px-5">
                  Occupancy
                </th>
                <th scope="col" className="py-3.5 px-5">
                  Status
                </th>
                <th scope="col" className="py-3.5 px-5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleSlots.map((slot, idx) => {
                const statusMeta = getSlotStatusMeta(slot.status, slot.booked_count);
                const isBlocked =
                  slot.status === 'BLOCKED_MAINTENANCE' ||
                  slot.status === 'RESERVED_DEPARTMENT';
                const occupancyPct =
                  slot.max_capacity > 0
                    ? Math.min(100, Math.round((slot.booked_count / slot.max_capacity) * 100))
                    : 0;
                const durationMins = getDurationMins(slot.start_time, slot.end_time);
                const isBusy = busySlotId === slot.id;
                const hasActiveBookings = slot.active_bookings_count > 0;
                const isBlockPanelOpen = blockingSlotId === slot.id;
                const isDeleteConfirmOpen = confirmDeleteSlotId === slot.id;
                const isDeleteWarningOpen = deleteWarningSlotId === slot.id;

                return (
                  <Fragment key={slot.id}>
                    <tr
                      style={{ animationDelay: `${Math.min(idx * 25, 220)}ms` }}
                      className="admin-row-enter admin-table-row"
                    >
                      {/* Time Window */}
                      <td className="py-3.5 px-5 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isBlocked
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                                : slot.status === 'FULL'
                                  ? 'bg-[#EFF5FF] text-[#165DF5] border border-[#DCE8FE]'
                                  : 'bg-slate-100/90 text-slate-500'
                            }`}
                          >
                            <MaterialIcon name="schedule" className="text-[17px]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-display text-[14px] font-bold text-[#0F172A] tabular-nums">
                              {formatTime12h(slot.start_time)} – {formatTime12h(slot.end_time)}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 font-medium">
                              <span>{durationMins} min</span>
                              {slot.slot_date && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#165DF5] font-semibold">
                                    Date-Specific ({slot.slot_date})
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Occupancy */}
                      <td className="py-3.5 px-5 align-middle min-w-[240px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2 text-[12px] tabular-nums">
                            <span className="font-semibold text-slate-700">
                              {slot.booked_count} / {slot.max_capacity} Booked
                            </span>
                            <span className="text-slate-400 font-medium">{occupancyPct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                occupancyPct >= 100
                                  ? 'bg-[#165DF5]'
                                  : occupancyPct > 0
                                    ? 'bg-sky-500'
                                    : 'bg-slate-200'
                              }`}
                              style={{ width: `${occupancyPct}%` }}
                            />
                          </div>
                          {slot.bookings.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {slot.bookings.slice(0, 2).map((b) => (
                                <span
                                  key={b.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600"
                                >
                                  <span className="font-semibold text-[#0F172A]">
                                    {b.member_name}
                                  </span>
                                  <span className="font-mono text-[10px] text-[#165DF5]">
                                    {b.booking_code}
                                  </span>
                                  {facility.is_partitionable && (
                                    <span className="text-[10px] text-slate-400">
                                      ({b.court_partition === 'FULL' ? 'Full' : b.court_partition.replace('_', ' ')})
                                    </span>
                                  )}
                                </span>
                              ))}
                              {slot.bookings.length > 2 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-500">
                                  +{slot.bookings.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap ${statusMeta.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                            {statusMeta.label}
                          </span>
                          {slot.block_reason && (
                            <span className="text-[12px] text-slate-500 max-w-xs line-clamp-1">
                              {slot.block_reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quiet Ghost Actions */}
                      <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {isBlocked ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onUnblockSlot(slot)}
                              className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[12px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              <MaterialIcon name="lock_open" className="text-[15px]" />
                              <span>Unblock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openInlineBlockPanel(slot)}
                              className={`h-8 px-2.5 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50 ${
                                isBlockPanelOpen
                                  ? 'bg-amber-500 text-white'
                                  : 'text-slate-500 hover:text-amber-800 hover:bg-amber-50'
                              }`}
                            >
                              <MaterialIcon name="block" className="text-[15px]" />
                              <span>Block</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onOpenEditSlot(slot)}
                            className="h-8 px-2.5 rounded-lg text-slate-500 hover:text-[#165DF5] hover:bg-[#EFF5FF] text-[12px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <MaterialIcon name="edit" className="text-[15px]" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteClick(slot)}
                            title={
                              hasActiveBookings
                                ? `Protected: ${slot.active_bookings_count} active booking(s) exist`
                                : 'Delete time slot'
                            }
                            className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors disabled:opacity-50 ${
                              hasActiveBookings
                                ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                                : isDeleteConfirmOpen
                                  ? 'bg-rose-600 text-white'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <MaterialIcon
                              name={hasActiveBookings ? 'lock' : 'delete'}
                              className="text-[16px]"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {(isBlockPanelOpen || isDeleteWarningOpen || isDeleteConfirmOpen) && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={4} className="px-5 py-3.5">
                          {renderInlineActionPanels(slot)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
