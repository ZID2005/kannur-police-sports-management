import type { ReactNode } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export interface StatCardProps {
  label: string;
  value: string | number;
  valueTone?: 'default' | 'primary';
  valueSuffix?: ReactNode;
  icon: string;
  iconTone?: 'primary' | 'secondary' | 'tertiary' | 'surface';
  children?: ReactNode;
}

const iconToneClasses: Record<NonNullable<StatCardProps['iconTone']>, string> = {
  primary: 'bg-primary-fixed text-primary',
  secondary: 'bg-secondary-fixed text-secondary',
  tertiary: 'bg-tertiary-fixed text-tertiary',
  surface: 'bg-surface-container-high text-primary',
};

export function StatCard({
  label,
  value,
  valueTone = 'default',
  valueSuffix,
  icon,
  iconTone = 'primary',
  children,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-label-meta text-label-meta uppercase tracking-wider text-secondary font-semibold">
            {label}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-[34px] font-bold leading-tight tracking-tight ${
                valueTone === 'primary' ? 'text-primary' : 'text-on-surface'
              }`}
            >
              {value}
            </span>
            {valueSuffix}
          </div>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconToneClasses[iconTone]}`}
        >
          <MaterialIcon name={icon} className="text-[26px]" />
        </div>
      </div>
      {children && <div className="mt-4 flex flex-col gap-2">{children}</div>}
    </div>
  );
}
