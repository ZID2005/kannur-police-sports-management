import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ApiError,
  bookingsApi,
  facilitiesApi,
  paymentsApi,
  type ApiFacility,
  type ApiPublicSlotsResponse,
  type ApiSlotBooking,
  type BackendCourtPartition,
  type FacilityOperationalStatus,
  type PublicSlotOperationalStatus,
} from '@/api/client';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { VenueSelectorCards } from '@/components/bookings/VenueSelectorCards';
import { SlotSelectionWorkspace } from '@/components/bookings/SlotSelectionWorkspace';
import { BookingSummaryCard } from '@/components/bookings/BookingSummaryCard';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  bookingPortalMeta,
  fallbackBookingVenues,
  guestBookingRegistrant,
} from '@/data/mockData';
import type {
  BookingCourtOption,
  BookingDateOption,
  BookingPortalMeta,
  BookingReceiptData,
  BookingRegistrant,
  BookingTimeSlot,
  BookingVenue,
} from '@/types/bookings';
import '@/styles/bookings.css';

export const LATEST_BOOKING_RECEIPT_KEY = 'kcp_latest_booking_receipt';

const LEGACY_SLUG_TO_CODE: Record<string, string> = {
  'police-turf': 'POLICE_TURF',
  'football-ground': 'FOOTBALL_GROUND',
  'indoor-badminton': 'BADMINTON_COURT',
  'badminton-court': 'BADMINTON_COURT',
};

const CORE_VENUE_IMAGES: Record<string, { url: string; alt: string; badge: string; icon: string }> = {
  POLICE_TURF: {
    url: '/images/facilities/police-turf.jpg',
    alt: 'Police Turf floodlit artificial 7-a-side football turf',
    badge: 'Turf',
    icon: 'sports_soccer',
  },
  FOOTBALL_GROUND: {
    url: '/images/facilities/football-ground.jpg',
    alt: 'Police Parade natural grass football ground',
    badge: 'Stadium',
    icon: 'sports_soccer',
  },
  BADMINTON_COURT: {
    url: '/images/facilities/badminton-court.jpg',
    alt: 'Indoor wooden badminton court complex',
    badge: 'Indoor',
    icon: 'sports_tennis',
  },
};

function normalizeVenueCode(param: string | null): string | null {
  if (!param) return null;
  const trimmed = param.trim();
  if (!trimmed) return null;
  return LEGACY_SLUG_TO_CODE[trimmed.toLowerCase()] ?? trimmed.toUpperCase();
}

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

function formatCourtModeLabel(partition: BackendCourtPartition, isPartitionable: boolean): string {
  if (partition === 'HALF_A') return 'Half Court A (5s)';
  if (partition === 'HALF_B') return 'Half Court B (5s)';
  return isPartitionable ? 'Full Court (7s)' : 'Full Court';
}

