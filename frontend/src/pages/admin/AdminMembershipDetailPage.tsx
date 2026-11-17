import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, adminApi } from '@/api/client';
import '@/styles/adminMemberships.css';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { StatusPill } from '@/components/admin/StatusPill';
import { DossierIdentitySection } from '@/components/admin/memberships/DossierIdentitySection';
import { DossierVerificationSection } from '@/components/admin/memberships/DossierVerificationSection';
import { OfficerDecisionToolbar } from '@/components/admin/memberships/OfficerDecisionToolbar';
import { useAuth } from '@/context/AuthContext';
import { currentStaff } from '@/data/mockData';
import type {
  AdminMembershipApplication,
  AdminMembershipStatus,
  AdminWorkflowTimelineEvent,
} from '@/types/adminMemberships';
import { mapApiMembershipToApplication } from '@/utils/adminMappers';

interface ToastBanner {
  tone: 'success' | 'warning' | 'error';
  message: string;
}

const toastStyles: Record<ToastBanner['tone'], string> = {
  success: 'bg-primary-fixed text-on-primary-fixed border-primary/20',
  warning: 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/20',
  error: 'bg-error-container text-on-error-container border-error/20',
};

export default function AdminMembershipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [matchedApplication, setMatchedApplication] =
    useState<AdminMembershipApplication | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<AdminMembershipStatus>('PENDING_APPROVAL');
  const [statusHeaderLabel, setStatusHeaderLabel] = useState<string>(
    'Status: Pending Final Officer Sign-Off'
  );
  const [timeline, setTimeline] = useState<AdminWorkflowTimelineEvent[]>([]);
  const [remarks, setRemarks] = useState<string>('');
  const [complianceChecked, setComplianceChecked] = useState<boolean>(true);
  const [flaggedForIntel, setFlaggedForIntel] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const loadDossier = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await adminApi.getMembershipById(id);
      const mapped = mapApiMembershipToApplication(res.membership);
      setMatchedApplication(mapped);
      setStatus(mapped.status);
      setStatusHeaderLabel(mapped.statusHeaderLabel);
      setTimeline(mapped.timeline);
      setRemarks(mapped.defaultOfficerRemarks);
    } catch {
      setMatchedApplication(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  if (loading) {
    return (
      <div className="flex flex-col w-full">
        <div className="relative w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-margin-desktop py-space-xl">
          <div className="bg-surface-container-lowest rounded-[32px] p-space-xl shadow-md flex items-center justify-center gap-3">
            <MaterialIcon
              name="progress_activity"
              className="text-[24px] text-primary animate-spin"
            />
            <span className="font-label-primary text-label-primary text-on-surface">
              Loading membership dossier...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!matchedApplication) {
    return (
      <div className="flex flex-col w-full">
        <div className="relative w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-[32px] p-space-xl shadow-md flex flex-col items-center text-center gap-space-md">
            <div className="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center">
              <MaterialIcon name="folder_off" className="text-[28px]" />
            </div>
            <div className="flex flex-col gap-1 max-w-lg">
              <h1 className="font-headline-card text-headline-card text-on-surface font-bold">
                Membership Dossier Not Found
              </h1>
              <p className="font-body-default text-body-default text-on-surface-variant">
                No membership application matches dossier identifier{' '}
                <span className="font-mono font-semibold text-on-surface">
                  {id ?? 'unknown'}
                </span>
                . Select a valid dossier from the verification queue.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Link
                to="/admin/memberships"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-label-primary text-label-primary font-semibold shadow-sm hover:bg-primary-container transition-all"
              >
                <MaterialIcon name="arrow_back" className="text-[18px]" />
                <span>Back to Verification Queue</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const executeReview = async (
    action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'SUSPEND',
    officerRemarks: string,
    successTone: ToastBanner['tone'],
    successMessage: string
  ) => {
    try {
      const res = await adminApi.reviewMembership(matchedApplication.id, {
        action,
        officer_remarks: officerRemarks,
      });
      const updated = mapApiMembershipToApplication(res.membership);
      setMatchedApplication(updated);
      setStatus(updated.status);
      setStatusHeaderLabel(updated.statusHeaderLabel);
      setTimeline(updated.timeline);
      setRemarks(updated.defaultOfficerRemarks);
      setToast({ tone: successTone, message: successMessage });
    } catch (error) {
      setToast({
        tone: 'error',
        message:
          error instanceof ApiError
            ? error.message
            : `Failed to execute ${action} on dossier ${matchedApplication.dossierNumber}.`,
      });
    }
  };

  const handleApprove = () =>
    executeReview(
      'APPROVE',
      remarks.trim() || matchedApplication.defaultOfficerRemarks,
      'success',
      `Application ${matchedApplication.dossierNumber} approved! Payment gateway unlocked for ${matchedApplication.shortTitleName}.`
    );

  const handleRequestRevision = (note: string) =>
    executeReview(
      'REQUEST_REVISION',
      note,
      'warning',
      `Revision requested for ${matchedApplication.dossierNumber}. Remarks recorded in audit log.`
    );

  const handleReject = (reason: string) =>
    executeReview(
      'REJECT',
      reason,
      'error',
      `Application ${matchedApplication.dossierNumber} flagged as REJECTED: ${reason}`
    );

  const handleSuspend = (reason: string) =>
    executeReview(
      'SUSPEND',
      reason,
      'error',
      `Membership ${matchedApplication.dossierNumber} SUSPENDED: ${reason}`
    );

  const handleToggleFlagIntel = () => {
    const next = !flaggedForIntel;
    setFlaggedForIntel(next);
    setToast({
      tone: next ? 'warning' : 'success',
      message: next
        ? `Dossier ${matchedApplication.dossierNumber} flagged for Special Branch Intelligence clearance.`
        : `Intelligence clearance flag removed for ${matchedApplication.dossierNumber}.`,
    });
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-margin-desktop py-space-md sm:py-space-lg flex flex-col gap-space-lg">
        {/* Atmospheric Ambient Glows behind workspace */}
        <div className="absolute -top-16 left-1/4 w-[480px] h-[320px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-12 w-[420px] h-[380px] bg-secondary-container/20 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* In-Page Feedback Toast */}
        {toast && (
          <div
            role="status"
            className={`flex items-center justify-between gap-space-md px-5 py-3.5 rounded-2xl shadow-sm border ${toastStyles[toast.tone]}`}
          >
            <div className="flex items-center gap-2.5">
              <MaterialIcon
                name={
                  toast.tone === 'success'
                    ? 'check_circle'
                    : toast.tone === 'warning'
                      ? 'info'
                      : 'error'
                }
                className="text-[20px]"
                filled
              />
              <span className="font-label-primary text-label-primary font-semibold">
                {toast.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Dismiss notification"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          </div>
        )}

        {/* 1. Top Sub-header / Breadcrumbs & Priority SLA Bar */}
        <section className="w-full bg-surface-container-low/80 backdrop-blur-xl rounded-[24px] p-space-md sm:p-space-lg shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md">
          {/* Breadcrumb path & Identity Tag */}
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs flex-wrap font-label-meta text-label-meta text-on-surface-variant">
              <Link
                to="/admin/dashboard"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <MaterialIcon name="dashboard" className="text-[16px]" />
                <span>Dashboard</span>
              </Link>
              <span className="text-outline-variant">/</span>
              <Link
                to="/admin/memberships"
                className="hover:text-primary transition-colors"
              >
                Memberships
              </Link>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface font-semibold">
                Review Dossier {matchedApplication.dossierNumber}
              </span>
            </div>

            <div className="flex items-center gap-space-sm flex-wrap mt-0.5">
              <Link
                to="/admin/memberships"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors font-label-primary text-label-primary text-on-surface"
              >
                <MaterialIcon name="arrow_back" className="text-[16px] text-primary" />
                <span>Back to Verification Queue</span>
              </Link>

              <StatusPill
                status={status}
                label={statusHeaderLabel}
                variant="pill"
                pulse={status === 'PENDING_APPROVAL'}
              />

              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-highest text-secondary font-label-meta text-label-meta font-medium">
                <MaterialIcon name="timer" className="text-[15px] text-primary" />
                <span>{matchedApplication.slaLabel}</span>
              </span>
            </div>
          </div>

          {/* Quick Action Utilities */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              type="button"
              onClick={() =>
                setToast({
                  tone: 'success',
                  message: `Preparing printable official dossier for ${matchedApplication.dossierNumber}...`,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-primary text-label-primary shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <MaterialIcon
                name="picture_as_pdf"
                className="text-[18px] text-primary"
              />
              <span>Print Dossier (PDF)</span>
            </button>
            <button
              type="button"
              onClick={handleToggleFlagIntel}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-label-primary text-label-primary shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] ${
                flaggedForIntel
                  ? 'bg-error text-on-error'
                  : 'bg-surface-container hover:bg-error-container/30 text-error'
              }`}
            >
              <MaterialIcon name="flag" className="text-[18px]" filled={flaggedForIntel} />
              <span>
                {flaggedForIntel
                  ? 'Flagged for Intelligence Clearance'
                  : 'Flag for Intelligence Clearance'}
              </span>
            </button>
          </div>
        </section>

        {/* 2. Main Workspace Layout (Two-Column Dossier Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT COLUMN: Applicant Credentials & Identity Verification (7 Cols) */}
          <DossierIdentitySection application={matchedApplication} />

          {/* RIGHT COLUMN: Verified Documents Viewer & Audit History (5 Cols) */}
          <DossierVerificationSection
            application={matchedApplication}
            timeline={timeline}
            onActionNotice={(message) => setToast({ tone: 'success', message })}
          />
        </div>

        {/* 3. Decision & Approval Toolbar (Reviewing Officer Workspace at Bottom) */}
        <OfficerDecisionToolbar
          application={matchedApplication}
          currentStatus={status}
          officerName={user?.full_name ?? currentStaff.name}
          officerPin={user?.username ?? currentStaff.pin}
          remarks={remarks}
          onRemarksChange={setRemarks}
          complianceChecked={complianceChecked}
          onComplianceChange={setComplianceChecked}
          onApprove={handleApprove}
          onRequestRevision={handleRequestRevision}
          onReject={handleReject}
          onSuspend={handleSuspend}
          onValidationError={(message) => setToast({ tone: 'error', message })}
        />
      </div>
    </div>
  );
}
