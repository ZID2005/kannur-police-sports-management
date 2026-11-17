import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type { BookingCourtOption, BookingVenue } from '@/types/bookings';

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
  const activeVenue = venues.find((v) => v.id === selectedVenueId) ?? venues[0];

  return (
    <>
      {/* 1. Venue Selector Cards (3 Horizontal Tabs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {venues.map((venue) => {
          const isSelected = venue.id === activeVenue.id;
          return (
            <button
              key={venue.id}
              type="button"
              onClick={() => onSelectVenue(venue.id)}
              className={
                isSelected
                  ? 'group relative flex items-center p-space-sm rounded-3xl bg-white/75 backdrop-blur-2xl shadow-[0_12px_32px_rgba(31,111,255,0.12)] ring-2 ring-primary text-left transition-all duration-300 active:scale-[0.99]'
                  : 'group relative flex items-center p-space-sm rounded-3xl bg-white/45 backdrop-blur-xl hover:bg-white/70 shadow-[0_6px_20px_rgba(0,0,0,0.03)] text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]'
              }
            >
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                <img
                  alt={venue.imageAlt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={venue.imageUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <span
                  className={
                    isSelected
                      ? 'absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-primary text-[10px] font-semibold text-white tracking-wider uppercase'
                      : 'absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-surface-container-highest text-[10px] font-semibold text-on-surface-variant tracking-wider uppercase'
                  }
                >
                  {venue.badge}
                </span>
              </div>
              <div className="flex flex-col justify-center ml-space-md min-w-0 pr-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-card text-headline-card text-on-surface truncate">
                    {venue.name}
                  </span>
                  {isSelected && (
                    <MaterialIcon
                      name="check_circle"
                      className="text-primary text-[20px]"
                      filled
                    />
                  )}
                </div>
                <p className="font-label-meta text-label-meta text-on-surface-variant truncate mt-0.5">
                  {venue.subtitle}
                </p>
                <span
                  className={
                    isSelected
                      ? 'font-caption text-caption text-primary font-semibold mt-1'
                      : 'font-caption text-caption text-secondary font-medium mt-1'
                  }
                >
                  {venue.priceLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Venue Policy & Rate Glass Banner */}
      <div className="relative w-full rounded-3xl bg-white/65 backdrop-blur-2xl p-space-md md:p-space-lg shadow-[0_16px_36px_rgba(31,111,255,0.07)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs max-w-3xl">
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="px-space-md py-1 rounded-full bg-primary/10 text-primary font-label-meta text-label-meta font-semibold">
              {activeVenue.rateBannerText}
            </span>
            <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant font-caption text-caption">
              {activeVenue.complianceBadge}
            </span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant font-label-primary text-label-primary mt-1">
            <MaterialIcon name="schedule" className="text-primary text-[20px] shrink-0" />
            <span>{activeVenue.operatingHoursText}</span>
          </div>
        </div>

        {/* Court Type Selector Radio Pills */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-space-xs bg-surface-container-high/70 p-1.5 rounded-full shrink-0 shadow-inner">
          {activeVenue.courtOptions.map((court) => {
            const isChecked = court.id === selectedCourtId;
            return (
              <label key={court.id} className="cursor-pointer shrink-0">
                <input
                  checked={isChecked}
                  onChange={() => onSelectCourt(court.id)}
                  className="sr-only peer"
                  name="court_type"
                  type="radio"
                  value={court.id}
                />
                <span className="px-space-md py-2 rounded-full flex items-center gap-2 font-label-primary text-label-primary text-on-surface-variant peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-md transition-all whitespace-nowrap shrink-0">
                  <MaterialIcon name={court.icon} className="text-[18px]" />
                  <span>{court.label}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}
