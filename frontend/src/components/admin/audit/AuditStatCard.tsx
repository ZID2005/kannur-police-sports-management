import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type { AuditStatCardData } from '@/types/adminAudit';

interface AuditStatCardProps {
  card: AuditStatCardData;
  delayMs?: number;
}

function getModernIconTone(id: string): string {
  switch (id) {
    case 'total-events':
      return 'bg-[#EFF5FF] text-[#165DF5] border border-[#DCE8FE]';
    case 'facility-ops':
      return 'bg-sky-50 text-sky-700 border border-sky-200/80';
    case 'slot-controls':
      return 'bg-amber-50 text-amber-700 border border-amber-200/80';
    default:
      return 'bg-indigo-50 text-indigo-600 border border-indigo-200/80';
  }
}

export function AuditStatCard({ card, delayMs = 0 }: AuditStatCardProps) {
  const iconTone = getModernIconTone(card.id);

  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className="admin-animate-enter admin-kpi-card h-full rounded-[22px] p-5 flex flex-col justify-between gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400 leading-snug pt-0.5">
          {card.label}
        </span>
        <div
          className={`admin-kpi-icon w-10 h-10 rounded-xl ${iconTone} flex items-center justify-center shrink-0`}
        >
          <MaterialIcon name={card.icon} className="text-[20px]" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="font-display text-[30px] leading-none font-extrabold text-[#0F172A] tracking-[-0.03em] tabular-nums">
          {card.value}
        </span>

        <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-[12px] text-slate-500">
          {card.trendText && (
            <>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                {card.trendIcon && <MaterialIcon name={card.trendIcon} className="text-[14px]" />}
                {card.trendText}
              </span>
              <span className="text-slate-300">·</span>
            </>
          )}
          {card.metaItems.map((item, idx) => (
            <span key={`${card.id}-${idx}`} className="inline-flex items-center gap-1.5">
              {idx > 0 && <span className="text-slate-300">·</span>}
              <span className={item.className ? 'font-semibold text-[#165DF5]' : 'font-medium'}>
                {item.text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
