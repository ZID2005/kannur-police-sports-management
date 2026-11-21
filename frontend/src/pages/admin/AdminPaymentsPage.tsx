import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  adminApi,
  type ApiAdminPaymentsSummary,
  type ApiSettlementReceipt,
  type BackendPaymentReferenceType,
} from '@/api/client';
import '@/styles/adminOps.css';
import type {
  OfficePaymentFormValues,
  OfficeSelectOption,
  PaymentStatusFilterId,
  PaymentSummaryCardData,
  PaymentTransactionRow,
  PaymentUserCategoryFilterId,
} from '@/types/adminOps';
import { useAuth } from '@/context/AuthContext';
import {
  currentStaff,
  paymentOfficeDefaultFormValues,
  paymentOfficeFacilityOptions,
  paymentOfficeModeOptions,
  paymentSummaryCards,
} from '@/data/mockData';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { PaymentSummaryCard } from '@/components/admin/payments/PaymentSummaryCard';
import { PaymentTransactionRowItem } from '@/components/admin/payments/PaymentTransactionRowItem';
import { OfficePaymentFormCard } from '@/components/admin/payments/OfficePaymentFormCard';
import { mapApiPaymentToRow } from '@/utils/adminMappers';

interface ToastMessage {
  tone: 'success' | 'error';
  title: string;
  subtitle: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS: Array<{ id: PaymentStatusFilterId; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'SETTLED', label: 'Completed' },
  { id: 'PENDING_RECONCILIATION', label: 'Pending' },
  { id: 'REFUNDED', label: 'Refunded' },
  { id: 'FAILED', label: 'Failed' },
];

const USER_CATEGORY_OPTIONS: Array<{ id: PaymentUserCategoryFilterId; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'PUBLIC', label: 'Public' },
  { id: 'GOVT_PERSONNEL', label: 'Govt / Police' },
];

