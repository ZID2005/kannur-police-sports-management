import { Fragment } from 'react';
import type { PaymentTransactionRow } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface PaymentTransactionRowItemProps {
  row: PaymentTransactionRow;
  isExpanded: boolean;
  onToggleExpand: () => void;
  delayMs?: number;
}

const SHORT_FACILITY_NAMES: Record<string, string> = {
  SYNTHETIC_TRACK: '400m Synthetic Track',
  FOOTBALL_GROUND: 'Parade Football Ground',
  POLICE_TURF: 'Floodlit Football Turf',
  BADMINTON_COURT: 'Indoor Badminton Complex',
};

function getConciseFacilityName(code: string, fullName: string): string {
  return SHORT_FACILITY_NAMES[code] ?? fullName;
}

function formatInrHalf(amount: number): string {
  const half = amount / 2;
  return `₹${half.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusPill(status: PaymentTransactionRow['status'], label: string) {
  switch (status) {
    case 'SETTLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11.5px] font-semibold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {label}
        </span>
      );
    case 'PENDING_RECONCILIATION':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11.5px] font-semibold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          {label}
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 text-[11.5px] font-semibold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          {label}
        </span>
      );
    case 'REFUNDED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/85 text-[11.5px] font-semibold whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {label}
        </span>
      );
  }
}

export function PaymentTransactionRowItem({
  row,
  isExpanded,
  onToggleExpand,
  delayMs = 0,
}: PaymentTransactionRowItemProps) {
  const isGovt = row.userCategory === 'GOVT_PERSONNEL';
  const hasConcession = row.concessionDiscount > 0;
  const isOffice = row.paymentMode === 'OFFICE_RECEIPT';
  const conciseFacility = getConciseFacilityName(row.facilityCode, row.facilityName);

  return (
    <Fragment>
      <tr
        onClick={onToggleExpand}
        style={{ animationDelay: `${delayMs}ms` }}
        className={`admin-row-enter admin-table-row cursor-pointer group ${
          isExpanded ? 'bg-[#EFF5FF]/55' : ''
        }`}
      >
        {/* Receipt / Booking Ref & Channel */}
        <td className="py-4 px-5 align-middle whitespace-nowrap">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] font-bold text-[#165DF5]">
                {row.receiptId}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${
                  isOffice
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80'
                }`}
              >
                <MaterialIcon
                  name={isOffice ? 'receipt_long' : 'credit_card'}
                  className="text-[12px]"
                />
                {isOffice ? 'Office' : 'Online'}
              </span>
            </div>
            <span className="font-mono text-[11.5px] text-slate-400">{row.bookingOrPassRef}</span>
          </div>
        </td>

        {/* Member & Category */}
        <td className="py-4 px-5 align-middle">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-[11.5px] shrink-0 border ${
                isGovt
                  ? 'bg-[#EFF5FF] text-[#165DF5] border-[#DCE8FE]'
                  : 'bg-slate-100 text-slate-600 border-slate-200/80'
              }`}
            >
              {row.memberInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13.5px] font-semibold text-[#0F172A] leading-snug truncate max-w-[190px]">
                {row.memberName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[11px] text-slate-400">@{row.memberUsername}</span>
                <span className="text-slate-300">·</span>
                <span
                  className={`text-[11px] font-semibold ${
                    isGovt ? 'text-[#165DF5]' : 'text-slate-500'
                  }`}
                >
                  {row.categoryLabel}
                </span>
              </div>
            </div>
          </div>
        </td>

        {/* Facility */}
        <td className="py-4 px-5 align-middle">
          <div className="flex flex-col max-w-[205px]" title={row.facilityName}>
            <span className="text-[13.5px] font-semibold text-[#0F172A] leading-snug truncate">
              {conciseFacility}
            </span>
            <span className="text-[12px] text-slate-500 mt-0.5 truncate">
              {row.facilityPurpose}
            </span>
          </div>
        </td>

        {/* Clean 2-Line Pricing Breakdown (Click row for full GST card) */}
        <td className="py-4 px-5 align-middle whitespace-nowrap">
          <div className="flex flex-col gap-1 tabular-nums">
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="text-slate-500">
                Base <strong className="text-slate-700 font-semibold">{row.baseFeeFormatted}</strong>
              </span>
              {hasConcession && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold">
                  −{row.concessionDiscountFormatted}
                  {row.concessionPercent > 0 ? ` (${row.concessionPercent}%)` : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 font-medium">
              <span>Taxable {row.taxableSubtotalFormatted}</span>
              <span>·</span>
              <span>
                GST ({row.gstRate}%) +{row.gstAmountFormatted}
              </span>
            </div>
          </div>
        </td>

        {/* Final Total Paid */}
        <td className="py-4 px-5 align-middle text-right whitespace-nowrap">
          <div className="flex flex-col items-end tabular-nums">
            <span
              className={`font-display text-[15px] font-extrabold tracking-tight ${
                row.status === 'REFUNDED' || row.status === 'FAILED'
                  ? 'text-rose-600'
                  : 'text-[#0F172A]'
              }`}
            >
              {row.totalPaidFormatted}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Incl. {row.gstRate}% GST</span>
          </div>
        </td>

        {/* Payment Status */}
        <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
          {getStatusPill(row.status, row.statusLabel)}
        </td>

        {/* Date / Time + Expand Chevron */}
        <td className="py-4 px-5 align-middle text-right whitespace-nowrap">
          <div className="inline-flex items-center justify-end gap-2.5">
            <div className="flex flex-col items-end tabular-nums" title={row.isoTimestamp}>
              <span className="text-[12.5px] font-semibold text-[#0F172A]">{row.dateLabel}</span>
              <span className="text-[11.5px] text-slate-400">{row.timeLabel}</span>
            </div>
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse GST breakdown' : 'Expand GST breakdown'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                isExpanded
                  ? 'bg-[#165DF5] text-white rotate-180'
                  : 'text-slate-400 group-hover:text-[#165DF5] group-hover:bg-[#EFF5FF]'
              }`}
            >
              <MaterialIcon name="expand_more" className="text-[18px]" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable Structured GST Reconciliation Drawer Row */}
      {isExpanded && (
        <tr className="bg-slate-50/75">
          <td colSpan={7} className="px-5 py-4">
            <div className="admin-panel-expand rounded-2xl bg-white border border-slate-200/90 p-4 flex flex-col gap-3.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-bold text-[#0F172A] font-display">
                    GST Tax Breakdown &amp; Audit Metadata
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[12px] text-slate-500">{row.facilityName}</span>
                </div>
                <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
                  <span>Channel: <strong className="text-slate-700">{row.paymentModeLabel}</strong></span>
                  {row.recordedByOfficerName && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>
                        Recorded by <strong className="text-slate-700">{row.recordedByOfficerName}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 tabular-nums">
                <div className="rounded-xl bg-slate-50/90 border border-slate-200/75 px-3.5 py-2.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    Base Fee
                  </span>
                  <div className="text-[14px] font-bold text-[#0F172A] mt-0.5">
                    {row.baseFeeFormatted}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50/90 border border-slate-200/75 px-3.5 py-2.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    Concession{hasConcession && row.concessionPercent > 0 ? ` (${row.concessionPercent}%)` : ''}
                  </span>
                  <div
                    className={`text-[14px] font-bold mt-0.5 ${
                      hasConcession ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {hasConcession ? `−${row.concessionDiscountFormatted}` : '₹0.00'}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50/90 border border-slate-200/75 px-3.5 py-2.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    Taxable Subtotal
                  </span>
                  <div className="text-[14px] font-bold text-[#0F172A] mt-0.5">
                    {row.taxableSubtotalFormatted}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50/90 border border-slate-200/75 px-3.5 py-2.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    GST ({row.gstRate}%)
                  </span>
                  <div className="text-[14px] font-bold text-[#0F172A] mt-0.5">
                    +{row.gstAmountFormatted}
                  </div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">
                    CGST {formatInrHalf(row.gstAmount)} · SGST {formatInrHalf(row.gstAmount)}
                  </div>
                </div>

                <div className="rounded-xl bg-[#EFF5FF] border border-[#BFDBFE] px-3.5 py-2.5 col-span-2 sm:col-span-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#165DF5]">
                    Final Total Paid
                  </span>
                  <div className="font-display text-[15px] font-extrabold text-[#165DF5] mt-0.5">
                    {row.totalPaidFormatted}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
