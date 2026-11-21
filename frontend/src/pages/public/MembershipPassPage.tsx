import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Info,
  Loader2,
  Printer,
  ReceiptText,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  membershipsApi,
  paymentsApi,
  type ApiMembership,
  type ApiPaymentPricingBreakdown,
  type ApiPaymentRecord,
  type ApiSettlePaymentResponse,
} from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { ACTIVATED_PASS_STORAGE_KEY } from '@/pages/public/membership/MembershipPage';
import '@/styles/bookings.css';

function formatPassDate(dateStr?: string | null): string {
  if (!dateStr) return 'Active';
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatInr(amount?: string | number | null): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Clean Track Membership Confirmation & Fee Receipt page (`/membership/pass`).
 * Clean printable pass summary and official fee receipt with zero third-party PDF libraries.
 */
export default function MembershipPassPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [liveMembership, setLiveMembership] = useState<ApiMembership | null>(null);
  const [livePayment, setLivePayment] = useState<ApiPaymentRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const stateSettled = (location.state as ApiSettlePaymentResponse | null) ?? null;
    if (stateSettled?.membership) {
      setLiveMembership(stateSettled.membership);
      setLivePayment(stateSettled.payment);
      setLoading(false);
      return;
    }

    try {
      const storedRaw = window.sessionStorage.getItem(ACTIVATED_PASS_STORAGE_KEY);
      if (storedRaw) {
        const parsed = JSON.parse(storedRaw) as ApiSettlePaymentResponse;
        if (parsed.membership) {
          setLiveMembership(parsed.membership);
          setLivePayment(parsed.payment);
          setLoading(false);
        }
      }
    } catch {
      // Ignore storage failure
    }

    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    Promise.all([
      membershipsApi.getMy().catch(() => ({ memberships: [] as ApiMembership[] })),
      paymentsApi.getMy().catch(() => ({ payments: [] as ApiPaymentRecord[] })),
    ])
      .then(([memRes, payRes]) => {
        if (!active) return;
        const activePass =
          memRes.memberships.find((m) => m.status === 'ACTIVE') ??
          memRes.memberships[0] ??
          null;
        if (activePass) {
          setLiveMembership(activePass);
          const matchingPayment =
            payRes.payments.find(
              (p) => p.reference_type === 'MEMBERSHIP' && p.reference_id === activePass.id,
            ) ?? null;
          if (matchingPayment) setLivePayment(matchingPayment);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [location.state, user]);

  const breakdown = useMemo<ApiPaymentPricingBreakdown | null>(() => {
    if (!liveMembership) return null;
    if (livePayment?.pricing_breakdown) return livePayment.pricing_breakdown;
    if (liveMembership.pricing_breakdown) return liveMembership.pricing_breakdown;

    const taxable = Number(
      livePayment?.base_amount ?? liveMembership.calculated_tariff?.base_amount ?? 0,
    );
    const gst = Number(
      livePayment?.gst_amount ?? liveMembership.calculated_tariff?.gst_amount ?? 0,
    );
    const total = Number(
      livePayment?.total_amount ?? liveMembership.calculated_tariff?.total_amount ?? 0,
    );

    return {
      base_fee: taxable.toFixed(2),
      concession_discount: '0.00',
      concession_percent: 0,
      taxable_subtotal: taxable.toFixed(2),
      gst_rate: 18,
      gst_amount: gst.toFixed(2),
      final_total_paid: total.toFixed(2),
    };
  }, [liveMembership, livePayment]);

  const handleCopyRef = async () => {
    if (!liveMembership) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(liveMembership.pass_code).catch(() => {});
    }
    setCopiedCode(true);
    setToastMessage(`Copied membership reference ${liveMembership.pass_code}`);
    window.setTimeout(() => {
      setCopiedCode(false);
      setToastMessage(null);
    }, 2400);
  };

  const sessionHours =
    liveMembership?.session_window === 'MORNING'
      ? '05:00 AM – 10:00 AM'
      : liveMembership?.session_window === 'EVENING'
        ? '03:00 PM – 09:00 PM'
        : '05:00 AM – 09:00 PM';

  const isGovt =
    liveMembership?.user_category === 'GOVT_PERSONNEL' || user?.role === 'GOVT_PERSONNEL';
  const concessionAmount = Number(breakdown?.concession_discount ?? 0);

  return (
    <div className="bookings-page-container flex flex-col w-full text-[#0F172A] antialiased">
      <div className="w-full max-w-[880px] mx-auto px-4 md:px-6 pt-5 md:pt-8 pb-16 flex flex-col gap-6">
        {/* Back link (hidden on print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>{t('Back to home', 'ഹോമിലേക്ക് മടങ്ങുക')}</span>
          </Link>

          <Link
            to="/my-bookings"
            className="text-[13px] font-semibold text-[#165DF5] hover:text-[#0F50DC] transition-colors"
          >
            {t('View My Bookings →', 'എന്റെ ബുക്കിംഗുകൾ →')}
          </Link>
        </div>

        {loading ? (
          <div className="rounded-[24px] bg-white/85 border border-slate-200/85 p-12 flex flex-col items-center justify-center gap-3 text-[#64748B]">
            <Loader2 className="w-6 h-6 animate-spin text-[#165DF5]" />
            <span className="text-[14px] font-medium">
              {t('Loading membership receipt...', 'അംഗത്വ രസീത് ലോഡ് ചെയ്യുന്നു...')}
            </span>
          </div>
        ) : !liveMembership ? (
          <div className="rounded-[26px] bg-white/90 border border-slate-200/85 p-9 text-center max-w-lg mx-auto flex flex-col items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
              <ReceiptText className="w-6 h-6" />
            </span>
            <div>
              <h1 className="font-display text-[21px] font-bold text-[#0F172A]">
                {t('No Active Track Membership', 'സജീവ ട്രാക്ക് അംഗത്വമില്ല')}
              </h1>
              <p className="text-[13.5px] text-[#64748B] mt-1">
                {t(
                  'Enroll in a monthly Synthetic Track plan to receive your instant confirmation and GST fee receipt.',
                  'സിന്തറ്റിക് ട്രാക്ക് അംഗത്വം എടുത്ത് ഉടൻ ഫീസ് രസീത് നേടുക.',
                )}
              </p>
            </div>
            <Link to="/membership" className="btn-primary !h-11 px-6 text-[14px] inline-flex items-center">
              {t('Get Track Membership', 'ട്രാക്ക് അംഗത്വം നേടുക')}
            </Link>
          </div>
        ) : (
          <article className="receipt-print-sheet w-full rounded-[26px] bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.14)] overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#165DF5] via-[#3B82F6] to-emerald-500" />

            {/* Header */}
            <div className="px-6 py-6 sm:px-8 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" strokeWidth={2.2} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#165DF5]">
                    {t('Kannur City Police • Sports Complex', 'കണ്ണൂർ സിറ്റി പോലീസ് • കായിക സമുച്ചയം')}
                  </p>
                  <h1 className="font-display text-[22px] sm:text-[25px] font-extrabold text-[#0F172A] tracking-[-0.025em] leading-tight mt-0.5">
                    {t('Track Membership Confirmation & Receipt', 'ട്രാക്ക് അംഗത്വ സ്ഥിരീകരണവും ഫീസ് രസീതും')}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11.5px] font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {liveMembership.status}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isGovt
                      ? 'bg-blue-50 border-blue-200 text-[#0F50DC]'
                      : 'bg-slate-100 border-slate-200 text-[#334155]'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {isGovt ? t('Govt / Police', 'സർക്കാർ / പോലീസ്') : t('General Public', 'പൊതുജനം')}
                </span>
              </div>
            </div>

            {/* Reference IDs */}
            <div className="px-6 py-4 sm:px-8 bg-slate-50/90 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                  {t('Membership Reference ID', 'അംഗത്വ റഫറൻസ് ഐഡി')}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[15px] font-bold text-[#0F172A]">
                    {liveMembership.pass_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-[#475569] hover:text-[#165DF5]"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? t('Copied', 'പകർത്തി') : t('Copy', 'പകർത്തുക')}</span>
                  </button>
                </div>
              </div>
              <div className="sm:text-right">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                  {t('Receipt Number', 'രസീത് നമ്പർ')}
                </span>
                <p className="font-mono text-[14px] font-semibold text-[#334155] mt-0.5">
                  {livePayment?.receipt_no ?? t('Recorded in ledger', 'ലെഡ്ജറിൽ രേഖപ്പെടുത്തി')}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="px-6 py-6 sm:px-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200/80">
              <div className="rounded-[16px] bg-slate-50/75 border border-slate-200/70 p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#165DF5] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                    {t('Member', 'അംഗം')}
                  </span>
                  <p className="text-[15px] font-bold text-[#0F172A] mt-0.5">
                    {user?.full_name ?? liveMembership.user?.full_name ?? 'Registered Member'}
                  </p>
                  {user?.username && (
                    <p className="text-[12px] font-mono text-[#64748B]">@{user.username}</p>
                  )}
                </div>
              </div>

              <div className="rounded-[16px] bg-slate-50/75 border border-slate-200/70 p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#165DF5] flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                    {t('Validity Period', 'കാലാവധി')}
                  </span>
                  <p className="text-[14.5px] font-bold text-[#0F172A] mt-0.5 tabular-nums">
                    {formatPassDate(liveMembership.start_date)} – {formatPassDate(liveMembership.end_date)}
                  </p>
                  <p className="text-[12px] font-semibold text-[#165DF5]">
                    {liveMembership.duration_months}{' '}
                    {liveMembership.duration_months === 1 ? 'Month Plan' : 'Months Plan'}
                  </p>
                </div>
              </div>

              <div className="rounded-[16px] bg-slate-50/75 border border-slate-200/70 p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#165DF5] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                    {t('Facility & Session Window', 'വേദിയും സമയവും')}
                  </span>
                  <p className="text-[14.5px] font-bold text-[#0F172A] mt-0.5">
                    {liveMembership.facility?.name ?? 'Synthetic 400m Athletic Track'}
                  </p>
                  <p className="text-[12px] text-[#475569] tabular-nums">
                    {liveMembership.session_window} • {sessionHours}
                  </p>
                </div>
              </div>

              <div className="rounded-[16px] bg-slate-50/75 border border-slate-200/70 p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#165DF5] flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
                    {t('Payment Mode', 'പേയ്‌മെന്റ് രീതി')}
                  </span>
                  <p className="text-[14.5px] font-bold text-[#0F172A] mt-0.5">
                    {livePayment?.payment_mode === 'OFFICE_RECEIPT'
                      ? t('Office Counter Receipt', 'ഓഫീസ് കൗണ്ടർ രസീത്')
                      : t('Online Payment Settled', 'ഓൺലൈൻ പേയ്‌മെന്റ് പൂർത്തിയായി')}
                  </p>
                </div>
              </div>
            </div>

            {/* Structured Pricing Breakdown */}
            {breakdown && (
              <div className="px-6 py-6 sm:px-8">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#64748B] mb-3.5">
                  {t('Official Fee Receipt Breakdown', 'ഔദ്യോഗിക ഫീസ് വിഭജനം')}
                </h2>
                <div className="rounded-[18px] bg-slate-50/80 border border-slate-200/80 p-5 flex flex-col gap-2.5 text-[14px]">
                  <div className="flex items-center justify-between text-[#475569]">
                    <span>{t('Base Fee', 'അടിസ്ഥാന ഫീസ്')}</span>
                    <span className="font-semibold text-[#0F172A] tabular-nums">
                      {formatInr(breakdown.base_fee)}
                    </span>
                  </div>

                  {(concessionAmount > 0 || isGovt) && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span className="font-medium">
                        {t('Govt / Police Concession', 'സർക്കാർ / പോലീസ് ഇളവ്')}
                        {breakdown.concession_percent > 0 ? ` (${breakdown.concession_percent}%)` : ''}
                      </span>
                      <span className="font-semibold tabular-nums">
                        −{formatInr(breakdown.concession_discount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[#475569]">
                    <span>{t('Taxable Subtotal', 'നികുതി ബാധകമായ തുക')}</span>
                    <span className="font-semibold text-[#0F172A] tabular-nums">
                      {formatInr(breakdown.taxable_subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#475569]">
                    <span>GST ({breakdown.gst_rate}%)</span>
                    <span className="font-semibold text-[#0F172A] tabular-nums">
                      {formatInr(breakdown.gst_amount)}
                    </span>
                  </div>

                  <div className="mt-1.5 pt-3.5 border-t border-dashed border-slate-300 flex items-center justify-between">
                    <span className="font-bold text-[#0F172A]">
                      {t('Total Paid', 'ആകെ അടച്ച തുക')}
                    </span>
                    <span className="font-display text-[25px] font-extrabold text-[#165DF5] tabular-nums">
                      {formatInr(breakdown.final_total_paid)}
                    </span>
                  </div>
                </div>

                <div className="print:hidden mt-5 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => window.print()}
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
                    <Copy className="w-4 h-4 text-[#475569]" />
                    <span>{t('Copy Reference ID', 'റഫറൻസ് പകർത്തുക')}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="px-6 py-4 sm:px-8 bg-slate-50/90 border-t border-slate-200/80 flex items-start gap-2.5 text-[12.5px] text-[#475569]">
              <Info className="w-4 h-4 text-[#165DF5] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {t(
                  'Please wear appropriate running shoes on the synthetic track surface and quote your Membership Reference ID if requested by ground staff.',
                  'സിന്തറ്റിക് ട്രാക്കിൽ അനുയോജ്യമായ റണ്ണിംഗ് ഷൂസ് ധരിക്കുക. ആവശ്യമെങ്കിൽ അംഗത്വ റഫറൻസ് ഐഡി കാണിക്കുക.',
                )}
              </p>
            </div>
          </article>
        )}
      </div>

      {toastMessage && (
        <div className="print:hidden fixed bottom-6 right-6 z-50 bookings-toast-enter">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-[#0F172A] text-white border border-white/10 shadow-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
