import type { ApiAdminFacility, FacilityOperationalStatus } from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface FacilityDirectoryCardProps {
  facility: ApiAdminFacility;
  isSelected: boolean;
  isUpdatingStatus: boolean;
  delayMs?: number;
  onSelect: (facilityId: string) => void;
  onEdit: (facility: ApiAdminFacility) => void;
}

const SHORT_VENUE_NAMES: Record<string, string> = {
  SYNTHETIC_TRACK: '400m Synthetic Track',
  FOOTBALL_GROUND: 'Parade Football Ground',
  POLICE_TURF: 'Floodlit Football Turf',
  BADMINTON_COURT: 'Indoor Badminton Complex',
};

export function getConciseFacilityName(facility: Pick<ApiAdminFacility, 'code' | 'name'>): string {
  return SHORT_VENUE_NAMES[facility.code] ?? facility.name;
}

export function getFacilityIcon(code: string, category: string): string {
  const combined = `${code} ${category}`.toLowerCase();
  if (combined.includes('track') || combined.includes('athletic')) return 'directions_run';
  if (combined.includes('badminton') || combined.includes('tennis') || combined.includes('squash')) {
    return 'sports_tennis';
  }
  if (combined.includes('basketball')) return 'sports_basketball';
  if (combined.includes('volleyball')) return 'sports_volleyball';
  if (combined.includes('swim') || combined.includes('pool') || combined.includes('aquatic')) {
    return 'pool';
  }
  if (combined.includes('cricket')) return 'sports_cricket';
  if (combined.includes('football') || combined.includes('turf') || combined.includes('pitch')) {
    return 'sports_soccer';
  }
  return 'stadium';
}

function getStatusBadgeStyle(status: FacilityOperationalStatus) {
  switch (status) {
    case 'ACTIVE':
      return {
        label: 'Active',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        dotClass: 'bg-emerald-500',
        barClass: 'bg-gradient-to-r from-[#165DF5] to-[#3B82F6]',
      };
    case 'MAINTENANCE':
      return {
        label: 'Maintenance',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/80',
        dotClass: 'bg-amber-500',
        barClass: 'bg-amber-500',
      };
    case 'CLOSED':
      return {
        label: 'Closed',
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200/80',
        dotClass: 'bg-rose-500',
        barClass: 'bg-rose-500',
      };
  }
}

export function FacilityDirectoryCard({
  facility,
  isSelected,
  isUpdatingStatus,
  delayMs = 0,
  onSelect,
  onEdit,
}: FacilityDirectoryCardProps) {
  const statusStyle = getStatusBadgeStyle(facility.operational_status);
  const iconName = getFacilityIcon(facility.code, facility.category);
  const displayName = getConciseFacilityName(facility);
  const rateSuffix = facility.pricing.unit === 'per_month' ? '/mo' : '/hr';
  const utilizationPct = Math.min(100, Math.max(0, facility.stats.utilization_rate));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(facility.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(facility.id);
        }
      }}
      aria-pressed={isSelected}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`admin-animate-enter admin-facility-card group relative rounded-[22px] p-5 flex flex-col justify-between gap-4 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DF5]/40 overflow-hidden ${
        isSelected
          ? 'bg-white ring-2 ring-[#165DF5] border border-[#165DF5]/20 shadow-[0_18px_38px_-18px_rgba(22,93,245,0.34),0_2px_6px_rgba(15,23,42,0.04)]'
          : 'bg-white/95 border border-slate-200/90 hover:border-blue-300/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.1)] hover:shadow-[0_16px_30px_-18px_rgba(22,93,245,0.22)]'
      }`}
    >
      {/* Active top indicator bar */}
      <div
        className={`absolute inset-x-0 top-0 h-[3px] transition-opacity duration-200 ${
          isSelected
            ? 'bg-gradient-to-r from-[#165DF5] via-[#3B82F6] to-[#0EA5E9] opacity-100'
            : 'bg-slate-200/70 opacity-0 group-hover:opacity-100'
        }`}
      />

      {/* Top Row: Icon + Status Pill + Quick Edit */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
              isSelected
                ? 'bg-gradient-to-br from-[#165DF5] to-[#0053CD] text-white shadow-md shadow-[#165DF5]/25'
                : 'bg-[#EFF5FF] text-[#165DF5] border border-[#DCE8FE] group-hover:scale-105'
            }`}
          >
            <MaterialIcon name={iconName} className="text-[20px]" />
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight ${statusStyle.badgeClass} ${
                isUpdatingStatus ? 'opacity-60' : ''
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass} ${
                  facility.operational_status === 'ACTIVE' ? 'animate-pulse' : ''
                }`}
              />
              {statusStyle.label}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(facility);
              }}
              title={`Edit ${facility.name}`}
              aria-label={`Edit ${facility.name}`}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-[#165DF5] hover:bg-[#EFF5FF] flex items-center justify-center shrink-0 transition-colors"
            >
              <MaterialIcon name="edit" className="text-[16px]" />
            </button>
          </div>
        </div>

        {/* Venue Identity */}
        <div className="min-w-0">
          <h3
            title={facility.name}
            className="font-display text-[15.5px] font-bold text-[#0F172A] tracking-[-0.015em] leading-snug truncate"
          >
            {displayName}
          </h3>
          <p className="text-[12.5px] text-slate-500 font-medium mt-0.5 truncate">
            {facility.category} · {facility.court_count} {facility.court_unit_label}
          </p>
        </div>

        {/* Clean Tariff & Capacity Line */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Tariff
            </span>
            <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
              <span className="text-[14px] font-bold text-[#0F172A]">
                ₹{facility.pricing.public_rate.toLocaleString('en-IN')}
                <span className="text-[11px] font-medium text-slate-400">{rateSuffix}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[12.5px] font-semibold text-[#165DF5]" title="Govt / Police Rate">
                ₹{facility.pricing.govt_rate.toLocaleString('en-IN')}
                <span className="text-[10.5px] font-medium text-blue-400 ml-0.5">Govt</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Capacity
            </span>
            <span className="text-[13px] font-semibold text-slate-700 mt-0.5 tabular-nums">
              {facility.max_capacity_per_slot}
              <span className="text-[11.5px] font-normal text-slate-400 ml-1">
                {facility.booking_mode === 'MONTHLY_MEMBERSHIP_ONLY' ? 'runners' : '/ slot'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer Occupancy Progress */}
      <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-100">
        <div className="flex items-center justify-between text-[12px] tabular-nums">
          <span className="text-slate-500 font-medium">
            {facility.stats.open_slots} open
            {facility.stats.blocked_slots > 0 ? (
              <span className="text-amber-700 font-medium">
                {' '}
                · {facility.stats.blocked_slots} blocked
              </span>
            ) : (
              <span> · 0 blocked</span>
            )}
          </span>
          <span className={`font-semibold ${isSelected ? 'text-[#165DF5]' : 'text-slate-700'}`}>
            {facility.stats.occupied_slots}/{facility.stats.total_slots} used
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`admin-bar-fill h-full rounded-full ${statusStyle.barClass}`}
            style={{ width: `${utilizationPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
