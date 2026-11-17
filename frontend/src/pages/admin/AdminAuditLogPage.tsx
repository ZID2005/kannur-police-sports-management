import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, adminApi } from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { AuditStatCard } from '@/components/admin/audit/AuditStatCard';
import { AuditLogTableRow } from '@/components/admin/audit/AuditLogTableRow';
import {
  auditCategoryTabs,
  auditLedgerHeader,
  auditStatCards,
} from '@/data/mockData';
import type { AuditCategoryFilter, AuditLogEntry, AuditStatCardData } from '@/types/gate';
import { mapApiAuditLogToEntry } from '@/utils/adminMappers';
import '@/styles/gate.css';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AuditCategoryFilter>('all');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('All Officers');
  const [officerDropdownOpen, setOfficerDropdownOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('All Entities');
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await adminApi.listAuditLogs({
        page: currentPage,
        limit: 50,
        search: searchQuery.trim() || undefined,
      });
      setLogs(res.audit_logs.map(mapApiAuditLogToEntry));
      setTotalPages(res.pagination.total_pages);
      setTotalRecords(res.pagination.total_records);
    } catch (error) {
      setToastMessage(
        error instanceof ApiError ? error.message : 'Unable to load immutable audit logs.'
      );
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const officerFilterOptions = useMemo(() => {
    const names = Array.from(new Set(logs.map((l) => l.officerName))).sort();
    return ['All Officers', ...names];
  }, [logs]);

  const entityFilterOptions = useMemo(() => {
    const cats = Array.from(new Set(logs.map((l) => l.entityType))).sort();
    return ['All Entities', ...cats];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (selectedCategory !== 'all' && entry.filterCategory !== selectedCategory) {
        return false;
      }
      if (selectedOfficer !== 'All Officers' && entry.officerName !== selectedOfficer) {
        return false;
      }
      if (selectedEntity !== 'All Entities' && entry.entityType !== selectedEntity) {
        return false;
      }
      return true;
    });
  }, [logs, selectedCategory, selectedOfficer, selectedEntity]);

  const dynamicStatCards = useMemo<AuditStatCardData[]>(() => {
    const overridesCount = logs.filter((l) =>
      l.categoryLabel.includes('GATE')
    ).length;
    const paymentCount = logs.filter((l) =>
      l.categoryLabel.includes('PAYMENT') || l.categoryLabel.includes('OFFICE_RECEIPT')
    ).length;
    const moderationCount = logs.filter((l) =>
      l.categoryLabel.includes('USER_STATUS') || l.categoryLabel.includes('MEMBERSHIP')
    ).length;

    return [
      {
        ...auditStatCards[0],
        value: String(totalRecords),
      },
      {
        ...auditStatCards[1],
        label: 'Membership & Moderation',
        value: String(moderationCount),
      },
      {
        ...auditStatCards[2],
        label: 'Office Receipts & Fees',
        value: String(paymentCount),
      },
      {
        ...auditStatCards[3],
        label: 'Gate Overrides & Syncs',
        value: String(overridesCount),
      },
    ];
  }, [logs, totalRecords]);

  const handleExportCsv = async () => {
    try {
      await adminApi.downloadAuditLogsCsv({
        search: searchQuery.trim() || undefined,
      });
      setToastMessage('Downloaded immutable audit trail CSV export.');
    } catch (error) {
      setToastMessage(
        error instanceof ApiError ? error.message : 'Audit CSV download failed.'
      );
    }
  };

  return (
    <div className="flex flex-col w-full bg-background">
      <div className="px-space-md sm:px-margin-desktop py-space-xl flex flex-col gap-space-xl max-w-[1440px] mx-auto w-full">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            role="status"
            className="rounded-xl bg-surface-container-lowest border border-primary/20 px-4 py-3 shadow-sm flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <MaterialIcon name="verified" className="text-[20px] text-primary" />
              <span className="font-label-meta text-label-meta text-on-surface font-medium">
                {toastMessage}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-outline hover:text-on-surface"
              aria-label="Close notification"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          </div>
        )}

        {/* Top Header & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
          <div className="flex flex-col gap-space-xs max-w-3xl">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-surface-container-high/80 backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-caption text-caption font-semibold tracking-wider uppercase text-on-surface-variant text-[11px]">
                {auditLedgerHeader.categoryPill}
              </span>
            </div>
            <h1 className="font-headline-card text-[30px] sm:text-[34px] leading-tight font-bold text-on-surface tracking-tight mt-1">
              {auditLedgerHeader.title}
            </h1>
            <p className="font-label-primary text-label-primary text-on-surface-variant leading-relaxed font-normal">
              {auditLedgerHeader.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm shrink-0">
            <div className="relative inline-block text-left" id="officer-dropdown-container">
              <button
                className="h-11 px-4 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-sm hover:bg-surface-container-low transition-all flex items-center gap-2.5 text-on-surface font-label-primary text-label-primary"
                id="officer-filter-btn"
                type="button"
                onClick={() => setOfficerDropdownOpen((prev) => !prev)}
              >
                <MaterialIcon name="badge" className="text-[19px] text-primary" />
                <span className="font-medium">
                  {selectedOfficer === 'All Officers' ? 'Filter by Officer' : selectedOfficer}
                </span>
                <MaterialIcon name="expand_more" className="text-[18px] text-outline" />
              </button>
              {officerDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-container-lowest shadow-xl border border-surface-container-high p-1.5 z-30">
                  {officerFilterOptions.map((officer) => (
                    <button
                      key={officer}
                      type="button"
                      onClick={() => {
                        setSelectedOfficer(officer);
                        setOfficerDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-label-meta text-label-meta ${selectedOfficer === officer
                          ? 'bg-primary-fixed text-primary font-semibold'
                          : 'text-on-surface hover:bg-surface-container-low'
                        }`}
                    >
                      {officer}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="h-11 px-5 rounded-xl bg-primary text-on-primary hover:bg-primary/95 transition-all shadow-[0_8px_20px_rgba(0,83,205,0.22)] active:scale-[0.985] flex items-center gap-2.5 font-label-primary text-label-primary font-medium"
              type="button"
              onClick={handleExportCsv}
            >
              <MaterialIcon name="download" className="text-[20px]" />
              <span>Export Audit Trail (CSV)</span>
            </button>
          </div>
        </div>

        {/* 4 Integrity & Statistics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {dynamicStatCards.map((card) => (
            <AuditStatCard key={card.id} card={card} />
          ))}
        </div>

        {/* Statutory Immutable Storage Notice */}
        <div className="bg-surface-container-low/90 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
            <MaterialIcon name="lock" className="text-[20px] text-primary" filled />
          </div>
          <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
            <strong className="font-semibold text-on-surface">
              {auditLedgerHeader.statutoryNoticeTitle}
            </strong>{' '}
            {auditLedgerHeader.statutoryNoticeBody}
          </p>
        </div>

        {/* Main Ledger Container Card */}
        <div className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl shadow-sm p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-surface-container-high/60 pb-4">
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full"
              id="log-category-tabs"
            >
              {auditCategoryTabs.map((tab) => {
                const isActive = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategory(tab.id)}
                    className={
                      isActive
                        ? 'tab-pill active px-4 py-2 rounded-full bg-primary text-on-primary font-label-meta text-label-meta font-medium shadow-sm whitespace-nowrap transition-all shrink-0'
                        : 'tab-pill px-4 py-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-label-meta text-label-meta font-medium whitespace-nowrap transition-all shrink-0'
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="relative flex-1 min-w-[280px] sm:max-w-md">
                <MaterialIcon
                  name="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none"
                />
                <input
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-low text-on-surface font-label-meta text-label-meta placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/25 transition-all shadow-inner"
                  id="log-search-input"
                  placeholder="Search by Officer, Member, Action..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <button
                    className="h-10 px-3.5 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container font-label-meta text-label-meta flex items-center gap-1.5 transition-all"
                    type="button"
                    onClick={() => setEntityDropdownOpen((prev) => !prev)}
                  >
                    <span className="text-outline text-caption">Category:</span>
                    <span className="font-medium">{selectedEntity}</span>
                    <MaterialIcon name="expand_more" className="text-[16px] text-outline" />
                  </button>
                  {entityDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-surface-container-lowest shadow-xl border border-surface-container-high p-1.5 z-30">
                      {entityFilterOptions.map((entity) => (
                        <button
                          key={entity}
                          type="button"
                          onClick={() => {
                            setSelectedEntity(entity);
                            setEntityDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg font-label-meta text-label-meta ${selectedEntity === entity
                              ? 'bg-primary-fixed text-primary font-semibold'
                              : 'text-on-surface hover:bg-surface-container-low'
                            }`}
                        >
                          {entity}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  aria-label="Refresh Logs"
                  className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all shadow-sm"
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedOfficer('All Officers');
                    setSelectedEntity('All Entities');
                    setSearchQuery('');
                    setCurrentPage(1);
                    loadAuditLogs();
                    setToastMessage('Immutable PostgreSQL audit ledger refreshed.');
                  }}
                >
                  <MaterialIcon name="refresh" className="text-[19px]" />
                </button>
              </div>
            </div>
          </div>

          {/* Ledger Data Table */}
          <div className="w-full overflow-x-auto rounded-xl">
            <table className="w-full text-left font-label-meta text-label-meta min-w-[1080px]">
              <thead>
                <tr className="bg-surface-container-low/70 text-outline font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 rounded-l-xl" scope="col">
                    Timestamp (IST)
                  </th>
                  <th className="py-3.5 px-4" scope="col">
                    Authorizing Officer
                  </th>
                  <th className="py-3.5 px-4" scope="col">
                    Action Category
                  </th>
                  <th className="py-3.5 px-4" scope="col">
                    Action Description
                  </th>
                  <th className="py-3.5 px-4" scope="col">
                    Target Ref ID
                  </th>
                  <th className="py-3.5 px-4 rounded-r-xl" scope="col">
                    Recorded Reason &amp; Audit Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-transparent">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((entry) => (
                    <AuditLogTableRow key={entry.id} entry={entry} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-secondary">
                      No audit logs match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ledger Footer & Pagination */}
          <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MaterialIcon
                name="check_circle"
                className="text-[18px] text-emerald-600"
                filled
              />
              <span className="font-caption text-caption text-on-surface-variant">
                Showing{' '}
                <strong className="text-on-surface font-semibold">
                  {filteredLogs.length > 0 ? 1 : 0} to {filteredLogs.length}
                </strong>{' '}
                of{' '}
                <strong className="text-on-surface font-semibold">{totalRecords}</strong>{' '}
                immutable audit logs
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end md:self-auto">
              <button
                className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-meta text-label-meta font-medium disabled:opacity-40 transition-all flex items-center gap-1"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                type="button"
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
                      ? 'w-9 h-9 rounded-lg bg-primary text-on-primary font-label-meta text-label-meta font-semibold shadow-sm'
                      : 'w-9 h-9 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-meta text-label-meta font-medium transition-all'
                  }
                >
                  {page}
                </button>
              ))}
              <button
                className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-meta text-label-meta font-medium disabled:opacity-40 transition-all flex items-center gap-1"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                <span>Next</span>
                <MaterialIcon name="chevron_right" className="text-[16px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
