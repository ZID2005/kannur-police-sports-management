import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  ApiAdminFacility,
  ApiManagedSlot,
  CreateSlotPayload,
  ManagedSlotStatus,
  UpdateSlotPayload,
} from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { getConciseFacilityName } from './FacilityDirectoryCard';

interface SlotFormDrawerProps {
  mode: 'create' | 'edit';
  facility: ApiAdminFacility;
  selectedDate: string;
  slot?: ApiManagedSlot | null;
  onClose: () => void;
  onSubmit: (payload: CreateSlotPayload | UpdateSlotPayload) => Promise<void>;
}

const QUICK_REASONS = ['Court resurfacing', 'Police event', 'Equipment maintenance'];

const INPUT_CLASS =
  'w-full h-11 px-3.5 rounded-2xl bg-white/90 border border-slate-200/90 text-[#0F172A] text-[13.5px] font-medium placeholder:text-slate-400 outline-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)] focus:bg-white focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all';

const SLOT_STATUS_OPTIONS: Array<{
  value: ManagedSlotStatus;
  label: string;
  dotClass: string;
  activeClass: string;
}> = [
  {
    value: 'OPEN',
    label: 'Open',
    dotClass: 'bg-emerald-500',
    activeClass:
      'bg-white/95 text-emerald-700 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-emerald-200/90',
  },
  {
    value: 'BLOCKED_MAINTENANCE',
    label: 'Maintenance',
    dotClass: 'bg-amber-500',
    activeClass:
      'bg-white/95 text-amber-800 shadow-[0_4px_12px_-4px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-amber-200/90',
  },
  {
    value: 'RESERVED_DEPARTMENT',
    label: 'Dept Reserved',
    dotClass: 'bg-indigo-500',
    activeClass:
      'bg-white/95 text-indigo-700 shadow-[0_4px_12px_-4px_rgba(99,102,241,0.28),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-indigo-200/90',
  },
];

function computeDurationMins(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) {
    return 0;
  }
  return eh * 60 + em - (sh * 60 + sm);
}

