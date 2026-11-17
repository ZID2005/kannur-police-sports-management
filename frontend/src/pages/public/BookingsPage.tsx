import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ApiError,
  bookingsApi,
  facilitiesApi,
  paymentsApi,
  type ApiFacility,
  type ApiPublicSlotsResponse,
  type BackendCourtPartition,
  type BackendFacilityCode,
} from '@/api/client';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { VenueSelectorCards } from '@/components/bookings/VenueSelectorCards';
import { SlotSelectionWorkspace } from '@/components/bookings/SlotSelectionWorkspace';
import { BookingSummaryCard } from '@/components/bookings/BookingSummaryCard';
import { useAuth } from '@/context/AuthContext';
import {
  bookingPortalMeta,
  bookingRegistrant,
  bookingTimeSlots,
  bookingVenues,
} from '@/data/mockData';
import type {
  BookingCourtOption,
  BookingDateOption,
  BookingPortalMeta,
  BookingRegistrant,
  BookingSelectionState,
  BookingTimeSlot,
  BookingVenue,
} from '@/types/bookings';
import '@/styles/bookings.css';

export const LATEST_BOOKING_TICKET_KEY = 'kcp_latest_booking_ticket';

const VENUE_ID_TO_CODE: Record<string, BackendFacilityCode> = {
  'police-turf': 'POLICE_TURF',
  'football-ground': 'FOOTBALL_GROUND',
  'indoor-badminton': 'BADMINTON_COURT',
};

