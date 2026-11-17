import type { AdminMembershipStatus } from '@/types/adminMemberships';

export interface StatusPillProps {
  status: AdminMembershipStatus;
  label: string;
  variant?: 'dot' | 'pill';
  pulse?: boolean;
}

const dotStyles: Record<AdminMembershipStatus, { dot: string; text: string }> = {
  PENDING_APPROVAL: {
    dot: 'bg-primary-container',
    text: 'text-primary',
  },
  IDENTITY_CLEARED: {
    dot: 'bg-secondary',
    text: 'text-secondary',
  },
  DOCUMENTS_PENDING: {
    dot: 'bg-error',
    text: 'text-error',
  },
  APPROVED: {
    dot: 'bg-secondary-fixed-dim',
    text: 'text-secondary',
  },
  REVISION_REQUESTED: {
    dot: 'bg-tertiary',
    text: 'text-tertiary',
  },
  REJECTED: {
    dot: 'bg-error',
    text: 'text-error',
  },
};

const pillStyles: Record<AdminMembershipStatus, { container: string; dot: string }> = {
  PENDING_APPROVAL: {
    container: 'bg-error-container/30 text-on-error-container',
    dot: 'bg-error',
  },
  IDENTITY_CLEARED: {
    container: 'bg-secondary-fixed text-on-secondary-fixed',
    dot: 'bg-secondary',
  },
  DOCUMENTS_PENDING: {
    container: 'bg-error-container/50 text-on-error-container',
    dot: 'bg-error',
  },
  APPROVED: {
    container: 'bg-primary-fixed text-on-primary-fixed',
    dot: 'bg-primary',
  },
  REVISION_REQUESTED: {
    container: 'bg-tertiary-fixed text-on-tertiary-fixed',
    dot: 'bg-tertiary',
  },
  REJECTED: {
    container: 'bg-error text-on-error',
    dot: 'bg-on-error',
  },
};

export function StatusPill({
  status,
  label,
  variant = 'dot',
  pulse = false,
}: StatusPillProps) {
  if (variant === 'pill') {
    const style = pillStyles[status];
    return (
      <span
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-label-meta text-label-meta ${style.container}`}
      >
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
        </span>
        <span className="font-semibold">{label}</span>
      </span>
    );
  }

  const style = dotStyles[status];
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className={`font-caption text-caption font-semibold ${style.text}`}>{label}</span>
    </div>
  );
}
