import type { FacilityAdminId, FacilityAdminItem } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface FacilitySwitcherBarProps {
  facilities: FacilityAdminItem[];
  selectedFacilityId: FacilityAdminId;
  onSelectFacility: (id: FacilityAdminId) => void;
  bookedCount: number;
  totalCount: number;
}

export function FacilitySwitcherBar({
  facilities,
  selectedFacilityId,
  onSelectFacility,
  bookedCount,
  totalCount,
}: FacilitySwitcherBarProps) {
  const activeFacility =
    facilities.find((item) => item.id === selectedFacilityId) ?? facilities[0];

  const occupancyPercent =
    totalCount > 0 ? Math.round((bookedCount / totalCount) * 100) : activeFacility.occupancyPercent;

  return (
    <div className="relative z-10 flex flex-col gap-space-sm">
      <div className="flex items-center justify-between flex-wrap gap-space-md">
        {/* Switcher Bar */}
        <div className="p-1.5 bg-surface-container/80 backdrop-blur-xl rounded-full shadow-sm flex items-center gap-1 overflow-x-auto max-w-full">
          {facilities.map((facility) => {
            const isActive = facility.id === selectedFacilityId;
            if (isActive) {
              return (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => onSelectFacility(facility.id)}
                  className="flex items-center gap-2.5 px-space-lg py-2.5 rounded-full bg-primary text-on-primary shadow-[0_8px_20px_rgba(0,83,205,0.28)] transition-all text-left"
                >
                  <MaterialIcon name={facility.icon} className="text-[19px]" />
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="font-label-primary text-label-primary font-semibold leading-none text-on-primary">
                        {facility.name}
                      </span>
                      <span className="font-caption text-caption text-primary-fixed-dim leading-none pt-0.5">
                        {facility.subtitle}
                      </span>
                    </div>
                    {facility.badge && (
                      <span className="bg-primary-container/80 text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        {facility.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            }

            return (
              <button
                key={facility.id}
                type="button"
                onClick={() => onSelectFacility(facility.id)}
                className="group flex items-center gap-2 px-space-md py-2.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/60 transition-all text-left"
              >
                <MaterialIcon name={facility.icon} className="text-[18px]" />
                <div className="flex flex-col">
                  <span className="font-label-primary text-label-primary font-medium leading-none">
                    {facility.name}
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant/80 scale-95 origin-left">
                    {facility.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Facility Meta Pill */}
        <div className="flex items-center gap-3 bg-surface-container-lowest/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-label-meta text-label-meta text-on-surface font-semibold">
            {activeFacility.operationalStatus}
          </span>
          <span className="text-outline-variant font-light">•</span>
          <span className="font-label-meta text-label-meta text-on-surface-variant">
            {activeFacility.location}
          </span>
        </div>
      </div>

      {/* Occupancy & Facility Sub-strip */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-2 text-on-surface-variant">
        <div className="flex items-center gap-2">
          <MaterialIcon name="analytics" className="text-[18px] text-primary" />
          <span className="font-label-meta text-label-meta font-medium">Today&apos;s Occupancy:</span>
          <span className="font-label-meta text-label-meta font-bold text-on-surface">
            {occupancyPercent}%
          </span>
          <span className="font-label-meta text-label-meta text-on-surface-variant">
            ({bookedCount} of {totalCount} slots booked/allocated)
          </span>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant">
          {activeFacility.subStripMeta.map((meta) => (
            <span key={meta.label} className="font-caption text-caption flex items-center gap-1">
              <MaterialIcon name={meta.icon} className="text-[15px] text-tertiary" /> {meta.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
