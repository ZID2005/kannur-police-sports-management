import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  ApiAdminFacility,
  CreateFacilityPayload,
  FacilityBookingMode,
  FacilityOperationalStatus,
  UpdateFacilityPayload,
} from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface FacilityFormDrawerProps {
  mode: 'create' | 'edit';
  facility?: ApiAdminFacility | null;
  onClose: () => void;
  onSubmit: (payload: CreateFacilityPayload | UpdateFacilityPayload) => Promise<void>;
}

const INPUT_CLASS =
  'w-full h-11 px-3.5 rounded-2xl bg-white/90 border border-slate-200/90 text-[#0F172A] text-[13.5px] font-medium placeholder:text-slate-400 outline-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)] focus:bg-white focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all';

const CATEGORY_PRESETS = [
  'Indoor Court Complex',
  'Floodlit Artificial Turf',
  'Outdoor Grass Pitch',
  'Athletic Track',
  'Indoor Arena',
];

const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

const STATUS_OPTIONS: Array<{
  value: FacilityOperationalStatus;
  label: string;
  dotClass: string;
  activeClass: string;
}> = [
  {
    value: 'ACTIVE',
    label: 'Active',
    dotClass: 'bg-emerald-500',
    activeClass:
      'bg-white/95 text-emerald-700 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-emerald-200/90',
  },
  {
    value: 'MAINTENANCE',
    label: 'Maintenance',
    dotClass: 'bg-amber-500',
    activeClass:
      'bg-white/95 text-amber-800 shadow-[0_4px_12px_-4px_rgba(245,158,11,0.28),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-amber-200/90',
  },
  {
    value: 'CLOSED',
    label: 'Closed',
    dotClass: 'bg-rose-500',
    activeClass:
      'bg-white/95 text-rose-700 shadow-[0_4px_12px_-4px_rgba(244,63,94,0.25),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-rose-200/90',
  },
];

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

