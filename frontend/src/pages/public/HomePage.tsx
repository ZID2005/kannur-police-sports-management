import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarPlus,
  Clock,
  CreditCard,
  ReceiptText,
  Shield,
  ShieldCheck,
  UserCheck,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import {
  bookingsApi,
  facilitiesApi,
  membershipsApi,
  type ApiFacility,
  type ApiMembership,
  type ApiSlotBooking,
} from '@/api/client';
import { ActivitySummaryCard } from '@/components/home/ActivitySummaryCard';
import { GuestAccessCard } from '@/components/home/GuestAccessCard';
import { GuestHomeHero } from '@/components/home/GuestHomeHero';
import { HourlyFacilityCard } from '@/components/home/HourlyFacilityCard';
import { TrackFacilityCard } from '@/components/home/TrackFacilityCard';
import { UpcomingBookingBanner } from '@/components/home/UpcomingBookingBanner';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  homeActiveMembership,
  homeActiveMembershipPreset,
  homeActivitySummary,
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

const CORE_FACILITY_CODES = new Set([
  'SYNTHETIC_TRACK',
  'FOOTBALL_GROUND',
  'POLICE_TURF',
  'BADMINTON_COURT',
]);

const hourlyGridClasses: Record<HomeHourlyFacilityId, string> = {
  'football-ground':
    'col-span-1 h-[200px] md:h-auto md:col-span-1 md:col-start-2 md:row-start-1',
  'police-turf':
    'col-span-1 h-[200px] md:h-auto md:col-span-1 md:col-start-2 md:row-start-2',
  'badminton-court':
    'col-span-2 h-[180px] md:h-auto md:col-span-1 md:col-start-3 md:row-start-1',
};

const hourlyDelayById: Record<HomeHourlyFacilityId, number> = {
  'football-ground': 190,
  'police-turf': 250,
  'badminton-court': 230,
};

const howItWorksSteps = [
  {
    step: '01',
    icon: UserCheck,
    title: 'Create your active account',
    titleMl: 'സജീവ പോർട്ടൽ അക്കൗണ്ട് തുടങ്ങുക',
    description:
      'Sign up as General Public or Govt / Police in seconds — your account activates immediately with no approval wait.',
    descriptionMl:
      'പൊതുജനമായോ സർക്കാർ / പോലീസ് വിഭാഗത്തിലോ നിമിഷങ്ങൾക്കുള്ളിൽ രജിസ്റ്റർ ചെയ്യുക — കാത്തിരിപ്പില്ലാതെ ഉടൻ സജീവമാകും.',
  },
  {
    step: '02',
    icon: CalendarPlus,
    title: 'Pick a live slot or track pass',
    titleMl: 'തത്സമയ സ്ലോട്ടോ ട്രാക്ക് പാസ്സോ തിരഞ്ഞെടുക്കുക',
    description:
      'Browse real-time availability for Football Ground, Turf, Badminton, or newly added complex venues.',
    descriptionMl:
      'ഫുട്ബോൾ ഗ്രൗണ്ട്, ടർഫ്, ബാഡ്മിന്റൺ അല്ലെങ്കിൽ പുതിയ വേദികളിലെ തത്സമയ ലഭ്യത പരിശോധിച്ച് ബുക്ക് ചെയ്യുക.',
  },
  {
    step: '03',
    icon: ReceiptText,
    title: 'Get instant booking receipt',
    titleMl: 'ഉടൻ ബുക്കിംഗ് ഫീസ് രസീത് നേടുക',
    description:
      'Receive an official Booking Confirmation & GST Fee Receipt with your reference ID ready to print anytime.',
    descriptionMl:
      'ബുക്കിംഗ് റഫറൻസ് ഐഡിയും GST വിഭജനവും അടങ്ങിയ ഔദ്യോഗിക ഫീസ് രസീത് ഉടൻ ലഭിക്കും.',
  },
] as const;

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
 * Member Home screen (`/`).
 * Renders public landing when signed out and live personalized dashboard when signed in.
 */
