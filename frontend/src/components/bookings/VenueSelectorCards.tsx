import { AlertTriangle, Building2, Check, Clock, ShieldCheck, Wrench } from 'lucide-react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useLanguage } from '@/context/LanguageContext';
import type { BookingCourtOption, BookingVenue } from '@/types/bookings';

const venueNameMl: Record<string, string> = {
  POLICE_TURF: 'പോലീസ് ടർഫ്',
  FOOTBALL_GROUND: 'പോലീസ് പരേഡ് ഗ്രൗണ്ട്',
  BADMINTON_COURT: 'ഇൻഡോർ ബാഡ്മിന്റൺ കോർട്ട്',
};

const venueSubMl: Record<string, string> = {
  POLICE_TURF: 'ഫുൾ / ഹാഫ് കോർട്ട് • ആസ്ട്രോടർഫ്',
  FOOTBALL_GROUND: 'പോലീസ് പരേഡ് ഗ്രൗണ്ട് • നാച്ചുറൽ പിച്ച്',
  BADMINTON_COURT: 'ഇൻഡോർ കോമ്പറ്റീഷൻ കോർട്ടുകൾ',
};

interface VenueSelectorCardsProps {
  venues: BookingVenue[];
  selectedVenueId: string;
  selectedCourtId: BookingCourtOption['id'];
  onSelectVenue: (venueId: string) => void;
  onSelectCourt: (courtId: BookingCourtOption['id']) => void;
}

