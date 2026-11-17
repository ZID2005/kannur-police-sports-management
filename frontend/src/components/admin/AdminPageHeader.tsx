import type { ReactNode } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export interface AdminPageHeaderProps {
  shiftBadge?: string;
  officerLabel?: string;
  title: string;
  groundsBadge?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({
  shiftBadge,
  officerLabel,
  title,
  groundsBadge,
  subtitle,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-lg">
      <div className="flex flex-col gap-space-xs">
        {(shiftBadge || officerLabel) && (
          <div className="flex items-center gap-space-sm flex-wrap">
            {shiftBadge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-meta text-label-meta font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {shiftBadge}
              </span>
            )}
            {officerLabel && (
              <span className="inline-flex items-center gap-1 text-on-surface-variant font-label-meta text-label-meta">
                <MaterialIcon name="badge" className="text-[16px] text-primary" filled />
                {officerLabel}
              </span>
            )}
          </div>
        )}
        <div className="flex items-baseline gap-space-md mt-1 flex-wrap">
          <h1 className="font-title-portal text-title-portal-mobile md:text-title-portal text-on-surface tracking-tight">
            {title}
          </h1>
          {groundsBadge && (
            <span className="hidden md:inline-block px-2.5 py-0.5 rounded bg-surface-container font-label-meta text-label-meta text-secondary font-medium">
              {groundsBadge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="font-body-default text-body-default text-on-surface-variant max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-space-sm self-stretch xl:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
