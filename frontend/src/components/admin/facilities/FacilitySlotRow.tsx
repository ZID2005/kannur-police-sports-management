import type { FacilitySlotAction, FacilityTimeSlot } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface FacilitySlotRowProps {
  slot: FacilityTimeSlot;
  onSlotAction: (slot: FacilityTimeSlot, actionId: FacilitySlotAction['id']) => void;
  onToggleSplitHalfBlock: (slotId: string, halfId: 'half-a' | 'half-b') => void;
}

export function FacilitySlotRow({
  slot,
  onSlotAction,
  onToggleSplitHalfBlock,
}: FacilitySlotRowProps) {
  if (slot.status === 'split' && slot.splitHalves) {
    return (
      <div className="group bg-surface-container-lowest/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-headline-card text-headline-card font-bold text-on-surface">
              {slot.timeRange}
            </span>
            <span className="bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-semibold px-2 py-0.5 rounded-md">
              {slot.splitStatusBadge ?? slot.statusBadgeLabel}
            </span>
          </div>
          {slot.splitSubtitle && (
            <span className="font-caption text-caption text-on-surface-variant">
              {slot.splitSubtitle}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {slot.splitHalves.map((half) => {
            const isBooked = half.status === 'booked';
            const isBlocked = half.status === 'blocked';
            const containerClass = isBooked
              ? 'bg-secondary-fixed/20'
              : isBlocked
                ? 'bg-amber-50/60'
                : 'bg-emerald-50/50';
            const barClass = isBooked
              ? 'bg-primary'
              : isBlocked
                ? 'bg-amber-500'
                : 'bg-emerald-500';
            const badgeClass = isBooked
              ? 'bg-primary-container text-on-primary'
              : isBlocked
                ? 'bg-amber-100 text-amber-900'
                : 'bg-emerald-100 text-emerald-800';
            const badgeText = isBooked ? 'Booked' : isBlocked ? 'Blocked' : 'Available';

            return (
              <div
                key={half.id}
                className={`${containerClass} rounded-xl p-3 flex items-center justify-between gap-2`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-8 ${barClass} rounded-full`} />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-primary text-label-primary font-bold text-on-surface">
                        {half.label}
                      </span>
                      <span
                        className={`text-caption text-[11px] ${badgeClass} px-1.5 rounded font-medium`}
                      >
                        {badgeText}
                      </span>
                    </div>
                    <span className="font-caption text-caption text-on-surface-variant">
                      {half.detailsText}
                    </span>
                  </div>
                </div>
                {half.rightLabel && !half.actionLabel && (
                  <span className="font-label-meta text-label-meta font-semibold text-on-surface">
                    {half.rightLabel}
                  </span>
                )}
                {half.actionLabel && (
                  <button
                    type="button"
                    onClick={() => onToggleSplitHalfBlock(slot.id, half.id)}
                    className="h-8 px-3 rounded-lg bg-surface-container text-on-surface text-caption font-semibold hover:bg-surface-container-high transition-colors"
                  >
                    {isBlocked ? 'Unblock Half B' : half.actionLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const subtitleToneClass = (() => {
    switch (slot.timeSubtitleTone) {
      case 'emerald':
        return 'text-emerald-600 font-medium';
      case 'tertiary':
        return 'text-tertiary';
      case 'secondary':
        return 'text-secondary font-medium';
      case 'primary':
        return 'text-primary font-medium flex items-center gap-1';
      default:
        return 'text-on-surface-variant';
    }
  })();

  const statusBadgeNode = (() => {
    if (slot.status === 'blocked') {
      return (
        <span className="bg-amber-100 text-amber-900 font-caption text-caption font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          {slot.statusBadgeIcon && (
            <MaterialIcon name={slot.statusBadgeIcon} className="text-[14px]" />
          )}
          {slot.statusBadgeLabel}
        </span>
      );
    }
    if (slot.status === 'booked') {
      return (
        <span className="bg-secondary-container text-on-secondary-fixed font-caption text-caption font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          {slot.statusBadgeIcon && (
            <MaterialIcon name={slot.statusBadgeIcon} className="text-[14px]" />
          )}
          {slot.statusBadgeLabel}
        </span>
      );
    }
    return (
      <span className="bg-emerald-100 text-emerald-800 font-caption text-caption font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        {slot.statusBadgeLabel}
      </span>
    );
  })();

  const bannerContainerClass = (() => {
    switch (slot.bannerTone) {
      case 'amber':
        return 'bg-amber-50/60';
      case 'amber-soft':
        return 'bg-amber-50/50';
      case 'secondary':
        return 'bg-secondary-fixed/30';
      case 'secondary-soft':
        return 'bg-secondary-fixed/20';
      default:
        return 'bg-surface-container-low/60';
    }
  })();

  const bannerIconBoxNode = (() => {
    if (slot.bannerAvatarText) {
      return (
        <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-caption">
          {slot.bannerAvatarText}
        </div>
      );
    }
    const iconBoxClass = (() => {
      switch (slot.bannerTone) {
        case 'amber':
          return 'bg-amber-200/70 text-amber-900';
        case 'amber-soft':
          return 'bg-amber-200/60 text-amber-900';
        case 'secondary':
        case 'secondary-soft':
          return 'bg-primary/10 text-primary';
        default:
          return 'bg-surface-container text-on-surface-variant';
      }
    })();
    return (
      <div className={`w-8 h-8 rounded-lg ${iconBoxClass} flex items-center justify-center`}>
        <MaterialIcon name={slot.bannerIcon ?? 'check_circle'} className="text-[20px]" />
      </div>
    );
  })();

  const rightTagNode = (() => {
    if (!slot.bannerRightTag) return null;
    switch (slot.bannerRightTagTone) {
      case 'amber':
        return (
          <div className="flex items-center gap-2 text-right">
            <span className="font-caption text-caption text-amber-800 font-medium bg-amber-200/50 px-2 py-0.5 rounded-md">
              {slot.bannerRightTag}
            </span>
          </div>
        );
      case 'amber-soft':
        return (
          <span className="font-caption text-caption text-amber-900 font-medium bg-amber-200/40 px-2 py-0.5 rounded">
            {slot.bannerRightTag}
          </span>
        );
      case 'primary-text':
        return (
          <div className="flex items-center gap-2">
            <span className="font-label-meta text-label-meta text-primary font-semibold">
              {slot.bannerRightTag}
            </span>
          </div>
        );
      case 'emerald-tag':
        return (
          <span className="font-caption text-caption text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
            {slot.bannerRightTag}
          </span>
        );
      case 'emerald-pill':
        return (
          <div className="flex items-center gap-2">
            <span className="font-caption text-caption text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-md">
              {slot.bannerRightTag}
            </span>
          </div>
        );
      case 'bold-text':
        return (
          <span className="font-label-meta text-label-meta font-semibold text-on-surface">
            {slot.bannerRightTag}
          </span>
        );
      default:
        return (
          <span className="font-label-meta text-label-meta font-semibold text-on-surface-variant">
            {slot.bannerRightTag}
          </span>
        );
    }
  })();

  const renderActionButton = (action: FacilitySlotAction) => {
    const btnClass = (() => {
      switch (action.variant) {
        case 'amber':
          return 'h-10 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-label-meta text-label-meta font-semibold flex items-center gap-1.5 transition-all';
        case 'primary':
          return 'h-10 px-3.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-label-meta text-label-meta font-medium transition-all shadow-sm';
        case 'subtle':
          return 'h-10 px-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-meta text-label-meta font-medium flex items-center gap-1 transition-all';
        case 'muted':
          return 'h-10 px-3.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface font-label-meta text-label-meta font-medium transition-all';
        default:
          return 'h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-meta text-label-meta font-medium flex items-center gap-1 transition-all';
      }
    })();

    return (
      <button
        key={action.id}
        type="button"
        onClick={() => onSlotAction(slot, action.id)}
        className={btnClass}
      >
        {action.icon && (
          <MaterialIcon
            name={action.icon}
            className={`text-[16px] ${action.variant === 'amber' ? 'text-amber-700' : ''}`}
          />
        )}
        {action.label}
      </button>
    );
  };

  return (
    <div className="group bg-surface-container-lowest/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-4 min-w-[200px]">
        <div className="flex flex-col">
          <span className="font-headline-card text-headline-card font-bold text-on-surface">
            {slot.timeRange}
          </span>
          <span className={`font-label-meta text-label-meta ${subtitleToneClass}`}>
            {slot.timeSubtitleIcon && (
              <MaterialIcon name={slot.timeSubtitleIcon} className="text-[14px]" />
            )}
            {slot.timeSubtitle}
          </span>
        </div>
        {statusBadgeNode}
      </div>

      <div
        className={`flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${bannerContainerClass} rounded-xl p-3`}
      >
        <div className="flex items-center gap-3">
          {bannerIconBoxNode}
          <div className="flex flex-col">
            <span
              className={`font-label-primary text-label-primary ${
                slot.status === 'available' ? 'font-medium' : 'font-semibold'
              } text-on-surface`}
            >
              {slot.bannerTitle}
            </span>
            <span className="font-caption text-caption text-on-surface-variant">
              {slot.bannerSubtitle}
            </span>
          </div>
        </div>
        {rightTagNode}
      </div>

      <div className="flex items-center gap-2 self-end md:self-auto">
        {slot.actions.map(renderActionButton)}
      </div>
    </div>
  );
}