export function VenueSelectorCards({
  venues,
  selectedVenueId,
  selectedCourtId,
  onSelectVenue,
  onSelectCourt,
}: VenueSelectorCardsProps) {
  const { t } = useLanguage();
  const activeVenue = venues.find((v) => v.id === selectedVenueId) ?? venues[0];
  if (!activeVenue) return null;

  const isUnavailable = activeVenue.operationalStatus !== 'ACTIVE';

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Dynamic Venue Selector Cards (supports 3 core + any Admin-added hourly venues) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((venue, index) => {
          const isSelected = venue.id === activeVenue.id;
          const isMaintenance = venue.operationalStatus === 'MAINTENANCE';
          const isClosed = venue.operationalStatus === 'CLOSED';
          const venueUnavailable = isMaintenance || isClosed;

          return (
            <button
              key={venue.id}
              type="button"
              onClick={() => onSelectVenue(venue.id)}
              style={{ animationDelay: `${60 + index * 45}ms` }}
              className={`bookings-rise group relative flex items-center p-3 rounded-[20px] text-left transition-all duration-300 active:scale-[0.99] ${
                isSelected
                  ? venueUnavailable
                    ? 'bg-white border border-amber-400/90 ring-2 ring-amber-200/70 shadow-[0_14px_34px_-14px_rgba(245,158,11,0.25)]'
                    : 'bg-white border border-[#165DF5]/70 ring-2 ring-[#165DF5]/20 shadow-[0_14px_34px_-14px_rgba(22,93,245,0.24)]'
                  : 'bg-white/75 backdrop-blur-xl border border-slate-200/85 hover:bg-white hover:border-slate-300/90 hover:-translate-y-0.5 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.08)]'
              }`}
            >
              {/* Venue Thumbnail or Custom Venue Gradient Tile */}
              <div className="relative w-[84px] h-[84px] rounded-[14px] overflow-hidden shrink-0 bg-gradient-to-br from-[#165DF5] via-[#1D4ED8] to-[#0F172A]">
                {venue.imageUrl ? (
                  <img
                    alt={venue.imageAlt}
                    className={`w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.07] ${
                      venueUnavailable ? 'grayscale-[35%] opacity-85' : ''
                    }`}
                    src={venue.imageUrl}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/90">
                    <Building2 className="w-8 h-8" strokeWidth={1.7} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                <span
                  className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-[0.06em] uppercase backdrop-blur-md ${
                    isSelected && !venueUnavailable
                      ? 'bg-[#165DF5] text-white shadow-sm'
                      : 'bg-slate-900/75 text-white/95'
                  }`}
                >
                  {venue.badge}
                </span>
              </div>

              {/* Venue Copy */}
              <div className="flex flex-col justify-center ml-3.5 min-w-0 flex-1 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[16px] font-bold text-[#0F172A] tracking-[-0.02em] truncate">
                    {t(venue.name, venueNameMl[venue.code] ?? venue.name)}
                  </span>
                  {isSelected && (
                    <span
                      className={`bookings-pop w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 shadow-sm ${
                        venueUnavailable ? 'bg-amber-500' : 'bg-[#165DF5]'
                      }`}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <p className="text-[12px] text-[#64748B] truncate mt-0.5">
                  {t(venue.subtitle, venueSubMl[venue.code] ?? venue.subtitle)}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {isMaintenance ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10.5px] font-bold">
                      <Wrench className="w-3 h-3" />
                      {t('Under Maintenance', 'അറ്റകുറ്റപ്പണിയിൽ')}
                    </span>
                  ) : isClosed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10.5px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      {t('Closed', 'അടച്ചിരിക്കുന്നു')}
                    </span>
                  ) : (
                    <span
                      className={`text-[12.5px] font-semibold tabular-nums ${
                        isSelected ? 'text-[#165DF5]' : 'text-[#334155]'
                      }`}
                    >
                      {venue.priceLabel}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Operational Notice Banner when selected venue is Maintenance or Closed */}
      {isUnavailable && (
        <div
          role="status"
          className={`rounded-[18px] px-4 py-3.5 border flex items-start gap-3 ${
            activeVenue.operationalStatus === 'MAINTENANCE'
              ? 'bg-amber-50/95 border-amber-200 text-amber-900'
              : 'bg-rose-50/95 border-rose-200 text-rose-900'
          }`}
        >
          {activeVenue.operationalStatus === 'MAINTENANCE' ? (
            <Wrench className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-[13.5px] leading-snug">
            <p className="font-bold">
              {activeVenue.operationalStatus === 'MAINTENANCE'
                ? t(
                    `${activeVenue.name} is currently under maintenance`,
                    `${activeVenue.name} നിലവിൽ അറ്റകുറ്റപ്പണിയിലാണ്`,
                  )
                : t(
                    `${activeVenue.name} is currently closed`,
                    `${activeVenue.name} നിലവിൽ അടച്ചിരിക്കുകയാണ്`,
                  )}
            </p>
            <p className="text-[12.5px] opacity-90 mt-0.5">
              {t(
                'New slot bookings are temporarily paused by Kannur City Police Sports Administration. Please select another active facility above.',
                'കണ്ണൂർ സിറ്റി പോലീസ് കായിക വിഭാഗം പുതിയ ബുക്കിംഗുകൾ താൽക്കാലികമായി നിർത്തിവച്ചിരിക്കുന്നു. ദയവായി മുകളിൽ നിന്ന് മറ്റൊരു വേദി തിരഞ്ഞെടുക്കുക.',
              )}
            </p>
          </div>
        </div>
      )}

      {/* 2. Selected Venue Policy & Court Configuration Strip */}
      <div
        style={{ animationDelay: '200ms' }}
        className="bookings-rise relative w-full rounded-[20px] bg-white/85 backdrop-blur-2xl border border-slate-200/85 px-4 py-4 md:px-5 md:py-4 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.08)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
      >
        {/* Left: Rate & Operating Hours */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#165DF5]/10 text-[#0F50DC] text-[12px] font-semibold tracking-[-0.005em] tabular-nums">
              {activeVenue.rateBannerText}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/70 text-[#475569] text-[11.5px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#64748B]" />
              {activeVenue.policyBadge}
            </span>
          </div>
          <div className="flex items-start sm:items-center gap-2 text-[#475569] text-[13px] leading-snug mt-0.5">
            <Clock className="w-4 h-4 text-[#165DF5] shrink-0 mt-0.5 sm:mt-0" strokeWidth={2} />
            <span>{activeVenue.operatingHoursText}</span>
          </div>
        </div>

        {/* Right: Segmented Court / Partition Selector */}
        <div
          className={`flex flex-wrap sm:flex-nowrap items-center gap-1 bg-slate-100/90 border border-slate-200/80 p-1 rounded-[14px] shrink-0 self-stretch lg:self-auto ${
            isUnavailable ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {activeVenue.courtOptions.map((court) => {
            const isChecked = court.id === selectedCourtId;
            return (
              <label key={court.id} className="cursor-pointer flex-1 sm:flex-initial">
                <input
                  checked={isChecked}
                  disabled={isUnavailable}
                  onChange={() => onSelectCourt(court.id)}
                  className="sr-only peer"
                  name="court_type"
                  type="radio"
                  value={court.id}
                />
                <span className="h-9 px-3.5 rounded-[10px] flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#475569] hover:text-[#0F172A] peer-checked:bg-[#165DF5] peer-checked:text-white peer-checked:shadow-[0_4px_12px_rgba(22,93,245,0.28)] transition-all duration-200 whitespace-nowrap tabular-nums">
                  <MaterialIcon name={court.icon} className="text-[16px]" />
                  <span>{court.label}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
