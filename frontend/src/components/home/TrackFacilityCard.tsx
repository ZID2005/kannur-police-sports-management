import { Link } from 'react-router-dom';
import type { HomeActiveMembership, HomeTrackFacility } from '@/types/home';
import { ArrowUpRightIcon, FacilityIcon } from './FacilityIcon';

interface TrackFacilityCardProps {
  facility: HomeTrackFacility;
  activeMembership: HomeActiveMembership | null;
}

/**
 * Column 1 Synthetic Track card on the Public Home Bento Grid.
 * Merges:
 * - kannur_city_police_home_default (desktop default state)
 * - kannur_city_police_home_active_membership (active membership strip state)
 * - kannur_city_police_mobile_home_default (responsive 240px mobile card)
 */
export function TrackFacilityCard({ facility, activeMembership }: TrackFacilityCardProps) {
  const targetRoute = activeMembership ? activeMembership.to : facility.to;
  const backgroundUrl = activeMembership ? activeMembership.imageUrl : facility.imageUrl;

  return (
    <div className="home-facility-card col-span-2 md:col-span-1 md:col-start-1 md:row-start-1 md:row-span-2 relative rounded-[28px] md:rounded-[36px] overflow-hidden shadow-lg shadow-blue-900/5 border border-white/80 h-[240px] md:h-[560px] flex flex-col justify-between p-3.5 md:p-4 group">
      {/* Photo Background */}
      <img
        src={backgroundUrl}
        alt={facility.title}
        className="absolute inset-0 w-full h-full object-cover object-center z-0 transition duration-300 group-hover:scale-[1.04]"
      />
      {/* Subtle dark/light gradient overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 md:to-black/25 z-[1]" />

      {/* Top Badges */}
      <div className="relative z-10 flex items-center justify-between p-1 md:p-2">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full glass-circle flex items-center justify-center text-[#1F6FFF]">
          <FacilityIcon name={facility.iconName} className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <Link
          to={targetRoute}
          aria-label={`Open ${facility.title}`}
          className="w-9 h-9 md:w-10 md:h-10 rounded-full glass-circle flex items-center justify-center text-[#6B7280] group-hover:text-[#1F6FFF] transition-colors"
        >
          <ArrowUpRightIcon className="w-4 h-4 md:w-5 md:h-5" />
        </Link>
      </div>

      {/* Frosted Glass Bottom Strip */}
      {activeMembership ? (
        <div
          className="relative z-10 rounded-[22px] md:rounded-[28px] liquid-glass-strip p-3.5 md:p-5 flex items-center justify-between gap-3"
          style={{
            background: 'rgba(244, 248, 255, 0.78)',
            backdropFilter: 'blur(32px) saturate(140%)',
            WebkitBackdropFilter: 'blur(32px) saturate(140%)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
          }}
        >
          <div>
            <h3 className="text-[20px] md:text-[22px] font-semibold text-[#111418] leading-tight">
              {activeMembership.facilityName}
            </h3>
            <p className="text-[12px] md:text-[13px] text-[#6B7280] mt-0.5 md:mt-1">
              {activeMembership.membershipLabel}
            </p>
            <p className="text-[14px] md:text-[17px] font-semibold text-[#111418] mt-0.5">
              {activeMembership.validUntilText}
            </p>
          </div>
          <Link
            to={activeMembership.to}
            className="px-4 py-2 md:px-5 md:py-3 rounded-full bg-[#1F6FFF] hover:bg-blue-600 text-white font-medium text-[13px] md:text-[15px] whitespace-nowrap shadow-sm shadow-blue-500/25 transition"
          >
            {activeMembership.ctaLabel}
          </Link>
        </div>
      ) : (
        <div
          className="relative z-10 rounded-[22px] md:rounded-[28px] liquid-glass-strip p-3.5 md:p-6 flex flex-row md:flex-col items-center md:items-stretch justify-between gap-3 md:gap-0 md:min-h-[210px]"
          style={{
            background: 'rgba(244, 248, 255, 0.78)',
            backdropFilter: 'blur(32px) saturate(140%)',
            WebkitBackdropFilter: 'blur(32px) saturate(140%)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
          }}
        >
          <div>
            <h3 className="text-[20px] md:text-[22px] font-semibold text-[#111418] leading-tight">
              {facility.title}
            </h3>
            <p className="text-[14px] md:text-[15px] text-[#6B7280] mt-0.5 md:mt-1">
              {facility.subtitle}
            </p>
          </div>
          <Link
            to={facility.to}
            className="px-4 py-2 md:px-0 md:py-0 md:w-full md:h-12 rounded-full md:rounded-[22px] bg-[#1F6FFF] hover:bg-blue-600 text-white font-medium md:font-semibold text-[13px] md:text-[15px] whitespace-nowrap flex items-center justify-center shadow-sm shadow-blue-500/25 transition md:mt-4"
          >
            {facility.defaultCtaLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
