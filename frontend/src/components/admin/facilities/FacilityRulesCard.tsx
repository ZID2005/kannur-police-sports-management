import type { FacilityAdminItem } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface FacilityRulesCardProps {
  facility: FacilityAdminItem;
  isMaintenanceClosureActive: boolean;
  onOpenEditRules: () => void;
  onToggleMaintenanceClosure: () => void;
}

export function FacilityRulesCard({
  facility,
  isMaintenanceClosureActive,
  onOpenEditRules,
  onToggleMaintenanceClosure,
}: FacilityRulesCardProps) {
  return (
    <section className="relative z-10 bg-surface-container-lowest/90 backdrop-blur-xl rounded-[28px] p-space-lg md:p-space-xl shadow-[0_20px_40px_rgba(31,111,255,0.06)] flex flex-col gap-space-lg">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <MaterialIcon name="tune" className="text-primary text-[22px]" />
            <h2 className="font-headline-card text-headline-card text-on-surface font-bold tracking-tight">
              {facility.rulesTitle}
            </h2>
          </div>
          <p className="font-body-default text-body-default text-on-surface-variant">
            {facility.rulesDescription}
          </p>
        </div>

        {/* Rules Action Cluster */}
        <div className="flex items-center flex-wrap gap-space-sm">
          <button
            type="button"
            onClick={onOpenEditRules}
            className="h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-primary text-label-primary font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <MaterialIcon name="edit" className="text-[18px]" />
            Edit Rules
          </button>
          <button
            type="button"
            onClick={onToggleMaintenanceClosure}
            className={`h-11 px-4 rounded-xl font-label-primary text-label-primary font-semibold flex items-center gap-2 transition-all ${
              isMaintenanceClosureActive
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                : 'bg-error-container/60 hover:bg-error-container text-on-error-container'
            }`}
          >
            <MaterialIcon
              name={isMaintenanceClosureActive ? 'lock_open' : 'build_circle'}
              className="text-[18px]"
            />
            {isMaintenanceClosureActive
              ? 'Lift Facility Maintenance Closure'
              : 'Block Facility / Maintenance Closure'}
          </button>
        </div>
      </div>

      {/* Operational Parameters Grid (4 Cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {facility.parameters.map((param) => (
          <div
            key={param.id}
            className="bg-surface-container-low/70 rounded-2xl p-space-md flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-caption text-caption text-on-surface-variant font-medium uppercase tracking-wider">
                {param.label}
              </span>
              <MaterialIcon name={param.icon} className="text-[18px] text-secondary" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-card text-headline-card font-bold text-on-surface">
                {param.value}
              </span>
              <span className="font-label-meta text-label-meta text-on-surface-variant">
                {param.subtext}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
