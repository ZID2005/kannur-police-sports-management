import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  ReceiptText,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  ApiError,
  bookingsApi,
  membershipsApi,
  paymentsApi,
  type ApiMembership,
  type ApiPaymentRecord,
  type ApiSlotBooking,
  type BackendCourtPartition,
  type BackendSlotBookingStatus,
} from '@/api/client';
import { BookingReceiptCard } from '@/components/bookings/BookingReceiptCard';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import type { BookingReceiptData } from '@/types/bookings';
import '@/styles/bookings.css';

type FilterTab = 'ALL' | 'UPCOMING' | 'CONFIRMED' | 'PENDING_PAYMENT' | 'CANCELLED';

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr) return 'Active';
  const dt = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
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

function formatCourtMode(partition: BackendCourtPartition, facilityCode?: string): string {
  if (partition === 'HALF_A') return 'Half Court A (5s)';
  if (partition === 'HALF_B') return 'Half Court B (5s)';
  return facilityCode === 'POLICE_TURF' ? 'Full Court (7s)' : 'Full Court';
}

function getStatusPill(status: BackendSlotBookingStatus): { label: string; classes: string } {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        classes: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      };
    case 'PENDING_PAYMENT':
      return {
        label: 'Pending Payment',
        classes: 'bg-amber-50 border-amber-200 text-amber-800',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        classes: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      };
    case 'CANCELLED':
    default:
      return {
        label: 'Cancelled',
        classes: 'bg-slate-100 border-slate-200 text-slate-600',
      };
  }
}

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState<ApiSlotBooking[]>([]);
  const [memberships, setMemberships] = useState<ApiMembership[]>([]);
  const [payments, setPayments] = useState<ApiPaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<BookingReceiptData | null>(null);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [bookRes, memRes, payRes] = await Promise.all([
        bookingsApi.getMy().catch(() => ({ bookings: [] as ApiSlotBooking[] })),
        membershipsApi.getMy().catch(() => ({ memberships: [] as ApiMembership[] })),
        paymentsApi.getMy().catch(() => ({ payments: [] as ApiPaymentRecord[] })),
      ]);
      setBookings(bookRes.bookings);
      setMemberships(memRes.memberships);
      setPayments(payRes.payments);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedReceipt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReceipt(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedReceipt]);

  const toReceiptData = useCallback(
    (booking: ApiSlotBooking): BookingReceiptData => {
      const payment = payments.find(
        (p) => p.reference_type === 'SLOT_BOOKING' && p.reference_id === booking.id,
      );
      const userCategory: 'PUBLIC' | 'GOVT_PERSONNEL' =
        booking.user_category ??
        (user?.role === 'GOVT_PERSONNEL' ? 'GOVT_PERSONNEL' : 'PUBLIC');
      const totalNum = Number(payment?.total_amount ?? booking.total_amount ?? 0);
      const taxable = Number(payment?.base_amount ?? (totalNum > 0 ? totalNum / 1.18 : 0));
      const gst = Number(payment?.gst_amount ?? Math.max(0, totalNum - taxable));

      return {
        bookingId: booking.id,
        bookingReference: booking.booking_code,
        receiptNo: booking.receipt?.receipt_no ?? payment?.receipt_no ?? null,
        status: booking.status,
        venueName: booking.facility?.name ?? 'Kannur City Police Sports Facility',
        facilityCode: booking.facility?.code,
        courtPartition: booking.court_partition,
        courtModeLabel: formatCourtMode(booking.court_partition, booking.facility?.code),
        dateLabel: formatDateLabel(booking.booking_date_formatted),
        timeSlotLabel: `${formatTime12h(booking.start_time_formatted)} – ${formatTime12h(
          booking.end_time_formatted,
        )}`,
        memberName: user?.full_name ?? 'Member',
        memberUsername: user?.username,
        userCategory,
        paymentMode: booking.receipt?.payment_mode ?? payment?.payment_mode ?? null,
        paidAt: booking.receipt?.paid_at ?? payment?.created_at ?? booking.created_at,
        pricingBreakdown: booking.pricing_breakdown ??
          payment?.pricing_breakdown ?? {
            base_fee: taxable.toFixed(2),
            concession_discount: '0.00',
            concession_percent: 0,
            taxable_subtotal: taxable.toFixed(2),
            gst_rate: 18,
            gst_amount: gst.toFixed(2),
            final_total_paid: totalNum.toFixed(2),
          },
      };
    },
    [payments, user],
  );

  const handleSettlePending = async (booking: ApiSlotBooking) => {
    setBusyBookingId(booking.id);
    try {
      const settled = await paymentsApi.settle({
        reference_type: 'SLOT_BOOKING',
        reference_id: booking.id,
      });
      showToast(`Booking ${booking.booking_code} confirmed. Receipt ${settled.payment.receipt_no} issued.`);
      await loadData();
      const updatedBooking: ApiSlotBooking = {
        ...booking,
        status: 'CONFIRMED',
        receipt: {
          receipt_no: settled.payment.receipt_no,
          payment_mode: settled.payment.payment_mode,
          status: settled.payment.status,
          paid_at: settled.payment.created_at,
        },
        pricing_breakdown:
          settled.receipt?.pricing_breakdown ??
          settled.payment.pricing_breakdown ??
          booking.pricing_breakdown,
      };
      setSelectedReceipt(toReceiptData(updatedBooking));
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Unable to settle payment.');
    } finally {
      setBusyBookingId(null);
    }
  };

  const handleCancelBooking = async (booking: ApiSlotBooking) => {
    setBusyBookingId(booking.id);
    try {
      await bookingsApi.cancel(booking.id, 'Cancelled by member via Member Portal');
      showToast(`Booking ${booking.booking_code} cancelled.`);
      await loadData();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Unable to cancel booking.');
    } finally {
      setBusyBookingId(null);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === 'UPCOMING') {
        return (
          (b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') &&
          b.booking_date_formatted >= todayIso
        );
      }
      if (activeTab === 'CONFIRMED') return b.status === 'CONFIRMED';
      if (activeTab === 'PENDING_PAYMENT') return b.status === 'PENDING_PAYMENT';
      if (activeTab === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'REFUNDED';
      return true;
    });
  }, [bookings, activeTab, todayIso]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
    const upcoming = confirmed.filter((b) => b.booking_date_formatted >= todayIso).length;
    const totalPaid = confirmed.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    return {
      total: bookings.length,
      upcoming,
      totalPaid,
    };
  }, [bookings, todayIso]);

  const activeTrackPass = useMemo(
    () => memberships.find((m) => m.status === 'ACTIVE') ?? null,
    [memberships],
  );

  if (!authLoading && !user) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 py-14 flex items-center justify-center">
        <div className="max-w-md w-full rounded-[28px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-8 text-center shadow-[0_18px_44px_-18px_rgba(15,23,42,0.12)] flex flex-col items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
            <ReceiptText className="w-6 h-6" />
          </span>
          <div>
            <h1 className="font-display text-[22px] font-bold text-[#0F172A]">
              {t('Sign in to view your bookings', 'നിങ്ങളുടെ ബുക്കിംഗുകൾ കാണാൻ സൈൻ ഇൻ ചെയ്യുക')}
            </h1>
            <p className="text-[13.5px] text-[#64748B] mt-1.5 leading-relaxed">
              {t(
                'Access your live slot reservations, track membership receipts, and printable GST fee summaries.',
                'നിങ്ങളുടെ തത്സമയ ബുക്കിംഗുകളും ഫീസ് രസീതുകളും കാണാൻ അക്കൗണ്ടിൽ പ്രവേശിക്കുക.',
              )}
            </p>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <Link to="/login" className="btn-primary !h-11 px-6 text-[14px] inline-flex items-center">
              {t('Sign in', 'സൈൻ ഇൻ')}
            </Link>
            <Link to="/register" className="btn-glass !h-11 px-5 text-[14px] inline-flex items-center">
              {t('Create account', 'അക്കൗണ്ട് തുടങ്ങുക')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-page-container flex flex-col w-full text-[#0F172A] antialiased">
      {/* Main listing view — hidden when printing if a receipt drawer is open */}
      <div
        className={`w-full max-w-[1200px] mx-auto px-4 md:px-6 pt-4 md:pt-7 pb-16 flex flex-col gap-6 ${
          selectedReceipt ? 'print:hidden' : ''
        }`}
      >
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[#165DF5] text-[12.5px] font-semibold">
              <ReceiptText className="w-4 h-4" />
              <span>{t('Reservations & Official Receipts', 'ബുക്കിംഗുകളും ഔദ്യോഗിക രസീതുകളും')}</span>
            </div>
            <h1 className="font-display text-[30px] sm:text-[36px] md:text-[40px] font-extrabold text-[#0F172A] tracking-[-0.03em] leading-[1.08] mt-1">
              {t('My Bookings', 'എന്റെ ബുക്കിംഗുകൾ')}
            </h1>
          </div>

          <Link
            to="/bookings"
            className="btn-primary !h-11 px-5 text-[13.5px] inline-flex items-center gap-2 self-start md:self-auto"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>{t('Book a New Slot', 'പുതിയ സ്ലോട്ട് ബുക്ക് ചെയ്യുക')}</span>
          </Link>
        </header>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[20px] bg-white/85 backdrop-blur-xl border border-slate-200/85 p-4 sm:p-5 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.1)]">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
              {t('Total Bookings', 'ആകെ ബുക്കിംഗുകൾ')}
            </p>
            <p className="font-display text-[28px] font-extrabold text-[#0F172A] tabular-nums mt-1">
              {stats.total}
            </p>
          </div>

          <div className="rounded-[20px] bg-white/85 backdrop-blur-xl border border-slate-200/85 p-4 sm:p-5 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.1)]">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
              {t('Upcoming Confirmed', 'വരാനിരിക്കുന്നവ')}
            </p>
            <p className="font-display text-[28px] font-extrabold text-[#165DF5] tabular-nums mt-1">
              {stats.upcoming}
            </p>
          </div>

          <div className="rounded-[20px] bg-white/85 backdrop-blur-xl border border-slate-200/85 p-4 sm:p-5 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.1)]">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-[#64748B]">
              {t('Total Fee Paid', 'ആകെ അടച്ച ഫീസ്')}
            </p>
            <p className="font-display text-[26px] font-extrabold text-emerald-700 tabular-nums mt-1">
              {formatInr(stats.totalPaid)}
            </p>
          </div>
        </div>

        {/* Active Track Membership Banner (if any) */}
        {activeTrackPass && (
          <div className="rounded-[22px] bg-gradient-to-r from-[#165DF5]/[0.07] via-white/90 to-emerald-50/70 border border-[#165DF5]/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="w-11 h-11 rounded-2xl bg-[#165DF5] text-white flex items-center justify-center shrink-0 shadow-sm">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#165DF5]">
                    {t('Active Monthly Membership', 'സജീവ പ്രതിമാസ അംഗത്വം')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10.5px] font-bold">
                    ACTIVE
                  </span>
                </div>
                <p className="font-display text-[17px] font-bold text-[#0F172A] mt-0.5">
                  {activeTrackPass.facility?.name ?? 'Synthetic 400m Athletic Track'}{' '}
                  <span className="font-mono text-[13px] font-semibold text-[#64748B]">
                    ({activeTrackPass.pass_code})
                  </span>
                </p>
                <p className="text-[12.5px] text-[#475569] mt-0.5">
                  {t('Valid until', 'കാലാവധി:')} {formatDateLabel(activeTrackPass.end_date)} •{' '}
                  {activeTrackPass.session_window} {t('Session', 'സെഷൻ')}
                </p>
              </div>
            </div>
            <Link
              to="/membership/pass"
              className="btn-primary !h-10 px-4 text-[13px] inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
            >
              <ReceiptText className="w-4 h-4" />
              <span>{t('View Membership Receipt', 'അംഗത്വ രസീത് കാണുക')}</span>
            </Link>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'ALL', label: t('All Bookings', 'എല്ലാം') },
              { id: 'UPCOMING', label: t('Upcoming', 'വരാനിരിക്കുന്നവ') },
              { id: 'CONFIRMED', label: t('Confirmed', 'സ്ഥിരീകരിച്ചവ') },
              { id: 'PENDING_PAYMENT', label: t('Pending Payment', 'പേയ്‌മെന്റ് ബാക്കി') },
              { id: 'CANCELLED', label: t('Cancelled', 'റദ്ദാക്കിയവ') },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-9 px-4 rounded-full text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-[#165DF5] text-white shadow-[0_6px_16px_rgba(22,93,245,0.28)]'
                    : 'bg-white/80 border border-slate-200/90 text-[#475569] hover:text-[#0F172A] hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="rounded-[24px] bg-white/85 border border-slate-200/85 p-12 flex flex-col items-center justify-center gap-3 text-[#64748B]">
            <Loader2 className="w-6 h-6 animate-spin text-[#165DF5]" />
            <span className="text-[14px] font-medium">
              {t('Loading your bookings...', 'ബുക്കിംഗുകൾ ലോഡ് ചെയ്യുന്നു...')}
            </span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-[24px] bg-white/85 border border-slate-200/85 p-10 text-center flex flex-col items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-slate-100 text-[#64748B] flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-bold text-[#0F172A]">
                {t('No bookings in this view', 'ഈ വിഭാഗത്തിൽ ബുക്കിംഗുകളൊന്നുമില്ല')}
              </h2>
              <p className="text-[13.5px] text-[#64748B] mt-1">
                {t(
                  'Reserve an hourly court slot to see your booking confirmation and fee receipt here.',
                  'ബുക്കിംഗ് സ്ഥിരീകരണവും ഫീസ് രസീതും കാണാൻ ഒരു കോർട്ട് സ്ലോട്ട് ബുക്ക് ചെയ്യുക.',
                )}
              </p>
            </div>
            <Link
              to="/bookings"
              className="btn-primary !h-10 px-5 text-[13.5px] inline-flex items-center gap-2 mt-1"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{t('Browse Available Slots', 'സ്ലോട്ടുകൾ കാണുക')}</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBookings.map((booking) => {
              const pill = getStatusPill(booking.status);
              const isBusy = busyBookingId === booking.id;
              const concession = Number(booking.pricing_breakdown?.concession_discount ?? 0);
              const courtMode = formatCourtMode(booking.court_partition, booking.facility?.code);

              return (
                <div
                  key={booking.id}
                  className="rounded-[22px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-5 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.1)] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-[#0F172A] px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {booking.booking_code}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.04em] ${pill.classes}`}
                      >
                        {pill.label}
                      </span>
                      {concession > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          {t('Govt / Police Concession', 'സർക്കാർ / പോലീസ് ഇളവ്')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-display text-[17.5px] font-bold text-[#0F172A] flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#165DF5] shrink-0" />
                        <span>{booking.facility?.name ?? 'Sports Facility'}</span>
                      </h3>
                      <span className="text-[13px] font-semibold text-[#165DF5] bg-[#165DF5]/10 px-2.5 py-0.5 rounded-full">
                        {courtMode}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#475569]">
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <CalendarDays className="w-3.5 h-3.5 text-[#64748B]" />
                        {formatDateLabel(booking.booking_date_formatted)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                        {formatTime12h(booking.start_time_formatted)} –{' '}
                        {formatTime12h(booking.end_time_formatted)}
                      </span>
                      {booking.receipt?.receipt_no && (
                        <span className="font-mono text-[12px] text-[#64748B]">
                          Receipt: {booking.receipt.receipt_no}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Fee & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200/75 shrink-0">
                    <div className="lg:text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">
                        {booking.status === 'PENDING_PAYMENT'
                          ? t('Total Payable', 'അടയ്‌ക്കേണ്ട തുക')
                          : t('Total Paid', 'അടച്ച തുക')}
                      </span>
                      <p className="font-display text-[21px] font-extrabold text-[#165DF5] tabular-nums leading-tight">
                        {formatInr(
                          booking.pricing_breakdown?.final_total_paid ?? booking.total_amount,
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {booking.status === 'PENDING_PAYMENT' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSettlePending(booking)}
                          className="btn-primary !h-9 px-3.5 text-[12.5px] inline-flex items-center gap-1.5"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5" />
                          )}
                          <span>{t('Pay Now', 'ഇപ്പോൾ അടയ്ക്കുക')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(toReceiptData(booking))}
                        className="h-9 px-3.5 rounded-xl bg-[#165DF5]/10 hover:bg-[#165DF5]/15 text-[#0F50DC] text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition"
                      >
                        <ReceiptText className="w-3.5 h-3.5" />
                        <span>{t('View Receipt', 'രസീത് കാണുക')}</span>
                      </button>

                      <Link
                        to={`/bookings/ticket?code=${encodeURIComponent(booking.booking_code)}`}
                        aria-label="Open full receipt page"
                        className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[#475569] inline-flex items-center justify-center transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      {booking.can_cancel && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleCancelBooking(booking)}
                          className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 text-[12.5px] font-semibold inline-flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t('Cancel', 'റദ്ദാക്കുക')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-Over Receipt Detail Drawer */}
      {selectedReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Booking Confirmation & Fee Receipt"
          className="fixed inset-0 z-[70] flex justify-end bg-slate-900/50 backdrop-blur-sm print:static print:bg-transparent print:backdrop-blur-none"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="relative w-full max-w-[660px] h-full overflow-y-auto bg-[#F7F9FC] p-4 sm:p-6 shadow-2xl print:max-w-none print:h-auto print:overflow-visible print:bg-white print:p-0 print:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="print:hidden flex items-center justify-between mb-4">
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                {t('Receipt Details', 'രസീത് വിവരങ്ങൾ')}
              </span>
              <button
                type="button"
                aria-label="Close receipt drawer"
                onClick={() => setSelectedReceipt(null)}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-[#475569] flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <BookingReceiptCard
              receipt={selectedReceipt}
              compact
              showNavLinks={false}
              onActionToast={showToast}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="print:hidden fixed bottom-6 right-6 z-[80] bookings-toast-enter">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-[#0F172A] text-white border border-white/10 shadow-[0_18px_40px_-10px_rgba(15,23,42,0.45)] max-w-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] font-medium leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
