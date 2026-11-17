import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type { AuditStatCardData } from '@/types/gate';

interface AuditStatCardProps {
  card: AuditStatCardData;
}

export function AuditStatCard({ card }: AuditStatCardProps) {
  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-caption text-caption font-semibold uppercase tracking-wider text-outline text-[11px]">
          {card.label}
        </span>
        <div
          className={`w-8 h-8 rounded-full ${card.iconBgClass} flex items-center justify-center shrink-0`}
        >
          <MaterialIcon name={card.icon} className={`text-[18px] ${card.iconTextClass} font-medium`} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-headline-card text-[34px] leading-none font-bold text-on-surface">
          {card.value}
        </span>
        <div className="flex items-center gap-1.5 mt-2 text-on-surface-variant font-label-meta text-label-meta truncate">
          {card.trendText && (
            <>
              <span className="inline-flex items-center text-emerald-700 font-label-meta text-label-meta font-medium">
                {card.trendIcon && (
                  <MaterialIcon name={card.trendIcon} className="text-[16px] mr-0.5" />
                )}
                {card.trendText}
              </span>
              <span className="text-outline text-caption">•</span>
            </>
          )}
          {card.metaItems.map((item, idx) => (
            <span key={item.text} className="inline-flex items-center gap-1">
              {idx > 0 && <span className="text-outline mx-0.5">•</span>}
              <span className={item.className ?? ''}>{item.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
