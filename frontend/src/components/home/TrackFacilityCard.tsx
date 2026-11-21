import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import type { HomeActiveMembership, HomeTrackFacility } from '@/types/home';
import { ArrowUpRightIcon, FacilityIcon } from './FacilityIcon';

interface TrackFacilityCardProps {
  facility: HomeTrackFacility;
  activeMembership: HomeActiveMembership | null;
  animationDelayMs?: number;
}

/**
 * Column 1 Synthetic Track card on the Public Home Bento Grid.
 * Displays venue photography, monthly pass badge, live operational status,
 * tariff info, and active membership strip when applicable.
 */
export function TrackFacilityCard({
  facility,
  activeMembership,
  animationDelayMs = 140,
}: TrackFacilityCardProps) {
  const [imgError, setImgError] = useState(false);
  const { t } = useLanguage();
  const targetRoute = activeMembership ? activeMembership.to : facility.to;
  const backgroundUrl = activeMembership ? activeMembership.imageUrl : facility.imageUrl;
  const isMaintenance = facility.operationalStatus === 'MAINTENANCE';
  const isClosed = facility.operationalStatus === 'CLOSED';

  return (
    <div
      style={{ animationDelay: `${animationDelayMs}ms` }}
      className="home-facility-card animate-fade-rise col-span-2 md:col-span-1 md:col-start-1 md:row-start-1 md:row-span-2 relative rounded-[28px] md:rounded-[32px] overflow-hidden shadow-[0_18px_42px_-16px_rgba(15,23,42,0.16)] border border-white/85 h-[310px] md:h-[560px] flex flex-col justify-between p-3.5 md:p-4 group bg-gradient-to-br from-[#C85A3A] via-[#9D3B26] to-[#1E3A5F]"
    >
      {/* Photo Background */}
      {!imgError && (
        <img
          src={backgroundUrl}
          alt={facility.title}
          onError={() => setImgError(true)}
          className={`absolute inset-0 w-full h-full object-cover object-center z-0 transition-transform duration-500 ease-out group-hover:scale-[1.05] ${
            isMaintenance || isClosed ? 'grayscale-[30%]' : ''
          }`}
        />
      )}

      {/* Contrast scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-900/10 to-slate-950/50 z-[1]" />

      {/* Top Badges */}
      <div className="relative z-10 flex items-center justify-between p-1 md:p-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full glass-circle flex items-center justify-center text-[#1F6FFF] shrink-0">
            <FacilityIcon name={facility.iconName} className="w-5 h-5" />
          </div>
          {isMaintenance ? (
            <span className="px-3 py-1.5 rounded-full bg-amber-50/95 border border-amber-200 text-[12px] font-bold text-amber-800 shadow-sm">
              {t('Under Maintenance', 'അറ്റകുറ്റപ്പണിയിൽ')}
            </span>
          ) : isClosed ? (
            <span className="px-3 py-1.5 rounded-full bg-rose-50/95 border border-rose-200 text-[12px] font-bold text-rose-700 shadow-sm">
              {t('Closed', 'അടച്ചിരിക്കുന്നു')}
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white/90 text-[12px] font-semibold text-[#111418] tracking-[-0.01em] shadow-sm">
              {activeMembership ? t('Active Pass', 'സജീവ അംഗത്വം') : t('Monthly Pass', 'പ്രതിമാസ അംഗത്വം')}
            </span>
          )}
        </div>

        <Link
          to={targetRoute}
          aria-label={`Open ${facility.title}`}
          className="w-9 h-9 md:w-10 md:h-10 rounded-full glass-circle flex items-center justify-center text-[#4B5563] group-hover:text-[#1F6FFF] transition-colors"
        >
          <ArrowUpRightIcon className="w-4 h-4 md:w-[18px] md:h-[18px] arrow-glide" />
        </Link>
      </div>

      {/* Frosted Glass Bottom Strip */}
      {activeMembership ? (
        <div
          className="relative z-10 rounded-[22px] md:rounded-[24px] p-4 md:p-5 flex items-center justify-between gap-3"
          style={{
            background: 'rgba(248, 251, 255, 0.86)',
            backdropFilter: 'blur(32px) saturate(150%)',
            WebkitBackdropFilter: 'blur(32px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.92)',
            boxShadow: '0 12px 32px -10px rgba(15, 23, 42, 0.16)',
          }}
        >
          <div className="min-w-0">
            <h3 className="font-display text-[19px] md:text-[21px] font-bold text-[#111418] tracking-[-0.02em] leading-tight">
              {activeMembership.facilityName}
            </h3>
            <p className="text-[12.5px] font-medium text-[#4B5563] mt-1 truncate">
              {activeMembership.membershipLabel}
            </p>
            <p className="text-[14px] md:text-[15px] font-semibold text-[#0053CD] mt-1">
              {activeMembership.validUntilText}
            </p>
          </div>
          <Link
            to={activeMembership.to}
            className="px-4 py-2.5 md:px-5 rounded-full bg-[#1F6FFF] hover:bg-[#155EE6] text-white font-semibold text-[13.5px] md:text-[14px] whitespace-nowrap shadow-[0_6px_18px_rgba(31,111,255,0.3)] transition"
          >
            {activeMembership.ctaLabel}
          </Link>
        </div>
      ) : (
        <div
          className="relative z-10 rounded-[22px] md:rounded-[24px] p-4 md:p-5 flex flex-col gap-3.5"
          style={{
            background: 'rgba(248, 251, 255, 0.86)',
            backdropFilter: 'blur(32px) saturate(150%)',
            WebkitBackdropFilter: 'blur(32px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.92)',
            boxShadow: '0 12px 32px -10px rgba(15, 23, 42, 0.16)',
          }}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-[20px] md:text-[22px] font-bold text-[#111418] tracking-[-0.02em] leading-tight">
                {t(facility.title, 'സിന്തറ്റിക് ട്രാക്ക്')}
              </h3>
              <span className="text-[11.5px] font-semibold text-[#0053CD] bg-[#1F6FFF]/10 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {t('8 Lanes', '8 ലൈനുകൾ')}
              </span>
            </div>
            <p className="text-[13.5px] md:text-[14.5px] font-medium text-[#4B5563] mt-1">
              {facility.subtitle}
            </p>

            {/* Concise structured feature tags */}
            <div className="hidden md:flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-[11.5px] font-medium text-[#374151] bg-white/80 border border-black/[0.06] px-2.5 py-1 rounded-full">
                {t('Morning & Evening', 'രാവിലെയും വൈകുന്നേരവും')}
              </span>
              <span className="text-[11.5px] font-medium text-[#374151] bg-white/80 border border-black/[0.06] px-2.5 py-1 rounded-full">
                {t('Official Fee Receipt', 'ഔദ്യോഗിക ഫീസ് രസീത്')}
              </span>
            </div>
          </div>

          <Link
            to={facility.to}
            className={`w-full h-11 md:h-12 rounded-[16px] md:rounded-[18px] font-semibold text-[14px] md:text-[14.5px] flex items-center justify-center gap-2 transition-all duration-200 ${
              isMaintenance || isClosed
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-[#1F6FFF] hover:bg-[#155EE6] text-white shadow-[0_8px_20px_rgba(31,111,255,0.28)] hover:shadow-[0_10px_26px_rgba(31,111,255,0.36)]'
            }`}
          >
            <span>
              {isMaintenance
                ? t('Under Maintenance', 'അറ്റകുറ്റപ്പണിയിൽ')
                : isClosed
                  ? t('Temporarily Closed', 'താൽക്കാലികമായി അടച്ചു')
                  : t(facility.defaultCtaLabel, 'ട്രാക്ക് അംഗത്വം നേടുക')}
            </span>
            <ArrowUpRightIcon className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
