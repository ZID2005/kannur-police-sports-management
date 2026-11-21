import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import type { HomeHourlyFacility, HomeHourlyFacilityId } from '@/types/home';
import { ArrowUpRightIcon, FacilityIcon } from './FacilityIcon';

interface HourlyFacilityCardProps {
  facility: HomeHourlyFacility;
  gridPositionClass: string;
  animationDelayMs?: number;
}

const fallbackGradients: Record<HomeHourlyFacilityId, string> = {
  'football-ground': 'from-[#2D7A47] via-[#1D5C36] to-[#0F3522]',
  'police-turf': 'from-[#1B6B53] via-[#134E4A] to-[#0F2A3A]',
  'badminton-court': 'from-[#1D6A52] via-[#1E4F69] to-[#17304A]',
};

const venuePillLabels: Record<HomeHourlyFacilityId, { en: string; ml: string }> = {
  'football-ground': { en: 'Natural Grass', ml: 'നാച്ചുറൽ ഗ്രാസ്' },
  'police-turf': { en: '7s / Dual 5s Turf', ml: '7s / ഡ്യുവൽ 5s ടർഫ്' },
  'badminton-court': { en: 'Indoor Arena', ml: 'ഇൻഡോർ അരീന' },
};

const venueTitleMl: Record<HomeHourlyFacilityId, string> = {
  'football-ground': 'പോലീസ് പരേഡ് ഗ്രൗണ്ട്',
  'police-turf': 'പോലീസ് ടർഫ്',
  'badminton-court': 'ഇൻഡോർ ബാഡ്മിന്റൺ കോർട്ട്',
};

/**
 * Hourly facility card (Police Parade Ground, Police Turf, Indoor Badminton Court).
 */
export function HourlyFacilityCard({
  facility,
  gridPositionClass,
  animationDelayMs = 200,
}: HourlyFacilityCardProps) {
  const [imgError, setImgError] = useState(false);
  const { lang, t } = useLanguage();
  const isMaintenance = facility.operationalStatus === 'MAINTENANCE';
  const isClosed = facility.operationalStatus === 'CLOSED';

  return (
    <Link
      to={facility.to}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      className={`home-facility-card animate-fade-rise relative rounded-[24px] md:rounded-[32px] overflow-hidden shadow-[0_16px_38px_-16px_rgba(15,23,42,0.16)] border border-white/85 flex flex-col justify-between p-3 md:p-4 group bg-gradient-to-br ${fallbackGradients[facility.id]} ${gridPositionClass}`}
    >
      {!imgError && (
        <img
          src={facility.imageUrl}
          alt={facility.title}
          onError={() => setImgError(true)}
          className={`absolute inset-0 w-full h-full object-cover object-center z-0 transition-transform duration-500 ease-out group-hover:scale-[1.05] ${
            isMaintenance || isClosed ? 'grayscale-[35%]' : ''
          }`}
        />
      )}

      {/* Balanced gradient scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-900/10 to-slate-950/50 z-[1]" />

      {/* Top Badges */}
      <div className="relative z-10 flex items-center justify-between md:p-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full glass-circle flex items-center justify-center text-[#1F6FFF] shrink-0">
            <FacilityIcon name={facility.iconName} className="w-[18px] h-[18px] md:w-5 md:h-5" />
          </div>
          {isMaintenance ? (
            <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-50/95 border border-amber-200 text-[11px] font-bold text-amber-800 shadow-sm">
              {t('Under Maintenance', 'അറ്റകുറ്റപ്പണിയിൽ')}
            </span>
          ) : isClosed ? (
            <span className="inline-flex px-2.5 py-1 rounded-full bg-rose-50/95 border border-rose-200 text-[11px] font-bold text-rose-700 shadow-sm">
              {t('Closed', 'അടച്ചിരിക്കുന്നു')}
            </span>
          ) : (
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 text-[11.5px] font-semibold text-[#111418] tracking-[-0.01em] shadow-sm">
              {lang === 'ML' ? venuePillLabels[facility.id].ml : venuePillLabels[facility.id].en}
            </span>
          )}
        </div>

        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full glass-circle flex items-center justify-center text-[#4B5563] group-hover:text-[#1F6FFF] transition-colors">
          <ArrowUpRightIcon className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] arrow-glide" />
        </div>
      </div>

      {/* Bottom Frosted Glass Strip with Busy-Time Bars */}
      <div
        className="relative z-10 rounded-[18px] md:rounded-[22px] px-3 py-2.5 md:px-4 md:py-3.5 flex items-center justify-between gap-2"
        style={{
          background: 'rgba(248, 251, 255, 0.86)',
          backdropFilter: 'blur(32px) saturate(150%)',
          WebkitBackdropFilter: 'blur(32px) saturate(150%)',
          border: '1px solid rgba(255, 255, 255, 0.92)',
          boxShadow: '0 10px 28px -10px rgba(15, 23, 42, 0.16)',
        }}
      >
        <div className="min-w-0">
          <h3 className="font-display text-[15.5px] md:text-[18.5px] font-bold text-[#111418] tracking-[-0.02em] leading-tight truncate">
            {t(facility.title, venueTitleMl[facility.id])}
          </h3>
          <p className="text-[12px] md:text-[13.5px] font-medium text-[#4B5563] mt-0.5 truncate tabular-nums">
            {isMaintenance
              ? t('Bookings paused for maintenance', 'അറ്റകുറ്റപ്പണിക്കായി നിർത്തിവച്ചു')
              : isClosed
                ? t('Temporarily closed', 'താൽക്കാലികമായി അടച്ചു')
                : facility.subtitle}
          </p>
        </div>

        {/* Desktop Busy-Time Bars */}
        {!isMaintenance && !isClosed && (
          <>
            <div className="hidden md:flex flex-col items-end shrink-0" aria-hidden="true">
              <div className="flex items-end gap-[3.5px] h-6">
                {facility.desktopBusyBars.map((bar, index) => (
                  <span
                    key={index}
                    style={{ transitionDelay: `${index * 22}ms` }}
                    className={`busy-bar w-[5px] rounded-full ${bar.heightClass} ${bar.colorClass}`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium text-[#6B7280] mt-1 tracking-[0.02em]">
                {t('Peak hours', 'തിരക്കുള്ള സമയം')}
              </span>
            </div>

            <div className="flex md:hidden items-end gap-0.5 h-5 shrink-0" aria-hidden="true">
              {facility.mobileBusyBars.map((bar, index) => (
                <span
                  key={index}
                  className={`w-1 rounded-full ${bar.heightClass} ${bar.colorClass}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
