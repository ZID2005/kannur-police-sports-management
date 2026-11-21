import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Info,
  Printer,
  ReceiptText,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { BackendSlotBookingStatus } from '@/api/client';
import { useLanguage } from '@/context/LanguageContext';
import type { BookingReceiptData } from '@/types/bookings';

interface BookingReceiptCardProps {
  receipt: BookingReceiptData;
  compact?: boolean;
  showNavLinks?: boolean;
  onActionToast?: (message: string) => void;
  onPrint?: () => void;
}

function formatInr(amount?: string | number | null): string {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTimestamp(iso?: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeStyles(status: BackendSlotBookingStatus): {
  label: string;
  classes: string;
  dot: string;
} {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        classes: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        dot: 'bg-emerald-500',
      };
    case 'PENDING_PAYMENT':
      return {
        label: 'Pending Payment',
        classes: 'bg-amber-50 border-amber-200 text-amber-800',
        dot: 'bg-amber-500',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        classes: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        dot: 'bg-indigo-500',
      };
    case 'CANCELLED':
    default:
      return {
        label: 'Cancelled',
        classes: 'bg-slate-100 border-slate-200 text-slate-600',
        dot: 'bg-slate-400',
      };
  }
}

export function BookingReceiptCard({
  receipt,
  compact = false,
  showNavLinks = true,
  onActionToast,
  onPrint,
}: BookingReceiptCardProps) {
  const { t } = useLanguage();
  const [copiedRef, setCopiedRef] = useState(false);

  const statusBadge = getStatusBadgeStyles(receipt.status);
  const concessionAmount = Number(receipt.pricingBreakdown.concession_discount ?? 0);
  const hasConcession = concessionAmount > 0 || receipt.userCategory === 'GOVT_PERSONNEL';
  const paidAtFormatted = formatTimestamp(receipt.paidAt);

  const handleCopyRef = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(receipt.bookingReference);
      }
      setCopiedRef(true);
      onActionToast?.(`Copied booking reference ${receipt.bookingReference}`);
      window.setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      onActionToast?.(`Booking reference: ${receipt.bookingReference}`);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    window.print();
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Official Printable Booking Confirmation & Fee Receipt Sheet */}
      <article
        className={`receipt-print-sheet w-full rounded-[26px] bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.14)] overflow-hidden ${
          compact ? '' : 'max-w-[760px] mx-auto'
        }`}
      >
        {/* Top Accent Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#165DF5] via-[#3B82F6] to-emerald-500" />

        {/* Receipt Header */}
        <div
          className={`${
            compact ? 'px-5 py-5' : 'px-6 py-6 sm:px-8 sm:py-7'
          } border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-start justify-between gap-4`}
        >
          <div className="flex items-start gap-3.5">
            <span className="w-11 h-11 rounded-2xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center shrink-0">
              <ReceiptText className="w-5 h-5" strokeWidth={2.1} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#165DF5]">
                {t('Kannur City Police • Sports Complex', 'കണ്ണൂർ സിറ്റി പോലീസ് • കായിക സമുച്ചയം')}
              </p>
              <h2 className="font-display text-[20px] sm:text-[23px] font-extrabold text-[#0F172A] tracking-[-0.025em] leading-tight mt-0.5">
                {t('Booking Confirmation & Fee Receipt', 'ബുക്കിംഗ് സ്ഥിരീകരണവും ഫീസ് രസീതും')}
              </h2>
              <p className="text-[12.5px] text-[#64748B] mt-1">
                {t(
                  'Official electronic reservation confirmation and tax fee summary',
                  'ഔദ്യോഗിക ഇലക്ട്രോണിക് ബുക്കിംഗ് സ്ഥിരീകരണവും ഫീസ് വിവരങ്ങളും',
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11.5px] font-bold uppercase tracking-[0.05em] ${statusBadge.classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
              {statusBadge.label}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                receipt.userCategory === 'GOVT_PERSONNEL'
                  ? 'bg-blue-50 border-blue-200 text-[#0F50DC]'
                  : 'bg-slate-100 border-slate-200 text-[#334155]'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              {receipt.userCategory === 'GOVT_PERSONNEL'
                ? t('Govt / Police', 'സർക്കാർ / പോലീസ്')
                : t('General Public', 'പൊതുജനം')}
            </span>
          </div>
        </div>

        {/* Reference Identifiers Strip */}
        <div
          className={`${
            compact ? 'px-5 py-3.5' : 'px-6 py-4 sm:px-8'
          } bg-slate-50/90 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3`}
        >
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
              {t('Booking Reference ID', 'ബുക്കിംഗ് റഫറൻസ് ഐഡി')}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[15px] font-bold text-[#0F172A] tracking-[0.02em]">
                {receipt.bookingReference}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-[#165DF5]/50 text-[11px] font-semibold text-[#475569] hover:text-[#165DF5] transition"
              >
                {copiedRef ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{t('Copied', 'പകർത്തി')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{t('Copy', 'പകർത്തുക')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
              {t('Receipt Number', 'രസീത് നമ്പർ')}
            </span>
            <p className="font-mono text-[14px] font-semibold text-[#334155] mt-0.5">
              {receipt.receiptNo ||
                (receipt.status === 'PENDING_PAYMENT'
                  ? t('Issued upon payment', 'പണമടച്ചാൽ ലഭിക്കും')
                  : t('Recorded in ledger', 'ലെഡ്ജറിൽ രേഖപ്പെടുത്തി'))}
            </p>
          </div>
        </div>

        {/* Booking Details Grid */}
        <div
          className={`${
            compact ? 'px-5 py-5' : 'px-6 py-6 sm:px-8'
          } grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200/80`}
        >
          <div className="rounded-[16px] bg-slate-50/75 border border-slate-200/70 p-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#165DF5] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                {t('Venue & Court Mode', 'വേദിയും കോർട്ടും')}
              </span>
              <p className="font-display text-[15px] font-bold text-[#0F172A] leading-snug mt-0.5">
                {receipt.venueName}
              </p>
              <p className="text-[12.5px] font-semibold text-[#165DF5] mt-0.5">
                {receipt.courtModeLabel}
              </p>
            </div>
          </div>

          <div className="rounded-[16px] bg-slate-50/75 border border-slate-200/70 p-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#165DF5] flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                {t('Date & Time Slot', 'തീയതിയും സമയവും')}
              </span>
              <p className="font-display text-[15px] font-bold text-[#0F172A] leading-snug mt-0.5 tabular-nums">
                {receipt.dateLabel}
              </p>
              <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#334155] mt-0.5 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                <span>{receipt.timeSlotLabel}</span>
              </p>
            </div>
          </div>

          <div className="rounded-[16px] bg-slate-50/75 border border-slate-200/70 p-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#165DF5] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                {t('Booked By', 'ബുക്ക് ചെയ്ത വ്യക്തി')}
              </span>
              <p className="text-[14.5px] font-bold text-[#0F172A] leading-snug mt-0.5 truncate">
                {receipt.memberName}
              </p>
              {receipt.memberUsername && (
                <p className="text-[12px] font-mono text-[#64748B] mt-0.5">
                  @{receipt.memberUsername}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[16px] bg-slate-50/75 border border-slate-200/70 p-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#165DF5] flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                {t('Settlement Details', 'പേയ്‌മെന്റ് വിവരങ്ങൾ')}
              </span>
              <p className="text-[14px] font-bold text-[#0F172A] leading-snug mt-0.5">
                {receipt.paymentMode === 'OFFICE_RECEIPT'
                  ? t('Office Counter Receipt', 'ഓഫീസ് കൗണ്ടർ രസീത്')
                  : receipt.paymentMode === 'ONLINE_GATEWAY'
                    ? t('Online Payment Settled', 'ഓൺലൈൻ പേയ്‌മെന്റ് പൂർത്തിയായി')
                    : receipt.status === 'PENDING_PAYMENT'
                      ? t('Awaiting Payment', 'പേയ്‌മെന്റ് കാത്തിരിക്കുന്നു')
                      : t('Departmental Ledger', 'വകുപ്പുതല ലെഡ്ജർ')}
              </p>
              {paidAtFormatted && (
                <p className="text-[12px] text-[#64748B] mt-0.5 tabular-nums">{paidAtFormatted}</p>
              )}
            </div>
          </div>
        </div>

        {/* Structured Fee & Tax Breakdown */}
        <div className={`${compact ? 'px-5 py-5' : 'px-6 py-6 sm:px-8'}`}>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
              {t('Official Fee Receipt Breakdown', 'ഔദ്യോഗിക ഫീസ് വിഭജനം')}
            </h3>
            <span className="text-[11.5px] font-medium text-[#64748B]">
              {t('Currency: INR (₹)', 'കറൻസി: INR (₹)')}
            </span>
          </div>

          <div className="rounded-[18px] bg-slate-50/80 border border-slate-200/80 p-4 sm:p-5 flex flex-col gap-2.5 text-[14px]">
            <div className="flex items-center justify-between gap-3 text-[#475569]">
              <span>{t('Base Fee', 'അടിസ്ഥാന ഫീസ്')}</span>
              <span className="font-semibold text-[#0F172A] tabular-nums">
                {formatInr(receipt.pricingBreakdown.base_fee)}
              </span>
            </div>

            {hasConcession && (
              <div className="flex items-center justify-between gap-3 text-emerald-700">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span>{t('Govt / Police Concession', 'സർക്കാർ / പോലീസ് ഇളവ്')}</span>
                  {receipt.pricingBreakdown.concession_percent > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10.5px] font-bold tabular-nums">
                      {receipt.pricingBreakdown.concession_percent}% OFF
                    </span>
                  )}
                </span>
                <span className="font-semibold tabular-nums">
                  −{formatInr(receipt.pricingBreakdown.concession_discount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 text-[#475569]">
              <span>{t('Taxable Subtotal', 'നികുതി ബാധകമായ തുക')}</span>
              <span className="font-semibold text-[#0F172A] tabular-nums">
                {formatInr(receipt.pricingBreakdown.taxable_subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-[#475569]">
              <span>
                {t(
                  `GST (${receipt.pricingBreakdown.gst_rate}%)`,
                  `GST (${receipt.pricingBreakdown.gst_rate}%)`,
                )}
              </span>
              <span className="font-semibold text-[#0F172A] tabular-nums">
                {formatInr(receipt.pricingBreakdown.gst_amount)}
              </span>
            </div>

            <div className="mt-1.5 pt-3.5 border-t border-dashed border-slate-300 flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-[#0F172A]">
                  {receipt.status === 'PENDING_PAYMENT'
                    ? t('Total Payable', 'ആകെ അടയ്‌ക്കേണ്ട തുക')
                    : t('Total Paid', 'ആകെ അടച്ച തുക')}
                </p>
                <p className="text-[11.5px] text-[#64748B]">
                  {t('Inclusive of applicable Kerala GST', 'കേരള GST ഉൾപ്പെടെ')}
                </p>
              </div>
              <span className="font-display text-[24px] sm:text-[26px] font-extrabold text-[#165DF5] tracking-[-0.03em] tabular-nums">
                {formatInr(receipt.pricingBreakdown.final_total_paid)}
              </span>
            </div>
          </div>

          {/* Action Row (hidden in print) */}
          <div className="print:hidden mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary !h-11 px-5 text-[13.5px] inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{t('Print Receipt', 'രസീത് പ്രിന്റ് ചെയ്യുക')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyRef}
                className="btn-glass !h-11 px-4 text-[13.5px] inline-flex items-center gap-2"
              >
                {copiedRef ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-[#475569]" />
                )}
                <span>
                  {copiedRef
                    ? t('Reference Copied', 'റഫറൻസ് പകർത്തി')
                    : t('Copy Reference ID', 'റഫറൻസ് പകർത്തുക')}
                </span>
              </button>
            </div>

            {showNavLinks && (
              <div className="flex items-center gap-3 text-[13px] font-semibold">
                <Link
                  to="/my-bookings"
                  className="text-[#165DF5] hover:text-[#0F50DC] transition-colors"
                >
                  {t('View My Bookings', 'എന്റെ ബുക്കിംഗുകൾ')}
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  to="/bookings"
                  className="text-[#475569] hover:text-[#0F172A] transition-colors"
                >
                  {t('Book Another Slot', 'മറ്റൊരു സ്ലോട്ട് ബുക്ക് ചെയ്യുക')}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Clean Facility Arrival & Cancellation Note */}
        <div
          className={`${
            compact ? 'px-5 py-4' : 'px-6 py-4 sm:px-8'
          } bg-slate-50/90 border-t border-slate-200/80 flex items-start gap-2.5 text-[12.5px] text-[#475569]`}
        >
          <Info className="w-4 h-4 text-[#165DF5] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {t(
              'Please arrive 10 minutes before your scheduled slot with appropriate sports footwear and quote your Booking Reference ID if requested by ground staff. Free cancellation is available up to 4 hours before slot start.',
              'നിങ്ങളുടെ സമയത്തിന് 10 മിനിറ്റ് മുമ്പ് അനുയോജ്യമായ കായിക പാദരക്ഷകളുമായി എത്തുക. ആവശ്യമെങ്കിൽ ബുക്കിംഗ് റഫറൻസ് ഐഡി കാണിക്കുക. 4 മണിക്കൂർ മുമ്പ് വരെ സൗജന്യമായി റദ്ദാക്കാം.',
            )}
          </p>
        </div>
      </article>
    </div>
  );
}
