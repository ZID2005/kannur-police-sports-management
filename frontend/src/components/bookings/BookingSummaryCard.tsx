import { MaterialIcon } from '@/components/ui/MaterialIcon';
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
  slot: BookingTimeSlot;
  registrant: BookingRegistrant;
  draftSaved: boolean;
  onProceedToPayment: () => void;
  onSaveDraft: () => void;
}

export function BookingSummaryCard({
  meta,
  venue,
  court,
  date,
  slot,
  registrant,
  draftSaved,
  onProceedToPayment,
  onSaveDraft,
}: BookingSummaryCardProps) {
  const baseFee = court.hourlyRate;
  const gstAmount = Math.round(baseFee * meta.gstRate);
  const totalAmount = baseFee + gstAmount;

  const formatInr = (val: number) =>
    `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="lg:col-span-4 w-full sticky top-24 flex flex-col gap-space-md">
      <div className="w-full rounded-3xl bg-white/75 backdrop-blur-3xl p-space-lg shadow-[0_24px_48px_rgba(31,111,255,0.12)] flex flex-col gap-space-md">
        {/* Card Title & Security Badge */}
        <div className="flex items-center justify-between pb-space-xs">
          <div className="flex items-center gap-space-xs">
            <h2 className="font-headline-card text-headline-card text-on-surface font-bold">
              Booking Summary
            </h2>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            <MaterialIcon name="verified" className="text-[16px]" filled />
            <span className="font-caption text-caption font-semibold uppercase tracking-wider">
              Verified Slot
            </span>
          </div>
        </div>

        {/* Primary Reservation Breakdown Container */}
        <div className="bg-surface-container-low/50 rounded-2xl p-space-md flex flex-col gap-space-sm">
          <div className="flex flex-col">
            <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
              Facility
            </span>
            <span className="font-body-medium text-body-medium font-semibold text-on-surface">
              {venue.name} ({court.shortName})
            </span>
          </div>
          <div className="flex flex-col pt-1">
            <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
              Date &amp; Selected Time
            </span>
            <span className="font-body-medium text-body-medium font-medium text-primary">
              {date.fullDateLabel} • {slot.summaryTimeLabel}
            </span>
          </div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-caption text-caption">
            <MaterialIcon name="timelapse" className="text-[16px] text-secondary" />
            <span>{slot.durationLabel}</span>
          </div>

          {/* Citizen Profile Tagging (Phone number removed per privacy policy) */}
          <div className="pt-space-xs flex flex-col gap-1">
            <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
              Authorized Registrant
            </span>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-primary text-label-primary font-medium text-on-surface">
                {registrant.name}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[11px] font-mono text-on-surface-variant">
                {registrant.registrantId}
              </span>
            </div>
            <span className="font-caption text-caption text-outline">
              {registrant.email} • {registrant.accountBadge}
            </span>
          </div>
        </div>

        {/* Detailed Price Breakdown */}
        <div className="flex flex-col gap-2.5 py-space-xs">
          <div className="flex items-center justify-between font-label-primary text-label-primary text-on-surface-variant">
            <span>Base Hourly Pitch Fee</span>
            <span className="text-on-surface font-medium">{formatInr(baseFee)}</span>
          </div>
          <div className="flex items-center justify-between font-label-primary text-label-primary text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span>Floodlight Operational Charge</span>
              <span title="Included complimentary after 06:30 PM" className="inline-flex">
                <MaterialIcon name="info" className="text-[14px] text-primary" />
              </span>
            </span>
            <span className="text-emerald-700 font-medium">{meta.floodlightChargeLabel}</span>
          </div>
          <div className="flex items-center justify-between font-label-primary text-label-primary text-on-surface-variant">
            <span>CGST (9%) + SGST (9%)</span>
            <span className="text-on-surface font-medium">{formatInr(gstAmount)}</span>
          </div>

          {/* Grand Total Plate */}
          <div className="mt-space-xs pt-space-sm bg-surface-container-high/40 rounded-2xl px-space-md py-space-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-on-surface-variant font-medium">
                Total Amount Payable
              </span>
              <span className="font-caption text-[11px] text-outline">
                Incl. of all official Kerala GST
              </span>
            </div>
            <span className="font-title-portal-mobile text-title-portal-mobile font-bold text-primary tracking-tight">
              {formatInr(totalAmount)}
            </span>
          </div>
        </div>

        {/* Cancellation & Gate Notice Glass Strip */}
        <div className="p-space-sm rounded-2xl bg-primary/5 flex items-start gap-space-xs">
          <MaterialIcon name="qr_code_2" className="text-primary text-[20px] shrink-0 mt-0.5" />
          <p className="font-caption text-caption text-on-surface-variant leading-snug">
            {meta.cancellationNotice}
          </p>
        </div>

        {/* Call-to-Action Triggers */}
        <div className="flex flex-col gap-space-xs pt-space-xs">
          <button
            type="button"
            onClick={onProceedToPayment}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary-container text-white font-label-primary text-label-primary font-semibold shadow-[0_8px_24px_rgba(0,83,205,0.32)] flex items-center justify-center gap-space-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.985]"
          >
            <MaterialIcon name="lock" className="text-[20px]" />
            <span>Proceed to Secure Payment ({formatInr(totalAmount)})</span>
            <MaterialIcon name="arrow_forward" className="text-[20px]" />
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            className="w-full h-12 rounded-2xl bg-white/70 hover:bg-white text-on-surface font-label-primary text-label-primary font-medium shadow-xs transition-all flex items-center justify-center gap-space-xs active:scale-[0.99]"
          >
            <MaterialIcon
              name={draftSaved ? 'bookmark_added' : 'bookmark'}
              className="text-[18px] text-secondary"
              filled={draftSaved}
            />
            <span>
              {draftSaved ? 'Slot Saved as Draft (15m Hold Active)' : 'Save Slot as Draft (15m hold)'}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Facility Support Mini Card (Phone number removed per policy) */}
      <div className="w-full rounded-2xl bg-white/50 backdrop-blur-xl p-space-md shadow-xs flex items-center justify-between text-on-surface-variant">
        <div className="flex items-center gap-space-xs">
          <MaterialIcon name="support_agent" className="text-primary text-[20px]" />
          <div className="flex flex-col">
            <span className="font-label-meta text-label-meta font-semibold text-on-surface">
              {meta.supportDeskTitle}
            </span>
            <span className="font-caption text-caption text-outline">
              {meta.supportDeskSubtitle}
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-caption font-medium">
          {meta.supportGateBadge}
        </span>
      </div>
    </div>
  );
}
