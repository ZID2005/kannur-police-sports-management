import type { ReactNode } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export interface StatCardProps {
  label: string;
  value: string | number;
  valueTone?: 'default' | 'primary';
  valueSuffix?: ReactNode;
  icon: string;
  iconTone?: 'primary' | 'secondary' | 'tertiary' | 'surface';
  delayMs?: number;
  children?: ReactNode;
}

const iconToneClasses: Record<NonNullable<StatCardProps['iconTone']>, string> = {
  primary: 'bg-blue-50 text-[#165DF5] border border-blue-200/70',
  secondary: 'bg-indigo-50 text-indigo-600 border border-indigo-200/70',
  tertiary: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70',
  surface: 'bg-slate-100 text-[#0F50DC] border border-slate-200/80',
};

export function StatCard({
  label,
  value,
  valueTone = 'default',
  valueSuffix,
  icon,
  iconTone = 'primary',
  delayMs = 0,
  children,
}: StatCardProps) {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className="admin-animate-enter admin-kpi-card h-full relative overflow-hidden p-5 sm:p-6 rounded-[22px] flex flex-col justify-between gap-5"
    >
      {/* Top Header Row — non-colliding label & icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748B] leading-snug">
            {label}
          </span>
          <div className="flex items-baseline gap-2.5 mt-2 flex-wrap">
            <span
              className={`font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] tabular-nums ${
                valueTone === 'primary' ? 'text-[#165DF5]' : 'text-[#0F172A]'
              }`}
            >
              {value}
            </span>
            {valueSuffix}
          </div>
        </div>

        <div
          className={`admin-kpi-icon w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconToneClasses[iconTone]}`}
        >
          <MaterialIcon name={icon} className="text-[22px]" />
        </div>
      </div>

      {/* Bottom Context & Footer Band */}
      {children && (
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
