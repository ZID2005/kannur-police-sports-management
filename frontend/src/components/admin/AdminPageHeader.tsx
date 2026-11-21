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
    <header className="admin-animate-enter flex flex-col xl:flex-row xl:items-end justify-between gap-5 pb-6 border-b border-slate-200/80">
      <div className="flex flex-col gap-2.5 min-w-0">
        {(shiftBadge || groundsBadge || officerLabel) && (
          <div className="flex items-center gap-2 flex-wrap">
            {shiftBadge && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#0F50DC] text-[12px] font-semibold tracking-[-0.005em]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#165DF5] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#165DF5]" />
                </span>
                {shiftBadge}
              </span>
            )}

            {groundsBadge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/85 text-[#475569] text-[12px] font-medium shadow-2xs">
                <MaterialIcon name="location_on" className="text-[14px] text-[#64748B]" />
                {groundsBadge}
              </span>
            )}

            {officerLabel && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 text-[#475569] text-[12px] font-medium">
                <MaterialIcon name="badge" className="text-[14px] text-[#165DF5]" filled />
                <span className="truncate max-w-[280px]">{officerLabel}</span>
              </span>
            )}
          </div>
        )}

        <h1 className="font-display text-[28px] sm:text-[34px] font-extrabold text-[#0F172A] tracking-[-0.03em] leading-[1.12]">
          {title}
        </h1>

        {subtitle && (
          <p className="text-[14.5px] text-[#64748B] leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
