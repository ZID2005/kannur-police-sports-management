import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  adminApi,
  type ApiAdminPaymentsSummary,
  type BackendPaymentReferenceType,
} from '@/api/client';
import '@/styles/adminOps.css';
import type {
  OfficePaymentFormValues,
  PaymentFacilityFilterId,
  PaymentLedgerTabId,
  PaymentSummaryCardData,
  PaymentTransactionRow,
} from '@/types/adminOps';
import { useAuth } from '@/context/AuthContext';
import {
  currentStaff,
  paymentDateRangeOptions,
  paymentFacilityFilters,
  paymentLedgerTabs,
  paymentOfficeDefaultFormValues,
  paymentOfficeFacilityOptions,
  paymentOfficeModeOptions,
  paymentSummaryCards,
} from '@/data/mockData';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { PaymentSummaryCard } from '@/components/admin/payments/PaymentSummaryCard';
import { PaymentTransactionRowItem } from '@/components/admin/payments/PaymentTransactionRowItem';
import { OfficePaymentFormCard } from '@/components/admin/payments/OfficePaymentFormCard';
import { mapApiPaymentToRow } from '@/utils/adminMappers';

interface ToastMessage {
  title: string;
  subtitle: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatInrShort(val?: string | number | null): string {
  const num = Number(val ?? 0);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PaymentTransactionRow[]>([]);
  const [summary, setSummary] = useState<ApiAdminPaymentsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentLedgerTabId>('all');
  const [selectedFacility, setSelectedFacility] =
    useState<PaymentFacilityFilterId>('All Facilities');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDateRangeIndex, setSelectedDateRangeIndex] = useState<number>(0);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<number>(1);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((title: string, subtitle: string) => {
    setToast({ title, subtitle });
    window.setTimeout(() => {
      setToast((prev) => (prev?.title === title ? null : prev));
    }, 3800);
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const res = await adminApi.listPayments();
      setSummary(res.summary);
      setRows(res.payments.map(mapApiPaymentToRow));
    } catch (error) {
      showToast(
        'Ledger Sync Error',
        error instanceof ApiError ? error.message : 'Unable to fetch payment ledger.'
      );
    }
  }, [showToast]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const summaryCards = useMemo<PaymentSummaryCardData[]>(() => {
    if (!summary) return paymentSummaryCards;
    return [
      {
        ...paymentSummaryCards[0],
        amount: formatInrShort(summary.total_revenue),
        badgeText: `${summary.total_transactions} Settled`,
        footerLeft: `Base: ${formatInrShort(summary.total_base_amount)}`,
        footerRightText: `GST: ${formatInrShort(summary.total_gst_amount)}`,
      },
      {
        ...paymentSummaryCards[1],
        amount: formatInrShort(summary.online_gateway_revenue),
        footerLeft: 'ONLINE_GATEWAY',
        footerRightText: 'Verified Instant',
      },
      {
        ...paymentSummaryCards[2],
        amount: formatInrShort(summary.office_receipt_revenue),
        footerLeft: 'OFFICE_RECEIPT',
        footerRightText: 'Treasury Audited',
      },
      {
        ...paymentSummaryCards[3],
        title: 'Track vs. Slot Revenue',
        amount: formatInrShort(summary.membership_revenue),
        badgeText: 'Synthetic Track',
        footerLeft: `Slots: ${formatInrShort(summary.slot_booking_revenue)}`,
        footerRightText: `${summary.total_transactions} Entries`,
      },
    ];
  }, [summary]);

