import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, adminApi } from '@/api/client';
import '@/styles/adminMemberships.css';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { ApplicationQueueRow } from '@/components/admin/memberships/ApplicationQueueRow';
import { useAuth } from '@/context/AuthContext';
import {
  adminDashboardShiftMeta,
  adminMembershipApplications,
  adminMembershipQueueFilters,
  adminMembershipSearchPlaceholder,
  adminMembershipStatusFilters,
} from '@/data/mockData';
import type {
  AdminMembershipApplication,
  AdminMembershipQueueFilterId,
  AdminMembershipStatusFilterId,
} from '@/types/adminMemberships';
import { mapApiMembershipToApplication } from '@/utils/adminMappers';

const PAGE_SIZE = 5;

export default function AdminMembershipsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AdminMembershipApplication[]>(
    adminMembershipApplications
  );
  const [capacity, setCapacity] = useState({
    active_and_approved_count: 0,
    monthly_member_cap: 300,
    remaining_slots: 300,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] =
    useState<AdminMembershipQueueFilterId>('ALL');
  const [statusFilter, setStatusFilter] =
    useState<AdminMembershipStatusFilterId>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadMemberships = useCallback(async () => {
    try {
      const res = await adminApi.listMemberships();
      setCapacity(res.capacity);
      setApplications(
        res.memberships.map((m) => mapApiMembershipToApplication(m, res.capacity))
      );
    } catch (error) {
      setToastMessage(
        error instanceof ApiError
          ? error.message
          : 'Failed to load membership dossier queue.'
      );
    }
  }, []);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter((app) => {
      if (categoryFilter !== 'ALL' && app.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && app.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        app.applicantName.toLowerCase().includes(q) ||
        app.shortTitleName.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        app.dossierNumber.toLowerCase().includes(q) ||
        (app.pen && app.pen.toLowerCase().includes(q)) ||
        app.organizationLabel.toLowerCase().includes(q) ||
        app.facilityPlanLabel.toLowerCase().includes(q)
      );
    });
  }, [applications, categoryFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedApplications = filteredApplications.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const pendingCount = useMemo(
    () => applications.filter((a) => a.status === 'PENDING_APPROVAL').length,
    [applications]
  );

  const pendingGovtCount = useMemo(
    () =>
      applications.filter(
        (a) => a.status === 'PENDING_APPROVAL' && a.category === 'POLICE_GOVT'
      ).length,
    [applications]
  );

  const pendingPublicCount = useMemo(
    () =>
      applications.filter(
        (a) => a.status === 'PENDING_APPROVAL' && a.category === 'PUBLIC'
      ).length,
    [applications]
  );

  const approvedCount = useMemo(
    () => applications.filter((a) => a.status === 'APPROVED').length,
    [applications]
  );

  const handleQuickApprove = async (target: AdminMembershipApplication) => {
    try {
      await adminApi.reviewMembership(target.id, {
        action: 'APPROVE',
        officer_remarks:
          target.defaultOfficerRemarks ||
          'Approved by Duty Officer from verification queue.',
      });
      setToastMessage(
        `Dossier ${target.dossierNumber} (${target.shortTitleName}) approved. Payment unlocked.`
      );
      await loadMemberships();
    } catch (error) {
      setToastMessage(
        error instanceof ApiError
          ? error.message
          : `Failed to approve dossier ${target.dossierNumber}.`
      );
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    let count = 0;
    for (const id of selectedIds) {
      try {
        await adminApi.reviewMembership(id, {
          action: 'APPROVE',
          officer_remarks: 'Batch approved by Duty Officer.',
        });
        count += 1;
      } catch {
        // Continue with remaining dossiers
      }
    }
    setToastMessage(`Batch approved ${count} of ${selectedIds.length} dossier(s).`);
    setSelectedIds([]);
    setBatchMode(false);
    await loadMemberships();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-hidden px-margin-desktop py-space-xl flex flex-col gap-space-xl">
        {/* Ambient Glows */}
        <div className="absolute -top-32 left-1/3 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-64 right-10 w-[400px] h-[250px] bg-secondary-container/30 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-space-md px-5 py-3.5 rounded-2xl bg-primary-fixed text-on-primary-fixed shadow-sm border border-primary/20"
          >
            <div className="flex items-center gap-2.5">
              <MaterialIcon
                name="check_circle"
                className="text-[20px] text-primary"
                filled
              />
              <span className="font-label-primary text-label-primary font-semibold">
                {toastMessage}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg hover:bg-primary/10 text-on-primary-fixed transition-colors"
              aria-label="Dismiss notification"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          </div>
        )}

        {/* 1. Page Header */}
        <AdminPageHeader
          shiftBadge={adminDashboardShiftMeta.shiftBadge}
          officerLabel={user ? `${user.full_name} (@${user.username})` : adminDashboardShiftMeta.officerLabel}
          title="Membership Verification Queue"
          groundsBadge={adminDashboardShiftMeta.groundsBadge}
          subtitle="Full registry of police, government, and public athletic membership dossiers awaiting credential verification and officer sign-off."
          actions={
            <>
              <Link
                to="/admin/dashboard"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low font-label-primary text-label-primary font-semibold transition-all"
              >
                <MaterialIcon name="arrow_back" className="text-[18px] text-primary" />
                <span>Command Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={loadMemberships}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low font-label-primary text-label-primary font-semibold transition-all"
              >
                <MaterialIcon name="refresh" className="text-[20px] text-secondary" />
                <span>Refresh Queue</span>
              </button>
            </>
          }
        />

        {/* 2. Summary KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <StatCard
            label="Queue Action Items"
            value={pendingCount}
            valueSuffix={
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-caption text-caption font-semibold">
                {applications.filter((a) => a.isOver24h).length} &gt; 24h SLA
              </span>
            }
            icon="assignment_turned_in"
            iconTone="primary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              Assigned to Duty Officer Desk • Kannur HQ
            </span>
          </StatCard>

          <StatCard
            label="Police & Govt Quota"
            value={pendingGovtCount}
            valueSuffix={
              <span className="font-caption text-caption text-secondary font-semibold">
                Service Proof
              </span>
            }
            icon="local_police"
            iconTone="secondary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              50% Departmental Subsidized Tariff
            </span>
          </StatCard>

          <StatCard
            label="Public Pending"
            value={pendingPublicCount}
            valueSuffix={
              <span className="font-caption text-caption text-primary font-semibold">
                Citizen Quota
              </span>
            }
            icon="emoji_events"
            iconTone="tertiary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              Standard Public Synthetic Track Pass
            </span>
          </StatCard>

          <StatCard
            label="Approved & Active"
            value={approvedCount}
            valueTone="primary"
            valueSuffix={
              <span className="font-caption text-caption text-secondary font-semibold">
                / {capacity.monthly_member_cap} Cap
              </span>
            }
            icon="verified"
            iconTone="surface"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              {capacity.remaining_slots} Track Slots Remaining in Cap
            </span>
          </StatCard>
        </div>

        {/* 3. Full-Page Verification Queue Card */}
        <section className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm flex flex-col gap-space-md">
          {/* Top Bar: Title + Batch Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                <MaterialIcon name="badge" className="text-[20px]" />
              </div>
              <div>
                <h2 className="font-headline-card text-headline-card text-on-surface font-semibold tracking-tight">
                  Dossier Verification &amp; Approval Registry
                </h2>
                <p className="font-caption text-caption text-secondary">
                  Select any applicant row or click &ldquo;Review Dossier&rdquo; to inspect
                  uploaded credentials and sign off.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {batchMode && selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchApprove}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-meta text-label-meta font-bold shadow-sm hover:bg-primary-container transition-all"
                >
                  Approve Selected ({selectedIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setBatchMode((prev) => !prev);
                  setSelectedIds([]);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-meta text-label-meta font-semibold transition-colors"
              >
                {batchMode ? 'Exit Batch Select' : 'Batch Select'}
              </button>
              <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-bold">
                {filteredApplications.length} Matching Dossiers
              </span>
            </div>
          </div>

          {/* Search & Category Filter Chips */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm pt-1">
            <div className="relative flex-1">
              <MaterialIcon
                name="search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={adminMembershipSearchPlaceholder}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container-low font-label-meta text-label-meta text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 admin-memberships-scroll">
              {adminMembershipQueueFilters.map((chip) => {
                const active = categoryFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(chip.id);
                      setCurrentPage(1);
                    }}
                    className={
                      active
                        ? 'px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-meta text-label-meta font-medium whitespace-nowrap shadow-sm'
                        : 'px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-meta text-label-meta font-medium whitespace-nowrap transition-colors'
                    }
                  >
                    {chip.label.replace(/\s*\(\d+\)/, '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Status Filter Strip */}
          <div className="flex items-center justify-between gap-space-sm flex-wrap pt-1 border-t border-surface-container-low">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 admin-memberships-scroll">
              <span className="font-caption text-caption text-secondary font-semibold mr-1">
                Status:
              </span>
              {adminMembershipStatusFilters.map((st) => {
                const active = statusFilter === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st.id);
                      setCurrentPage(1);
                    }}
                    className={
                      active
                        ? 'px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-bold whitespace-nowrap'
                        : 'px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-caption text-caption font-medium whitespace-nowrap transition-colors'
                    }
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            {(searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="font-caption text-caption text-primary font-semibold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Application Rows */}
          <div className="flex flex-col gap-space-sm divide-y divide-surface-container-low">
            {paginatedApplications.length > 0 ? (
              paginatedApplications.map((application) => (
                <ApplicationQueueRow
                  key={application.id}
                  application={application}
                  onQuickApprove={handleQuickApprove}
                  selectable={batchMode}
                  selected={selectedIds.includes(application.id)}
                  onToggleSelect={handleToggleSelect}
                  showExtendedMeta
                />
              ))
            ) : (
              <div className="py-space-xl text-center flex flex-col items-center gap-2">
                <MaterialIcon
                  name="manage_search"
                  className="text-[32px] text-outline"
                />
                <p className="font-label-primary text-label-primary text-on-surface font-semibold">
                  No matching membership dossiers found
                </p>
                <p className="font-caption text-caption text-secondary">
                  Try clearing your search query or switching status filter chips.
                </p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="pt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-surface-container font-label-meta text-label-meta text-secondary">
            <span>
              Showing{' '}
              {filteredApplications.length === 0
                ? 0
                : (safePage - 1) * PAGE_SIZE + 1}
              –{Math.min(safePage * PAGE_SIZE, filteredApplications.length)} of{' '}
              {filteredApplications.length} matching dossiers ({applications.length} total in queue)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-meta text-label-meta font-semibold hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={
                    pageNum === safePage
                      ? 'w-8 h-8 rounded-lg bg-primary text-on-primary font-label-meta text-label-meta font-bold shadow-xs'
                      : 'w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-meta text-label-meta font-medium transition-colors'
                  }
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-meta text-label-meta font-semibold hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
