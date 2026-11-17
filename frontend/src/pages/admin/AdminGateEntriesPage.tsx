import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, adminApi, gateApi, type BackendFacilityCode } from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { GateSummaryStatCard } from '@/components/admin/gate/GateSummaryStatCard';
import { GateEntryTableRow } from '@/components/admin/gate/GateEntryTableRow';
import {
  GateManualOverrideForm,
  type ManualOverrideSubmitPayload,
} from '@/components/admin/gate/GateManualOverrideForm';
import {
  gateDateOptions,
  gateEntryTabs,
  gateSummaryStats,
  gateTelemetryHeader,
} from '@/data/mockData';
import type { GateEntryFilterTab, GateEntryRecord, GateSummaryStat } from '@/types/gate';
import { mapApiGateLogToRecord } from '@/utils/adminMappers';
import '@/styles/gate.css';

const ADMIN_GATE_FACILITIES: Array<{ label: string; code: BackendFacilityCode | 'ALL' }> = [
  { label: 'All Facilities', code: 'ALL' },
  { label: 'Synthetic Track', code: 'SYNTHETIC_TRACK' },
  { label: 'Football Ground', code: 'FOOTBALL_GROUND' },
  { label: 'Police Turf', code: 'POLICE_TURF' },
  { label: 'Badminton Court', code: 'BADMINTON_COURT' },
];

function resolveFacilityCodeFromTurnstile(turnstile: string): BackendFacilityCode {
  const lower = turnstile.toLowerCase();
  if (lower.includes('football')) return 'FOOTBALL_GROUND';
  if (lower.includes('turf')) return 'POLICE_TURF';
  if (lower.includes('badminton')) return 'BADMINTON_COURT';
  return 'SYNTHETIC_TRACK';
}

