import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Headphones,
  Loader2,
  Lock,
  ReceiptText,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type {
  BookingCourtOption,
  BookingDateOption,
  BookingPortalMeta,
  BookingRegistrant,
  BookingTimeSlot,
  BookingVenue,
} from '@/types/bookings';

interface BookingSummaryCardProps {
  meta: BookingPortalMeta;
  venue: BookingVenue;
  court: BookingCourtOption;
  date: BookingDateOption;
  slot: BookingTimeSlot | null;
  registrant: BookingRegistrant;
  reserving?: boolean;
  disabledReason?: string | null;
  inlineError?: string | null;
  onProceedToPayment: () => void;
}

export function BookingSummaryCard({
  meta,
  venue,
  court,
  date,
  slot,
  registrant,
  reserving = false,
  disabledReason = null,
  inlineError = null,
  onProceedToPayment,
}: BookingSummaryCardProps) {
  const { t } = useLanguage();

  const standardBaseFee = court.standardHourlyRate || court.hourlyRate;
  const concessionDiscount = court.concessionDiscount || 0;
  const taxableSubtotal = court.hourlyRate;
  const gstRatePercent = court.gstRate || Math.round(meta.gstRate * 100);
  const gstAmount = Math.round(taxableSubtotal * (gstRatePercent / 100) * 100) / 100;
  const totalAmount = Math.round((taxableSubtotal + gstAmount) * 100) / 100;

  const isDisabled = Boolean(disabledReason) || reserving || !slot || slot.status !== 'available';

  const formatInr = (val: number) =>
    `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      style={{ animationDelay: '310ms' }}
      className="bookings-rise lg:col-span-4 w-full sticky top-24 flex flex-col gap-3.5"
    >
      {/* Main Receipt-Style Summary Card */}
      <div className="w-full rounded-[24px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 md:p-6 shadow-[0_20px_48px_-18px_rgba(15,23,42,0.12)] flex flex-col gap-5">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-[19px] font-bold text-[#0F172A] tracking-[-0.02em]">
            {t('Booking Summary', 'ബുക്കിംഗ് സംഗ്രഹം')}
          </h2>
          {venue.operationalStatus !== 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-[0.05em]">
              {venue.operationalStatus === 'CLOSED' ? t('Closed', 'അടച്ചു') : t('Maintenance', 'അറ്റകുറ്റപ്പണി')}
            </span>
          ) : slot?.status === 'available' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-bold uppercase tracking-[0.05em]">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.2} />
              {t('Open Slot', 'ലഭ്യമായ സ്ലോട്ട്')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-[0.05em]">
              {t('Unavailable', 'ലഭ്യമല്ല')}
            </span>
          )}
        </div>

        {/* Structured Selection Details Box */}
        <div className="rounded-[16px] bg-slate-50/90 border border-slate-200/75 p-4 flex flex-col gap-3.5">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
              {t('Facility', 'കായിക വേദി')}
            </span>
            <p className="font-display text-[15px] font-bold text-[#0F172A] mt-0.5 leading-snug">
              {venue.name}{' '}
              <span className="font-medium text-[#475569]">({court.shortName})</span>
            </p>
          </div>

          <div className="h-px bg-slate-200/75" />

          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
              {t('Date & Time Slot', 'തീയതിയും സമയവും')}
            </span>
            <p className="text-[14px] font-semibold text-[#165DF5] mt-0.5 tabular-nums leading-snug">
              {date.fullDateLabel}
              {slot ? ` • ${slot.summaryTimeLabel}` : ` • ${t('No open slot selected', 'സ്ലോട്ട് തിരഞ്ഞെടുത്തിട്ടില്ല')}`}
            </p>
            {slot && (
              <div className="inline-flex items-center gap-1.5 text-[12px] text-[#64748B] mt-1">
                <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                <span>{slot.durationLabel}</span>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200/75" />

          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
              {t('Member Account', 'അംഗ അക്കൗണ്ട്')}
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[13.5px] font-semibold text-[#0F172A]">
                {registrant.name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-[#475569]">
                {registrant.registrantId}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  registrant.isGovt
                    ? 'bg-blue-50 border-blue-200 text-[#0F50DC]'
                    : 'bg-slate-100 border-slate-200 text-[#475569]'
                }`}
              >
                {registrant.accountBadge}
              </span>
            </div>
          </div>
        </div>

        {/* Structured Backend-Aligned Price Breakdown */}
        <div className="flex flex-col gap-2.5 text-[13.5px]">
          <div className="flex items-center justify-between text-[#475569]">
            <span>{t('Base Fee', 'അടിസ്ഥാന ഫീസ്')}</span>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              {formatInr(standardBaseFee)}
            </span>
          </div>

          {(concessionDiscount > 0 || registrant.isGovt) && (
            <div className="flex items-center justify-between text-emerald-700">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span>{t('Govt / Police Concession', 'സർക്കാർ / പോലീസ് ഇളവ്')}</span>
                {court.concessionPercent > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {court.concessionPercent}%
                  </span>
                )}
              </span>
              <span className="font-semibold tabular-nums">
                −{formatInr(concessionDiscount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[#475569]">
            <span>{t('Taxable Subtotal', 'നികുതി ബാധകമായ തുക')}</span>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              {formatInr(taxableSubtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#475569]">
            <span>{t(`GST (${gstRatePercent}%)`, `GST (${gstRatePercent}%)`)}</span>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              {formatInr(gstAmount)}
            </span>
          </div>

          {/* Dashed Receipt Total Divider */}
          <div className="mt-1.5 pt-3.5 border-t border-dashed border-slate-300/90 flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-[#0F172A]">
                {t('Total Payable', 'ആകെ അടയ്‌ക്കേണ്ട തുക')}
              </span>
              <span className="text-[11.5px] text-[#64748B]">
                {t('Incl. official Kerala GST', 'കേരള GST ഉൾപ്പെടെ')}
              </span>
            </div>
            <span className="font-display text-[25px] font-extrabold text-[#165DF5] tracking-[-0.03em] tabular-nums">
              {formatInr(totalAmount)}
            </span>
          </div>
        </div>

        {/* Inline Error Alert */}
        {inlineError && (
          <div
            role="alert"
            className="px-3.5 py-3 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-[12.5px] font-medium"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{inlineError}</span>
          </div>
        )}

        {/* Instant Booking Confirmation & Receipt Policy Callout */}
        <div className="px-3.5 py-3 rounded-[14px] bg-[#165DF5]/[0.06] border border-[#165DF5]/15 flex items-start gap-2.5">
          <ReceiptText className="w-4 h-4 text-[#165DF5] shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-[12px] text-[#334155] leading-relaxed">
            {t(
              meta.cancellationNotice,
              'പണമടച്ചാലുടൻ ഔദ്യോഗിക ബുക്കിംഗ് സ്ഥിരീകരണവും ഫീസ് രസീതും ലഭിക്കും. 4 മണിക്കൂർ മുമ്പ് റദ്ദാക്കിയാൽ സൗജന്യ റീഫണ്ട് ലഭിക്കും.',
            )}
          </p>
        </div>

        {/* Primary Confirm & Pay Action Button */}
        <button
          type="button"
          disabled={isDisabled}
          onClick={onProceedToPayment}
          className={`btn-primary w-full inline-flex items-center justify-center gap-2 group ${
            isDisabled ? 'opacity-55 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          {reserving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{t('Confirming Booking...', 'ബുക്കിംഗ് സ്ഥിരീകരിക്കുന്നു...')}</span>
            </>
          ) : disabledReason ? (
            <>
              <Lock className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span>{disabledReason}</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span className="tabular-nums">
                {t('Confirm & Pay', 'സ്ഥിരീകരിച്ച് പണമടയ്ക്കുക')} ({formatInr(totalAmount)})
              </span>
              <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>

      {/* Compact On-Site Helpdesk Strip */}
      <div className="w-full rounded-[18px] bg-white/80 backdrop-blur-xl border border-slate-200/85 px-4 py-3.5 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.06)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 text-[#165DF5] flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#0F172A] truncate">
              {t(meta.supportDeskTitle, 'സ്പോർട്സ് കോംപ്ലക്സ് ഡെസ്ക്')}
            </p>
            <p className="text-[11.5px] text-[#64748B] truncate">
              {t(meta.supportDeskSubtitle, 'കണ്ണൂർ സിറ്റി പോലീസ് കായിക ഓഫീസ് • സഹായ ഡെസ്ക്')}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[#334155] text-[11.5px] font-semibold whitespace-nowrap shrink-0">
          {meta.supportBadge}
        </span>
      </div>
    </div>
  );
}
