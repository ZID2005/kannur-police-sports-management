import { Link } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { SyntheticQrCode } from '@/components/bookings/SyntheticQrCode';
import type { BookingSelectionState, BookingTicketData } from '@/types/bookings';

interface EntryTicketCardProps {
  ticket: BookingTicketData;
  selectionOverride?: BookingSelectionState | null;
  onActionToast: (message: string) => void;
}

export function EntryTicketCard({
  ticket,
  selectionOverride,
  onActionToast,
}: EntryTicketCardProps) {
  const venueDisplay = selectionOverride
    ? `${selectionOverride.venueName} • ${selectionOverride.courtShortName}`
    : ticket.venueName;
  const venueShortBadge = selectionOverride ? selectionOverride.turfBadge : ticket.venueShortBadge;
  const dateDisplay = selectionOverride ? selectionOverride.dateLabel : ticket.dateLabel;
  const timeSlotDisplay = selectionOverride
    ? selectionOverride.timeSlotLabel
    : ticket.timeSlotLabel;
  const sessionNoteDisplay = selectionOverride ? selectionOverride.sessionNote : ticket.sessionNote;
  const amountDisplay = selectionOverride
    ? selectionOverride.totalAmountFormatted
    : ticket.amountPaid;
  const bookingReferenceDisplay =
    selectionOverride?.bookingReference ?? ticket.bookingReference;
  const qrTokenHashDisplay = selectionOverride?.qrTokenHash ?? ticket.qrTokenHash;
  const qrSeedDisplay = selectionOverride?.qrTokenHash ?? ticket.qrSeed;
  const attendeeNameDisplay = selectionOverride?.attendeeName ?? ticket.attendeeName;
  const attendeeRoleDisplay = selectionOverride?.attendeeRole ?? ticket.attendeeRole;
  const receiptRefDisplay = selectionOverride?.receiptNo
    ? `Receipt: ${selectionOverride.receiptNo}`
    : ticket.upiReference;
  const paymentStatusNoteDisplay =
    selectionOverride?.paymentStatusNote ?? ticket.paymentStatusNote;
  const gateNameDisplay = selectionOverride?.gateName ?? ticket.gateName;

  return (
    <div className="w-full max-w-[580px] relative">
      <div className="relative rounded-[32px] bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_24px_50px_rgba(0,83,205,0.08),0_4px_16px_rgba(25,28,32,0.04)] overflow-hidden">
        {/* Ticket Header Banner */}
        <div className="p-6 md:p-8 bg-gradient-to-br from-primary via-primary to-primary-container text-on-primary relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <MaterialIcon name="local_police" className="text-[24px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-meta text-label-meta uppercase tracking-wider text-white/80 font-semibold">
                  {ticket.organizationName}
                </span>
                <span className="font-headline-card text-headline-card font-bold leading-tight">
                  {ticket.passTitle}
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md font-label-meta text-label-meta font-semibold uppercase tracking-wider text-white text-right">
              {ticket.passTypeBadge}
            </span>
          </div>

          {/* Booking Reference ID Strip */}
          <div className="flex items-center justify-between pt-2 border-t border-white/15 relative z-10">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-white/75 uppercase tracking-wider">
                Booking Reference
              </span>
              <span className="font-headline-card text-headline-card font-mono tracking-wider text-white font-bold">
                {bookingReferenceDisplay}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 text-white font-label-meta text-label-meta">
              <MaterialIcon name="verified" className="text-[16px]" />
              <span>{ticket.approvalBadge}</span>
            </div>
          </div>
        </div>

        {/* Ticket Upper Body Details */}
        <div className="p-6 md:p-8 space-y-6 bg-surface-container-lowest/80">
          {/* Venue & Sport Strip */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-surface-container-low">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm">
                <MaterialIcon name={ticket.venueIcon} className="text-[28px]" />
              </div>
              <div>
                <span className="font-caption text-caption text-secondary uppercase font-semibold tracking-wider">
                  Reserved Venue
                </span>
                <div className="font-headline-card text-headline-card text-on-surface font-bold">
                  {venueDisplay}
                </div>
                <span className="font-label-meta text-label-meta text-on-surface-variant">
                  {ticket.venueSubtitle}
                </span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-meta text-label-meta font-medium">
                {venueShortBadge}
              </span>
            </div>
          </div>

          {/* 2x2 Grid for Session, Gate, Attendee, Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date & Time Slot */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-secondary mb-1">
                <MaterialIcon name="calendar_today" className="text-[18px]" />
                <span className="font-caption text-caption uppercase font-semibold tracking-wider">
                  Date &amp; Time Slot
                </span>
              </div>
              <div>
                <div className="font-label-primary text-label-primary text-on-surface font-bold">
                  {dateDisplay}
                </div>
                <div className="font-body-medium text-body-medium text-primary font-bold">
                  {timeSlotDisplay}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-on-surface-variant font-label-meta text-label-meta">
                <MaterialIcon name="lightbulb" className="text-[15px] text-amber-500" />
                <span>{sessionNoteDisplay}</span>
              </div>
            </div>

            {/* Gate Access Location */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-secondary mb-1">
                <MaterialIcon name="meeting_room" className="text-[18px]" />
                <span className="font-caption text-caption uppercase font-semibold tracking-wider">
                  Gate Access Point
                </span>
              </div>
              <div>
                <div className="font-label-primary text-label-primary text-on-surface font-bold">
                  {gateNameDisplay}
                </div>
                <div className="font-label-meta text-label-meta text-on-surface-variant">
                  {ticket.gateLaneInfo}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-on-surface-variant font-label-meta text-label-meta">
                <MaterialIcon name="navigation" className="text-[15px] text-primary" />
                <span>{ticket.gateQuadrant}</span>
              </div>
            </div>

            {/* Booked For / Identity */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-secondary mb-1">
                <MaterialIcon name="badge" className="text-[18px]" />
                <span className="font-caption text-caption uppercase font-semibold tracking-wider">
                  Booked For
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    alt={ticket.attendeeAvatarAlt}
                    className="w-11 h-11 rounded-full object-cover shadow-sm"
                    src={ticket.attendeeAvatarUrl}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary text-on-primary rounded-full flex items-center justify-center text-[10px]">
                    <MaterialIcon name="check" className="text-[11px]" filled />
                  </div>
                </div>
                <div>
                  <div className="font-label-primary text-label-primary text-on-surface font-bold">
                    {attendeeNameDisplay}
                  </div>
                  <div className="font-caption text-caption text-on-surface-variant">
                    {attendeeRoleDisplay}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Clearance */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-secondary mb-1">
                <MaterialIcon name="payments" className="text-[18px]" />
                <span className="font-caption text-caption uppercase font-semibold tracking-wider">
                  Payment Status
                </span>
              </div>
              <div>
                <div className="font-body-medium text-body-medium text-on-surface font-bold">
                  {amountDisplay}
                </div>
                <div className="font-caption text-caption text-primary font-medium">
                  {paymentStatusNoteDisplay}
                </div>
              </div>
              <div
                className="mt-2 font-mono text-[11px] text-on-surface-variant truncate"
                title={receiptRefDisplay}
              >
                {receiptRefDisplay}
              </div>
            </div>
          </div>
        </div>

        {/* Perforated Ticket Cut-out Divider */}
        <div className="relative w-full h-8 bg-surface-container-lowest flex items-center justify-between">
          <div className="w-6 h-8 bg-background rounded-r-full -ml-3 shadow-inner" />
          <div className="flex-1 mx-3 border-b-2 border-dashed border-outline-variant/60" />
          <div className="w-6 h-8 bg-background rounded-l-full -mr-3 shadow-inner" />
        </div>

        {/* Optical QR Scan Section */}
        <div className="p-6 md:p-8 bg-surface-container-low flex flex-col items-center text-center">
          <span className="font-caption text-caption text-secondary uppercase font-semibold tracking-wider mb-2">
            {ticket.qrSectionLabel}
          </span>

          <SyntheticQrCode seed={qrSeedDisplay} variant="ticket" />

          {/* Single-Stage Notice */}
          <div className="mt-3 px-4 py-2 rounded-xl bg-primary-fixed/50 text-on-primary-fixed max-w-sm flex items-center gap-2">
            <MaterialIcon name="speed" className="text-[18px] text-primary shrink-0" />
            <span className="font-label-meta text-label-meta font-medium leading-snug text-left">
              {ticket.qrNotice}
            </span>
          </div>
          <div className="mt-3 font-mono text-[11px] text-on-surface-variant/80 tracking-tight break-all max-w-full px-2">
            {qrTokenHashDisplay}
          </div>
        </div>
      </div>

      {/* Ticket Card Floating Actions */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        <button
          type="button"
          onClick={() =>
            onActionToast(`Downloading PDF Ticket (${bookingReferenceDisplay})...`)
          }
          className="w-full sm:w-auto flex-1 h-12 py-3 px-6 rounded-2xl bg-primary text-on-primary font-body-medium text-body-medium font-semibold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(0,83,205,0.25)] hover:bg-primary-container active:scale-[0.99] transition-all leading-normal whitespace-nowrap"
        >
          <MaterialIcon name="download" className="text-[20px]" />
          <span>Download PDF Ticket</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onActionToast('Pass added to Apple Wallet for Turnstile Gate 1.')
          }
          className="w-full sm:w-auto h-12 py-3 px-6 rounded-2xl bg-inverse-surface text-inverse-on-surface font-body-medium text-body-medium font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all leading-normal whitespace-nowrap"
        >
          <MaterialIcon name="wallet" className="text-[20px]" />
          <span>Add to Apple Wallet</span>
        </button>

        <Link
          to="/bookings"
          className="w-full sm:w-auto h-12 py-3 px-5 rounded-2xl bg-surface-container-high text-on-surface font-body-medium text-body-medium font-medium flex items-center justify-center gap-2 hover:bg-surface-variant transition-all leading-normal whitespace-nowrap"
        >
          <MaterialIcon name="calendar_month" className="text-[20px]" />
          <span>My Bookings</span>
        </Link>
      </div>
    </div>
  );
}