function mapFacilityToBookingVenue(fac: ApiFacility): BookingVenue {
  const media = CORE_VENUE_IMAGES[fac.code];
  const fullTariff =
    fac.tariffs.find((tItem) => tItem.booking_type === 'FULL_COURT') ?? fac.tariffs[0];
  const halfTariff = fac.tariffs.find((tItem) => tItem.booking_type === 'HALF_COURT');

  const fullRate = fullTariff ? Number(fullTariff.base_price) : 500;
  const fullStandard = fullTariff?.standard_base_price
    ? Number(fullTariff.standard_base_price)
    : fullRate;
  const fullDiscount = fullTariff?.concession_discount
    ? Number(fullTariff.concession_discount)
    : Math.max(0, fullStandard - fullRate);
  const fullConcessionPct = fullTariff?.concession_percent ?? 0;
  const gstRate = fullTariff ? Number(fullTariff.gst_percent) : 18;

  const halfRate = halfTariff ? Number(halfTariff.base_price) : Math.round(fullRate / 2);
  const halfStandard = halfTariff?.standard_base_price
    ? Number(halfTariff.standard_base_price)
    : halfRate;
  const halfDiscount = halfTariff?.concession_discount
    ? Number(halfTariff.concession_discount)
    : Math.max(0, halfStandard - halfRate);
  const halfConcessionPct = halfTariff?.concession_percent ?? fullConcessionPct;

  const courtIcon = media?.icon ?? 'sports_score';

  const courtOptions: BookingCourtOption[] = fac.is_partitionable
    ? [
        {
          id: 'full',
          partition: 'FULL',
          label: `Full Court • ₹${fullRate.toLocaleString('en-IN')}/hr`,
          shortName: 'Full Court (7s)',
          turfBadge: 'FULL COURT',
          icon: courtIcon,
          hourlyRate: fullRate,
          standardHourlyRate: fullStandard,
          concessionDiscount: fullDiscount,
          concessionPercent: fullConcessionPct,
          gstRate,
        },
        {
          id: 'half_a',
          partition: 'HALF_A',
          label: `Half A • ₹${halfRate.toLocaleString('en-IN')}/hr`,
          shortName: 'Half Court A (5s)',
          turfBadge: 'HALF COURT A',
          icon: 'crop_free',
          hourlyRate: halfRate,
          standardHourlyRate: halfStandard,
          concessionDiscount: halfDiscount,
          concessionPercent: halfConcessionPct,
          gstRate,
        },
        {
          id: 'half_b',
          partition: 'HALF_B',
          label: `Half B • ₹${halfRate.toLocaleString('en-IN')}/hr`,
          shortName: 'Half Court B (5s)',
          turfBadge: 'HALF COURT B',
          icon: 'crop_free',
          hourlyRate: halfRate,
          standardHourlyRate: halfStandard,
          concessionDiscount: halfDiscount,
          concessionPercent: halfConcessionPct,
          gstRate,
        },
      ]
    : [
        {
          id: 'full',
          partition: 'FULL',
          label: `Full Court • ₹${fullRate.toLocaleString('en-IN')}/hr`,
          shortName: 'Full Court',
          turfBadge: 'FULL COURT',
          icon: courtIcon,
          hourlyRate: fullRate,
          standardHourlyRate: fullStandard,
          concessionDiscount: fullDiscount,
          concessionPercent: fullConcessionPct,
          gstRate,
        },
      ];

  const badgeText =
    media?.badge ??
    (fac.category ? fac.category.split(/\s+/)[0].slice(0, 10) : 'Venue');
  const subtitle =
    fac.description ||
    (fac.is_partitionable
      ? 'Full / Half Court Partitionable Venue'
      : `${fac.court_count ?? 1} ${fac.court_unit_label ?? 'Court'} • ${fac.category ?? 'Sports Arena'}`);

  const rateCategoryLabel =
    fac.user_category === 'GOVT_PERSONNEL' ? 'Govt / Police Rate' : 'General Public Rate';

  return {
    id: fac.code,
    code: fac.code,
    name: fac.name,
    category: fac.category ?? 'Sports Facility',
    badge: badgeText,
    subtitle,
    priceLabel: fac.is_partitionable
      ? `₹${halfRate.toLocaleString('en-IN')} – ₹${fullRate.toLocaleString('en-IN')} / hr`
      : `₹${fullRate.toLocaleString('en-IN')} / hr`,
    imageUrl: media?.url ?? null,
    imageAlt: media?.alt ?? fac.name,
    operationalStatus: fac.operational_status ?? 'ACTIVE',
    rateBannerText: `${rateCategoryLabel}: ₹${fullRate.toLocaleString('en-IN')}/hr Full${
      fac.is_partitionable ? ` • ₹${halfRate.toLocaleString('en-IN')}/hr Half Court` : ''
    }`,
    policyBadge: `${fac.is_partitionable ? 'Partitionable' : 'Hourly'} • Max ${fac.daily_user_hour_cap} hrs/day`,
    operatingHoursText: `Operating Hours: ${formatTime12h(fac.operating_start)} – ${formatTime12h(
      fac.operating_end,
    )} • Max ${fac.daily_user_hour_cap} hrs/day • Instant booking confirmation & GST receipt`,
    dailyUserHourCap: fac.daily_user_hour_cap,
    isPartitionable: fac.is_partitionable,
    courtOptions,
  };
}

