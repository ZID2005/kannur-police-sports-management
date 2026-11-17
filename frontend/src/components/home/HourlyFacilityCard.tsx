import { Link } from 'react-router-dom';
import type { HomeHourlyFacility } from '@/types/home';
import { ArrowUpRightIcon, FacilityIcon } from './FacilityIcon';

interface HourlyFacilityCardProps {
  facility: HomeHourlyFacility;
  gridPositionClass: string;
}

/**
 * Hourly facility card (Football Ground, Police Turf, Badminton Court).
 * Merges desktop bento card, hover state (kannur_city_police_home_hover),
 * and mobile compact card (kannur_city_police_mobile_home_default).
 */
export function HourlyFacilityCard({ facility, gridPositionClass }: HourlyFacilityCardProps) {
  return (
    <Link
      to={facility.to}
      className={`home-facility-card relative rounded-[24px] md:rounded-[36px] overflow-hidden shadow-lg shadow-blue-900/5 border border-white/80 flex flex-col justify-between p-3 md:p-4 group ${gridPositionClass}`}
    >
      <img
        src={facility.imageUrl}
        alt={facility.title}
        className="absolute inset-0 w-full h-full object-cover object-center z-0 transition duration-300 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 md:to-black/25 z-[1]" />

      {/* Top Badges */}
      <div className="relative z-10 flex items-center justify-between md:p-1">
        <div className="w-9 h-9 md:w-12 md:h-12 rounded-full glass-circle flex items-center justify-center text-[#1F6FFF]">
          <FacilityIcon name={facility.iconName} className="w-[18px] h-[18px] md:w-6 md:h-6" />
        </div>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full glass-circle flex items-center justify-center text-[#6B7280] group-hover:text-[#1F6FFF] transition-colors">
          <ArrowUpRightIcon className="w-3.5 h-3.5 md:w-5 md:h-5" />
        </div>
      </div>

      {/* Bottom Strip with Busy-Time Bars */}
      <div
        className="relative z-10 rounded-[18px] md:rounded-[28px] liquid-glass-strip p-2.5 md:p-4 flex items-center justify-between"
        style={{
          background: 'rgba(244, 248, 255, 0.78)',
          backdropFilter: 'blur(32px) saturate(140%)',
          WebkitBackdropFilter: 'blur(32px) saturate(140%)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
        }}
      >
        <div>
          <h3 className="text-[16px] md:text-[20px] font-semibold text-[#111418] leading-tight">
            {facility.title}
          </h3>
          <p className="text-[12px] md:text-[14px] text-[#6B7280] mt-0.5">{facility.subtitle}</p>
        </div>

        {/* Desktop Busy-Time Bars (8-10 bars) */}
        <div className="hidden md:flex items-end gap-1 h-7" aria-hidden="true">
          {facility.desktopBusyBars.map((bar, index) => (
            <span
              key={index}
              className={`w-1.5 rounded-full ${bar.heightClass} ${bar.colorClass}`}
            />
          ))}
        </div>

        {/* Mobile Busy-Time Bars (5 compact bars) */}
        <div className="flex md:hidden items-end gap-0.5 h-5" aria-hidden="true">
          {facility.mobileBusyBars.map((bar, index) => (
            <span
              key={index}
              className={`w-1 rounded-full ${bar.heightClass} ${bar.colorClass}`}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
