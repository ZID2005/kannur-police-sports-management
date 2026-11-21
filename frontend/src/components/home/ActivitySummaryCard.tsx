import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarCheck2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { HomeActivitySummary } from '@/types/home';

interface ActivitySummaryCardProps {
  summary: HomeActivitySummary;
  animationDelayMs?: number;
}

export function ActivitySummaryCard({
  summary,
  animationDelayMs = 320,
}: ActivitySummaryCardProps) {
  const { t } = useLanguage();

  const translateStatLabel = (id: string, fallback: string) => {
    if (id === 'bookings') return t('Bookings', 'ബുക്കിംഗുകൾ');
    if (id === 'hours-played') return t('Hours booked', 'മണിക്കൂറുകൾ');
    if (id === 'coming-up') return t('Coming up', 'വരാനിരിക്കുന്നവ');
    return fallback;
  };

  return (
    <div
      style={{ animationDelay: `${animationDelayMs}ms` }}
      className="animate-fade-rise col-span-2 md:col-span-1 md:col-start-3 md:row-start-2 liquid-glass rounded-[28px] md:rounded-[32px] p-5 md:p-6 flex flex-col justify-between border border-white/90 shadow-[0_16px_38px_-16px_rgba(31,111,255,0.12)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0053CD]">
            <CalendarCheck2 className="w-3.5 h-3.5" />
            {t(summary.periodLabel, 'ഈ മാസം')}
          </span>
          <h3 className="font-display text-[19px] md:text-[21px] font-bold text-[#111418] tracking-[-0.02em] mt-1 leading-tight">
            {t(summary.title, 'നിങ്ങളുടെ പ്രവർത്തനങ്ങൾ')}
          </h3>
        </div>
        <Link
          to="/my-bookings"
          className="text-[12.5px] font-semibold text-[#1F6FFF] hover:text-[#0053CD] inline-flex items-center gap-0.5 bg-[#1F6FFF]/10 hover:bg-[#1F6FFF]/15 px-3 py-1.5 rounded-full transition whitespace-nowrap"
        >
          <span>{t('My Bookings', 'ബുക്കിംഗുകൾ')}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Inset Glass Stat Tiles */}
      <div className="grid grid-cols-3 gap-2.5 mt-4 md:mt-0">
        {summary.stats.map((stat) => (
          <div
            key={stat.id}
            className="rounded-[18px] bg-white/75 border border-white/90 px-3 py-3.5 flex flex-col justify-between shadow-[0_4px_14px_-6px_rgba(15,23,42,0.06)]"
          >
            <p className="font-display text-[28px] md:text-[32px] font-bold text-[#111418] leading-none tracking-[-0.03em] tabular-nums">
              {stat.value}
            </p>
            <p className="text-[11.5px] md:text-[12px] font-medium text-[#6B7280] mt-2 leading-tight">
              {translateStatLabel(stat.id, stat.label)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