export default function AdminGateEntriesPage() {
  const [entries, setEntries] = useState<GateEntryRecord[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    total_scans: 0,
    granted_count: 0,
    rejected_count: 0,
    manual_override_count: 0,
    biometric_verified_count: 0,
  });
  const [activeTab, setActiveTab] = useState<GateEntryFilterTab>('all');
  const [selectedFacility, setSelectedFacility] = useState<string>('All Facilities');
  const [selectedDate, setSelectedDate] = useState<string>(gateDateOptions[0]);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inspectedEntry, setInspectedEntry] = useState<GateEntryRecord | null>(null);

  const triggerToast = (message: string) => {
    setToastMessage(message);
  };

  const loadGateLogs = useCallback(async () => {
    const facilityOpt = ADMIN_GATE_FACILITIES.find((f) => f.label === selectedFacility);
    try {
      const res = await adminApi.listGateLogs({
        facility_code: facilityOpt && facilityOpt.code !== 'ALL' ? facilityOpt.code : undefined,
        verification_type: activeTab === 'override' ? 'MANUAL_OVERRIDE' : undefined,
        access_granted:
          activeTab === 'verified' ? 'true' : activeTab === 'failed' ? 'false' : undefined,
        page: currentPage,
        limit: 25,
      });

      setSummaryStats(res.summary);
      setTotalPages(res.pagination.total_pages);
      setTotalRecords(res.pagination.total_records);
      setEntries(res.gate_logs.map(mapApiGateLogToRecord));
    } catch (error) {
      triggerToast(
        error instanceof ApiError ? error.message : 'Unable to fetch gate telemetry logs.'
      );
    }
  }, [selectedFacility, activeTab, currentPage]);

  useEffect(() => {
    loadGateLogs();
  }, [loadGateLogs]);

  const dynamicStats = useMemo<GateSummaryStat[]>(() => {
    return [
      {
        ...gateSummaryStats[0],
        value: String(summaryStats.total_scans),
        badgeText: 'Live DB',
        subtext: `${summaryStats.biometric_verified_count} Biometric Verified`,
      },
      {
        ...gateSummaryStats[1],
        value: String(summaryStats.granted_count),
        badgeText:
          summaryStats.total_scans > 0
            ? `${Math.round((summaryStats.granted_count / summaryStats.total_scans) * 100)}% Granted`
            : '0%',
      },
      {
        ...gateSummaryStats[2],
        value: String(summaryStats.rejected_count).padStart(2, '0'),
        subtext: 'Rejected QR / Expired / Mismatch',
      },
      {
        ...gateSummaryStats[3],
        value: String(summaryStats.manual_override_count),
        subtext: 'All officer signed • 100% Audited',
      },
    ];
  }, [summaryStats]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter((entry) =>
      `${entry.memberName} ${entry.memberSub} ${entry.passId} ${entry.facility} ${entry.category} ${entry.remarks}`
        .toLowerCase()
        .includes(q)
    );
  }, [entries, searchQuery]);

  const handleAuthorizeOverride = async (payload: ManualOverrideSubmitPayload) => {
    const facilityCode = resolveFacilityCodeFromTurnstile(payload.turnstile);
    try {
      await gateApi.manualOverride({
        facility_code: facilityCode,
        gate_name: payload.turnstile,
        pass_or_booking_code: payload.referenceId,
        override_reason: `${payload.failureClassification}: ${payload.justification}`,
      });
      triggerToast(
        `Manual Override (§ 6.28) logged for ${payload.referenceId} — ${payload.turnstile} unlocked & audited.`
      );
      await loadGateLogs();
    } catch (error) {
      triggerToast(
        error instanceof ApiError
          ? error.message
          : 'Failed to log manual gate override.'
      );
    }
  };

  const handleLookupId = async (referenceId: string) => {
    if (!referenceId.trim()) return;
    try {
      const res = await adminApi.listGateLogs({
        pass_or_booking_code: referenceId.trim(),
        limit: 5,
      });
      if (res.gate_logs.length > 0) {
        const latest = mapApiGateLogToRecord(res.gate_logs[0]);
        setInspectedEntry(latest);
        triggerToast(
          `Found ${res.gate_logs.length} scan record(s) for ${referenceId.trim()}.`
        );
      } else {
        triggerToast(`No prior gate logs found for "${referenceId.trim()}".`);
      }
    } catch (error) {
      triggerToast(
        error instanceof ApiError ? error.message : 'Lookup failed.'
      );
    }
  };

  return (
    <div className="flex flex-col w-full bg-gradient-to-b from-[#f8f9ff] to-[#edf2fb]">
      <section className="relative w-full overflow-hidden px-margin-desktop py-space-xl">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-1/2 right-12 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl" />
        </div>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            role="status"
            className="mb-space-lg rounded-2xl bg-surface-container-lowest/95 border border-primary/20 px-5 py-3.5 shadow-[0_12px_32px_rgba(0,83,205,0.12)] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MaterialIcon name="verified" className="text-[20px]" />
              </div>
              <span className="font-label-primary text-label-primary text-on-surface font-medium">
                {toastMessage}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary"
              aria-label="Dismiss notification"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          </div>
        )}

        {/* Header Telemetry Status & Action Cluster */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-xl">
          <div className="flex flex-col max-w-3xl">
            <div className="flex items-center gap-space-sm mb-space-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest/80 backdrop-blur-md text-on-surface-variant font-label-meta text-label-meta font-semibold uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {gateTelemetryHeader.versionBadge}
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-meta text-label-meta font-medium">
                <MaterialIcon name="sensors" className="text-[16px]" />
                {gateTelemetryHeader.liveSyncBadge}
              </span>
            </div>
            <h1 className="font-title-portal text-title-portal font-bold text-on-surface tracking-tight">
              {gateTelemetryHeader.title}
            </h1>
            <p className="font-body-default text-body-default text-secondary mt-1">
              {gateTelemetryHeader.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-space-sm shrink-0">
            <button
              type="button"
              onClick={loadGateLogs}
              className="h-14 px-space-lg rounded-full bg-surface-container-lowest/80 hover:bg-surface-container-lowest backdrop-blur-xl text-on-surface font-label-primary text-label-primary shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <MaterialIcon name="sync" className="text-[20px] text-secondary" />
              <span>Sync Telemetry</span>
            </button>
            <a
              className="h-14 px-space-xl rounded-full bg-primary-container hover:bg-primary text-on-primary-container font-label-primary text-label-primary font-semibold shadow-[0_8px_24px_rgba(22,107,251,0.30)] hover:shadow-[0_12px_28px_rgba(22,107,251,0.40)] active:scale-[0.985] transition-all duration-200 flex items-center gap-2.5"
              href="#manual-override-form"
            >
              <MaterialIcon name="admin_panel_settings" className="text-[22px]" />
              <span>+ Log Manual Gate Override</span>
            </a>
          </div>
        </div>

        {/* 2. Entry Telemetry Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg mb-space-xl">
          {dynamicStats.map((stat) => (
            <GateSummaryStatCard key={stat.id} stat={stat} />
          ))}
        </div>

        {/* Inspected Entry Details Drawer */}
        {inspectedEntry && (
          <div className="w-full rounded-2xl bg-surface-container-lowest border border-primary/20 p-5 mb-space-lg shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full ${inspectedEntry.avatarClass} font-bold flex items-center justify-center shrink-0`}
              >
                {inspectedEntry.initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-label-primary text-label-primary font-bold text-on-surface">
                    {inspectedEntry.memberName}
                  </span>
                  <span className="font-caption text-caption px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-mono">
                    {inspectedEntry.passId}
                  </span>
                  <span className="font-caption text-caption text-secondary">
                    • {inspectedEntry.date} at {inspectedEntry.time}
                  </span>
                </div>
                <p className="font-caption text-caption text-secondary mt-1">
                  <strong>{inspectedEntry.verificationStage}:</strong> {inspectedEntry.remarks}
                </p>
                {inspectedEntry.authorizingOfficer && (
                  <p className="font-caption text-caption text-primary font-semibold mt-1">
                    Verified by {inspectedEntry.authorizingOfficer}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectedEntry(null)}
              className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-meta text-label-meta font-semibold self-end md:self-auto"
            >
              Close Details
            </button>
          </div>
        )}

        {/* 3. Entry Transaction Log & Filters */}
        <div className="w-full rounded-3xl bg-surface-container-lowest/70 backdrop-blur-3xl shadow-[0_20px_48px_rgba(0,83,205,0.07)] p-6 md:p-8 mb-space-xl">
          <div className="flex flex-col gap-space-md mb-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md pb-4 border-b border-surface-container">
              <div className="flex items-center p-1.5 rounded-2xl bg-surface-container/60 backdrop-blur-md overflow-x-auto">
                {gateEntryTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const label = tab.label.replace(/\s*\(\d+\)/, '');
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setCurrentPage(1);
                      }}
                      className={
                        isActive
                          ? 'px-4 py-2 rounded-xl bg-surface-container-lowest text-on-surface font-label-primary text-label-primary font-semibold shadow-sm whitespace-nowrap flex items-center gap-1.5'
                          : 'px-4 py-2 rounded-xl text-secondary hover:text-on-surface font-label-primary text-label-primary font-medium transition-colors whitespace-nowrap flex items-center gap-1.5'
                      }
                    >
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 relative">
                <button
                  type="button"
                  onClick={() => setDateMenuOpen((prev) => !prev)}
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center gap-2 text-on-surface font-label-meta text-label-meta font-medium transition-colors"
                >
                  <MaterialIcon name="calendar_today" className="text-[18px] text-secondary" />
                  <span>{selectedDate}</span>
                  <MaterialIcon name="expand_more" className="text-[16px] text-secondary" />
                </button>
                {dateMenuOpen && (
                  <div className="absolute right-12 top-12 z-30 w-56 rounded-2xl bg-surface-container-lowest shadow-xl border border-surface-container-high p-1.5">
                    {gateDateOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedDate(option);
                          setDateMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl font-label-meta text-label-meta ${
                          option === selectedDate
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={loadGateLogs}
                  className="w-11 h-11 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                  title="Refresh Feed"
                >
                  <MaterialIcon name="sync" className="text-[19px]" />
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
              <div className="relative flex-1 max-w-xl">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary">
                  <MaterialIcon name="search" className="text-[20px]" />
                </span>
                <input
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-surface-container-low/70 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline font-body-default text-body-default transition-all duration-200 outline-none"
                  placeholder="Search by member ID, booking reference, citizen name, or gate..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {ADMIN_GATE_FACILITIES.map((facility) => {
                  const active = selectedFacility === facility.label;
                  return (
                    <button
                      key={facility.label}
                      type="button"
                      onClick={() => {
                        setSelectedFacility(facility.label);
                        setCurrentPage(1);
                      }}
                      className={
                        active
                          ? 'px-3.5 py-2 rounded-full bg-primary text-on-primary font-label-meta text-label-meta font-medium shadow-sm whitespace-nowrap'
                          : 'px-3.5 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface font-label-meta text-label-meta font-medium transition-colors whitespace-nowrap'
                      }
                    >
                      {facility.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Turnstile Telemetry Data Table */}
          <div className="overflow-x-auto -mx-6 md:mx-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 text-secondary font-label-meta text-label-meta uppercase tracking-wider">
                  <th className="py-3.5 px-4 rounded-l-xl">TIMESTAMP</th>
                  <th className="py-3.5 px-4">MEMBER / VISITOR</th>
                  <th className="py-3.5 px-4">CATEGORY</th>
                  <th className="py-3.5 px-4">FACILITY &amp; GATE</th>
                  <th className="py-3.5 px-4">VERIFICATION STAGE</th>
                  <th className="py-3.5 px-4">OFFICER REMARKS / REASON</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4 rounded-r-xl text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40 font-body-default text-body-default text-on-surface">
                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry) => (
                    <GateEntryTableRow
                      key={entry.id}
                      entry={entry}
                      onInspectEntry={(record) => setInspectedEntry(record)}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 px-4 text-center font-body-default text-secondary"
                    >
                      No gate entry logs found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 mt-4 border-t border-surface-container">
            <span className="font-caption text-caption text-secondary">
              Showing{' '}
              <span className="font-semibold text-on-surface">
                {filteredEntries.length > 0 ? 1 : 0} to {filteredEntries.length}
              </span>{' '}
              of <span className="font-semibold text-on-surface">{totalRecords}</span>{' '}
              recorded turnstile gate transactions
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-9 h-9 rounded-xl bg-surface-container-low text-secondary hover:text-on-surface disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                <MaterialIcon name="chevron_left" className="text-[18px]" />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={
                    currentPage === page
                      ? 'w-9 h-9 rounded-xl bg-primary text-on-primary font-label-meta text-label-meta font-bold'
                      : 'w-9 h-9 rounded-xl bg-surface-container-low text-secondary hover:text-on-surface font-label-meta text-label-meta font-medium'
                  }
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-9 h-9 rounded-xl bg-surface-container-low text-secondary hover:text-on-surface disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                <MaterialIcon name="chevron_right" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Manual Gate Override Form Workspace */}
        <GateManualOverrideForm
          onAuthorizeOverride={handleAuthorizeOverride}
          onLookupId={handleLookupId}
        />
      </section>
    </div>
  );
}
