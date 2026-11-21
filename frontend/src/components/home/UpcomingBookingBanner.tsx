import { Link } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import type { HomeUpcomingBooking } from '@/types/home';

interface UpcomingBookingBannerProps {
  booking: HomeUpcomingBooking;
}

/**
 * Upcoming booking confirmation banner rendered above the Bento Grid for signed-in members.
 */
export function UpcomingBookingBanner({ booking }: UpcomingBookingBannerProps) {
  return (
    <div
      style={{ animationDelay: '110ms' }}
      className="animate-fade-rise w-full min-h-[78px] md:min-h-[86px] rounded-[24px] md:rounded-[28px] liquid-glass border border-white/90 px-5 md:px-6 py-3.5 md:py-4 mb-4 md:mb-7 flex items-center justify-between gap-4 shadow-[0_14px_34px_-14px_rgba(31,111,255,0.14)]"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-[#1F6FFF]/10 text-[#1F6FFF] items-center justify-center shrink-0">
          <ReceiptText className="w-5 h-5" />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0053CD] leading-tight">
            {booking.label}
          </span>
          <span className="font-display text-[16px] md:text-[17.5px] font-bold text-[#111418] leading-tight mt-0.5 truncate">
            {booking.facilityName}
          </span>
          <span className="text-[13px] md:text-[14px] text-[#4B5563] leading-tight mt-0.5 truncate">
            {booking.dateTimeText}
          </span>
        </div>
      </div>
      <Link
        to={booking.to}
        className="h-10 px-5 rounded-full bg-[#1F6FFF] hover:bg-[#155EE6] text-white font-semibold text-[13.5px] flex items-center justify-center transition shadow-[0_6px_18px_rgba(31,111,255,0.28)] whitespace-nowrap shrink-0"
      >
        {booking.ctaLabel}
      </Link>
    </div>
  );
}
