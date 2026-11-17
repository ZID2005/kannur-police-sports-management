import type { AdminFacilityZoneCard } from '@/types/adminMemberships';

export interface FacilityZoneCardProps {
  zone: AdminFacilityZoneCard;
}

const dotToneClasses: Record<AdminFacilityZoneCard['dotTone'], string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  'primary-container': 'bg-primary-container',
};

const statusToneClasses: Record<AdminFacilityZoneCard['statusTone'], string> = {
  primary: 'bg-primary-fixed text-on-primary-fixed',
  secondary: 'bg-secondary-fixed text-on-secondary-fixed',
  neutral: 'bg-surface-container text-on-surface',
};

const metricHighlightClasses: Record<
  NonNullable<AdminFacilityZoneCard['metrics'][number]['highlight']>,
  string
> = {
  default: 'text-on-surface',
  primary: 'text-primary',
  secondary: 'text-secondary',
};

export function FacilityZoneCard({ zone }: FacilityZoneCardProps) {
  return (
    <div className="p-space-lg rounded-3xl bg-surface-container-lowest shadow-sm flex flex-col justify-between gap-space-md">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${dotToneClasses[zone.dotTone]}`} />
            <h3 className="font-headline-card text-headline-card font-semibold text-on-surface">
              {zone.name}
            </h3>
          </div>
          <span className="font-caption text-caption text-secondary mt-1">
            {zone.subtitle}
          </span>
        </div>
        <span
          className={`px-2.5 py-1 rounded-md font-caption text-caption font-bold ${statusToneClasses[zone.statusTone]}`}
        >
          {zone.statusBadge}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2">
        {zone.metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col p-2.5 rounded-xl bg-surface-container-low text-center"
          >
            <span className="text-caption font-caption text-outline">{metric.label}</span>
            <span
              className={`font-headline-card text-headline-card font-bold mt-0.5 ${
                metricHighlightClasses[metric.highlight ?? 'default']
              }`}
            >
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-caption font-caption text-on-surface-variant pt-2 border-t border-surface-container">
        <span>{zone.footerLeft}</span>
        <span
          className={
            zone.footerRightTone === 'primary'
              ? 'text-primary font-semibold'
              : 'text-secondary font-semibold'
          }
        >
          {zone.footerRight}
        </span>
      </div>
    </div>
  );
}
