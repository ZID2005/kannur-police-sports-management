import { Link } from 'react-router-dom';
import type { HomeUpcomingBooking } from '@/types/home';

interface UpcomingBookingBannerProps {
  booking: HomeUpcomingBooking;
}

/**
 * Upcoming booking QR banner rendered above the Bento Grid
 * (from `kannur_city_police_home_upcoming_booking`).
 */
export function UpcomingBookingBanner({ booking }: UpcomingBookingBannerProps) {
  return (
    <div className="w-full min-h-[76px] md:h-[88px] rounded-[24px] md:rounded-[28px] liquid-glass border border-white/80 px-5 md:px-6 py-3 md:py-0 mb-2 md:mb-8 flex items-center justify-between shadow-lg shadow-blue-900/5">
      <div className="flex flex-col justify-center">
        <span className="text-[12px] md:text-[13px] text-[#6B7280] font-normal leading-tight">
          {booking.label}
        </span>
        <span className="text-[16px] md:text-[17px] font-semibold text-[#111418] leading-tight mt-0.5">
          {booking.facilityName}
        </span>
        <span className="text-[13px] md:text-[15px] text-[#6B7280] leading-tight mt-0.5">
          {booking.dateTimeText}
        </span>
      </div>
      <Link
        to={booking.to}
        className="h-10 px-5 rounded-full bg-[#1F6FFF] hover:bg-blue-600 text-white font-semibold text-[14px] flex items-center justify-center transition shadow-sm shadow-blue-500/25 whitespace-nowrap"
      >
        {booking.ctaLabel}
      </Link>
    </div>
  );
}
