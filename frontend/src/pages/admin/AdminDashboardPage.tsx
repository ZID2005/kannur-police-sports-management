import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, adminApi } from '@/api/client';
import '@/styles/adminMemberships.css';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { ApplicationQueueRow } from '@/components/admin/memberships/ApplicationQueueRow';
import { TurnstileStreamPanel } from '@/components/admin/memberships/TurnstileStreamPanel';
import { FacilityZoneCard } from '@/components/admin/memberships/FacilityZoneCard';
import { useAuth } from '@/context/AuthContext';
import {
  adminDashboardFacilityZones,
  adminDashboardMetrics,
  adminDashboardShiftMeta,
  adminDashboardTurnstileEvents,
  adminDashboardTurnstileGateOptions,
  adminMembershipApplications,
  adminMembershipQueueFilters,
  adminMembershipSearchPlaceholder,
} from '@/data/mockData';
import type {
  AdminMembershipApplication,
  AdminMembershipQueueFilterId,
  AdminTurnstileEvent,
} from '@/types/adminMemberships';
import {
  mapApiGateLogToTurnstileEvent,
  mapApiMembershipToApplication,
} from '@/utils/adminMappers';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applications, setApplications] = useState<AdminMembershipApplication[]>(
    adminMembershipApplications
  );
  const [capacity, setCapacity] = useState({
    active_and_approved_count: adminDashboardMetrics.activeTrackMembers,
    monthly_member_cap: adminDashboardMetrics.trackMemberCap,
    remaining_slots: adminDashboardMetrics.openSlotsCount,
  });
  const [turnstileEvents, setTurnstileEvents] = useState<AdminTurnstileEvent[]>(
    adminDashboardTurnstileEvents
  );
  const [totalRevenueFormatted, setTotalRevenueFormatted] = useState<string>(
    adminDashboardMetrics.todaysCollectionsFormatted
  );
  const [revenueBreakdown, setRevenueBreakdown] = useState({
    track: adminDashboardMetrics.trackPassesCollectionLabel,
    turf: adminDashboardMetrics.turfSlotsCollectionLabel,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<AdminMembershipQueueFilterId>('ALL');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const [memRes, gateRes, payRes] = await Promise.all([
        adminApi.listMemberships(),
        adminApi.listGateLogs({ limit: 8 }).catch(() => null),
        adminApi.listPayments().catch(() => null),
      ]);

      setCapacity(memRes.capacity);
      setApplications(
        memRes.memberships.map((m) => mapApiMembershipToApplication(m, memRes.capacity))
      );

      if (gateRes && gateRes.gate_logs.length > 0) {
        setTurnstileEvents(gateRes.gate_logs.map(mapApiGateLogToTurnstileEvent));
      }

      if (payRes) {
        const rev = Number(payRes.summary.total_revenue);
        const trackRev = Number(payRes.summary.membership_revenue);
        const slotRev = Number(payRes.summary.slot_booking_revenue);
        setTotalRevenueFormatted(`₹${rev.toLocaleString('en-IN')}`);
        setRevenueBreakdown({
          track: `₹${trackRev.toLocaleString('en-IN')} Track`,
          turf: `₹${slotRev.toLocaleString('en-IN')} Slots`,
        });
      }
    } catch (error) {
      showToast(
        error instanceof ApiError
          ? error.message
          : 'Failed to load live admin dashboard metrics.'
      );
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter((app) => {
      if (activeCategoryFilter !== 'ALL' && app.category !== activeCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        app.applicantName.toLowerCase().includes(q) ||
        app.shortTitleName.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        app.dossierNumber.toLowerCase().includes(q) ||
        (app.pen && app.pen.toLowerCase().includes(q)) ||
        app.organizationLabel.toLowerCase().includes(q)
      );
    });
  }, [applications, activeCategoryFilter, searchQuery]);

  const visibleApplications = filteredApplications.slice(0, 5);

  const pendingApplications = useMemo(
    () => applications.filter((a) => a.status === 'PENDING_APPROVAL'),
    [applications]
  );
  const pendingGovtCount = useMemo(
    () => pendingApplications.filter((a) => a.category === 'POLICE_GOVT').length,
    [pendingApplications]
  );
  const pendingPublicCount = useMemo(
    () => pendingApplications.filter((a) => a.category === 'PUBLIC').length,
    [pendingApplications]
  );
  const capPercent = Math.min(
    100,
    Math.round(
      (capacity.active_and_approved_count / Math.max(1, capacity.monthly_member_cap)) * 1000
    ) / 10
  );

  const handleQuickApprove = async (target: AdminMembershipApplication) => {
    try {
      await adminApi.reviewMembership(target.id, {
        action: 'APPROVE',
        officer_remarks:
          target.defaultOfficerRemarks ||
          'Approved by Duty Officer via Command Dashboard.',
      });
      showToast(
        `Application ${target.dossierNumber} approved. Payment unlocked for ${target.shortTitleName}.`
      );
      await loadDashboardData();
    } catch (error) {
      showToast(
        error instanceof ApiError
          ? error.message
          : `Failed to approve application ${target.dossierNumber}.`
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
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await adminApi.reviewMembership(id, {
          action: 'APPROVE',
          officer_remarks: 'Batch approved by Duty Officer.',
        });
        successCount += 1;
      } catch {
        // Continue remaining batch approvals
      }
    }
    showToast(`Batch approved ${successCount} of ${selectedIds.length} dossier(s).`);
    setSelectedIds([]);
    setBatchMode(false);
    await loadDashboardData();
  };

  return (
    <div className="flex flex-col w-full">
      {/* Dynamic Atmospheric Underglow (ambient blue light) */}
      <div className="relative w-full overflow-hidden px-margin-desktop py-space-xl flex flex-col gap-space-xl">
        {/* Top Decorative Ambient Glow */}
        <div className="absolute -top-32 left-1/3 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-64 right-10 w-[400px] h-[250px] bg-secondary-container/30 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* In-page Action Toast */}
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

        {/* 1. Header & Quick Controls */}
        <AdminPageHeader
          shiftBadge={adminDashboardShiftMeta.shiftBadge}
          officerLabel={user ? `${user.full_name} (@${user.username})` : adminDashboardShiftMeta.officerLabel}
          title={adminDashboardShiftMeta.portalTitle}
          groundsBadge={adminDashboardShiftMeta.groundsBadge}
          subtitle={adminDashboardShiftMeta.subtitle}
          actions={
            <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await adminApi.downloadFinancialReportCsv();
                    showToast('Financial & operations manifest downloaded as CSV.');
                  } catch (error) {
                    showToast(
                      error instanceof ApiError ? error.message : 'Failed to export CSV.'
                    );
                  }
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low transition-all active:scale-[0.98]"
              >
                <MaterialIcon
                  name="file_download"
                  className="text-[20px] text-secondary"
                />
                <span className="font-label-primary text-label-primary font-semibold">
                  Export Manifest (CSV)
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/gate-entries')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-container-highest text-on-surface shadow-sm hover:bg-surface-container transition-all active:scale-[0.98]"
              >
                <MaterialIcon name="lock_open" className="text-[20px] text-error" />
                <span className="font-label-primary text-label-primary font-semibold">
                  Gate Override
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/memberships')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/25 hover:bg-primary-container transition-all active:scale-[0.98]"
              >
                <MaterialIcon name="how_to_reg" className="text-[22px]" />
                <span className="font-label-primary text-label-primary font-bold">
                  Review Dossier Queue
                </span>
              </button>
            </>
          }
        />

        {/* 2. Key Metrics & Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Card 1: Active Track Memberships */}
          <StatCard
            label="Active Track Members"
            value={capacity.active_and_approved_count}
            valueSuffix={
              <span className="font-headline-card text-headline-card text-outline font-normal">
                / {capacity.monthly_member_cap}
              </span>
            }
            icon="sprint"
            iconTone="primary"
          >
            <div className="flex justify-between items-center text-caption font-caption text-on-surface-variant">
              <span>{capPercent}% Cap Utilized</span>
              <span className="font-semibold text-primary">
                {capacity.remaining_slots} Slots Open
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${capPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-caption text-caption text-secondary font-medium">
              <MaterialIcon name="trending_up" className="text-[15px] text-primary" />
              <span>300-member safety cap enforced</span>
            </div>
          </StatCard>

          {/* Card 2: Pending Applications */}
          <StatCard
            label="Pending Approval"
            value={pendingApplications.length}
            valueSuffix={
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-caption text-caption font-semibold">
                {pendingApplications.filter((p) => p.isOver24h).length} &gt; 24h
              </span>
            }
            icon="pending_actions"
            iconTone="secondary"
          >
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-surface-container font-caption text-caption font-semibold text-on-surface">
                {pendingGovtCount} Govt / Police
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-container font-caption text-caption font-semibold text-secondary">
                {pendingPublicCount} Public
              </span>
            </div>
            <Link
              to="/admin/memberships"
              className="inline-flex items-center justify-between pt-1 font-label-meta text-label-meta text-primary font-semibold hover:underline"
            >
              <span>View Verification Queue</span>
              <MaterialIcon name="arrow_forward" className="text-[16px]" />
            </Link>
          </StatCard>

          {/* Card 3: Gate Scans */}
          <StatCard
            label="Recent Gate Telemetry"
            value={turnstileEvents.length}
            valueSuffix={
              <span className="font-headline-card text-headline-card text-outline font-normal">
                Logs
              </span>
            }
            icon="sports_soccer"
            iconTone="tertiary"
          >
            <div className="flex items-center justify-between font-caption text-caption text-on-surface-variant font-medium">
              <span>{turnstileEvents.filter((e) => e.granted).length} Granted</span>
              <span>•</span>
              <span>{turnstileEvents.filter((e) => !e.granted).length} Alerts</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" />
              <span className="font-caption text-caption font-medium truncate">
                {turnstileEvents[0]?.locationMeta ?? 'Turnstile Network Live'}
              </span>
            </div>
          </StatCard>

          {/* Card 4: Collections */}
          <StatCard
            label="Total Collections"
            value={totalRevenueFormatted}
            valueTone="primary"
            icon="account_balance"
            iconTone="surface"
          >
            <div className="flex justify-between font-caption text-caption text-on-surface-variant">
              <span>{revenueBreakdown.track}</span>
              <span>{revenueBreakdown.turf}</span>
            </div>
            <div className="flex items-center justify-between font-caption text-caption pt-1 text-on-surface-variant">
              <span className="flex items-center gap-1 text-secondary">
                <MaterialIcon
                  name="verified"
                  className="text-[14px] text-primary"
                  filled
                />
                {adminDashboardMetrics.treasuryLabel}
              </span>
              <span className="text-outline font-medium">
                {adminDashboardMetrics.vaultStatusLabel}
              </span>
            </div>
          </StatCard>
        </div>

        {/* 3. Live Operations & Action Panels (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT COLUMN: Recent Membership Applications (7 Cols) */}
          <section
            id="applications-queue"
            className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm flex flex-col gap-space-md"
          >
            {/* Header & Filter Row */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                    <MaterialIcon name="assignment_turned_in" className="text-[20px]" />
                  </div>
                  <h2 className="font-headline-card text-headline-card text-on-surface font-semibold tracking-tight">
                    Membership Verification Queue
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {batchMode && selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchApprove}
                      className="px-3 py-1 rounded-full bg-primary text-on-primary font-caption text-caption font-bold shadow-xs hover:bg-primary-container transition-all"
                    >
                      Approve Selected ({selectedIds.length})
                    </button>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-bold">
                    {pendingApplications.length} Action Items
                  </span>
                </div>
              </div>

              {/* Search & Filter Chips */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm pt-2">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <MaterialIcon
                    name="search"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={adminMembershipSearchPlaceholder}
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container-low font-label-meta text-label-meta text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container transition-all"
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 admin-memberships-scroll">
                  {adminMembershipQueueFilters.map((chip) => {
                    const active = activeCategoryFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setActiveCategoryFilter(chip.id)}
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
            </div>

            {/* High-density Application Records */}
            <div className="flex flex-col gap-space-sm divide-y divide-surface-container-low">
              {visibleApplications.length > 0 ? (
                visibleApplications.map((application) => (
                  <ApplicationQueueRow
                    key={application.id}
                    application={application}
                    onQuickApprove={handleQuickApprove}
                    selectable={batchMode}
                    selected={selectedIds.includes(application.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))
              ) : (
                <div className="py-space-xl text-center text-on-surface-variant font-label-primary text-label-primary">
                  No membership applications match your current filter.
                </div>
              )}
            </div>

            {/* Table Sub-Footer */}
            <div className="pt-space-sm flex items-center justify-between border-t border-surface-container font-label-meta text-label-meta text-secondary">
              <span>
                Showing {visibleApplications.length} of {applications.length} dossiers
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBatchMode((prev) => !prev);
                    setSelectedIds([]);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  {batchMode ? 'Cancel Batch' : 'Batch Select'}
                </button>
                <span className="text-outline-variant">•</span>
                <Link
                  to="/admin/memberships"
                  className="font-semibold text-primary hover:underline"
                >
                  Full Registry
                </Link>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Gate Entry & Turnstile Stream (5 Cols) */}
          <TurnstileStreamPanel
            gateOptions={adminDashboardTurnstileGateOptions}
            events={turnstileEvents}
            onActionNotice={showToast}
          />
        </div>

        {/* 4. Facility Schedule & Occupancy Visual Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
          {adminDashboardFacilityZones.map((zone) => (
            <FacilityZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      </div>
    </div>
  );
}