export function SlotFormDrawer({
  mode,
  facility,
  selectedDate,
  slot,
  onClose,
  onSubmit,
}: SlotFormDrawerProps) {
  const [startTime, setStartTime] = useState(slot?.start_time ?? '22:00');
  const [endTime, setEndTime] = useState(slot?.end_time ?? '23:00');
  const [maxCapacity, setMaxCapacity] = useState(
    String(slot?.max_capacity ?? facility.max_capacity_per_slot)
  );
  const [scope, setScope] = useState<'RECURRING' | 'DATE_ONLY'>(
    slot?.slot_date ? 'DATE_ONLY' : 'RECURRING'
  );
  const [status, setStatus] = useState<ManagedSlotStatus>(
    slot?.status === 'BLOCKED_MAINTENANCE' || slot?.status === 'RESERVED_DEPARTMENT'
      ? slot.status
      : 'OPEN'
  );
  const [blockReason, setBlockReason] = useState(slot?.block_reason ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const durationMins = useMemo(() => computeDurationMins(startTime, endTime), [startTime, endTime]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (durationMins <= 0) {
      setErrorMessage('End time must be strictly after start time.');
      return;
    }

    const parsedCap = Number.parseInt(maxCapacity, 10);
    if (!Number.isFinite(parsedCap) || parsedCap < 1 || parsedCap > 500) {
      setErrorMessage('Max capacity must be between 1 and 500.');
      return;
    }

    if (mode === 'edit' && slot && parsedCap < slot.active_bookings_count) {
      setErrorMessage(
        `Capacity cannot be lower than the ${slot.active_bookings_count} active booking(s) on this slot.`
      );
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'create') {
        const payload: CreateSlotPayload = {
          start_time: startTime,
          end_time: endTime,
          max_capacity: parsedCap,
          slot_date: scope === 'DATE_ONLY' ? selectedDate : null,
          status,
          block_reason: status === 'OPEN' ? null : blockReason.trim() || null,
        };
        await onSubmit(payload);
      } else {
        const payload: UpdateSlotPayload = {
          start_time: startTime,
          end_time: endTime,
          max_capacity: parsedCap,
          status,
          block_reason: status === 'OPEN' ? null : blockReason.trim() || null,
          date: selectedDate,
        };
        await onSubmit(payload);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to save time slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="admin-backdrop-enter fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-900/32 backdrop-blur-[8px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal-enter admin-glass-modal relative w-full max-w-[540px] max-h-[86vh] rounded-[30px] flex flex-col overflow-hidden"
      >
        {/* Soft Ambient Specular Glow inside Glass Modal */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-8 w-56 h-40 rounded-full bg-[#60A5FA]/20 blur-[70px]"
        />

        {/* Pinned Header */}
        <div className="relative z-10 px-6 py-[18px] bg-white/75 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-[16px] bg-gradient-to-br from-[#2476FF] to-[#004EC9] text-white flex items-center justify-center shadow-[0_10px_24px_-6px_rgba(22,93,245,0.52),inset_0_1px_1px_rgba(255,255,255,0.4)] shrink-0">
              <MaterialIcon
                name={mode === 'create' ? 'more_time' : 'edit_calendar'}
                className="text-[22px]"
              />
            </div>
            <div className="min-w-0">
              <h2
                id="slot-drawer-title"
                className="font-display text-[18.5px] font-extrabold text-[#0F172A] tracking-[-0.02em]"
              >
                {mode === 'create' ? 'Add Time Slot' : 'Edit Slot Window'}
              </h2>
              <p className="text-[12.5px] text-slate-500 font-medium truncate">
                {getConciseFacilityName(facility)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="admin-glass-btn w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-[#0F172A] shrink-0"
          >
            <MaterialIcon name="close" className="text-[19px]" />
          </button>
        </div>

        {/* Form Shell: Scrollable Body + Pinned Liquid Glass Footer */}
        <form onSubmit={handleSubmit} className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="admin-modal-scroll flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {errorMessage && (
              <div
                role="alert"
                className="admin-panel-expand rounded-2xl bg-rose-50/95 border border-rose-200 px-4 py-3 text-rose-800 text-[13px] font-medium flex items-center gap-2.5"
              >
                <MaterialIcon name="error" className="text-[19px] text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Timing & Capacity */}
            <div
              style={{ animationDelay: '40ms' }}
              className="admin-row-enter admin-glass-section rounded-[22px] p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Window &amp; Capacity
                </span>
                {durationMins > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] text-[11px] font-bold tabular-nums">
                    {durationMins} min window
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="slot-start-time"
                    className="text-[12.5px] font-semibold text-slate-700"
                  >
                    Start Time
                  </label>
                  <input
                    id="slot-start-time"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`${INPUT_CLASS} tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="slot-end-time"
                    className="text-[12.5px] font-semibold text-slate-700"
                  >
                    End Time
                  </label>
                  <input
                    id="slot-end-time"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`${INPUT_CLASS} tabular-nums`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="slot-max-capacity"
                  className="text-[12.5px] font-semibold text-slate-700"
                >
                  Max Capacity for This Slot
                </label>
                <input
                  id="slot-max-capacity"
                  type="number"
                  min={mode === 'edit' && slot ? Math.max(1, slot.active_bookings_count) : 1}
                  max={500}
                  required
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  className={`${INPUT_CLASS} tabular-nums`}
                />
                {mode === 'edit' && slot && slot.active_bookings_count > 0 && (
                  <span className="text-[12px] text-slate-500">
                    {slot.active_bookings_count} active booking(s) currently occupy this window on{' '}
                    {selectedDate}.
                  </span>
                )}
              </div>
            </div>

            {/* Schedule Scope (Create mode only) */}
            {mode === 'create' && (
              <div
                style={{ animationDelay: '85ms' }}
                className="admin-row-enter admin-glass-section rounded-[22px] p-5 flex flex-col gap-3"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Schedule Scope
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setScope('RECURRING')}
                    className={`p-3.5 rounded-2xl text-left border transition-all duration-200 ${
                      scope === 'RECURRING'
                        ? 'bg-[#EFF5FF]/90 border-[#165DF5]/65 ring-2 ring-[#165DF5]/15 shadow-[0_8px_20px_-10px_rgba(22,93,245,0.35)] text-[#0F172A]'
                        : 'admin-glass-chip text-slate-600'
                    }`}
                  >
                    <div className="font-display text-[13px] font-bold">Daily Schedule</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">Repeats every day</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('DATE_ONLY')}
                    className={`p-3.5 rounded-2xl text-left border transition-all duration-200 ${
                      scope === 'DATE_ONLY'
                        ? 'bg-[#EFF5FF]/90 border-[#165DF5]/65 ring-2 ring-[#165DF5]/15 shadow-[0_8px_20px_-10px_rgba(22,93,245,0.35)] text-[#0F172A]'
                        : 'admin-glass-chip text-slate-600'
                    }`}
                  >
                    <div className="font-display text-[13px] font-bold">Selected Date Only</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5 tabular-nums">
                      {selectedDate}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Availability Status */}
            <div
              style={{ animationDelay: '130ms' }}
              className="admin-row-enter admin-glass-section rounded-[22px] p-5 flex flex-col gap-3.5"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Availability Status
              </span>

              <div
                role="group"
                aria-label="Slot availability status"
                className="grid grid-cols-3 gap-1 p-1 rounded-full bg-slate-200/55 border border-white/80 shadow-inner"
              >
                {SLOT_STATUS_OPTIONS.map((opt) => {
                  const active = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`h-9 rounded-full text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-200 ${
                        active
                          ? opt.activeClass
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${opt.dotClass}`} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {status !== 'OPEN' && (
                <div className="admin-panel-expand flex flex-col gap-2 pt-1">
                  <label
                    htmlFor="slot-block-reason"
                    className="text-[12.5px] font-semibold text-slate-700"
                  >
                    Block / Reservation Reason (Optional)
                  </label>
                  <input
                    id="slot-block-reason"
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g., Court resurfacing or Police event"
                    className={`${INPUT_CLASS} h-10`}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REASONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBlockReason(preset)}
                        className="admin-glass-chip px-3 py-1 rounded-full text-slate-600 hover:text-[#165DF5] text-[11px] font-semibold"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pinned Liquid Glass Footer */}
          <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/70 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="admin-glass-btn h-11 px-5 rounded-full text-[13.5px] font-semibold inline-flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="admin-glass-btn-primary h-11 px-6 rounded-full text-[13.5px] font-semibold inline-flex items-center gap-2 disabled:opacity-60"
            >
              <MaterialIcon
                name={submitting ? 'progress_activity' : mode === 'create' ? 'add_circle' : 'save'}
                className={`text-[18px] ${submitting ? 'animate-spin' : ''}`}
              />
              <span>
                {submitting
                  ? 'Saving...'
                  : mode === 'create'
                    ? 'Add Time Slot'
                    : 'Save Changes'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
