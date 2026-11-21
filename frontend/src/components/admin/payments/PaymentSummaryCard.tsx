import type { PaymentSummaryCardData } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface PaymentSummaryCardProps {
  card: PaymentSummaryCardData;
  delayMs?: number;
}

export function PaymentSummaryCard({ card, delayMs = 0 }: PaymentSummaryCardProps) {
  const iconBoxClass = (() => {
    switch (card.iconBoxTone) {
      case 'primary':
        return 'bg-[#EFF5FF] text-[#165DF5] border border-[#DCE8FE]';
      case 'secondary':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-200/70';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border border-amber-200/80';
      default:
        return 'bg-sky-50 text-sky-700 border border-sky-200/80';
    }
  })();

  const badgeNode = (() => {
    switch (card.badgeTone) {
      case 'emerald':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11.5px] font-semibold whitespace-nowrap">
            {card.badgeIcon && <MaterialIcon name={card.badgeIcon} className="text-[13px]" />}
            {card.badgeText}
          </span>
        );
      case 'secondary':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 text-[11.5px] font-semibold whitespace-nowrap">
            {card.badgeText}
          </span>
        );
      case 'amber':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11.5px] font-semibold whitespace-nowrap">
            {card.badgeIcon && <MaterialIcon name={card.badgeIcon} className="text-[13px]" />}
            {card.badgeText}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#EFF5FF] text-[#165DF5] border border-[#DCE8FE] text-[11.5px] font-semibold whitespace-nowrap">
            {card.badgeText}
          </span>
        );
    }
  })();

  const footerRightNode = (() => {
    switch (card.footerRightTone) {
      case 'pill-emerald-dot':
        return (
          <div className="inline-flex items-center gap-1.5 shrink-0">
            <span className="text-[12px] text-slate-600 font-semibold tabular-nums">
              {card.footerRightText}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
        );
      case 'primary-verified':
        return (
          <span className="inline-flex items-center gap-1 text-[12px] text-[#165DF5] font-semibold tabular-nums shrink-0">
            {card.footerRightIcon && (
              <MaterialIcon name={card.footerRightIcon} className="text-[14px]" />
            )}
            {card.footerRightText}
          </span>
        );
      case 'amber':
        return (
          <span className="text-[12px] text-amber-700 font-semibold tabular-nums shrink-0">
            {card.footerRightText}
          </span>
        );
      default:
        return (
          <span className="text-[12px] text-slate-600 font-semibold tabular-nums shrink-0">
            {card.footerRightText}
          </span>
        );
    }
  })();

  const amountToneClass =
    card.amountTone === 'amber'
      ? 'text-amber-700'
      : card.amountTone === 'primary'
        ? 'text-[#165DF5]'
        : 'text-[#0F172A]';

  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className="admin-animate-enter admin-kpi-card h-full rounded-[22px] p-5 flex flex-col justify-between gap-4"
    >
      {/* Header Row: Icon + Status Pill */}
      <div className="flex items-center justify-between gap-2">
        <div
          className={`admin-kpi-icon w-10 h-10 rounded-xl ${iconBoxClass} flex items-center justify-center shrink-0`}
        >
          <MaterialIcon name={card.icon} className="text-[21px]" />
        </div>
        {badgeNode}
      </div>

      {/* Main Figure */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
          {card.title}
        </span>
        <div
          className={`font-display text-[28px] xl:text-[30px] leading-tight font-extrabold tracking-[-0.03em] mt-1 tabular-nums ${amountToneClass}`}
        >
          {card.amount}
        </div>
      </div>

      {/* Footer Metadata Strip */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-slate-500">
        <span className="text-[12px] font-medium truncate tabular-nums">{card.footerLeft}</span>
        {footerRightNode}
      </div>
    </div>
  );
}