function mapOperationalToSlotUiStatus(
  rawStatus: 'AVAILABLE' | 'ALREADY_BOOKED',
  opStatus?: PublicSlotOperationalStatus,
): BookingTimeSlot['status'] {
  if (opStatus === 'FACILITY_MAINTENANCE' || opStatus === 'FACILITY_CLOSED') {
    return 'facility_unavailable';
  }
  if (opStatus === 'BLOCKED_MAINTENANCE') {
    return 'blocked_maintenance';
  }
  if (opStatus === 'RESERVED_DEPARTMENT') {
    return 'reserved_department';
  }
  if (rawStatus === 'ALREADY_BOOKED' || opStatus === 'BOOKED') {
    return 'booked';
  }
  return 'available';
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();

  const initialCode = normalizeVenueCode(searchParams.get('venue')) ?? 'POLICE_TURF';

  const rollingDates = useMemo(() => buildRollingDates(), []);
  const todayIso = rollingDates[1]?.id ?? formatDateIso(new Date());

  const [facilities, setFacilities] = useState<ApiFacility[]>([]);
  const [myBookings, setMyBookings] = useState<ApiSlotBooking[]>([]);
  const [selectedVenueCode, setSelectedVenueCode] = useState<string>(initialCode);
  const [selectedCourtId, setSelectedCourtId] = useState<BookingCourtOption['id']>('full');
  const [selectedDateId, setSelectedDateId] = useState<string>(todayIso);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [slotsData, setSlotsData] = useState<ApiPublicSlotsResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [reserving, setReserving] = useState<boolean>(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    let active = true;
    facilitiesApi
      .list()
      .then((res) => {
        if (active) setFacilities(res.facilities);
      })
      .catch(() => {
        // Keep fallback venues if offline
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setMyBookings([]);
      return;
    }
    let active = true;
    bookingsApi
      .getMy()
      .then((res) => {
        if (active) setMyBookings(res.bookings);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  // Build ALL hourly-bookable facilities dynamically (core 3 + any custom Admin-created venues)
  const venues = useMemo<BookingVenue[]>(() => {
    const hourlyFacilities = facilities.filter(
      (f) => f.booking_mode !== 'MONTHLY_MEMBERSHIP_ONLY' && f.code !== 'SYNTHETIC_TRACK',
    );
    if (hourlyFacilities.length === 0) {
      return fallbackBookingVenues;
    }

    // Order POLICE_TURF, FOOTBALL_GROUND, BADMINTON_COURT first, then custom venues
    const coreOrder = ['POLICE_TURF', 'FOOTBALL_GROUND', 'BADMINTON_COURT'];
    const sorted = [...hourlyFacilities].sort((a, b) => {
      const ia = coreOrder.indexOf(a.code);
      const ib = coreOrder.indexOf(b.code);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.map(mapFacilityToBookingVenue);
  }, [facilities]);

  const activeVenue = venues.find((v) => v.code === selectedVenueCode) ?? venues[0];
  const activeCourt =
    activeVenue.courtOptions.find((c) => c.id === selectedCourtId) ??
    activeVenue.courtOptions[0];

  useEffect(() => {
    if (!activeVenue.courtOptions.some((c) => c.id === selectedCourtId)) {
      setSelectedCourtId('full');
    }
  }, [activeVenue, selectedCourtId]);

  const activeFacilityCode = activeVenue.code;
  const activePartition = activeCourt.partition;

  useEffect(() => {
    let active = true;
    setLoadingSlots(true);
    setInlineError(null);
    facilitiesApi
      .getPublicSlots(activeFacilityCode, selectedDateId)
      .then((res) => {
        if (active) setSlotsData(res);
      })
      .catch((err) => {
        if (active) {
          setSlotsData(null);
          setInlineError(
            err instanceof ApiError ? err.message : 'Unable to fetch live slot availability.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [activeFacilityCode, selectedDateId]);

  // Sync live operational status from both facilities list and slots response
  const effectiveOperationalStatus: FacilityOperationalStatus =
    slotsData?.facility?.operational_status ?? activeVenue.operationalStatus;

  const effectiveVenue: BookingVenue = useMemo(
    () => ({
      ...activeVenue,
      operationalStatus: effectiveOperationalStatus,
    }),
    [activeVenue, effectiveOperationalStatus],
  );

  const mappedSlots = useMemo<BookingTimeSlot[]>(() => {
    if (!slotsData?.slots) {
      return [];
    }

    return slotsData.slots.map((slot) => {
      const partitionEntry = slot.partitions?.[activePartition];
      const rawStatus = partitionEntry?.status ?? slot.status;
      const opStatus = partitionEntry?.operational_status ?? slot.operational_status ?? (rawStatus === 'ALREADY_BOOKED' ? 'BOOKED' : 'OPEN');
      const opLabel = partitionEntry?.operational_label ?? slot.operational_label ?? null;
      const opReason = partitionEntry?.operational_reason ?? slot.operational_reason ?? null;
      const startHour = Number.parseInt(slot.start_time.split(':')[0] ?? '6', 10);
      const isMorning = startHour < 12;
      const isFloodlit = startHour >= 18;

      return {
        id: slot.start_time,
        startTime: slot.start_time,
        endTime: slot.end_time,
        session: isMorning ? 'morning' : 'evening',
        timeLabel: `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`,
        summaryTimeLabel: `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`,
        status: mapOperationalToSlotUiStatus(rawStatus, opStatus),
        operationalStatus: opStatus,
        operationalLabel: opLabel,
        operationalReason: opReason,
        sessionTag: isFloodlit ? 'Floodlit' : isMorning ? 'Morning' : 'Daylight',
        durationLabel: `1 Hour (${activeCourt.shortName})`,
      };
    });
  }, [slotsData, activePartition, activeCourt.shortName]);

  useEffect(() => {
    const firstAvailable = mappedSlots.find((s) => s.status === 'available');
    setSelectedSlotId((prev) => {
      const stillValid = mappedSlots.find((s) => s.id === prev && s.status === 'available');
      return stillValid ? prev : firstAvailable?.id ?? '';
    });
  }, [mappedSlots]);

  const usedHoursOnDate = useMemo(() => {
    if (!user) return 0;
    return myBookings
      .filter(
        (b) =>
          b.facility?.code === activeFacilityCode &&
          b.booking_date_formatted === selectedDateId &&
          (b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT'),
      )
      .reduce((sum, b) => {
        const [sh, sm] = b.start_time_formatted.split(':').map(Number);
        const [eh, em] = b.end_time_formatted.split(':').map(Number);
        return sum + Math.max(1, (eh * 60 + em - (sh * 60 + sm)) / 60);
      }, 0);
  }, [user, myBookings, activeFacilityCode, selectedDateId]);

  const dailyCapReached =
    Boolean(user) &&
    effectiveVenue.dailyUserHourCap > 0 &&
    usedHoursOnDate >= effectiveVenue.dailyUserHourCap;

  const activeDate =
    rollingDates.find((d) => d.id === selectedDateId) ?? rollingDates[1] ?? rollingDates[0];
  const activeSlot = mappedSlots.find((s) => s.id === selectedSlotId) ?? null;

  const datesWithAvailability = useMemo<BookingDateOption[]>(() => {
    const availCount = mappedSlots.filter((s) => s.status === 'available').length;
    return rollingDates.map((d) =>
      d.id === selectedDateId && !d.isPast
        ? {
            ...d,
            slotsCountLabel:
              effectiveOperationalStatus !== 'ACTIVE'
                ? effectiveOperationalStatus === 'CLOSED'
                  ? 'Closed'
                  : 'Maint.'
                : `${availCount} Free`,
          }
        : d,
    );
  }, [rollingDates, selectedDateId, mappedSlots, effectiveOperationalStatus]);

  const dynamicMeta = useMemo<BookingPortalMeta>(() => {
    const morningAvail = mappedSlots.filter(
      (s) => s.session === 'morning' && s.status === 'available',
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
        : effectiveOperationalStatus === 'MAINTENANCE'
          ? `${activeVenue.name} • Under Maintenance`
          : effectiveOperationalStatus === 'CLOSED'
            ? `${activeVenue.name} • Closed`
            : `Live Schedule • ${activeFacilityCode}`,
    };
  }, [mappedSlots, selectedDateId, loadingSlots, activeFacilityCode, effectiveOperationalStatus, activeVenue.name]);

  const registrant = useMemo<BookingRegistrant>(() => {
    if (!user) return guestBookingRegistrant;
    const isGovt = user.role === 'GOVT_PERSONNEL';
    return {
      name: user.full_name,
      registrantId: `@${user.username}`,
      email: user.email || 'Active Member Account',
      accountBadge: isGovt ? 'Govt / Police • Concession' : 'General Public',
      isGovt,
    };
  }, [user]);

  const disabledReason = useMemo<string | null>(() => {
    if (effectiveOperationalStatus === 'MAINTENANCE') {
      return t('Venue Under Maintenance', 'വേദി അറ്റകുറ്റപ്പണിയിലാണ്');
    }
    if (effectiveOperationalStatus === 'CLOSED') {
      return t('Venue Currently Closed', 'വേദി അടച്ചിരിക്കുകയാണ്');
    }
    if (dailyCapReached) {
      return t(
        `Daily Limit Reached (${effectiveVenue.dailyUserHourCap}h/day)`,
        `പ്രതിദിന പരിധി പൂർത്തിയായി (${effectiveVenue.dailyUserHourCap} മണിക്കൂർ)`,
      );
    }
    if (!activeSlot || activeSlot.status !== 'available') {
      return t('Select an Available Slot', 'ലഭ്യമായ സ്ലോട്ട് തിരഞ്ഞെടുക്കുക');
    }
    return null;
  }, [effectiveOperationalStatus, dailyCapReached, effectiveVenue.dailyUserHourCap, activeSlot, t]);

  const handleSelectVenue = (venueCode: string) => {
    setSelectedVenueCode(venueCode);
    setInlineError(null);
    setSearchParams({ venue: venueCode }, { replace: true });
  };

  const handleSelectCourt = (courtId: BookingCourtOption['id']) => {
    setSelectedCourtId(courtId);
    setInlineError(null);
  };

  const handleSelectDate = (dateId: string) => {
    setSelectedDateId(dateId);
    setInlineError(null);
  };

  const handleSelectSlot = (slotId: string) => {
    setSelectedSlotId(slotId);
    setInlineError(null);
  };

  const handleProceedToPayment = async () => {
    if (reserving || disabledReason) return;
    if (!user) {
      showToast('Please sign in or register first to book a facility slot.');
      navigate('/login', { state: { from: `/bookings?venue=${activeFacilityCode}` } });
      return;
    }

    if (!activeSlot || activeSlot.status !== 'available') {
      setInlineError('This slot is unavailable. Please choose an open hourly slot.');
      return;
    }

    setReserving(true);
    setInlineError(null);

    try {
      const reserveRes = await bookingsApi.reserve({
        facility_code: activeFacilityCode,
        booking_date: selectedDateId,
        start_time: activeSlot.startTime,
        end_time: activeSlot.endTime,
        court_partition: activePartition,
      });

      const settleRes = await paymentsApi.settle({
        reference_type: 'SLOT_BOOKING',
        reference_id: reserveRes.booking.id,
      });

      const breakdown =
        settleRes.receipt?.pricing_breakdown ??
        settleRes.payment.pricing_breakdown ??
        reserveRes.booking.pricing_breakdown ?? {
          base_fee: activeCourt.standardHourlyRate.toFixed(2),
          concession_discount: activeCourt.concessionDiscount.toFixed(2),
          concession_percent: activeCourt.concessionPercent,
          taxable_subtotal: Number(settleRes.payment.base_amount).toFixed(2),
          gst_rate: activeCourt.gstRate,
          gst_amount: Number(settleRes.payment.gst_amount).toFixed(2),
          final_total_paid: Number(settleRes.payment.total_amount).toFixed(2),
        };

      const receiptData: BookingReceiptData = {
        bookingId: reserveRes.booking.id,
        bookingReference:
          settleRes.receipt?.booking_or_pass_code ?? reserveRes.booking.booking_code,
        receiptNo: settleRes.receipt?.receipt_no ?? settleRes.payment.receipt_no,
        status: settleRes.slot_booking?.status ?? 'CONFIRMED',
        venueName:
          settleRes.receipt?.facility_name ??
          reserveRes.booking.facility?.name ??
          effectiveVenue.name,
        facilityCode: activeFacilityCode,
        courtPartition: activePartition,
        courtModeLabel: formatCourtModeLabel(activePartition, effectiveVenue.isPartitionable),
        dateLabel: activeDate.ticketDateLabel,
        timeSlotLabel: activeSlot.summaryTimeLabel,
        sessionNote: activeSlot.sessionTag,
        memberName: user.full_name,
        memberUsername: user.username,
        userCategory: user.role === 'GOVT_PERSONNEL' ? 'GOVT_PERSONNEL' : 'PUBLIC',
        paymentMode: settleRes.payment.payment_mode,
        paidAt: settleRes.receipt?.issued_at ?? settleRes.payment.created_at,
        pricingBreakdown: breakdown,
      };

      try {
        window.sessionStorage.setItem(LATEST_BOOKING_RECEIPT_KEY, JSON.stringify(receiptData));
      } catch {
        // Ignore storage quota errors
      }

      navigate(`/bookings/ticket?code=${encodeURIComponent(receiptData.bookingReference)}`, {
        state: receiptData,
      });
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Slot reservation or payment failed. Please refresh slots and try again.';
      setInlineError(msg);
      showToast(msg);

      // Live refresh slots and facilities state after any admin change / conflict
      facilitiesApi
        .getPublicSlots(activeFacilityCode, selectedDateId)
        .then((res) => setSlotsData(res))
        .catch(() => {});
      facilitiesApi
        .list()
        .then((res) => setFacilities(res.facilities))
        .catch(() => {});
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="bookings-page-container flex flex-col w-full text-[#0F172A] antialiased">
      <div className="relative w-full max-w-[1200px] mx-auto px-4 md:px-6 pt-4 md:pt-7 pb-14 flex flex-col gap-5 md:gap-6">
        {/* Editorial Header Context & Live Sync Pill */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div
              style={{ animationDelay: '30ms' }}
              className="bookings-rise inline-flex items-center gap-1.5 text-[#165DF5] text-[12.5px] font-semibold tracking-[0.01em]"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={2.1} />
              <span>
                {t(
                  dynamicMeta.portalBadge,
                  'ഔദ്യോഗിക വകുപ്പുതല ബുക്കിംഗ് പോർട്ടൽ • ഉടൻ പ്രവേശനം',
                )}
              </span>
            </div>
            <h1 className="font-display text-[30px] sm:text-[36px] md:text-[42px] font-extrabold text-[#0F172A] tracking-[-0.03em] leading-[1.08]">
              <span className="bookings-text-mask">
                <span className="bookings-text-reveal" style={{ animationDelay: '70ms' }}>
                  {t(dynamicMeta.title, 'കായിക വേദിയും മണിക്കൂർ സ്ലോട്ട് ബുക്കിംഗും')}
                </span>
              </span>
            </h1>
          </div>

          <div
            style={{ animationDelay: '120ms' }}
            className="bookings-rise inline-flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-slate-200/85 px-3.5 py-2 rounded-full shadow-[0_6px_18px_-10px_rgba(15,23,42,0.1)] self-start md:self-auto"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${
                  effectiveOperationalStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  effectiveOperationalStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-[12.5px] font-semibold text-[#334155]">
              {dynamicMeta.statusPillText}
            </span>
          </div>
        </header>

        {/* 1. Dynamic Venue Selector Cards & Policy Banner */}
        <VenueSelectorCards
          venues={venues}
          selectedVenueId={effectiveVenue.id}
          selectedCourtId={activeCourt.id}
          onSelectVenue={handleSelectVenue}
          onSelectCourt={handleSelectCourt}
        />

        {/* 2. Main Booking Two-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">
          <SlotSelectionWorkspace
            meta={dynamicMeta}
            venueName={effectiveVenue.name}
            venueOperationalStatus={effectiveOperationalStatus}
            loadingSlots={loadingSlots}
            dailyCapInfo={
              user
                ? {
                    usedHours: usedHoursOnDate,
                    capHours: effectiveVenue.dailyUserHourCap,
                  }
                : null
            }
            dates={datesWithAvailability}
            selectedDateId={selectedDateId}
            onSelectDate={handleSelectDate}
            slots={mappedSlots}
            selectedSlotId={activeSlot?.id ?? ''}
            onSelectSlot={handleSelectSlot}
            hourlyRate={activeCourt.hourlyRate}
          />

          <BookingSummaryCard
            meta={dynamicMeta}
            venue={effectiveVenue}
            court={activeCourt}
            date={activeDate}
            slot={activeSlot}
            registrant={registrant}
            reserving={reserving}
            disabledReason={disabledReason}
            inlineError={inlineError}
            onProceedToPayment={handleProceedToPayment}
          />
        </div>
      </div>

      {/* Interactive Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bookings-toast-enter">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-[#0F172A] text-white border border-white/10 shadow-[0_18px_40px_-10px_rgba(15,23,42,0.45)] max-w-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.2} />
            <span className="text-[13.5px] font-medium leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
