import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, adminApi, type ApiAuditLogsSummary } from '@/api/client';
import '@/styles/adminOps.css';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { AuditStatCard } from '@/components/admin/audit/AuditStatCard';
import { AuditLogTableRow } from '@/components/admin/audit/AuditLogTableRow';
import {
  auditCategoryTabs,
  auditEntityFilterOptions,
  auditLedgerHeader,
  auditStatCards,
} from '@/data/mockData';
import type {
  AuditCategoryFilter,
  AuditEntityFilter,
  AuditLogEntry,
  AuditStatCardData,
} from '@/types/adminAudit';
import { mapApiAuditLogToEntry } from '@/utils/adminMappers';

const PAGE_SIZE = 20;

interface ToastState {
  tone: 'success' | 'error';
  title: string;
  subtitle: string;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<ApiAuditLogsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<AuditCategoryFilter>('ALL');
  const [selectedEntity, setSelectedEntity] = useState<AuditEntityFilter>('ALL');
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (title: string, subtitle: string, tone: 'success' | 'error' = 'success') => {
      setToast({ tone, title, subtitle });
      window.setTimeout(() => {
        setToast((prev) => (prev?.title === title ? null : prev));
      }, 4000);
    },
    []
  );

  const loadAuditLogs = useCallback(
    async (manualRefresh = false) => {
      if (manualRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await adminApi.listAuditLogs({
          action_category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          entity_type: selectedEntity !== 'ALL' ? selectedEntity : undefined,
          officer_id: selectedOfficerId !== 'ALL' ? selectedOfficerId : undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          search: searchQuery.trim() || undefined,
          page: currentPage,
          limit: PAGE_SIZE,
        });

        setSummary(res.summary);
        setLogs(res.audit_logs.map(mapApiAuditLogToEntry));
        setTotalPages(res.pagination.total_pages);
        setTotalRecords(res.pagination.total_records);
      } catch (error) {
        showToast(
          'Audit Ledger Sync Error',
          error instanceof ApiError ? error.message : 'Unable to load immutable audit logs.',
          'error'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      selectedCategory,
      selectedEntity,
      selectedOfficerId,
      fromDate,
      toDate,
      searchQuery,
      currentPage,
      showToast,
    ]
  );

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const dynamicStatCards = useMemo<AuditStatCardData[]>(() => {
    const totalEvents = summary?.total_events ?? totalRecords;
    const facilityCount = summary?.facility_actions_count ?? 0;
    const slotCount = summary?.slot_actions_count ?? 0;
    const paymentCount = summary?.payment_actions_count ?? 0;
    const accountCount = summary?.account_actions_count ?? 0;

    return [
      {
        ...auditStatCards[0],
        value: String(totalEvents),
      },
      {
        ...auditStatCards[1],
        value: String(facilityCount),
      },
      {
        ...auditStatCards[2],
        value: String(slotCount),
      },
      {
        ...auditStatCards[3],
        value: String(paymentCount + accountCount),
        metaItems: [
          { text: `${paymentCount} Payment Receipts` },
          { text: `${accountCount} Account / Auth` },
        ],
      },
    ];
  }, [summary, totalRecords]);

  const hasActiveFilters = Boolean(
    selectedCategory !== 'ALL' ||
      selectedEntity !== 'ALL' ||
      selectedOfficerId !== 'ALL' ||
      fromDate ||
      toDate ||
      searchQuery.trim()
  );

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setSelectedEntity('ALL');
    setSelectedOfficerId('ALL');
    setFromDate('');
    setToDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleExportCsv = async () => {
    try {
      await adminApi.downloadAuditLogsCsv({
        action_category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        entity_type: selectedEntity !== 'ALL' ? selectedEntity : undefined,
        officer_id: selectedOfficerId !== 'ALL' ? selectedOfficerId : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: searchQuery.trim() || undefined,
      });
      showToast(
        'Audit Trail Exported',
        'Downloaded immutable audit trail CSV for the active filter view.'
      );
    } catch (error) {
      showToast(
        'Export Failed',
        error instanceof ApiError ? error.message : 'Audit CSV download failed.',
        'error'
      );
    }
  };

  const rangeStart = totalRecords === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalRecords);

  return (
    <div className="admin-ops-page flex flex-col w-full">
      <div className="relative w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9 flex flex-col gap-7">
        {/* Ambient Subtle Executive Glows */}
        <div className="admin-ambient-orb pointer-events-none absolute -top-28 left-1/3 w-[560px] h-[300px] bg-[#165DF5]/[0.07] rounded-full blur-[120px] -z-10" />
        <div
          className="admin-ambient-orb pointer-events-none absolute top-56 right-12 w-96 h-72 bg-sky-400/[0.08] rounded-full blur-[110px] -z-10"
          style={{ animationDelay: '-9s' }}
        />

        {/* 1. Executive Admin Page Header */}
        <AdminPageHeader
          shiftBadge={auditLedgerHeader.shiftBadge}
          groundsBadge={auditLedgerHeader.groundsBadge}
          title={auditLedgerHeader.title}
          subtitle={auditLedgerHeader.subtitle}
          actions={
            <>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => loadAuditLogs(true)}
                className="admin-btn-secondary px-4 inline-flex items-center gap-2 disabled:opacity-60"
              >
                <MaterialIcon
                  name="refresh"
                  className={`text-[18px] text-slate-500 ${refreshing ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="admin-btn-primary px-5 inline-flex items-center gap-2"
              >
                <MaterialIcon name="download" className="text-[19px]" />
                <span>Export Audit Trail (CSV)</span>
              </button>
            </>
          }
        />

        {/* 2. 4 Equal-Width Integrity & Operations KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {dynamicStatCards.map((card, idx) => (
            <AuditStatCard key={card.id} card={card} delayMs={idx * 65} />
          ))}
        </div>

        {/* 3. Statutory Append-Only Immutable Storage Strip */}
        <div
          style={{ animationDelay: '200ms' }}
          className="admin-animate-enter rounded-2xl bg-[#EFF5FF]/75 border border-[#DCE8FE] px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#DCE8FE] text-[#165DF5] flex items-center justify-center shrink-0 shadow-2xs">
              <MaterialIcon name="lock" className="text-[18px]" filled />
            </div>
            <p className="text-[12.5px] text-slate-600 leading-relaxed">
              <strong className="font-semibold text-[#0F172A]">
                {auditLedgerHeader.statutoryNoticeTitle}
              </strong>{' '}
              {auditLedgerHeader.statutoryNoticeBody}
            </p>
          </div>

          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11.5px] font-semibold whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Append-Only Active
          </span>
        </div>

        {/* 4. Main Immutable Audit Ledger Table Card */}
        <section
          style={{ animationDelay: '260ms' }}
          className="admin-animate-enter admin-surface-card rounded-[26px] p-5 sm:p-7 flex flex-col gap-5"
        >
          {/* Header Row: Segmented Category Tabs + Immutable Record Count */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-slate-200/80">
            <div
              role="tablist"
              aria-label="Audit log action categories"
              className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-0.5 overflow-x-auto scrollbar-none max-w-full"
            >
              {auditCategoryTabs.map((tab) => {
                const isActive = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setSelectedCategory(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`h-8 px-3.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? 'bg-[#165DF5] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#0F172A] hover:bg-white/75'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] text-[12px] font-bold tabular-nums">
                {totalRecords} Immutable {totalRecords === 1 ? 'Record' : 'Records'}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-semibold text-slate-500 hover:text-[#165DF5] hover:bg-[#EFF5FF] transition-colors"
                >
                  <MaterialIcon name="filter_alt_off" className="text-[15px]" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Unified Filter Surface */}
          <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-3.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5 items-center">
            <div className="relative xl:col-span-4">
              <MaterialIcon
                name="search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                id="audit-log-search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search officer, facility, slot, receipt, or reason..."
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[13px] font-medium placeholder:text-slate-400 outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 xl:col-span-4">
              <input
                type="date"
                aria-label="From date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 h-10 px-3 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[12.5px] font-medium tabular-nums outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all"
              />
              <span className="text-[12px] font-semibold text-slate-400 shrink-0">to</span>
              <input
                type="date"
                aria-label="To date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 h-10 px-3 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[12.5px] font-medium tabular-nums outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all"
              />
            </div>

            <div className="xl:col-span-2">
              <select
                aria-label="Filter by authorizing officer"
                value={selectedOfficerId}
                onChange={(e) => {
                  setSelectedOfficerId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[13px] font-medium outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all cursor-pointer"
              >
                <option value="ALL">All Officers</option>
                {(summary?.officers ?? []).map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.full_name} (@{off.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="xl:col-span-2">
              <select
                aria-label="Filter by target entity"
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value as AuditEntityFilter);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[13px] font-medium outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all cursor-pointer"
              >
                {auditEntityFilterOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Read-Only Immutable Ledger Data Table */}
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/85 bg-white">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold uppercase tracking-[0.06em]">
                  <th className="py-3.5 px-5" scope="col">
                    Timestamp (IST)
                  </th>
                  <th className="py-3.5 px-5" scope="col">
                    Authorizing Officer
                  </th>
                  <th className="py-3.5 px-5" scope="col">
                    Action Type
                  </th>
                  <th className="py-3.5 px-5" scope="col">
                    Target Entity
                  </th>
                  <th className="py-3.5 px-5" scope="col">
                    Operation Summary &amp; Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [0, 1, 2, 3].map((idx) => (
                    <tr key={idx}>
                      <td colSpan={5} className="py-3.5 px-5">
                        <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : logs.length > 0 ? (
                  logs.map((entry, idx) => (
                    <AuditLogTableRow
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedRowId === entry.id}
                      onToggleExpand={() =>
                        setExpandedRowId((prev) => (prev === entry.id ? null : entry.id))
                      }
                      delayMs={Math.min(idx * 30, 220)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-14 px-5 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                          <MaterialIcon name="history" className="text-[22px]" />
                        </div>
                        <p className="font-display text-[14.5px] font-bold text-[#0F172A]">
                          No immutable audit entries found
                        </p>
                        <p className="text-[13px] text-slate-500">
                          Try clearing your category, date range, officer, or entity filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MaterialIcon name="verified" className="text-[18px] text-emerald-600" filled />
              <span className="text-[12.5px] text-slate-500 tabular-nums">
                Showing{' '}
                <strong className="text-[#0F172A] font-semibold">
                  {rangeStart}–{rangeEnd}
                </strong>{' '}
                of <strong className="text-[#0F172A] font-semibold">{totalRecords}</strong>{' '}
                immutable audit entries · Click any row to inspect full record evidence
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg bg-white border border-slate-200/90 text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1"
              >
                <MaterialIcon name="chevron_left" className="text-[16px]" />
                <span>Previous</span>
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={
                    currentPage === page
                      ? 'w-8 h-8 rounded-lg bg-[#165DF5] text-white text-[12.5px] font-bold shadow-xs tabular-nums'
                      : 'w-8 h-8 rounded-lg bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 text-[12.5px] font-semibold tabular-nums transition-colors'
                  }
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 rounded-lg bg-white border border-slate-200/90 text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1"
              >
                <span>Next</span>
                <MaterialIcon name="chevron_right" className="text-[16px]" />
              </button>
            </div>
          </div>
        </section>

        {/* Executive Toast Notification */}
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 pointer-events-none flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border max-w-md ${
            toast?.tone === 'error'
              ? 'bg-rose-600 border-rose-500 text-white'
              : 'bg-[#0F172A] border-slate-700/80 text-white'
          } ${toast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
        >
          <MaterialIcon
            name={toast?.tone === 'error' ? 'error' : 'verified'}
            className={`text-[21px] shrink-0 ${
              toast?.tone === 'error' ? 'text-white' : 'text-emerald-400'
            }`}
          />
          <div className="flex flex-col">
            <span className="font-display text-[13.5px] font-bold text-white leading-snug">
              {toast?.title ?? ''}
            </span>
            <span className="text-[12px] text-slate-300 leading-snug">
              {toast?.subtitle ?? ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
