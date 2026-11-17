import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  bookingsApi,
  paymentsApi,
  type ApiPaymentRecord,
  type ApiSettlePaymentResponse,
  type ApiSlotBooking,
} from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { EntryTicketCard } from '@/components/bookings/EntryTicketCard';
import { TicketGuidelinesCard } from '@/components/bookings/TicketGuidelinesCard';
import { useAuth } from '@/context/AuthContext';
import { bookingTicketDefault } from '@/data/mockData';
import { LATEST_BOOKING_TICKET_KEY } from '@/pages/public/BookingsPage';
import type { BookingSelectionState } from '@/types/bookings';
import '@/styles/bookings.css';

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

export default function BookingTicketPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const stateOverride = (location.state as BookingSelectionState | null) ?? null;
  const codeParam = searchParams.get('code');

  const [resolvedOverride, setResolvedOverride] = useState<BookingSelectionState | null>(
    stateOverride
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (stateOverride) {
      setResolvedOverride(stateOverride);
      return;
    }

    if (!codeParam) {
      try {
        const storedRaw = window.sessionStorage.getItem(LATEST_BOOKING_TICKET_KEY);
        if (storedRaw) {
          const settled = JSON.parse(storedRaw) as ApiSettlePaymentResponse;
          if (settled.slot_booking) {
            const b = settled.slot_booking;
            setResolvedOverride({
              venueName: b.facility?.name ?? settled.qr_pass.facility_code,
              courtShortName: b.court_partition,
              turfBadge: b.court_partition,
              dateLabel: b.booking_date_formatted,
              timeSlotLabel: `${formatTime12h(b.start_time_formatted)} – ${formatTime12h(
                b.end_time_formatted
              )}`,
              sessionNote: 'Confirmed Slot',
              totalAmountFormatted: `₹${Number(settled.payment.total_amount).toLocaleString(
                'en-IN',
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}`,
              bookingReference: b.booking_code,
              receiptNo: settled.payment.receipt_no,
              qrTokenHash: settled.qr_pass.qr_token_hash,
              attendeeName: user?.full_name ?? bookingTicketDefault.attendeeName,
              attendeeRole: user?.role ?? bookingTicketDefault.attendeeRole,
              paymentStatusNote: `Settled (${settled.payment.payment_mode})`,
            });
            return;
          }
        }
      } catch {
        // Ignore storage read failure
      }
    }

    if (!user) return;
    let active = true;

    Promise.all([
      bookingsApi.getMy().catch(() => ({ bookings: [] as ApiSlotBooking[] })),
      paymentsApi.getMy().catch(() => ({ payments: [] as ApiPaymentRecord[] })),
    ]).then(([bookRes, payRes]) => {
      if (!active) return;
      const targetBooking = codeParam
        ? bookRes.bookings.find((b) => b.booking_code === codeParam)
        : bookRes.bookings.find((b) => b.status === 'CONFIRMED') ?? bookRes.bookings[0];

      if (!targetBooking) return;

      const matchingPayment = payRes.payments.find(
        (p) => p.reference_type === 'SLOT_BOOKING' && p.reference_id === targetBooking.id
      );

      setResolvedOverride({
        venueName: targetBooking.facility?.name ?? 'Kannur City Police Sports Facility',
        courtShortName: targetBooking.court_partition,
        turfBadge: targetBooking.court_partition,
        dateLabel: targetBooking.booking_date_formatted,
        timeSlotLabel: `${formatTime12h(
          targetBooking.start_time_formatted
        )} – ${formatTime12h(targetBooking.end_time_formatted)}`,
        sessionNote: targetBooking.status,
        totalAmountFormatted: `₹${Number(targetBooking.total_amount).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        bookingReference: targetBooking.booking_code,
        receiptNo: matchingPayment?.receipt_no,
        qrTokenHash: targetBooking.qr_token_hash ?? undefined,
        attendeeName: user.full_name,
        attendeeRole:
          user.role === 'GOVT_PERSONNEL' ? 'Government Personnel' : 'Citizen Account',
        paymentStatusNote: matchingPayment
          ? `Settled (${matchingPayment.payment_mode})`
          : targetBooking.status,
      });
    });

    return () => {
      active = false;
    };
  }, [stateOverride, codeParam, user]);

  const handleActionToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="bookings-page-container flex flex-col w-full bg-background font-body-default text-on-surface antialiased">
      {/* Subtle Ambient Glow Orbs */}
      <div className="relative w-full overflow-hidden px-gutter md:px-margin-desktop py-space-xl">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-96 -right-32 w-[380px] h-[380px] bg-secondary-container/40 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto flex flex-col items-center">
          {/* Top Departmental Breadcrumb / Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container/80 backdrop-blur-md mb-space-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label-meta text-label-meta text-primary font-semibold tracking-wide uppercase">
              {bookingTicketDefault.departmentBadge}
            </span>
            <span className="text-outline-variant font-light text-caption">/</span>
            <span className="font-label-meta text-label-meta text-on-surface-variant font-medium">
              {bookingTicketDefault.clearanceStage}
            </span>
          </div>

          {/* Main Headline Group */}
          <div className="text-center max-w-2xl flex flex-col items-center mb-space-xl">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-sm">
              <MaterialIcon name="check_circle" className="text-[24px]" filled />
            </div>
            <h1 className="font-title-portal text-title-portal-mobile md:text-title-portal text-on-surface tracking-tight text-center leading-tight">
              {bookingTicketDefault.headline}
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-meta text-label-meta font-medium mt-3 mb-1 shadow-sm">
              <MaterialIcon name="sensors" className="text-[16px] text-primary" />
              <span>{bookingTicketDefault.syncStatusBadge}</span>
            </div>
            <p className="font-body-default text-body-default text-on-surface-variant mt-2 max-w-xl text-center">
              {bookingTicketDefault.subheadline}
            </p>
          </div>

          {/* Apple Wallet Style Vertical Entry Pass Card */}
          <EntryTicketCard
            ticket={bookingTicketDefault}
            selectionOverride={resolvedOverride}
            onActionToast={handleActionToast}
          />

          {/* Facility Guidelines & Intercom Assistance Box */}
          <TicketGuidelinesCard ticket={bookingTicketDefault} />
        </div>
      </div>

      {/* Interactive Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bookings-toast-enter">
          <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-xl">
            <MaterialIcon
              name="check_circle"
              className="text-emerald-400 text-[20px]"
              filled
            />
            <span className="font-label-primary text-label-primary">
              {toastMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
