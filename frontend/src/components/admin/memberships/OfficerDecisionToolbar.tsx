import { useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type {
  AdminMembershipApplication,
  AdminMembershipStatus,
} from '@/types/adminMemberships';

export interface OfficerDecisionToolbarProps {
  application: AdminMembershipApplication;
  currentStatus: AdminMembershipStatus;
  officerName: string;
  officerPin: string;
  remarks: string;
  onRemarksChange: (value: string) => void;
  complianceChecked: boolean;
  onComplianceChange: (checked: boolean) => void;
  onApprove: () => Promise<void> | void;
  onRequestRevision: (note: string) => Promise<void> | void;
  onReject: (reason: string) => Promise<void> | void;
  onSuspend?: (reason: string) => Promise<void> | void;
  onValidationError: (message: string) => void;
}

export function OfficerDecisionToolbar({
  application,
  currentStatus,
  officerName,
  officerPin,
  remarks,
  onRemarksChange,
  complianceChecked,
  onComplianceChange,
  onApprove,
  onRequestRevision,
  onReject,
  onSuspend,
  onValidationError,
}: OfficerDecisionToolbarProps) {
  const [isSealing, setIsSealing] = useState(false);
  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(
    'Incomplete service authorization credentials.'
  );

  const isApproved = currentStatus === 'APPROVED';

  const handleApproveClick = async () => {
    if (isApproved || isSealing) return;
    if (!complianceChecked) {
      onValidationError(
        'Please check the verification compliance box under Kerala Police Sports Council Bylaws before approving.'
      );
      return;
    }

    setIsSealing(true);
    try {
      await onApprove();
    } finally {
      setIsSealing(false);
    }
  };

  const handleConfirmReject = async () => {
    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      onValidationError('Please specify the departmental ground for rejection.');
      return;
    }
    setRejectPromptOpen(false);
    await onReject(trimmed);
  };

  const handleRevisionClick = async () => {
    const note =
      remarks.trim() ||
      'Applicant requested to re-upload clear identity and medical credentials via the portal.';
    await onRequestRevision(note);
  };

  const handleSuspendClick = async () => {
    const reason =
      remarks.trim() ||
      'Suspended by Duty Officer pending administrative verification.';
    if (onSuspend) {
      await onSuspend(reason);
    }
  };

  return (
    <section className="w-full bg-surface-container-lowest/90 backdrop-blur-3xl rounded-[32px] p-space-md sm:p-space-xl shadow-xl flex flex-col gap-space-md">
      {/* Duty Officer Credential Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pb-2">
        <div className="flex items-center gap-space-sm">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-md">
            <MaterialIcon name="rate_review" className="text-[26px]" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-headline-card text-headline-card text-on-surface font-bold">
              Officer Determination &amp; Sign-Off
            </h3>
            <span className="font-label-meta text-label-meta text-secondary">
              Reviewing Authority:{' '}
              <strong>
                {officerName} (PIN: {officerPin})
              </strong>{' '}
              • Kannur City Duty Officer
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low font-caption text-caption text-secondary">
          <MaterialIcon name="verified_user" className="text-[16px] text-primary" />
          <span>
            Digital Signature Token: Active (Token ID:{' '}
            {application.digitalSignatureTokenId})
          </span>
        </div>
      </div>

      {/* Remarks / Concession Notes Input Tray */}
      <div className="flex flex-col gap-2">
        <label
          className="font-label-primary text-label-primary font-semibold text-on-surface flex items-center justify-between flex-wrap gap-1"
          htmlFor="officer-remarks"
        >
          <span>Officer Remarks / Concession Verification Notes</span>
          <span className="text-secondary font-caption text-caption">
            Mandatory for subsidized police welfare memberships
          </span>
        </label>
        <div className="w-full bg-surface-container-low/70 rounded-2xl p-3 sm:p-4 shadow-inner">
          <textarea
            id="officer-remarks"
            rows={2}
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            placeholder="Enter reason for approval or document clarifications..."
            className="w-full bg-transparent text-on-surface font-body-default text-body-default placeholder:text-outline focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Optional inline Rejection Ground Drawer (replaces window.prompt) */}
      {rejectPromptOpen && (
        <div className="p-space-md rounded-2xl bg-error-container/30 border border-error/20 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-primary text-label-primary font-semibold text-on-error-container flex items-center gap-1.5">
              <MaterialIcon name="report" className="text-[18px] text-error" />
              Specify Departmental Ground for Rejection
            </span>
            <button
              type="button"
              onClick={() => setRejectPromptOpen(false)}
              className="text-caption font-caption text-secondary hover:text-on-surface"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter official reason for rejecting this application..."
            className="w-full h-10 px-3.5 rounded-xl bg-surface-container-lowest text-on-surface font-label-meta text-label-meta focus:outline-none focus:ring-2 focus:ring-error/40"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectPromptOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-surface-container text-on-surface font-label-meta text-label-meta font-semibold"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              className="px-4 py-1.5 rounded-xl bg-error text-on-error font-label-meta text-label-meta font-bold shadow-sm"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}

      {/* Legal Compliance Checkbox */}
      <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none group py-1">
        <input
          id="confirm-checkbox"
          type="checkbox"
          checked={complianceChecked}
          onChange={(e) => onComplianceChange(e.target.checked)}
          className="w-5 h-5 rounded-lg accent-primary text-primary focus:ring-0 focus:outline-none cursor-pointer mt-0.5 sm:mt-0"
        />
        <span className="font-label-primary text-label-primary text-on-surface leading-tight">
          I confirm physical/digital verification of original credentials under{' '}
          <strong>Kerala Police Sports Council Bylaws 2024 (Section 12.B)</strong>.
        </span>
      </label>

      {/* Action Button Group */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md pt-space-xs">
        {/* Left: Quick Fee Indicator */}
        <div className="flex items-center gap-2 font-label-primary text-label-primary text-on-surface-variant flex-wrap">
          <span className="text-secondary">Concessional Fee:</span>
          <span className="text-on-surface font-bold text-headline-card">
            {application.feeAmountFormatted}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-[11px] font-semibold">
            {application.feeTaxBadge}
          </span>
        </div>

        {/* Right: Primary Action Triggers */}
        <div className="flex items-center gap-space-sm flex-wrap justify-end">
          {/* Secondary Red Outlined */}
          <button
            id="btn-reject"
            type="button"
            onClick={() => setRejectPromptOpen((prev) => !prev)}
            className="px-5 py-3 rounded-[20px] bg-surface-container hover:bg-error-container/40 text-error font-label-primary text-label-primary font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5"
          >
            <MaterialIcon name="cancel" className="text-[18px]" />
            <span>Reject Application</span>
          </button>

          {onSuspend && (
            <button
              id="btn-suspend"
              type="button"
              onClick={handleSuspendClick}
              className="px-5 py-3 rounded-[20px] bg-surface-container hover:bg-amber-100/70 text-amber-800 font-label-primary text-label-primary font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              <MaterialIcon name="pause_circle" className="text-[18px]" />
              <span>Suspend</span>
            </button>
          )}

          {/* Secondary Slate/Neutral */}
          <button
            id="btn-revision"
            type="button"
            onClick={handleRevisionClick}
            className="px-5 py-3 rounded-[20px] bg-surface-container hover:bg-surface-container-high text-on-surface font-label-primary text-label-primary font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5"
          >
            <MaterialIcon name="rule_folder" className="text-[18px]" />
            <span>Request Revision</span>
          </button>

          {/* Primary Royal Blue Solid Button */}
          <button
            id="btn-approve"
            type="button"
            disabled={isSealing}
            onClick={handleApproveClick}
            className={`px-7 py-3 rounded-[22px] font-label-primary text-label-primary font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.985] flex items-center gap-2 ${
              isApproved
                ? 'bg-secondary-fixed text-on-secondary-fixed'
                : 'bg-primary-container text-on-primary-container'
            } ${isSealing ? 'opacity-80 pointer-events-none' : ''}`}
          >
            {isSealing ? (
              <>
                <MaterialIcon
                  name="progress_activity"
                  className="animate-spin text-[20px]"
                />
                <span>Sealing Approval Token...</span>
              </>
            ) : isApproved ? (
              <>
                <MaterialIcon name="check_circle" className="text-[20px]" />
                <span>Approved &amp; Payment Gateway Notified</span>
              </>
            ) : (
              <>
                <MaterialIcon name="lock" className="text-[20px]" />
                <span>
                  Approve Membership &amp; Enable Payment Gateway (
                  {application.feeShortFormatted})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
