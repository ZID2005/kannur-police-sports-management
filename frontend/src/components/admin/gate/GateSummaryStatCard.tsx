import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type { GateSummaryStat } from '@/types/gate';

interface GateSummaryStatCardProps {
  stat: GateSummaryStat;
}

export function GateSummaryStatCard({ stat }: GateSummaryStatCardProps) {
  return (
    <div className="group relative rounded-3xl bg-surface-container-lowest/80 backdrop-blur-2xl p-6 shadow-[0_12px_32px_rgba(0,83,205,0.05)] hover:shadow-[0_20px_40px_rgba(0,83,205,0.10)] transition-all duration-300 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-2xl ${stat.iconWrapClass} flex items-center justify-center group-hover:scale-105 transition-transform`}
        >
          <MaterialIcon name={stat.icon} className="text-[26px]" />
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${stat.badgeClass} font-label-meta text-label-meta font-medium`}
        >
          {stat.badgeIcon && <MaterialIcon name={stat.badgeIcon} className="text-[14px]" />}
          {stat.badgeText}
        </span>
      </div>
      <div className="mt-4">
        <div className="font-caption text-caption uppercase tracking-wider text-secondary font-semibold">
          {stat.label}
        </div>
        <div className={`text-[38px] leading-[44px] font-bold tracking-tight ${stat.valueClass} mt-1`}>
          {stat.value}
        </div>
        <div className="font-caption text-caption text-secondary mt-1 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${stat.dotClass}`} />
          {stat.subtext}
        </div>
      </div>
    </div>
  );
}