export default function HomePage({ activeMembership, upcomingBooking }: HomePageProps = {}) {
  const [searchParams] = useSearchParams();
  const stateParam = searchParams.get('state');
  const { user } = useAuth();
  const { lang, t } = useLanguage();

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
        // Fallback to static descriptors if offline
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
    const baseSub = t(homeTrackFacility.subtitle, 'പ്രതിമാസ അംഗത്വം');
    if (!liveTrack) return { ...homeTrackFacility, subtitle: baseSub };
    const tariff = liveTrack.tariffs[0];
    return {
      ...homeTrackFacility,
      title: liveTrack.name || homeTrackFacility.title,
      operationalStatus: liveTrack.operational_status ?? 'ACTIVE',
      subtitle: tariff
        ? `${t('Monthly membership', 'പ്രതിമാസ അംഗത്വം')} • ₹${Number(tariff.base_price).toLocaleString('en-IN')}/${t('mo', 'മാസം')}`
        : baseSub,
    };
  }, [facilities, t]);

  const hourlyFacilitiesCardData = useMemo<HomeHourlyFacility[]>(() => {
    const codeById: Record<HomeHourlyFacilityId, ApiFacility['code']> = {
      'football-ground': 'FOOTBALL_GROUND',
      'police-turf': 'POLICE_TURF',
      'badminton-court': 'BADMINTON_COURT',
    };
    const routeById: Record<HomeHourlyFacilityId, string> = {
      'football-ground': '/bookings?venue=FOOTBALL_GROUND',
      'police-turf': '/bookings?venue=POLICE_TURF',
      'badminton-court': '/bookings?venue=BADMINTON_COURT',
    };
    const fallbackSubMl: Record<HomeHourlyFacilityId, string> = {
      'football-ground': 'മണിക്കൂർ നിരക്കിൽ ബുക്ക് ചെയ്യുക',
      'police-turf': 'ഫുൾ അല്ലെങ്കിൽ ഹാഫ് കോർട്ട്',
      'badminton-court': 'കോർട്ട് അടിസ്ഥാനത്തിൽ ബുക്ക് ചെയ്യുക',
    };

    return homeHourlyFacilities.map((item) => {
      const live = facilities.find((f) => f.code === codeById[item.id]);
      const baseTariff =
        live?.tariffs.find((tItem) => tItem.booking_type === 'FULL_COURT') ?? live?.tariffs[0];
      return {
        ...item,
        to: routeById[item.id],
        operationalStatus: live?.operational_status ?? 'ACTIVE',
        subtitle:
          live && baseTariff
            ? `${live.is_partitionable ? t('Full / half court', 'ഫുൾ / ഹാഫ് കോർട്ട്') : t('Book by hour', 'മണിക്കൂർ നിരക്ക്')} • ₹${Number(baseTariff.base_price).toLocaleString('en-IN')}/${t('hr', 'മണിക്കൂർ')}`
            : t(item.subtitle, fallbackSubMl[item.id]),
      };
    });
  }, [facilities, t]);

  const customFacilities = useMemo<ApiFacility[]>(() => {
    return facilities.filter((f) => !CORE_FACILITY_CODES.has(f.code));
  }, [facilities]);

  const liveMembershipBanner = useMemo<HomeActiveMembership | null>(() => {
    if (!user) return null;
    const activePass =
      myMemberships.find((m) => m.status === 'ACTIVE') ??
      myMemberships.find((m) => m.status === 'APPROVED_UNPAID');

    if (!activePass) return null;

    if (activePass.status === 'ACTIVE') {
      return {
        facilityName: 'Synthetic Track',
        membershipLabel: `Track membership • ${activePass.pass_code}`,
        validUntilText: `Active until ${formatDisplayDate(activePass.end_date)}`,
        ctaLabel: 'View Receipt',
        to: '/membership/pass',
        imageUrl: homeTrackFacility.activeMembershipImageUrl,
      };
    }

    return {
      facilityName: 'Synthetic Track',
      membershipLabel: `Ready to activate • ${activePass.pass_code}`,
      validUntilText: 'Complete fee payment to activate pass',
      ctaLabel: 'Pay & Activate',
      to: '/membership',
      imageUrl: homeTrackFacility.activeMembershipImageUrl,
    };
  }, [user, myMemberships]);

  const liveUpcomingBooking = useMemo<HomeUpcomingBooking | null>(() => {
    if (!user) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const confirmedFuture = myBookings
      .filter((b) => b.status === 'CONFIRMED' && b.booking_date_formatted >= todayStr)
      .sort((a, b) =>
        `${a.booking_date_formatted}T${a.start_time_formatted}`.localeCompare(
          `${b.booking_date_formatted}T${b.start_time_formatted}`,
        ),
      );

    const next = confirmedFuture[0];
    if (!next) return null;

    return {
      label: 'Next confirmed booking',
      facilityName: next.facility?.name ?? 'Sports Facility',
      dateTimeText: `${formatDisplayDate(next.booking_date_formatted)}, ${formatTime12h(
        next.start_time_formatted,
      )} • ${next.booking_code}`,
      ctaLabel: 'View Receipt',
      to: `/bookings/ticket?code=${encodeURIComponent(next.booking_code)}`,
    };
  }, [user, myBookings]);

  const activitySummary = useMemo<HomeActivitySummary>(() => {
    if (!user) return homeActivitySummary;
    const confirmedBookings = myBookings.filter((b) => b.status === 'CONFIRMED');
    const totalHours = confirmedBookings.reduce((sum, b) => {
      const [sh, sm] = b.start_time_formatted.split(':').map(Number);
      const [eh, em] = b.end_time_formatted.split(':').map(Number);
      const hrs = Math.max(1, (eh * 60 + em - (sh * 60 + sm)) / 60);
      return sum + hrs;
    }, 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const upcomingCount = confirmedBookings.filter(
      (b) => b.booking_date_formatted >= todayStr,
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
        : user
          ? liveMembershipBanner ?? homeActiveMembership
          : null;

  const resolvedUpcomingBooking: HomeUpcomingBooking | null =
    upcomingBooking !== undefined
      ? upcomingBooking
      : stateParam === 'upcoming-booking'
        ? homeUpcomingBookingPreset
        : user
          ? liveUpcomingBooking ?? homeUpcomingBooking
          : null;

  const rawGreeting = getDynamicGreeting();
  const greetingText =
    rawGreeting === 'Good morning'
      ? t('Good morning', 'സുപ്രഭാതം')
      : rawGreeting === 'Good afternoon'
        ? t('Good afternoon', 'ശുഭ ഉച്ച')
        : t('Good evening', 'ശുഭ സായാഹ്നം');

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 pt-3 md:pt-5 pb-12 md:pb-16 relative z-10 flex-1 flex flex-col justify-start">
      {/* Top Section: Guest Editorial Hero OR Signed-In Personal Greeting */}
      {user ? (
        <section className="pt-2 pb-5 md:pt-5 md:pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <p
                style={{ animationDelay: '40ms' }}
                className="animate-fade-rise text-[14px] md:text-[15px] font-semibold text-[#0053CD] tracking-[0.01em]"
              >
                {greetingText}
              </p>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  user.role === 'GOVT_PERSONNEL'
                    ? 'bg-blue-50 border-blue-200 text-[#0F50DC]'
                    : 'bg-white/85 border-slate-200 text-[#334155]'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {user.role === 'GOVT_PERSONNEL'
                  ? t('Govt / Police', 'സർക്കാർ / പോലീസ്')
                  : t('General Public', 'പൊതുജനം')}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('Active Account', 'സജീവ അക്കൗണ്ട്')}
              </span>
            </div>
            <h1 className="font-display text-[34px] sm:text-[42px] md:text-[50px] font-extrabold text-[#111418] tracking-[-0.03em] leading-[1.06]">
              <span className="text-reveal-mask">
                <span className="animate-text-reveal" style={{ animationDelay: '100ms' }}>
                  {user.full_name}
                </span>
              </span>
            </h1>
          </div>

          {/* Balanced right-side quick actions for authenticated users */}
          <div
            style={{ animationDelay: '160ms' }}
            className="animate-fade-rise flex flex-wrap items-center gap-2.5"
          >
            <Link
              to="/bookings"
              className="h-10 px-4 rounded-full bg-[#1F6FFF] hover:bg-[#155EE6] text-white text-[13.5px] font-semibold inline-flex items-center gap-2 shadow-[0_8px_20px_rgba(31,111,255,0.28)] transition"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{t('Book a slot', 'സ്ലോട്ട് ബുക്ക് ചെയ്യുക')}</span>
            </Link>
            <Link
              to="/my-bookings"
              className="h-10 px-4 rounded-full bg-white/85 hover:bg-white border border-white/95 text-[#111418] text-[13.5px] font-semibold inline-flex items-center gap-2 shadow-sm transition"
            >
              <ReceiptText className="w-4 h-4 text-[#1F6FFF]" />
              <span>{t('My Bookings', 'എന്റെ ബുക്കിംഗുകൾ')}</span>
            </Link>
            <Link
              to={resolvedActiveMembership?.to ?? '/membership'}
              className="h-10 px-4 rounded-full bg-white/80 hover:bg-white border border-white/95 text-[#111418] text-[13.5px] font-semibold inline-flex items-center gap-2 shadow-sm transition"
            >
              <CreditCard className="w-4 h-4 text-[#1F6FFF]" />
              <span>
                {resolvedActiveMembership
                  ? t('Track Receipt', 'ട്രാക്ക് രസീത്')
                  : t('Track Pass', 'ട്രാക്ക് പാസ്')}
              </span>
            </Link>
          </div>
        </section>
      ) : (
        <GuestHomeHero venueCount={Math.max(4, facilities.length)} />
      )}

      {/* Optional Upcoming Booking Banner (signed-in users) */}
      {resolvedUpcomingBooking && <UpcomingBookingBanner booking={resolvedUpcomingBooking} />}

      {/* Structured Venues Section Header */}
      <section id="venues" className="scroll-mt-24">
        {!user && (
          <div
            style={{ animationDelay: '120ms' }}
            className="animate-fade-rise flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4 md:mb-5 pt-2"
          >
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-[#0053CD]">
                {t('Athletic Facilities', 'കായിക സൗകര്യങ്ങൾ')}
              </p>
              <h2 className="font-display text-[24px] md:text-[30px] font-bold text-[#111418] tracking-[-0.025em] leading-tight mt-0.5">
                {t('Choose your arena', 'നിങ്ങളുടെ വേദി തിരഞ്ഞെടുക്കുക')}
              </h2>
            </div>
            <Link
              to="/bookings"
              className="text-[13.5px] md:text-[14px] font-semibold text-[#1F6FFF] hover:text-[#0053CD] inline-flex items-center gap-1.5 group self-start sm:self-auto"
            >
              <span>{t('Check live slot availability', 'തത്സമയ സ്ലോട്ടുകൾ കാണുക')}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {/* Responsive 3x2 Bento Grid (Core 4 Venues + Activity/Access Card) */}
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:grid-rows-2 md:gap-5 md:h-[560px] items-stretch">
          <TrackFacilityCard
            facility={trackFacilityCardData}
            activeMembership={resolvedActiveMembership}
            animationDelayMs={140}
          />

          {hourlyFacilitiesCardData.map((facility) => (
            <HourlyFacilityCard
              key={facility.id}
              facility={facility}
              gridPositionClass={hourlyGridClasses[facility.id]}
              animationDelayMs={hourlyDelayById[facility.id]}
            />
          ))}

          {user ? (
            <ActivitySummaryCard summary={activitySummary} animationDelayMs={300} />
          ) : (
            <GuestAccessCard animationDelayMs={300} />
          )}
        </div>

        {/* Live Sync: Additional Admin-Created Venues */}
        {customFacilities.length > 0 && (
          <div className="mt-8 md:mt-10 animate-fade-rise">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-[#0053CD]">
                  {t('More Sports Complex Venues', 'കൂടുതൽ കായിക വേദികൾ')}
                </p>
                <h2 className="font-display text-[21px] md:text-[25px] font-bold text-[#111418] tracking-[-0.025em] leading-tight mt-0.5">
                  {t('Additional Bookable Facilities', 'ലഭ്യമായ മറ്റ് കായിക വേദികൾ')}
                </h2>
              </div>
              <Link
                to="/bookings"
                className="text-[13px] font-semibold text-[#1F6FFF] hover:text-[#0053CD] inline-flex items-center gap-1"
              >
                <span>{t('View all venues', 'എല്ലാ വേദികളും കാണുക')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customFacilities.map((fac) => {
                const tariff =
                  fac.tariffs.find((tItem) => tItem.booking_type === 'FULL_COURT') ??
                  fac.tariffs[0];
                const isMaintenance = fac.operational_status === 'MAINTENANCE';
                const isClosed = fac.operational_status === 'CLOSED';
                const targetUrl =
                  fac.booking_mode === 'MONTHLY_MEMBERSHIP_ONLY'
                    ? '/membership'
                    : `/bookings?venue=${encodeURIComponent(fac.code)}`;

                return (
                  <Link
                    key={fac.id}
                    to={targetUrl}
                    className="group rounded-[24px] p-5 bg-white/80 hover:bg-white backdrop-blur-2xl border border-white/95 shadow-[0_14px_34px_-16px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="w-10 h-10 rounded-2xl bg-[#1F6FFF]/10 text-[#1F6FFF] flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </span>
                        {isMaintenance ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                            <Wrench className="w-3 h-3" />
                            {t('Under Maintenance', 'അറ്റകുറ്റപ്പണിയിൽ')}
                          </span>
                        ) : isClosed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            {t('Closed', 'അടച്ചിരിക്കുന്നു')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t('Open', 'തുറന്നിരിക്കുന്നു')}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-[17.5px] font-bold text-[#111418] tracking-[-0.02em] mt-3 leading-snug">
                        {fac.name}
                      </h3>
                      <p className="text-[12.5px] text-[#64748B] mt-1 line-clamp-2">
                        {fac.description || fac.category || t('Sports Complex Facility', 'കായിക വേദി')}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/75 flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="inline-flex items-center gap-1 text-[#475569] tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[#1F6FFF]" />
                        {formatTime12h(fac.operating_start)} – {formatTime12h(fac.operating_end)}
                      </span>
                      <span className="font-bold text-[#1F6FFF] tabular-nums">
                        {tariff
                          ? `₹${Number(tariff.base_price).toLocaleString('en-IN')}/${fac.booking_mode === 'MONTHLY_MEMBERSHIP_ONLY' ? 'mo' : 'hr'}`
                          : t('View Slots', 'സ്ലോട്ടുകൾ')}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Unauthenticated 3-Step Workflow Strip & Clean Footer */}
      {!user && (
        <>
          <section
            style={{ animationDelay: '360ms' }}
            className="animate-fade-rise mt-10 md:mt-14"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4 md:mb-5">
              <div>
                <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-[#0053CD]">
                  {t('Simple Access Flow', 'ലളിതമായ നടപടിക്രമം')}
                </p>
                <h2 className="font-display text-[22px] md:text-[26px] font-bold text-[#111418] tracking-[-0.025em] leading-tight mt-0.5">
                  {t(
                    'From signup to confirmed receipt in three steps',
                    'മൂന്ന് ഘട്ടങ്ങളിലൂടെ സ്ഥിരീകരിച്ച ബുക്കിംഗിലേക്ക്',
                  )}
                </h2>
              </div>
              <span className="text-[13px] font-medium text-[#6B7280]">
                {t(
                  'Instant activation • Transparent Public & Govt/Police tariffs',
                  'ഉടൻ സജീവമാകും • സുതാര്യമായ ഫീസ് നിരക്കുകൾ',
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {howItWorksSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="rounded-[24px] p-5 md:p-6 bg-white/70 backdrop-blur-2xl border border-white/90 shadow-[0_14px_34px_-16px_rgba(31,111,255,0.1)] flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-[#1F6FFF]/10 text-[#1F6FFF] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-display text-[13px] font-bold text-[#9CA3AF] tracking-[0.06em] tabular-nums">
                        {t('STEP', 'ഘട്ടം')} {item.step}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display text-[17px] font-bold text-[#111418] tracking-[-0.015em]">
                        {lang === 'ML' ? item.titleMl : item.title}
                      </h3>
                      <p className="text-[13.5px] text-[#4B5563] leading-relaxed mt-1.5">
                        {lang === 'ML' ? item.descriptionMl : item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <footer className="mt-12 md:mt-16 pt-6 border-t border-black/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-[#6B7280]">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#1F6FFF]/10 text-[#1F6FFF] flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </span>
              <span className="font-medium text-[#374151]">
                {t(
                  'Kannur City Police Sports Facilities Portal',
                  'കണ്ണൂർ സിറ്റി പോലീസ് കായിക സൗകര്യ പോർട്ടൽ',
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-5 font-medium">
              <Link to="/bookings" className="hover:text-[#1F6FFF] transition-colors">
                {t('Hourly Bookings', 'മണിക്കൂർ ബുക്കിംഗുകൾ')}
              </Link>
              <Link to="/membership" className="hover:text-[#1F6FFF] transition-colors">
                {t('Track Membership', 'ട്രാക്ക് അംഗത്വം')}
              </Link>
              <Link to="/login" className="hover:text-[#1F6FFF] transition-colors">
                {t('Member Sign in', 'സൈൻ ഇൻ')}
              </Link>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
