import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  bookingsApi,
  facilitiesApi,
  membershipsApi,
  type ApiFacility,
  type ApiMembership,
  type ApiSlotBooking,
} from '@/api/client';
import { ActivitySummaryCard } from '@/components/home/ActivitySummaryCard';
import { HourlyFacilityCard } from '@/components/home/HourlyFacilityCard';
import { TrackFacilityCard } from '@/components/home/TrackFacilityCard';
import { UpcomingBookingBanner } from '@/components/home/UpcomingBookingBanner';
import { useAuth } from '@/context/AuthContext';
import {
  currentUser,
  homeActiveMembership,
  homeActiveMembershipPreset,
  homeActivitySummary,
  homeGreeting,
  homeHourlyFacilities,
  homeTrackFacility,
  homeUpcomingBooking,
  homeUpcomingBookingPreset,
} from '@/data/mockData';
import type {
  HomeActiveMembership,
  HomeActivitySummary,
  HomeHourlyFacility,
  HomeHourlyFacilityId,
  HomeTrackFacility,
  HomeUpcomingBooking,
} from '@/types/home';
import '@/styles/home.css';

interface HomePageProps {
  activeMembership?: HomeActiveMembership | null;
  upcomingBooking?: HomeUpcomingBooking | null;
}

const hourlyGridClasses: Record<HomeHourlyFacilityId, string> = {
  'football-ground': 'col-span-1 h-[190px] md:h-auto md:col-span-1 md:col-start-2 md:row-start-1',
  'police-turf': 'col-span-1 h-[190px] md:h-auto md:col-span-1 md:col-start-2 md:row-start-2',
  'badminton-court': 'col-span-2 h-[150px] md:h-auto md:col-span-1 md:col-start-3 md:row-start-1',
};

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return 'Active';
  const parsed = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${mStr ?? '00'} ${suffix}`;
}

function getDynamicGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Public Citizen Home screen (`/`).
 * Merges:
 * - `kannur_city_police_home_default`
 * - `kannur_city_police_home_hover`
 * - `kannur_city_police_home_active_membership`
 * - `kannur_city_police_home_upcoming_booking`
 * - `kannur_city_police_mobile_home_default`
 * (Header account menu and mobile slide-down sheet are rendered by `PublicLayout`.)
 */
export default function HomePage({ activeMembership, upcomingBooking }: HomePageProps = {}) {
  const [searchParams] = useSearchParams();
  const stateParam = searchParams.get('state');
  const { user } = useAuth();

  const [facilities, setFacilities] = useState<ApiFacility[]>([]);
  const [myMemberships, setMyMemberships] = useState<ApiMembership[]>([]);
  const [myBookings, setMyBookings] = useState<ApiSlotBooking[]>([]);

  useEffect(() => {
    let active = true;
    facilitiesApi
      .list()
      .then((res) => {
        if (active) setFacilities(res.facilities);
      })
      .catch(() => {
        // Fallback to static facility descriptors if offline
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setMyMemberships([]);
      setMyBookings([]);
      return;
    }

    Promise.all([
      membershipsApi.getMy().catch(() => ({ memberships: [] as ApiMembership[] })),
      bookingsApi.getMy().catch(() => ({ bookings: [] as ApiSlotBooking[] })),
    ]).then(([memRes, bookRes]) => {
      if (!active) return;
      setMyMemberships(memRes.memberships);
      setMyBookings(bookRes.bookings);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const trackFacilityCardData = useMemo<HomeTrackFacility>(() => {
    const liveTrack = facilities.find((f) => f.code === 'SYNTHETIC_TRACK');
    if (!liveTrack) return homeTrackFacility;
    const tariff = liveTrack.tariffs[0];
    return {
      ...homeTrackFacility,
      subtitle: tariff
        ? `Monthly membership • ₹${Number(tariff.base_price).toLocaleString('en-IN')}/mo`
        : homeTrackFacility.subtitle,
    };
  }, [facilities]);

  const hourlyFacilitiesCardData = useMemo<HomeHourlyFacility[]>(() => {
    const codeById: Record<HomeHourlyFacilityId, ApiFacility['code']> = {
      'football-ground': 'FOOTBALL_GROUND',
      'police-turf': 'POLICE_TURF',
      'badminton-court': 'BADMINTON_COURT',
    };
    const routeById: Record<HomeHourlyFacilityId, string> = {
      'football-ground': '/bookings?venue=football-ground',
      'police-turf': '/bookings?venue=police-turf',
      'badminton-court': '/bookings?venue=indoor-badminton',
    };

    return homeHourlyFacilities.map((item) => {
      const live = facilities.find((f) => f.code === codeById[item.id]);
      const baseTariff = live?.tariffs.find((t) => t.booking_type === 'FULL_COURT') ?? live?.tariffs[0];
      return {
        ...item,
        to: routeById[item.id],
        subtitle: live && baseTariff
          ? `${live.is_partitionable ? 'Full / half court' : 'Book by hour'} • ₹${Number(baseTariff.base_price).toLocaleString('en-IN')}/hr`
          : item.subtitle,
      };
    });
  }, [facilities]);

  const liveMembershipBanner = useMemo<HomeActiveMembership | null>(() => {
    const activePass =
      myMemberships.find((m) => m.status === 'ACTIVE') ??
      myMemberships.find((m) => m.status === 'APPROVED_UNPAID') ??
      myMemberships.find((m) => m.status === 'PENDING_APPROVAL');

    if (!activePass) return null;

    if (activePass.status === 'ACTIVE') {
      return {
        facilityName: 'Synthetic Track',
        membershipLabel: `Track pass • ${activePass.pass_code}`,
        validUntilText: `Active until ${formatDisplayDate(activePass.end_date)}`,
        ctaLabel: 'View card',
        to: '/membership/pass',
        imageUrl: homeTrackFacility.activeMembershipImageUrl,
      };
    }

    if (activePass.status === 'APPROVED_UNPAID') {
      return {
        facilityName: 'Synthetic Track',
        membershipLabel: `Approved • ${activePass.pass_code}`,
        validUntilText: 'Payment unlocked — settle fee to activate',
        ctaLabel: 'Pay & Activate',
        to: '/membership',
        imageUrl: homeTrackFacility.activeMembershipImageUrl,
      };
    }

    return {
      facilityName: 'Synthetic Track',
      membershipLabel: `Pending Review • ${activePass.pass_code}`,
      validUntilText: 'Awaiting officer verification',
      ctaLabel: 'View status',
      to: '/membership',
      imageUrl: homeTrackFacility.imageUrl,
    };
  }, [myMemberships]);

  const liveUpcomingBooking = useMemo<HomeUpcomingBooking | null>(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const confirmedFuture = myBookings
      .filter(
        (b) =>
          b.status === 'CONFIRMED' &&
          b.booking_date_formatted >= todayStr
      )
      .sort((a, b) =>
        `${a.booking_date_formatted}T${a.start_time_formatted}`.localeCompare(
          `${b.booking_date_formatted}T${b.start_time_formatted}`
        )
      );

    const next = confirmedFuture[0];
    if (!next) return null;

    return {
      label: 'Next booking',
      facilityName: next.facility?.name ?? 'Sports Facility',
      dateTimeText: `${formatDisplayDate(next.booking_date_formatted)}, ${formatTime12h(
        next.start_time_formatted
      )} • ${next.booking_code}`,
      ctaLabel: 'View QR',
      to: `/bookings/ticket?code=${encodeURIComponent(next.booking_code)}`,
    };
  }, [myBookings]);

  const activitySummary = useMemo<HomeActivitySummary>(() => {
    if (!user) return homeActivitySummary;
    const confirmedBookings = myBookings.filter((b) => b.status === 'CONFIRMED');
    const totalHours = confirmedBookings.reduce((sum, b) => {
      const [sh, sm] = b.start_time_formatted.split(':').map(Number);
      const [eh, em] = b.end_time_formatted.split(':').map(Number);
      const hrs = Math.max(1, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
      return sum + hrs;
    }, 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const upcomingCount = confirmedBookings.filter(
      (b) => b.booking_date_formatted >= todayStr
    ).length;

    return {
      title: 'Your activity',
      periodLabel: 'This month',
      stats: [
        { id: 'bookings', value: confirmedBookings.length, label: 'Bookings' },
        { id: 'hours-played', value: Math.round(totalHours), label: 'Hours booked' },
        { id: 'coming-up', value: upcomingCount, label: 'Coming up' },
      ],
    };
  }, [user, myBookings]);

  const resolvedActiveMembership: HomeActiveMembership | null =
    activeMembership !== undefined
      ? activeMembership
      : stateParam === 'active-membership'
        ? homeActiveMembershipPreset
        : liveMembershipBanner ?? homeActiveMembership;

  const resolvedUpcomingBooking: HomeUpcomingBooking | null =
    upcomingBooking !== undefined
      ? upcomingBooking
      : stateParam === 'upcoming-booking'
        ? homeUpcomingBookingPreset
        : liveUpcomingBooking ?? homeUpcomingBooking;

  const greetingText = user ? getDynamicGreeting() : homeGreeting;
  const displayName = user?.full_name ?? currentUser.displayName;

  return (
    <div className="w-full max-w-[420px] md:max-w-[1200px] mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-6 relative z-10 flex-1 flex flex-col justify-start gap-4 md:gap-0">
      {/* Greeting */}
      <section className="mb-1 md:mb-8">
        <p className="text-[15px] md:text-[17px] text-[#6B7280] font-normal mb-0.5 md:mb-1">
          {greetingText}
        </p>
        <h2 className="text-[36px] md:text-[56px] font-bold text-[#111418] tracking-tight leading-none">
          {displayName}
        </h2>
      </section>

      {/* Optional Upcoming Booking Banner (`kannur_city_police_home_upcoming_booking`) */}
      {resolvedUpcomingBooking && <UpcomingBookingBanner booking={resolvedUpcomingBooking} />}

      {/* Responsive Bento Grid (2 cols on mobile, 3x2 560px Bento on desktop) */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:grid-rows-2 md:gap-5 md:h-[560px] items-stretch">
        {/* Col 1 (Rows 1-2 on desktop): Synthetic Track */}
        <TrackFacilityCard
          facility={trackFacilityCardData}
          activeMembership={resolvedActiveMembership}
        />

        {/* Col 2 (Rows 1-2) & Col 3 (Row 1): Hourly Facilities */}
        {hourlyFacilitiesCardData.map((facility) => (
          <HourlyFacilityCard
            key={facility.id}
            facility={facility}
            gridPositionClass={hourlyGridClasses[facility.id]}
          />
        ))}

        {/* Col 3 (Row 2 on desktop, full-width bottom card on mobile): Your activity */}
        <ActivitySummaryCard summary={activitySummary} />
      </div>
    </div>
  );
}
