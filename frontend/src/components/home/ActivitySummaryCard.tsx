import type { HomeActivitySummary } from '@/types/home';

interface ActivitySummaryCardProps {
  summary: HomeActivitySummary;
}

/**
 * "Your activity" monthly stats card in Column 3 Row 2 of the Bento Grid
 * (responsive for mobile full-width bottom card).
 */
export function ActivitySummaryCard({ summary }: ActivitySummaryCardProps) {
  return (
    <div className="col-span-2 md:col-span-1 md:col-start-3 md:row-start-2 liquid-glass rounded-[28px] md:rounded-[36px] p-5 md:p-6 flex flex-col justify-between border border-white/80 shadow-lg shadow-blue-900/5">
      <div className="flex items-center justify-between mb-3 md:mb-0">
        <h3 className="text-[18px] md:text-[22px] font-semibold text-[#111418]">{summary.title}</h3>
        <span className="text-[12px] md:text-[13px] text-[#6B7280]">{summary.periodLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 md:py-3 border-t border-black/[0.04] md:mt-2">
        {summary.stats.map((stat) => (
          <div key={stat.id}>
            <p className="text-[32px] md:text-[40px] font-semibold text-[#111418] leading-none tracking-tight">
              {stat.value}
            </p>
            <p className="text-[12px] md:text-[13px] text-[#6B7280] mt-1 md:mt-1.5 font-normal">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
