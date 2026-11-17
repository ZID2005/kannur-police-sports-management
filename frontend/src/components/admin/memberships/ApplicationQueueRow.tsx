import { Link } from 'react-router-dom';
import { StatusPill } from '@/components/admin/StatusPill';
import type { AdminMembershipApplication } from '@/types/adminMemberships';

export interface ApplicationQueueRowProps {
  application: AdminMembershipApplication;
  onQuickApprove?: (application: AdminMembershipApplication) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  showExtendedMeta?: boolean;
}

const avatarToneClasses: Record<AdminMembershipApplication['avatarTone'], string> = {
  primary: 'bg-primary-fixed-dim text-primary',
  secondary: 'bg-secondary-fixed text-secondary',
  neutral: 'bg-surface-container-high text-on-surface-variant',
  tertiary: 'bg-tertiary-fixed text-tertiary',
};

const tagToneClasses: Record<AdminMembershipApplication['tagTone'], string> = {
  neutral: 'bg-surface-container text-secondary font-medium',
  primary: 'bg-primary-fixed text-on-primary-fixed font-semibold',
  outline: 'bg-surface-container text-outline font-medium',
};

export function ApplicationQueueRow({
  application,
  onQuickApprove,
  selectable = false,
  selected = false,
  onToggleSelect,
  showExtendedMeta = false,
}: ApplicationQueueRowProps) {
  const canApproveDirectly =
    application.status === 'PENDING_APPROVAL' || application.status === 'IDENTITY_CLEARED';

  return (
    <div className="pt-space-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md p-space-sm rounded-xl hover:bg-surface-container-low/50 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(application.id)}
            aria-label={`Select ${application.shortTitleName}`}
            className="mt-2.5 w-4 h-4 rounded accent-primary text-primary cursor-pointer shrink-0"
          />
        )}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-label-primary shrink-0 ${avatarToneClasses[application.avatarTone]}`}
        >
          {application.initials}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/admin/memberships/${application.id}`}
              className="font-label-primary text-label-primary font-semibold text-on-surface hover:text-primary transition-colors"
            >
              {application.shortTitleName}
            </Link>
            <span
              className={`px-2 py-0.5 rounded font-caption text-caption ${tagToneClasses[application.tagTone]}`}
            >
              {application.tagLabel}
            </span>
            {showExtendedMeta && (
              <span className="px-2 py-0.5 rounded bg-surface-container-low font-mono text-[11px] text-secondary">
                {application.dossierNumber}
              </span>
            )}
            {showExtendedMeta && application.isOver24h && (
              <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-caption text-[11px] font-semibold">
                &gt; 24h SLA
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-caption font-caption text-on-surface-variant mt-0.5 flex-wrap">
            <span
              className={application.organizationHighlight ? 'font-medium text-primary' : ''}
            >
              {application.organizationLabel}
            </span>
            <span>•</span>
            <span>{application.facilityPlanLabel}</span>
            <span>•</span>
            <span>{application.submittedAtLabel}</span>
            {showExtendedMeta && (
              <>
                <span>•</span>
                <span className="font-semibold text-on-surface">
                  Fee: {application.feeShortFormatted}
                </span>
              </>
            )}
          </div>
          <StatusPill
            status={application.status}
            label={application.statusLabel}
            variant="dot"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {application.secondaryActionLabel && canApproveDirectly ? (
          <>
            <Link
              to={`/admin/memberships/${application.id}`}
              className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-meta text-label-meta font-semibold hover:bg-surface-container-high transition-colors"
            >
              {application.secondaryActionLabel}
            </Link>
            <button
              type="button"
              onClick={() => onQuickApprove?.(application)}
              className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-label-meta text-label-meta font-bold shadow hover:bg-primary-container transition-all"
            >
              {application.primaryActionLabel}
            </button>
          </>
        ) : canApproveDirectly ? (
          <>
            <Link
              to={`/admin/memberships/${application.id}`}
              className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-meta text-label-meta font-semibold hover:bg-surface-container-high transition-colors"
            >
              Review Dossier
            </Link>
            <button
              type="button"
              onClick={() => onQuickApprove?.(application)}
              className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-label-meta text-label-meta font-bold shadow hover:bg-primary-container transition-all"
            >
              {application.primaryActionLabel}
            </button>
          </>
        ) : (
          <Link
            to={`/admin/memberships/${application.id}`}
            className={`px-3.5 py-1.5 rounded-lg font-label-meta text-label-meta font-semibold transition-colors ${
              application.status === 'DOCUMENTS_PENDING'
                ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {application.primaryActionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