export function FacilityFormDrawer({
  mode,
  facility,
  onClose,
  onSubmit,
}: FacilityFormDrawerProps) {
  const [name, setName] = useState(facility?.name ?? '');
  const [category, setCategory] = useState(facility?.category ?? 'Indoor Court Complex');
  const [courtCount, setCourtCount] = useState(String(facility?.court_count ?? 1));
  const [courtUnitLabel, setCourtUnitLabel] = useState(facility?.court_unit_label ?? 'Courts');
  const [operationalStatus, setOperationalStatus] = useState<FacilityOperationalStatus>(
    facility?.operational_status ?? 'ACTIVE'
  );
  const [bookingMode, setBookingMode] = useState<FacilityBookingMode>(
    facility?.booking_mode ?? 'HOURLY_SLOTS'
  );
  const [isPartitionable, setIsPartitionable] = useState<boolean>(
    facility?.is_partitionable ?? false
  );
  const [maxCapacity, setMaxCapacity] = useState(String(facility?.max_capacity_per_slot ?? 2));
  const [operatingStart, setOperatingStart] = useState(facility?.operating_start ?? '05:00');
  const [operatingEnd, setOperatingEnd] = useState(facility?.operating_end ?? '22:00');
  const [slotDurationMins, setSlotDurationMins] = useState(
    String(facility?.slot_duration_mins ?? 60)
  );
  const [dailyHourCap, setDailyHourCap] = useState(String(facility?.daily_user_hour_cap ?? 2));
  const [publicRate, setPublicRate] = useState(String(facility?.pricing.public_rate ?? 500));
  const [govtRate, setGovtRate] = useState(String(facility?.pricing.govt_rate ?? 300));
  const [halfPublicRate, setHalfPublicRate] = useState(
    facility?.pricing.half_court_public_rate != null
      ? String(facility.pricing.half_court_public_rate)
      : ''
  );
  const [halfGovtRate, setHalfGovtRate] = useState(
    facility?.pricing.half_court_govt_rate != null
      ? String(facility.pricing.half_court_govt_rate)
      : ''
  );
  const [description, setDescription] = useState(facility?.description ?? '');

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

  const schedulePreview = useMemo(() => {
    const startMins = timeToMinutes(operatingStart);
    const endMins = timeToMinutes(operatingEnd);
    const step = Number.parseInt(slotDurationMins, 10) || 60;
    if (endMins <= startMins) {
      return { valid: false, count: 0, step };
    }
    const count = Math.floor((endMins - startMins) / step);
    return { valid: count > 0, count, step };
  }, [operatingStart, operatingEnd, slotDurationMins]);

  const pricingPreview = useMemo(() => {
    const pub = Number.parseFloat(publicRate);
    const gov = Number.parseFloat(govtRate);
    const pubValid = Number.isFinite(pub) && pub >= 0;
    const govValid = Number.isFinite(gov) && gov >= 0;
    const pubInclGst = pubValid ? Math.round(pub * 1.18) : 0;
    const govInclGst = govValid ? Math.round(gov * 1.18) : 0;
    const concessionPct =
      pubValid && govValid && pub > 0 && gov < pub ? Math.round(((pub - gov) / pub) * 100) : 0;
    return { pubValid, govValid, pubInclGst, govInclGst, concessionPct };
  }, [publicRate, govtRate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    if (trimmedName.length < 2) {
      setErrorMessage('Please enter a facility name (at least 2 characters).');
      return;
    }
    if (trimmedCategory.length < 2) {
      setErrorMessage('Please enter a facility category.');
      return;
    }
    if (timeToMinutes(operatingEnd) <= timeToMinutes(operatingStart)) {
      setErrorMessage('Operating end time must be strictly after operating start time.');
      return;
    }

    const parsedCourtCount = Number.parseInt(courtCount, 10);
    const parsedMaxCap = Number.parseInt(maxCapacity, 10);
    const parsedSlotDuration = Number.parseInt(slotDurationMins, 10);
    const parsedDailyCap = Number.parseInt(dailyHourCap, 10);
    const parsedPublicRate = Number.parseFloat(publicRate);
    const parsedGovtRate = Number.parseFloat(govtRate);

    if (!Number.isFinite(parsedCourtCount) || parsedCourtCount < 1 || parsedCourtCount > 100) {
      setErrorMessage('Court / lane count must be between 1 and 100.');
      return;
    }
    if (!Number.isFinite(parsedMaxCap) || parsedMaxCap < 1 || parsedMaxCap > 500) {
      setErrorMessage('Max capacity per slot must be between 1 and 500.');
      return;
    }
    if (!Number.isFinite(parsedDailyCap) || parsedDailyCap < 1 || parsedDailyCap > 12) {
      setErrorMessage('Daily member cap must be between 1 and 12 hours.');
      return;
    }
    if (!Number.isFinite(parsedPublicRate) || parsedPublicRate < 0) {
      setErrorMessage('Please enter a valid Public fee rate.');
      return;
    }
    if (!Number.isFinite(parsedGovtRate) || parsedGovtRate < 0) {
      setErrorMessage('Please enter a valid Govt/Police fee rate.');
      return;
    }

    let parsedHalfPublic: number | null | undefined = undefined;
    let parsedHalfGovt: number | null | undefined = undefined;

    if (isPartitionable) {
      if (halfPublicRate.trim() !== '') {
        const val = Number.parseFloat(halfPublicRate);
        if (!Number.isFinite(val) || val < 0) {
          setErrorMessage('Please enter a valid Half-Court Public fee rate.');
          return;
        }
        parsedHalfPublic = val;
      }
      if (halfGovtRate.trim() !== '') {
        const val = Number.parseFloat(halfGovtRate);
        if (!Number.isFinite(val) || val < 0) {
          setErrorMessage('Please enter a valid Half-Court Govt/Police fee rate.');
          return;
        }
        parsedHalfGovt = val;
      }
    } else if (mode === 'edit') {
      parsedHalfPublic = null;
      parsedHalfGovt = null;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload: CreateFacilityPayload = {
        name: trimmedName,
        category: trimmedCategory,
        court_count: parsedCourtCount,
        court_unit_label: courtUnitLabel.trim() || 'Courts',
        operational_status: operationalStatus,
        max_capacity_per_slot: parsedMaxCap,
        operating_start: operatingStart,
        operating_end: operatingEnd,
        slot_duration_mins: Number.isFinite(parsedSlotDuration) ? parsedSlotDuration : 60,
        daily_user_hour_cap: parsedDailyCap,
        is_partitionable: isPartitionable,
        booking_mode: bookingMode,
        public_rate: parsedPublicRate,
        govt_rate: parsedGovtRate,
        ...(parsedHalfPublic !== undefined ? { half_court_public_rate: parsedHalfPublic } : {}),
        ...(parsedHalfGovt !== undefined ? { half_court_govt_rate: parsedHalfGovt } : {}),
        description: description.trim(),
      };

      await onSubmit(payload);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to save facility configuration.'
      );
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
        aria-labelledby="facility-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="admin-modal-enter admin-glass-modal relative w-full max-w-[740px] max-h-[86vh] rounded-[30px] flex flex-col overflow-hidden"
      >
        {/* Soft Ambient Specular Glow inside Glass Modal */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-10 w-64 h-44 rounded-full bg-[#60A5FA]/20 blur-[70px]"
        />

        {/* Pinned Translucent Glass Header */}
        <div className="relative z-10 px-6 py-[18px] bg-white/75 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-[16px] bg-gradient-to-br from-[#2476FF] to-[#004EC9] text-white flex items-center justify-center shadow-[0_10px_24px_-6px_rgba(22,93,245,0.52),inset_0_1px_1px_rgba(255,255,255,0.4)] shrink-0">
              <MaterialIcon
                name={mode === 'create' ? 'add_business' : 'stadium'}
                className="text-[22px]"
              />
            </div>
            <div className="min-w-0">
              <h2
                id="facility-drawer-title"
                className="font-display text-[19px] font-extrabold text-[#0F172A] tracking-[-0.025em] truncate"
              >
                {mode === 'create' ? 'Add New Sports Facility' : 'Configure Sports Facility'}
              </h2>
              <p className="text-[12.5px] text-slate-500 font-medium truncate mt-0.5">
                {mode === 'create'
                  ? 'Auto-generates daily time slots and syncs immediately across the portal.'
                  : facility?.name}
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

        {/* Form Shell: Smooth Scrollable Body + Pinned Liquid Glass Footer */}
        <form onSubmit={handleSubmit} className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="admin-modal-scroll flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {errorMessage && (
              <div
                role="alert"
                className="admin-panel-expand rounded-2xl bg-rose-50/95 border border-rose-200 px-4 py-3 text-rose-800 text-[13px] font-medium flex items-center gap-2.5 shadow-xs"
              >
                <MaterialIcon name="error" className="text-[19px] text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Venue Identity */}
            <div
              style={{ animationDelay: '40ms' }}
              className="admin-row-enter admin-glass-section rounded-[22px] p-5 flex flex-col gap-3.5"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#165DF5]/12 text-[#165DF5] flex items-center justify-center text-[11px] font-bold">
                  1
                </span>
                <span className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-slate-500">
                  Venue Identity
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="facility-name"
                  className="text-[12.5px] font-semibold text-slate-700"
                >
                  Facility Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="facility-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Kannur Police Indoor Basketball Arena"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7 flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-category"
                    className="text-[12.5px] font-semibold text-slate-700"
                  >
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="facility-category"
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Indoor Court Complex"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-courts"
                    className="text-[12.5px] font-semibold text-slate-700"
                  >
                    Count
                  </label>
                  <input
                    id="facility-courts"
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={courtCount}
                    onChange={(e) => setCourtCount(e.target.value)}
                    className={`${INPUT_CLASS} px-2.5 text-center tabular-nums`}
                  />
                </div>

                <div className="sm:col-span-3 flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-unit-label"
                    className="text-[12.5px] font-semibold text-slate-700"
                  >
                    Unit Label
                  </label>
                  <input
                    id="facility-unit-label"
                    type="text"
                    value={courtUnitLabel}
                    onChange={(e) => setCourtUnitLabel(e.target.value)}
                    placeholder="Courts"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Liquid Glass Quick Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-medium text-slate-400 mr-0.5">Presets:</span>
                {CATEGORY_PRESETS.map((preset) => {
                  const active = category === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCategory(preset)}
                      className={`px-3 py-1 rounded-full text-[11.5px] font-semibold ${
                        active
                          ? 'admin-glass-btn-primary !py-1 !px-3'
                          : 'admin-glass-chip text-slate-600 hover:text-[#165DF5]'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Operations & Schedule Rules */}
            <div
              style={{ animationDelay: '90ms' }}
              className="admin-row-enter admin-glass-section rounded-[22px] p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#165DF5]/12 text-[#165DF5] flex items-center justify-center text-[11px] font-bold">
                    2
                  </span>
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-slate-500">
                    Operations &amp; Daily Schedule
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">IST 24-hr clock</span>
              </div>

              {/* Liquid Glass Segmented Operational Status */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-slate-700">
                  Operational Status
                </span>
                <div
                  role="group"
                  aria-label="Operational status"
                  className="grid grid-cols-3 gap-1 p-1 rounded-full bg-slate-200/55 border border-white/80 shadow-inner"
                >
                  {STATUS_OPTIONS.map((opt) => {
                    const active = operationalStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOperationalStatus(opt.value)}
                        className={`h-9 rounded-full text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-200 ${
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
              </div>

              {/* Glass Selectable Booking Mode Cards */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-slate-700">Booking Mode</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBookingMode('HOURLY_SLOTS')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 ${
                      bookingMode === 'HOURLY_SLOTS'
                        ? 'bg-[#EFF5FF]/90 border-[#165DF5]/65 ring-2 ring-[#165DF5]/15 shadow-[0_8px_20px_-10px_rgba(22,93,245,0.35)]'
                        : 'admin-glass-chip'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        bookingMode === 'HOURLY_SLOTS'
                          ? 'bg-[#165DF5] text-white shadow-sm shadow-[#165DF5]/30'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <MaterialIcon name="schedule" className="text-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-[13px] font-bold text-[#0F172A]">
                        Hourly Time Slots
                      </div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">
                        Bookable court / turf sessions
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingMode('MONTHLY_MEMBERSHIP_ONLY')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 ${
                      bookingMode === 'MONTHLY_MEMBERSHIP_ONLY'
                        ? 'bg-[#EFF5FF]/90 border-[#165DF5]/65 ring-2 ring-[#165DF5]/15 shadow-[0_8px_20px_-10px_rgba(22,93,245,0.35)]'
                        : 'admin-glass-chip'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        bookingMode === 'MONTHLY_MEMBERSHIP_ONLY'
                          ? 'bg-[#165DF5] text-white shadow-sm shadow-[#165DF5]/30'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <MaterialIcon name="card_membership" className="text-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-[13px] font-bold text-[#0F172A]">
                        Monthly Membership
                      </div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">
                        Recurring pass access (e.g. Track)
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Operating Hours & Capacity (4-col on desktop, 2-col on mobile) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-start"
                    className="text-[12px] font-semibold text-slate-700"
                  >
                    Opens At
                  </label>
                  <input
                    id="facility-start"
                    type="time"
                    required
                    value={operatingStart}
                    onChange={(e) => setOperatingStart(e.target.value)}
                    className={`${INPUT_CLASS} px-3 tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-end"
                    className="text-[12px] font-semibold text-slate-700"
                  >
                    Closes At
                  </label>
                  <input
                    id="facility-end"
                    type="time"
                    required
                    value={operatingEnd}
                    onChange={(e) => setOperatingEnd(e.target.value)}
                    className={`${INPUT_CLASS} px-3 tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-max-cap"
                    className="text-[12px] font-semibold text-slate-700"
                  >
                    Max Cap / Slot
                  </label>
                  <input
                    id="facility-max-cap"
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    className={`${INPUT_CLASS} tabular-nums`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-daily-cap"
                    className="text-[12px] font-semibold text-slate-700"
                  >
                    Daily Cap (hrs)
                  </label>
                  <input
                    id="facility-daily-cap"
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={dailyHourCap}
                    onChange={(e) => setDailyHourCap(e.target.value)}
                    className={`${INPUT_CLASS} tabular-nums`}
                  />
                </div>
              </div>

              {/* Liquid Glass Slot Interval Pills */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-slate-700">Slot Interval</span>
                <div className="grid grid-cols-5 gap-2">
                  {DURATION_OPTIONS.map((mins) => {
                    const active = Number.parseInt(slotDurationMins, 10) === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSlotDurationMins(String(mins))}
                        className={`h-9 rounded-full text-[12.5px] font-semibold tabular-nums ${
                          active
                            ? 'admin-glass-btn-primary'
                            : 'admin-glass-chip text-slate-600 hover:text-[#165DF5]'
                        }`}
                      >
                        {mins}m
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Slot Generator Preview Pill */}
              <div
                className={`rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-[12px] border ${
                  schedulePreview.valid
                    ? 'bg-white/80 border-slate-200/80 text-slate-600'
                    : 'bg-amber-50/90 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MaterialIcon
                    name={schedulePreview.valid ? 'auto_awesome' : 'warning'}
                    className={`text-[16px] shrink-0 ${
                      schedulePreview.valid ? 'text-[#165DF5]' : 'text-amber-600'
                    }`}
                  />
                  <span className="truncate font-medium">
                    {schedulePreview.valid
                      ? `${formatTime12h(operatingStart)} – ${formatTime12h(operatingEnd)} · ${schedulePreview.step} min intervals`
                      : 'Closing time must be later than opening time'}
                  </span>
                </div>
                {schedulePreview.valid && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] font-bold tabular-nums shrink-0">
                    {schedulePreview.count} daily slots
                  </span>
                )}
              </div>

              {/* Modern Toggle Switch: Half-Court Partitioning */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#0F172A]">
                    Half-Court Partitioning
                  </span>
                  <span className="text-[11.5px] text-slate-500">
                    Allow independent Full, Half A, and Half B court bookings
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPartitionable}
                  onClick={() => setIsPartitionable((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DF5]/40 ${
                    isPartitionable
                      ? 'bg-gradient-to-r from-[#2476FF] to-[#0053CD] shadow-inner'
                      : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                      isPartitionable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Section 3: Fee Schedule & Rules */}
            <div
              style={{ animationDelay: '140ms' }}
              className="admin-row-enter admin-glass-section rounded-[22px] p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#165DF5]/12 text-[#165DF5] flex items-center justify-center text-[11px] font-bold">
                    3
                  </span>
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-slate-500">
                    Fee Schedule ({bookingMode === 'MONTHLY_MEMBERSHIP_ONLY' ? 'Per Month' : 'Per Hour'})
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">+ 18% GST</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-public-rate"
                    className="text-[12.5px] font-semibold text-slate-700"
                  >
                    Public Rate (Base INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[14px] pointer-events-none">
                      ₹
                    </span>
                    <input
                      id="facility-public-rate"
                      type="number"
                      min={0}
                      step="1"
                      required
                      value={publicRate}
                      onChange={(e) => setPublicRate(e.target.value)}
                      className={`${INPUT_CLASS} pl-8 font-bold tabular-nums`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="facility-govt-rate"
                    className="text-[12.5px] font-semibold text-[#165DF5]"
                  >
                    Govt / Police Rate (Base INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#165DF5] font-bold text-[14px] pointer-events-none">
                      ₹
                    </span>
                    <input
                      id="facility-govt-rate"
                      type="number"
                      min={0}
                      step="1"
                      required
                      value={govtRate}
                      onChange={(e) => setGovtRate(e.target.value)}
                      className={`${INPUT_CLASS} pl-8 font-bold text-[#165DF5] tabular-nums`}
                    />
                  </div>
                </div>
              </div>

              {/* Live GST Checkout Calculation Strip */}
              {pricingPreview.pubValid && pricingPreview.govValid && (
                <div className="rounded-2xl bg-white/80 border border-slate-200/80 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] tabular-nums">
                  <span className="text-slate-600">
                    Checkout incl. GST:{' '}
                    <strong className="text-[#0F172A]">
                      ₹{pricingPreview.pubInclGst.toLocaleString('en-IN')}
                    </strong>{' '}
                    Public ·{' '}
                    <strong className="text-[#165DF5]">
                      ₹{pricingPreview.govInclGst.toLocaleString('en-IN')}
                    </strong>{' '}
                    Govt/Police
                  </span>
                  {pricingPreview.concessionPct > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-semibold text-[11px]">
                      {pricingPreview.concessionPct}% Concession
                    </span>
                  )}
                </div>
              )}

              {isPartitionable && (
                <div className="admin-panel-expand grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-200/60">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="facility-half-public-rate"
                      className="text-[12px] font-semibold text-slate-600"
                    >
                      Half Court — Public Rate (₹)
                    </label>
                    <input
                      id="facility-half-public-rate"
                      type="number"
                      min={0}
                      step="1"
                      value={halfPublicRate}
                      onChange={(e) => setHalfPublicRate(e.target.value)}
                      placeholder="e.g., 800"
                      className={`${INPUT_CLASS} tabular-nums`}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="facility-half-govt-rate"
                      className="text-[12px] font-semibold text-[#165DF5]"
                    >
                      Half Court — Govt / Police Rate (₹)
                    </label>
                    <input
                      id="facility-half-govt-rate"
                      type="number"
                      min={0}
                      step="1"
                      value={halfGovtRate}
                      onChange={(e) => setHalfGovtRate(e.target.value)}
                      placeholder="e.g., 500"
                      className={`${INPUT_CLASS} text-[#165DF5] tabular-nums`}
                    />
                  </div>
                </div>
              )}

              {/* Facility Rules & Description */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="facility-description"
                    className="text-[12.5px] font-semibold text-slate-700"
                  >
                    Facility Rules &amp; Description
                  </label>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {description.length} / 600
                  </span>
                </div>
                <textarea
                  id="facility-description"
                  rows={3}
                  maxLength={600}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Footwear policy, surface guidelines, lighting schedule, and booking rules..."
                  className="w-full p-3.5 rounded-2xl bg-white/90 border border-slate-200/90 text-[#0F172A] text-[13px] placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Pinned Translucent Liquid Glass Footer */}
          <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/70 flex items-center justify-between gap-3">
            <span className="text-[12px] text-slate-500 hidden sm:inline-flex items-center gap-1.5">
              <MaterialIcon name="verified_user" className="text-[15px] text-[#165DF5]" />
              {mode === 'create'
                ? 'Logged automatically to Admin Audit Trail'
                : 'Changes sync immediately across portal'}
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
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
                      ? 'Create Facility'
                      : 'Save Changes'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