  const computedTabs = useMemo(() => {
    return paymentLedgerTabs.map((t) => {
      const count =
        t.id === 'all'
          ? rows.length
          : rows.filter((r) => r.tabCategory === t.id).length;
      return { ...t, count };
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeTab !== 'all' && row.tabCategory !== activeTab) {
        return false;
      }
      if (
        selectedFacility !== 'All Facilities' &&
        row.facilityFilterGroup !== selectedFacility
      ) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const combined =
          `${row.receiptId} ${row.memberName} ${row.memberMeta} ${row.categoryLabel} ${row.facilityName} ${row.facilityPurpose} ${row.paymentModeLabel}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }
      return true;
    });
  }, [rows, activeTab, selectedFacility, searchQuery]);

  const scrollToOfficeForm = () => {
    const el = document.getElementById('office-record-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExportStatement = async () => {
    try {
      await adminApi.downloadFinancialReportCsv();
      showToast(
        'Financial CSV Exported',
        'Downloaded audited financial revenue statement from Kannur City Police server.'
      );
    } catch (error) {
      showToast(
        'CSV Export Failed',
        error instanceof ApiError ? error.message : 'Unable to download financial CSV.'
      );
    }
  };

  const handleDownloadReceipt = (row: PaymentTransactionRow) => {
    showToast(
      row.isRefund ? 'Refund Note Selected' : 'Official Receipt Verified',
      `${row.receiptId} (${row.memberName} • ${row.amountFormatted}) verified in ledger.`
    );
  };

  const handleRecordOfficePayment = async (values: OfficePaymentFormValues) => {
    const rawRef = values.applicantRef.trim();
    const extractedCode = rawRef.split(/\s+/)[0] || rawRef;
    const isUuid = UUID_REGEX.test(extractedCode);

    const isMembership =
      values.facilityValue === 'track' ||
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
        remarks: `Mode: ${values.paymentMode.toUpperCase()}`,
      });

      showToast(
        'Treasury Receipt Issued',
        `Receipt ${result.payment.receipt_no} recorded for ${result.qr_pass.pass_or_booking_code}. QR pass activated.`
      );
      await loadPayments();
    } catch (error) {
      showToast(
        'Office Receipt Failed',
        error instanceof ApiError
          ? error.message
          : 'Could not record offline treasury receipt. Verify Pass/Booking Code and amount.'
      );
    }
  };

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(activePage, totalPages);
  const paginatedRows = filteredRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="admin-ops-page flex flex-col w-full">
      {/* Dynamic Ambient Glow Backdrop Container */}
      <div className="relative w-full overflow-hidden px-margin-desktop py-space-xl flex flex-col gap-space-xl">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-secondary-container/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-primary-fixed/25 blur-3xl pointer-events-none" />

        {/* Header & Action Controls */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-caption text-caption uppercase tracking-wider font-semibold">
                Treasury Audit v4.2
              </span>
              <span className="inline-flex items-center gap-1 font-caption text-caption text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Bank
                Gateway Live Sync
              </span>
            </div>
            <h1 className="font-title-portal text-title-portal text-on-surface tracking-tight">
              Payment Management &amp; Financial Reports
            </h1>
            <p className="font-body-default text-body-default text-on-surface-variant">
              Audit-compliant electronic payment ledger, treasury receipts reconciliation, and
              departmental concession tracking.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-space-sm shrink-0">
            <button
              type="button"
              onClick={handleExportStatement}
              className="h-14 px-6 rounded-full bg-surface-container-lowest/80 backdrop-blur-xl shadow-sm hover:shadow-md hover:bg-surface-container-lowest text-on-surface font-label-primary text-label-primary transition-all flex items-center gap-2 active:scale-95"
            >
              <MaterialIcon name="sim_card_download" className="text-[20px] text-secondary" />
              <span>Export Statement</span>
              <span className="font-caption text-caption px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                CSV
              </span>
            </button>
            <button
              type="button"
              onClick={scrollToOfficeForm}
              className="h-14 px-7 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-primary text-label-primary shadow-[0_8px_24px_rgba(0,83,205,0.28)] hover:shadow-[0_12px_28px_rgba(0,83,205,0.35)] transition-all flex items-center gap-2 active:scale-95"
            >
              <MaterialIcon name="add_circle" className="text-[22px]" />
              <span>Record Office Payment</span>
            </button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md relative z-10">
          {summaryCards.map((card) => (
            <PaymentSummaryCard key={card.id} card={card} />
          ))}
        </div>

        {/* Interactive Payment Ledger & Filters */}
        <div className="relative z-10 p-6 md:p-8 rounded-3xl bg-surface-container-lowest/60 backdrop-blur-3xl shadow-[0_20px_48px_rgba(0,83,205,0.06)] flex flex-col gap-space-lg">
          {/* Ledger Head Controls & Segmented Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex items-center gap-1.5 p-1.5 bg-surface-container/60 rounded-2xl overflow-x-auto whitespace-nowrap">
              {computedTabs.map((tab) => {
                const isSelected = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setActivePage(1);
                    }}
                    className={
                      isSelected
                        ? 'px-4 py-2 rounded-xl font-label-meta text-label-meta transition-all bg-primary text-on-primary font-semibold shadow-sm whitespace-nowrap'
                        : 'px-4 py-2 rounded-xl font-label-meta text-label-meta transition-all text-on-surface-variant hover:text-on-surface font-medium whitespace-nowrap'
                    }
                  >
                    {tab.label} <span className="ml-1 opacity-80">({tab.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Date Range Pill */}
            <div className="relative flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsDateDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-lowest shadow-sm font-label-meta text-label-meta text-on-surface"
              >
                <MaterialIcon name="calendar_month" className="text-[18px] text-primary" />
                <span className="font-medium">
                  {paymentDateRangeOptions[selectedDateRangeIndex]}
                </span>
                <MaterialIcon
                  name="expand_more"
                  className="text-[16px] text-on-surface-variant"
                />
              </button>

              {isDateDropdownOpen && (
                <div className="absolute top-12 right-12 z-30 w-56 rounded-2xl bg-surface-container-lowest p-1.5 shadow-xl border border-surface-container-high flex flex-col gap-1">
                  {paymentDateRangeOptions.map((option, idx) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSelectedDateRangeIndex(idx);
                        setIsDateDropdownOpen(false);
                      }}
                      className={`px-3 py-2 rounded-xl text-left font-label-meta text-label-meta transition-colors ${
                        idx === selectedDateRangeIndex
                          ? 'bg-primary text-on-primary font-semibold'
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
                onClick={() => {
                  setActiveTab('all');
                  setSelectedFacility('All Facilities');
                  setSearchQuery('');
                  loadPayments();
                  showToast('Ledger Synced', 'Payment ledger refreshed from database.');
                }}
                className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant hover:text-primary shadow-sm transition-transform active:rotate-180"
                title="Quick Refresh"
              >
                <MaterialIcon name="refresh" className="text-[18px]" />
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col lg:flex-row gap-space-sm items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-xl">
              <MaterialIcon
                name="search"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActivePage(1);
                }}
                placeholder="Search by receipt, pass/booking code, citizen name, or username..."
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low/70 focus:bg-surface-container-lowest focus:shadow-md text-body-default text-on-surface placeholder:text-outline outline-none transition-all font-body-default"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="font-caption text-caption text-on-surface-variant font-medium whitespace-nowrap pl-1">
                Facility:
              </span>
              {paymentFacilityFilters.map((facility) => {
                const isActive = facility === selectedFacility;
                return (
                  <button
                    key={facility}
                    type="button"
                    onClick={() => {
                      setSelectedFacility(facility);
                      setActivePage(1);
                    }}
                    className={
                      isActive
                        ? 'px-3 py-1.5 rounded-full bg-primary text-on-primary font-caption text-caption font-medium shadow-sm whitespace-nowrap'
                        : 'px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface font-caption text-caption font-medium whitespace-nowrap'
                    }
                  >
                    {facility}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Financial Transaction Ledger Table */}
          <div className="overflow-x-auto rounded-2xl bg-surface-container-lowest/80 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container-low/70 text-on-surface-variant font-label-meta text-label-meta uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold">Receipt / UTR ID</th>
                  <th className="py-4 px-6 font-semibold">Member / Organiser</th>
                  <th className="py-4 px-6 font-semibold">Category</th>
                  <th className="py-4 px-6 font-semibold">Facility &amp; Purpose</th>
                  <th className="py-4 px-6 font-semibold">Payment Mode</th>
                  <th className="py-4 px-6 font-semibold text-right">Amount (₹)</th>
                  <th className="py-4 px-6 font-semibold text-center">Status</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-label-primary text-label-primary text-on-surface">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row) => (
                    <PaymentTransactionRowItem
                      key={row.id}
                      row={row}
                      onDownloadReceipt={handleDownloadReceipt}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 px-6 text-center font-body-default text-on-surface-variant"
                    >
                      No matching financial transactions found for the current filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ledger Footer Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-2">
            <span className="font-caption text-caption text-on-surface-variant">
              Showing {filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}{' '}
              recorded financial entries
            </span>
            <div className="flex items-center gap-1 font-label-meta text-label-meta">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setActivePage(page)}
                  className={
                    safePage === page
                      ? 'px-3 py-1.5 rounded-lg bg-primary text-on-primary font-medium'
                      : 'px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm text-on-surface-variant hover:text-on-surface transition-colors'
                  }
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm text-on-surface-variant hover:text-on-surface disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Record Office Payment Form Card */}
        <OfficePaymentFormCard
          defaultValues={{
            ...paymentOfficeDefaultFormValues,
            applicantRef: '',
            challanNumber: 'TR-KCP-2026-',
            amount: '',
            entryTimestamp: new Date().toLocaleString('en-IN'),
          }}
          facilityOptions={paymentOfficeFacilityOptions}
          modeOptions={paymentOfficeModeOptions}
          officerName={user?.full_name ?? currentStaff.name}
          officerPin={user?.username ?? currentStaff.pin}
          onSubmitPayment={handleRecordOfficePayment}
        />

        {/* Notification Toast */}
        <div
          className={`fixed bottom-8 right-8 z-50 transform transition-all duration-300 pointer-events-none flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-2xl ${
            toast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
          }`}
        >
          <MaterialIcon name="verified" className="text-emerald-400 text-[22px]" />
          <div className="flex flex-col">
            <span className="font-label-primary text-label-primary font-medium text-white">
              {toast?.title ?? 'Official Receipt Issued'}
            </span>
            <span className="font-caption text-caption text-surface-variant">
              {toast?.subtitle ?? ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
