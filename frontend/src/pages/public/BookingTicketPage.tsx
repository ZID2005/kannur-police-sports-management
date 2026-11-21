import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, ReceiptText } from 'lucide-react';
import {
  bookingsApi,
  paymentsApi,
  type ApiPaymentRecord,
  type ApiSlotBooking,
  type BackendCourtPartition,
} from '@/api/client';
import { BookingReceiptCard } from '@/components/bookings/BookingReceiptCard';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LATEST_BOOKING_RECEIPT_KEY } from '@/pages/public/BookingsPage';
import type { BookingReceiptData } from '@/types/bookings';
import '@/styles/bookings.css';

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

function formatDateLabel(dateStr: string): string {
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

function formatCourtMode(partition: BackendCourtPartition, facilityCode?: string): string {
  if (partition === 'HALF_A') return 'Half Court A (5s)';
  if (partition === 'HALF_B') return 'Half Court B (5s)';
  return facilityCode === 'POLICE_TURF' ? 'Full Court (7s)' : 'Full Court';
}

function buildReceiptFromBooking(
  booking: ApiSlotBooking,
  payment: ApiPaymentRecord | undefined,
  memberName: string,
  memberUsername: string | undefined,
  userRole: string | undefined,
): BookingReceiptData {
  const userCategory: 'PUBLIC' | 'GOVT_PERSONNEL' =
    booking.user_category ??
    (userRole === 'GOVT_PERSONNEL' ? 'GOVT_PERSONNEL' : 'PUBLIC');

  const totalNum = Number(payment?.total_amount ?? booking.total_amount ?? 0);
  const fallbackTaxable = Number(
    payment?.base_amount ?? (totalNum > 0 ? totalNum / 1.18 : 0),
  );
  const fallbackGst = Number(payment?.gst_amount ?? Math.max(0, totalNum - fallbackTaxable));

  const pricingBreakdown =
    booking.pricing_breakdown ??
    payment?.pricing_breakdown ?? {
      base_fee: fallbackTaxable.toFixed(2),
      concession_discount: '0.00',
      concession_percent: 0,
      taxable_subtotal: fallbackTaxable.toFixed(2),
      gst_rate: 18,
      gst_amount: fallbackGst.toFixed(2),
      final_total_paid: totalNum.toFixed(2),
    };

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
    memberName,
    memberUsername,
    userCategory,
    paymentMode: booking.receipt?.payment_mode ?? payment?.payment_mode ?? null,
    paidAt: booking.receipt?.paid_at ?? payment?.created_at ?? booking.created_at,
    pricingBreakdown,
  };
}

