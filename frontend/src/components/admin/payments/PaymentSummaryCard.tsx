import type { PaymentSummaryCardData } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface PaymentSummaryCardProps {
  card: PaymentSummaryCardData;
}

export function PaymentSummaryCard({ card }: PaymentSummaryCardProps) {
  const iconBoxClass = (() => {
    switch (card.iconBoxTone) {
      case 'primary':
        return 'bg-primary/10 text-primary';
      case 'secondary':
        return 'bg-secondary-container/40 text-secondary';
      case 'amber':
        return 'bg-amber-50 text-amber-600';
      default:
        return 'bg-surface-container text-tertiary';
    }
  })();

  const badgeNode = (() => {
    switch (card.badgeTone) {
      case 'emerald':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-meta text-label-meta flex items-center gap-1 font-semibold">
            {card.badgeIcon && (
              <MaterialIcon name={card.badgeIcon} className="text-[16px]" />
            )}
            {card.badgeText}
          </span>
        );
      case 'secondary':
        return (
          <span className="px-2.5 py-1 rounded-full bg-surface-container font-label-meta text-label-meta text-secondary font-medium">
            {card.badgeText}
          </span>
        );
      case 'amber':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100/70 text-amber-800 font-label-meta text-label-meta font-medium flex items-center gap-1">
            {card.badgeIcon && (
              <MaterialIcon name={card.badgeIcon} className="text-[14px]" />
            )}
            {card.badgeText}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-meta text-label-meta font-medium">
            {card.badgeText}
          </span>
        );
    }
  })();

  const footerRightNode = (() => {
    switch (card.footerRightTone) {
      case 'pill-emerald-dot':
        return (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-on-surface-variant font-medium">
              {card.footerRightText}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        );
      case 'primary-verified':
        return (
          <span className="font-caption text-caption text-primary font-semibold flex items-center gap-0.5">
            {card.footerRightIcon && (
              <MaterialIcon name={card.footerRightIcon} className="text-[14px]" />
            )}
            {card.footerRightText}
          </span>
        );
      case 'amber':
        return (
          <span className="font-caption text-caption text-amber-700 font-medium">
            {card.footerRightText}
          </span>
        );
      default:
        return (
          <span className="font-caption text-caption text-tertiary font-medium">
            {card.footerRightText}
          </span>
        );
    }
  })();

  return (
    <div className="p-6 rounded-2xl bg-surface-container-lowest/70 backdrop-blur-2xl shadow-[0_16px_32px_rgba(0,83,205,0.06)] flex flex-col justify-between gap-space-md transition-all hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-xl ${iconBoxClass} flex items-center justify-center`}
        >
          <MaterialIcon name={card.icon} className="text-[26px]" />
        </div>
        {badgeNode}
      </div>

      <div>
        <span className="font-caption text-caption uppercase tracking-wider text-on-surface-variant font-medium">
          {card.title}
        </span>
        <div
          className={`font-title-portal text-[32px] leading-tight font-bold tracking-tight mt-1 ${
            card.amountTone === 'amber' ? 'text-amber-700' : 'text-on-surface'
          }`}
        >
          {card.amount}
        </div>
      </div>

      <div className="pt-3 flex items-center justify-between text-on-surface-variant">
        <span className="font-caption text-caption">{card.footerLeft}</span>
        {footerRightNode}
      </div>
    </div>
  );
}