function formatInr(val?: string | number | null): string {
  const num = Number(val ?? 0);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportFilteredRowsToCsv(rows: PaymentTransactionRow[]): void {
  const headers = [
    'Receipt No',
    'Booking / Pass Ref',
    'Date',
    'Time',
    'Member Name',
    'Username',
    'User Category',
    'Facility',
    'Purpose',
    'Payment Mode',
    'Base Fee (INR)',
    'Govt/Police Concession (INR)',
    'Taxable Subtotal (INR)',
    'GST Rate (%)',
    'GST Amount (INR)',
    'Final Total Paid (INR)',
    'Status',
  ];

  const lines = rows.map((row) =>
    [
      escapeCsvCell(row.receiptId),
      escapeCsvCell(row.bookingOrPassRef),
      escapeCsvCell(row.dateLabel),
      escapeCsvCell(row.timeLabel),
      escapeCsvCell(row.memberName),
      escapeCsvCell(row.memberUsername),
      escapeCsvCell(row.categoryLabel),
      escapeCsvCell(row.facilityName),
      escapeCsvCell(row.facilityPurpose),
      escapeCsvCell(row.paymentModeLabel),
      escapeCsvCell(row.baseFee.toFixed(2)),
      escapeCsvCell(row.concessionDiscount.toFixed(2)),
      escapeCsvCell(row.taxableSubtotal.toFixed(2)),
      escapeCsvCell(row.gstRate),
      escapeCsvCell(row.gstAmount.toFixed(2)),
      escapeCsvCell(row.finalTotalPaid.toFixed(2)),
      escapeCsvCell(row.statusLabel),
    ].join(',')
  );

  const csvContent = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const todayStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `kcp-payments-ledger-${todayStamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function AdminPaymentsPage() {
  const { user } = useAuth();

  const [rows, setRows] = useState<PaymentTransactionRow[]>([]);
  const [summary, setSummary] = useState<ApiAdminPaymentsSummary | null>(null);
  const [facilities, setFacilities] = useState<Array<{ code: string; name: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Live backend filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFacilityCode, setSelectedFacilityCode] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatusFilterId>('ALL');
  const [selectedUserCategory, setSelectedUserCategory] =
    useState<PaymentUserCategoryFilterId>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [activePage, setActivePage] = useState<number>(1);
  const [lastRecordedReceipt, setLastRecordedReceipt] = useState<ApiSettlementReceipt | null>(
    null
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (title: string, subtitle: string, tone: 'success' | 'error' = 'success') => {
      setToast({ tone, title, subtitle });
      window.setTimeout(() => {
        setToast((prev) => (prev?.title === title ? null : prev));
      }, 4000);
    },
    []
  );

  const loadPayments = useCallback(
    async (manualRefresh = false) => {
      if (manualRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await adminApi.listPayments({
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          facility_code: selectedFacilityCode !== 'ALL' ? selectedFacilityCode : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          user_category: selectedUserCategory !== 'ALL' ? selectedUserCategory : undefined,
          search: searchQuery.trim() || undefined,
        });

        setSummary(res.summary);
        if (Array.isArray(res.facilities) && res.facilities.length > 0) {
          setFacilities(res.facilities);
        }
        setRows(res.payments.map(mapApiPaymentToRow));
      } catch (error) {
        showToast(
          'Ledger Sync Error',
          error instanceof ApiError ? error.message : 'Unable to fetch payment ledger.',
          'error'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fromDate,
      toDate,
      selectedFacilityCode,
      selectedStatus,
      selectedUserCategory,
      searchQuery,
      showToast,
    ]
  );

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const summaryCards = useMemo<PaymentSummaryCardData[]>(() => {
    if (!summary) return paymentSummaryCards;

    return [
      {
        ...paymentSummaryCards[0],
        title: 'Total Revenue',
        amount: formatInr(summary.total_revenue),
        badgeText: `${summary.completed_transactions_count} Settled`,
        footerLeft: `Taxable ${formatInr(summary.total_taxable_subtotal)}`,
        footerRightText: `Online ${formatInr(summary.online_gateway_revenue)}`,
      },
      {
        ...paymentSummaryCards[1],
        title: 'GST Collected',
        amount: formatInr(summary.gst_collected ?? summary.total_gst_amount),
        badgeText: '18% GST',
        footerLeft: 'CGST 9% + SGST 9%',
        footerRightText: `On ${formatInr(summary.total_taxable_subtotal)}`,
      },
      {
        ...paymentSummaryCards[2],
        title: 'Govt / Police Concessions',
        amount: formatInr(summary.total_concessions_applied),
        badgeText: `${summary.concession_transactions_count} Subsidized`,
        footerLeft: `Gross ${formatInr(summary.total_gross_base_fee)}`,
        footerRightText: `Govt ${formatInr(summary.govt_revenue)}`,
      },
      {
        ...paymentSummaryCards[3],
        title: 'Completed / Pending',
        amount: `${summary.completed_transactions_count} / ${summary.pending_transactions_count}`,
        badgeText: `${summary.total_records} Records`,
        footerLeft: `Pending ${formatInr(summary.pending_amount)}`,
        footerRightText: `Office ${formatInr(summary.office_receipt_revenue)}`,
      },
    ];
  }, [summary]);

  const officeFacilitySelectOptions = useMemo<OfficeSelectOption[]>(() => {
    if (facilities.length === 0) return paymentOfficeFacilityOptions;
    return facilities.map((f) => ({ value: f.code, label: f.name }));
  }, [facilities]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedFacilityCode !== 'ALL' ||
      selectedStatus !== 'ALL' ||
      selectedUserCategory !== 'ALL' ||
      fromDate ||
      toDate
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedFacilityCode('ALL');
    setSelectedStatus('ALL');
    setSelectedUserCategory('ALL');
    setFromDate('');
    setToDate('');
    setActivePage(1);
  };

  const handleExportFilteredCsv = () => {
    if (rows.length === 0) {
      showToast(
        'No Rows to Export',
        'Adjust your filters to include at least one ledger transaction before exporting.',
        'error'
      );
      return;
    }
    exportFilteredRowsToCsv(rows);
    showToast(
      'Ledger CSV Exported',
      `Exported ${rows.length} filtered transaction${rows.length === 1 ? '' : 's'} with full GST & concession breakdown.`
    );
  };

  const scrollToOfficeForm = () => {
    const el = document.getElementById('office-record-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRecordOfficePayment = async (values: OfficePaymentFormValues) => {
    const rawRef = values.applicantRef.trim();
    const extractedCode = rawRef.split(/\s+/)[0] || rawRef;
    const isUuid = UUID_REGEX.test(extractedCode);

    const isMembership =
      values.facilityCode === 'SYNTHETIC_TRACK' ||
      extractedCode.toUpperCase().startsWith('KCP-PUB') ||
      extractedCode.toUpperCase().startsWith('KCP-GOV') ||
      extractedCode.toUpperCase().startsWith('KCP-MEM');

    const referenceType: BackendPaymentReferenceType = isMembership
      ? 'MEMBERSHIP'
      : 'SLOT_BOOKING';

    const parsedAmount = Number.parseFloat(values.amount);

    try {
      const result = await adminApi.recordOfficeReceipt({
        reference_type: referenceType,
        ...(isUuid
          ? { reference_id: extractedCode }
          : { pass_or_booking_code: extractedCode }),
        ...(Number.isFinite(parsedAmount) && parsedAmount > 0
          ? { total_amount: parsedAmount }
          : {}),
        treasury_challan_no: values.challanNumber.trim() || undefined,
        remarks: `Channel: ${values.paymentMode.toUpperCase()}`,
      });

      const refCode =
        result.receipt?.booking_or_pass_code ??
        result.payment.pass_or_booking_code ??
        extractedCode;
      const totalPaid = formatInr(
        result.receipt?.pricing_breakdown?.final_total_paid ?? result.payment.total_amount
      );
      setLastRecordedReceipt(result.receipt ?? null);
      showToast(
        'Office Receipt Recorded',
        `Receipt ${result.payment.receipt_no} settled for ${refCode} (${totalPaid}) and logged to the Audit Ledger.`
      );
      await loadPayments(true);
    } catch (error) {
      showToast(
        'Office Receipt Failed',
        error instanceof ApiError
          ? error.message
          : 'Could not record office receipt. Verify Booking/Pass Code and amount.',
        'error'
      );
    }
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(activePage, totalPages);
  const paginatedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="admin-ops-page flex flex-col w-full">
      <div className="relative w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9 flex flex-col gap-7">
        {/* Ambient Subtle Executive Glows */}
        <div className="admin-ambient-orb pointer-events-none absolute -top-28 left-1/4 w-[540px] h-[300px] bg-[#165DF5]/[0.07] rounded-full blur-[120px] -z-10" />
        <div
          className="admin-ambient-orb pointer-events-none absolute top-56 right-12 w-96 h-72 bg-sky-400/[0.08] rounded-full blur-[110px] -z-10"
          style={{ animationDelay: '-8s' }}
        />

        {/* 1. Executive Admin Page Header */}
        <AdminPageHeader
          shiftBadge={
            summary
              ? `Live Ledger · Monthly ${formatInr(summary.monthly_revenue)}`
              : 'Live Financial Ledger · GST Reconciliation'
          }
          groundsBadge="Kannur Armed Reserve Police Grounds"
          title="Payments & Financial Ledger"
          subtitle="Departmental revenue reconciliation, Govt/Police concession accounting, structured GST breakdowns, and office treasury receipt desk."
          actions={
            <>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => loadPayments(true)}
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
                onClick={handleExportFilteredCsv}
                className="admin-btn-secondary px-4 inline-flex items-center gap-2"
              >
                <MaterialIcon name="download" className="text-[18px] text-[#165DF5]" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={scrollToOfficeForm}
                className="admin-btn-primary px-5 inline-flex items-center gap-2"
              >
                <MaterialIcon name="add_circle" className="text-[19px]" />
                <span>Record Office Receipt</span>
              </button>
            </>
          }
        />

        {/* 2. 4 Equal-Width Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {summaryCards.map((card, idx) => (
            <PaymentSummaryCard key={card.id} card={card} delayMs={idx * 65} />
          ))}
        </div>

        {/* 3. Transaction & GST Reconciliation Ledger */}
        <section
          style={{ animationDelay: '220ms' }}
          className="admin-animate-enter admin-surface-card rounded-[26px] p-5 sm:p-7 flex flex-col gap-5"
        >
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#EFF5FF] border border-[#DCE8FE] flex items-center justify-center text-[#165DF5] shrink-0">
                <MaterialIcon name="receipt_long" className="text-[20px]" />
              </div>
              <div>
                <h2 className="font-display text-[18px] font-bold text-[#0F172A] tracking-[-0.02em]">
                  Transaction &amp; GST Reconciliation Ledger
                </h2>
                <p className="text-[12.5px] text-slate-500 mt-0.5">
                  Click any entry to inspect the full CGST / SGST breakdown and officer audit record
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] text-[12px] font-bold tabular-nums">
                {rows.length} {rows.length === 1 ? 'Entry' : 'Entries'}
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
          <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-3.5 flex flex-col gap-3">
            {/* Top Controls: Search + Date Range + Venue Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5 items-center">
              <div className="relative xl:col-span-5">
                <MaterialIcon
                  name="search"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none"
                />
                <input
                  type="text"
                  id="payments-search-input"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActivePage(1);
                  }}
                  placeholder="Search receipt no, booking ref, member, or venue..."
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[13px] font-medium placeholder:text-slate-400 outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 xl:col-span-4">
                <input
                  type="date"
                  aria-label="Filter from date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setActivePage(1);
                  }}
                  className="flex-1 h-10 px-3 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[12.5px] font-medium tabular-nums outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all"
                />
                <span className="text-[12px] font-semibold text-slate-400 shrink-0">to</span>
                <input
                  type="date"
                  aria-label="Filter to date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setActivePage(1);
                  }}
                  className="flex-1 h-10 px-3 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[12.5px] font-medium tabular-nums outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all"
                />
              </div>

              <div className="xl:col-span-3">
                <select
                  aria-label="Filter by facility"
                  value={selectedFacilityCode}
                  onChange={(e) => {
                    setSelectedFacilityCode(e.target.value);
                    setActivePage(1);
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[13px] font-medium outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all cursor-pointer"
                >
                  <option value="ALL">All Sports Facilities</option>
                  {facilities.map((fac) => (
                    <option key={fac.code} value={fac.code}>
                      {fac.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom Controls: Segmented Status & Category Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200/70">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 shrink-0">
                  Status
                </span>
                <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/60 border border-slate-200/80 gap-0.5">
                  {STATUS_FILTER_OPTIONS.map((st) => {
                    const active = selectedStatus === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(st.id);
                          setActivePage(1);
                        }}
                        className={`h-7 px-3 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all ${
                          active
                            ? 'bg-[#165DF5] text-white shadow-xs'
                            : 'text-slate-600 hover:text-[#0F172A] hover:bg-white/75'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 shrink-0">
                  Category
                </span>
                <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/60 border border-slate-200/80 gap-0.5">
                  {USER_CATEGORY_OPTIONS.map((cat) => {
                    const active = selectedUserCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserCategory(cat.id);
                          setActivePage(1);
                        }}
                        className={`h-7 px-3 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all ${
                          active
                            ? 'bg-white text-[#0F172A] shadow-xs ring-1 ring-slate-200/80'
                            : 'text-slate-600 hover:text-[#0F172A] hover:bg-white/60'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Executive Financial Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/85 bg-white">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold uppercase tracking-[0.06em]">
                  <th scope="col" className="py-3.5 px-5">
                    Receipt / Ref
                  </th>
                  <th scope="col" className="py-3.5 px-5">
                    Member
                  </th>
                  <th scope="col" className="py-3.5 px-5">
                    Facility
                  </th>
                  <th scope="col" className="py-3.5 px-5">
                    Pricing &amp; GST
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-right">
                    Total Paid
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-center">
                    Status
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-right">
                    Date / Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [0, 1, 2, 3].map((idx) => (
                    <tr key={idx}>
                      <td colSpan={7} className="py-3.5 px-5">
                        <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : paginatedRows.length > 0 ? (
                  paginatedRows.map((row, idx) => (
                    <PaymentTransactionRowItem
                      key={row.id}
                      row={row}
                      isExpanded={expandedRowId === row.id}
                      onToggleExpand={() =>
                        setExpandedRowId((prev) => (prev === row.id ? null : row.id))
                      }
                      delayMs={Math.min(idx * 30, 220)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-14 px-5 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                          <MaterialIcon name="receipt_long" className="text-[22px]" />
                        </div>
                        <p className="font-display text-[14.5px] font-bold text-[#0F172A]">
                          No matching financial entries
                        </p>
                        <p className="text-[13px] text-slate-500">
                          Try adjusting your date range, status segment, or search query.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <span className="text-[12.5px] text-slate-500 tabular-nums">
              Showing{' '}
              <strong className="text-[#0F172A] font-semibold">
                {rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, rows.length)}
              </strong>{' '}
              of <strong className="text-[#0F172A] font-semibold">{rows.length}</strong> filtered
              entries
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-lg bg-white border border-slate-200/90 text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setActivePage(page)}
                  className={
                    safePage === page
                      ? 'w-8 h-8 rounded-lg bg-[#165DF5] text-white text-[12.5px] font-bold shadow-xs tabular-nums'
                      : 'w-8 h-8 rounded-lg bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 text-[12.5px] font-semibold tabular-nums transition-colors'
                  }
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 rounded-lg bg-white border border-slate-200/90 text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* 4. Record Office Treasury Receipt Desk */}
        <OfficePaymentFormCard
          defaultValues={{
            ...paymentOfficeDefaultFormValues,
            facilityCode: officeFacilitySelectOptions[0]?.value ?? 'POLICE_TURF',
            entryTimestamp: new Date().toLocaleString('en-IN'),
          }}
          facilityOptions={officeFacilitySelectOptions}
          modeOptions={paymentOfficeModeOptions}
          officerName={user?.full_name ?? currentStaff.name}
          officerUsername={user?.username ?? 'insp_rajeev'}
          onSubmitPayment={handleRecordOfficePayment}
          lastReceipt={lastRecordedReceipt}
          onDismissReceipt={() => setLastRecordedReceipt(null)}
        />

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