export default function BookingTicketPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();

  const stateReceipt = (location.state as BookingReceiptData | null) ?? null;
  const codeParam = searchParams.get('code');

  const [receipt, setReceipt] = useState<BookingReceiptData | null>(() => {
    if (stateReceipt && (!codeParam || stateReceipt.bookingReference === codeParam)) {
      return stateReceipt;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(!receipt);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (stateReceipt && (!codeParam || stateReceipt.bookingReference === codeParam)) {
      setReceipt(stateReceipt);
      setLoading(false);
      return;
    }

    try {
      const storedRaw = window.sessionStorage.getItem(LATEST_BOOKING_RECEIPT_KEY);
      if (storedRaw) {
        const parsed = JSON.parse(storedRaw) as BookingReceiptData;
        if (parsed?.bookingReference && (!codeParam || parsed.bookingReference === codeParam)) {
          setReceipt(parsed);
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
    setLoading(true);

    Promise.all([
      bookingsApi.getMy().catch(() => ({ bookings: [] as ApiSlotBooking[] })),
      paymentsApi.getMy().catch(() => ({ payments: [] as ApiPaymentRecord[] })),
    ])
      .then(([bookRes, payRes]) => {
        if (!active) return;
        const target = codeParam
          ? bookRes.bookings.find((b) => b.booking_code === codeParam)
          : bookRes.bookings.find((b) => b.status === 'CONFIRMED') ?? bookRes.bookings[0];

        if (!target) {
          setLoading(false);
          return;
        }

        const matchingPayment = payRes.payments.find(
          (p) => p.reference_type === 'SLOT_BOOKING' && p.reference_id === target.id,
        );

        setReceipt(
          buildReceiptFromBooking(
            target,
            matchingPayment,
            user.full_name,
            user.username,
            user.role,
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [stateReceipt, codeParam, user]);

  const handleActionToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  return (
    <div className="bookings-page-container flex flex-col w-full text-[#0F172A] antialiased">
      <div className="w-full max-w-[920px] mx-auto px-4 md:px-6 pt-5 md:pt-8 pb-16 flex flex-col gap-6">
        {/* Top Back Navigation (hidden when printing) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/my-bookings"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>{t('Back to My Bookings', 'എന്റെ ബുക്കിംഗുകളിലേക്ക് മടങ്ങുക')}</span>
          </Link>

          <Link
            to="/bookings"
            className="text-[13px] font-semibold text-[#165DF5] hover:text-[#0F50DC] transition-colors"
          >
            {t('Book Another Slot →', 'മറ്റൊരു സ്ലോട്ട് ബുക്ക് ചെയ്യുക →')}
          </Link>
        </div>

        {/* Confirmation Header Banner (hidden when printing so receipt sheet prints cleanly) */}
        {receipt && (
          <div className="print:hidden text-center flex flex-col items-center max-w-xl mx-auto">
            <span className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.2} />
            </span>
            <h1 className="font-display text-[26px] sm:text-[32px] font-extrabold text-[#0F172A] tracking-[-0.03em] leading-tight">
              {receipt.status === 'CONFIRMED'
                ? t('Booking Confirmed', 'ബുക്കിംഗ് സ്ഥിരീകരിച്ചു')
                : t('Booking Summary & Receipt', 'ബുക്കിംഗ് വിവരങ്ങളും രസീതും')}
            </h1>
            <p className="text-[14px] text-[#475569] mt-1.5">
              {t(
                'Your slot reservation and official fee receipt are ready below. You can print this page anytime.',
                'നിങ്ങളുടെ സ്ലോട്ട് ബുക്കിംഗും ഔദ്യോഗിക ഫീസ് രസീതും താഴെ തയ്യാറാണ്. എപ്പോൾ വേണമെങ്കിലും പ്രിന്റ് ചെയ്യാം.',
              )}
            </p>
          </div>
        )}

        {/* Receipt Content or Loading/Empty State */}
        {loading ? (
          <div className="rounded-[24px] bg-white/85 border border-slate-200/85 p-12 flex flex-col items-center justify-center gap-3 text-[#64748B]">
            <Loader2 className="w-6 h-6 animate-spin text-[#165DF5]" />
            <span className="text-[14px] font-medium">
              {t('Loading booking receipt...', 'ബുക്കിംഗ് രസീത് ലോഡ് ചെയ്യുന്നു...')}
            </span>
          </div>
        ) : receipt ? (
          <BookingReceiptCard
            receipt={receipt}
            showNavLinks
            onActionToast={handleActionToast}
          />
        ) : (
          <div className="rounded-[26px] bg-white/90 backdrop-blur-2xl border border-slate-200/85 p-8 sm:p-10 text-center max-w-lg mx-auto flex flex-col items-center gap-4 shadow-[0_18px_42px_-18px_rgba(15,23,42,0.1)]">
            <span className="w-12 h-12 rounded-2xl bg-[#165DF5]/10 text-[#165DF5] flex items-center justify-center">
              <ReceiptText className="w-6 h-6" />
            </span>
            <div>
              <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
                {t('No Booking Receipt Found', 'ബുക്കിംഗ് രസീത് കണ്ടെത്തിയില്ല')}
              </h2>
              <p className="text-[13.5px] text-[#64748B] mt-1">
                {user
                  ? t(
                      'Select a confirmed reservation from My Bookings or book a new facility slot to view its receipt.',
                      'രസീത് കാണാൻ എന്റെ ബുക്കിംഗുകളിൽ നിന്ന് തിരഞ്ഞെടുക്കുക അല്ലെങ്കിൽ പുതിയ സ്ലോട്ട് ബുക്ക് ചെയ്യുക.',
                    )
                  : t(
                      'Sign in to your account to view your booking confirmations and GST fee receipts.',
                      'നിങ്ങളുടെ ബുക്കിംഗ് രസീതുകൾ കാണാൻ അക്കൗണ്ടിൽ സൈൻ ഇൻ ചെയ്യുക.',
                    )}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
              {user ? (
                <>
                  <Link
                    to="/my-bookings"
                    className="btn-primary !h-11 px-5 text-[13.5px] inline-flex items-center"
                  >
                    {t('Go to My Bookings', 'എന്റെ ബുക്കിംഗുകൾ')}
                  </Link>
                  <Link
                    to="/bookings"
                    className="btn-glass !h-11 px-5 text-[13.5px] inline-flex items-center"
                  >
                    {t('Book a Slot', 'സ്ലോട്ട് ബുക്ക് ചെയ്യുക')}
                  </Link>
                </>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary !h-11 px-6 text-[13.5px] inline-flex items-center"
                >
                  {t('Sign in', 'സൈൻ ഇൻ')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="print:hidden fixed bottom-6 right-6 z-50 bookings-toast-enter">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-[#0F172A] text-white border border-white/10 shadow-[0_18px_40px_-10px_rgba(15,23,42,0.45)]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