const COURT_ID_TO_PARTITION: Record<BookingCourtOption['id'], BackendCourtPartition> = {
  full: 'FULL',
  half_a: 'HALF_A',
  half_b: 'HALF_B',
};

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildRollingDates(): BookingDateOption[] {
  const base = new Date();
  const list: BookingDateOption[] = [];

  for (let offset = -1; offset < 6; offset += 1) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + offset);
    const iso = formatDateIso(dt);
    const isPast = offset < 0;
    list.push({
      id: iso,
      dayShort: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: String(dt.getDate()),
      fullDateLabel: dt.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      ticketDateLabel: dt.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      slotsCountLabel: isPast ? 'Past' : 'Open',
      isPast,
    });
  }
  return list;
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const initialVenueParam = searchParams.get('venue');
  const initialVenueId =
    initialVenueParam && VENUE_ID_TO_CODE[initialVenueParam]
      ? initialVenueParam
      : 'police-turf';

  const rollingDates = useMemo(() => buildRollingDates(), []);
  const todayIso = rollingDates[1]?.id ?? formatDateIso(new Date());

  const [facilities, setFacilities] = useState<ApiFacility[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(initialVenueId);
  const [selectedCourtId, setSelectedCourtId] = useState<BookingCourtOption['id']>('full');
  const [selectedDateId, setSelectedDateId] = useState<string>(todayIso);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [slotsData, setSlotsData] = useState<ApiPublicSlotsResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [reserving, setReserving] = useState<boolean>(false);
  const [draftSaved, setDraftSaved] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    let active = true;
    facilitiesApi
      .list()
      .then((res) => {
        if (active) setFacilities(res.facilities);
      })
      .catch(() => {
        // Keep static tariff defaults if offline
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const venues = useMemo<BookingVenue[]>(() => {
    return bookingVenues.map((baseVenue) => {
      const code = VENUE_ID_TO_CODE[baseVenue.id];
      const liveFac = facilities.find((f) => f.code === code);
      if (!liveFac) {
        return baseVenue.id === 'police-turf'
          ? baseVenue
          : { ...baseVenue, courtOptions: [baseVenue.courtOptions[0]] };
      }

      const fullTariff = liveFac.tariffs.find((t) => t.booking_type === 'FULL_COURT');
      const halfTariff = liveFac.tariffs.find((t) => t.booking_type === 'HALF_COURT');
      const fullRate = fullTariff ? Number(fullTariff.base_price) : baseVenue.courtOptions[0].hourlyRate;
      const halfRate = halfTariff ? Number(halfTariff.base_price) : Math.round(fullRate / 2);

      const courtOptions: BookingCourtOption[] = liveFac.is_partitionable
        ? [
            {
              id: 'full',
              label: `Full Court • ₹${fullRate.toLocaleString('en-IN')}/hr`,
              shortName: 'Full Court (7s)',
              turfBadge: 'FULL',
              icon: 'sports_soccer',
              hourlyRate: fullRate,
            },
            {
              id: 'half_a',
              label: `Half A • ₹${halfRate.toLocaleString('en-IN')}/hr`,
              shortName: 'Half Court A (5s)',
              turfBadge: 'HALF_A',
              icon: 'crop_free',
              hourlyRate: halfRate,
            },
            {
              id: 'half_b',
              label: `Half B • ₹${halfRate.toLocaleString('en-IN')}/hr`,
              shortName: 'Half Court B (5s)',
              turfBadge: 'HALF_B',
              icon: 'crop_free',
              hourlyRate: halfRate,
            },
          ]
        : [
            {
              id: 'full',
              label: `Full Court • ₹${fullRate.toLocaleString('en-IN')}/hr`,
              shortName: baseVenue.courtOptions[0].shortName,
              turfBadge: 'FULL',
              icon: baseVenue.courtOptions[0].icon,
              hourlyRate: fullRate,
            },
          ];

      return {
        ...baseVenue,
        name: liveFac.name,
        priceLabel: liveFac.is_partitionable
          ? `₹${halfRate.toLocaleString('en-IN')} - ₹${fullRate.toLocaleString('en-IN')} / hr`
          : `₹${fullRate.toLocaleString('en-IN')} / hr`,
        rateBannerText: `${liveFac.user_category === 'GOVT_PERSONNEL' ? 'Govt Personnel Rate' : 'General Public Rate'}: ₹${fullRate.toLocaleString('en-IN')}/hr Full${
          liveFac.is_partitionable ? ` • ₹${halfRate.toLocaleString('en-IN')}/hr Half Court` : ''
        }`,
        operatingHoursText: `Operating Hours: ${formatTime12h(liveFac.operating_start)} – ${formatTime12h(
          liveFac.operating_end
        )} • Max ${liveFac.daily_user_hour_cap} hrs/day • Stage 1 QR Gate Scan only`,
        courtOptions,
      };
    });
  }, [facilities]);

  const activeVenue = venues.find((v) => v.id === selectedVenueId) ?? venues[0];
  const activeCourt =
    activeVenue.courtOptions.find((c) => c.id === selectedCourtId) ??
    activeVenue.courtOptions[0];

  useEffect(() => {
    if (!activeVenue.courtOptions.some((c) => c.id === selectedCourtId)) {
      setSelectedCourtId('full');
    }
  }, [activeVenue, selectedCourtId]);

  const activeFacilityCode = VENUE_ID_TO_CODE[activeVenue.id] ?? 'POLICE_TURF';
  const activePartition = COURT_ID_TO_PARTITION[activeCourt.id] ?? 'FULL';

  useEffect(() => {
    let active = true;
    setLoadingSlots(true);
    facilitiesApi
      .getPublicSlots(activeFacilityCode, selectedDateId)
      .then((res) => {
        if (active) setSlotsData(res);
      })
      .catch((err) => {
        if (active) {
          setSlotsData(null);
          showToast(err instanceof ApiError ? err.message : 'Unable to fetch slot availability.');
        }
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [activeFacilityCode, selectedDateId]);

  const mappedSlots = useMemo<BookingTimeSlot[]>(() => {
    if (!slotsData?.slots?.length) {
      return bookingTimeSlots;
    }

    return slotsData.slots.map((slot) => {
      const partitionEntry = slot.partitions?.[activePartition];
      const slotStatus = partitionEntry?.status ?? slot.status;
      const startHour = Number.parseInt(slot.start_time.split(':')[0] ?? '6', 10);
      const isMorning = startHour < 12;
      const isFloodlit = startHour >= 18;

      return {
        id: slot.start_time,
        session: isMorning ? 'morning' : 'evening',
        timeLabel: `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`,
        summaryTimeLabel: `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`,
        status: slotStatus === 'ALREADY_BOOKED' ? 'booked' : 'available',
        sessionTag: isFloodlit ? 'Floodlit' : isMorning ? 'Morning' : 'Daylight',
        durationLabel: `1 Hour (${activeCourt.shortName})`,
      };
    });
  }, [slotsData, activePartition, activeCourt.shortName]);

  useEffect(() => {
    const firstAvailable = mappedSlots.find((s) => s.status === 'available');
    setSelectedSlotId((prev) => {
      const stillValid = mappedSlots.find((s) => s.id === prev && s.status === 'available');
      return stillValid ? prev : firstAvailable?.id ?? mappedSlots[0]?.id ?? '';
    });
  }, [mappedSlots]);

  const activeDate =
    rollingDates.find((d) => d.id === selectedDateId) ?? rollingDates[1] ?? rollingDates[0];
  const activeSlot =
    mappedSlots.find((s) => s.id === selectedSlotId) ?? mappedSlots[0] ?? bookingTimeSlots[0];

  const datesWithAvailability = useMemo<BookingDateOption[]>(() => {
    const availCount = mappedSlots.filter((s) => s.status === 'available').length;
    return rollingDates.map((d) =>
      d.id === selectedDateId && !d.isPast
        ? { ...d, slotsCountLabel: `${availCount} Free` }
        : d
    );
  }, [rollingDates, selectedDateId, mappedSlots]);

  const dynamicMeta = useMemo<BookingPortalMeta>(() => {
    const morningAvail = mappedSlots.filter(
      (s) => s.session === 'morning' && s.status === 'available'
    ).length;
    const monthLabel = new Date(`${selectedDateId}T00:00:00`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
    return {
      ...bookingPortalMeta,
      calendarMonthLabel: monthLabel,
      morningBadge: `${morningAvail} Slots Available`,
      statusPillText: loadingSlots
        ? 'Syncing live facility schedule...'
        : `Kannur Sports Complex • ${activeFacilityCode} Live`,
    };
  }, [mappedSlots, selectedDateId, loadingSlots, activeFacilityCode]);

  const registrant = useMemo<BookingRegistrant>(() => {
    if (!user) return bookingRegistrant;
    return {
      name: user.full_name,
      registrantId: `@${user.username}`,
      email: user.email || 'Departmental Portal Account',
      accountBadge: user.role === 'GOVT_PERSONNEL' ? 'Govt Concession' : 'Citizen Account',
    };
  }, [user]);

  const handleSelectVenue = (venueId: string) => {
    setSelectedVenueId(venueId);
    setDraftSaved(false);
  };

  const handleSelectCourt = (courtId: BookingCourtOption['id']) => {
    setSelectedCourtId(courtId);
    setDraftSaved(false);
  };

  const handleSelectDate = (dateId: string) => {
    setSelectedDateId(dateId);
    setDraftSaved(false);
  };

  const handleSelectSlot = (slotId: string) => {
    setSelectedSlotId(slotId);
    setDraftSaved(false);
  };

  const handleSaveDraft = () => {
    setDraftSaved(true);
    showToast(
      `Slot selected: ${activeVenue.name} (${activeCourt.shortName}) on ${activeDate.ticketDateLabel} at ${activeSlot.summaryTimeLabel}.`
    );
  };

  const handleProceedToPayment = async () => {
    if (reserving) return;
    if (!user) {
      showToast('Please sign in first to reserve and pay for a facility slot.');
      navigate('/login', { state: { from: '/bookings' } });
      return;
    }

    if (activeSlot.status !== 'available') {
      showToast('This slot is already booked. Please choose an available hourly slot.');
      return;
    }

    const startTime = activeSlot.id.includes(':') ? activeSlot.id : '06:00';
    setReserving(true);
    try {
      const reserveRes = await bookingsApi.reserve({
        facility_code: activeFacilityCode,
        booking_date: selectedDateId,
        start_time: startTime,
        court_partition: activePartition,
      });

      const settleRes = await paymentsApi.settle({
        reference_type: 'SLOT_BOOKING',
        reference_id: reserveRes.booking.id,
      });

      try {
        window.sessionStorage.setItem(LATEST_BOOKING_TICKET_KEY, JSON.stringify(settleRes));
      } catch {
        // Ignore storage errors
      }

      const selectionState: BookingSelectionState = {
        venueName: activeVenue.name,
        courtShortName: activeCourt.shortName,
        turfBadge: activeCourt.turfBadge,
        dateLabel: activeDate.ticketDateLabel,
        timeSlotLabel: activeSlot.summaryTimeLabel,
        sessionNote: activeSlot.sessionTag,
        totalAmountFormatted: `₹${Number(settleRes.payment.total_amount).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        bookingReference: settleRes.qr_pass.pass_or_booking_code,
        receiptNo: settleRes.payment.receipt_no,
        qrTokenHash: settleRes.qr_pass.qr_token_hash,
        attendeeName: user.full_name,
        attendeeRole: user.role === 'GOVT_PERSONNEL' ? 'Government Personnel' : 'Citizen Account',
        paymentStatusNote: `Settled (${settleRes.payment.payment_mode})`,
      };

      navigate('/bookings/ticket', { state: selectionState });
    } catch (error) {
      showToast(
        error instanceof ApiError
          ? error.message
          : 'Slot reservation or payment failed. Please refresh slots and try again.'
      );
      // Refresh slot availability after conflict
      facilitiesApi
        .getPublicSlots(activeFacilityCode, selectedDateId)
        .then((res) => setSlotsData(res))
        .catch(() => {});
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="bookings-page-container flex flex-col w-full bg-surface font-body-default text-body-default text-on-surface antialiased">
      <div className="relative w-full overflow-hidden px-margin sm:px-margin-desktop py-space-lg max-w-7xl mx-auto flex flex-col gap-space-lg">
        {/* Ambient Liquid Glass Atmosphere Glows */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-secondary-container/40 rounded-full blur-[110px] pointer-events-none -z-10" />

        {/* Section: Header Context & Official Tagline */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-primary font-label-meta text-label-meta">
              <MaterialIcon name="verified_user" className="text-[18px]" />
              <span>{dynamicMeta.portalBadge}</span>
            </div>
            <h1 className="font-title-portal text-title-portal-mobile md:text-title-portal text-on-surface tracking-tight">
              {dynamicMeta.title}
            </h1>
          </div>
          <div className="flex items-center gap-space-sm bg-white/70 backdrop-blur-xl px-space-md py-space-xs rounded-full shadow-sm self-start md:self-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-label-meta text-label-meta text-on-surface-variant font-medium">
              {dynamicMeta.statusPillText}
            </span>
          </div>
        </div>

        {/* 1. Venue Selector Cards & Policy Banner */}
        <VenueSelectorCards
          venues={venues}
          selectedVenueId={activeVenue.id}
          selectedCourtId={activeCourt.id}
          onSelectVenue={handleSelectVenue}
          onSelectCourt={handleSelectCourt}
        />

        {/* 2. Main Booking Two-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <SlotSelectionWorkspace
            meta={dynamicMeta}
            dates={datesWithAvailability}
            selectedDateId={selectedDateId}
            onSelectDate={handleSelectDate}
            slots={mappedSlots}
            selectedSlotId={activeSlot.id}
            onSelectSlot={handleSelectSlot}
            hourlyRate={activeCourt.hourlyRate}
          />

          <BookingSummaryCard
            meta={dynamicMeta}
            venue={activeVenue}
            court={activeCourt}
            date={activeDate}
            slot={activeSlot}
            registrant={registrant}
            draftSaved={draftSaved}
            onProceedToPayment={handleProceedToPayment}
            onSaveDraft={handleSaveDraft}
          />
        </div>
      </div>

      {/* Interactive Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bookings-toast-enter">
          <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-xl">
            <MaterialIcon
              name="check_circle"
              className="text-emerald-400 text-[20px]"
              filled
            />
            <span className="font-label-primary text-label-primary">
              {toastMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
