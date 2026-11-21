import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ApiError,
  adminApi,
  type ApiAdminBookingItem,
  type ApiAdminDashboardOverview,
  type ApiAdminMemberSignup,
  type BackendSlotBookingStatus,
} from '@/api/client';
import '@/styles/adminOps.css';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { useAuth } from '@/context/AuthContext';
import { currentStaff } from '@/data/mockData';

const FACILITY_SHORT_NAMES: Record<string, string> = {
  SYNTHETIC_TRACK: 'Synthetic Track',
  FOOTBALL_GROUND: 'Football Ground',
  POLICE_TURF: 'Police Turf',
  BADMINTON_COURT: 'Badminton Court',
};

const FACILITY_COMPACT_BADGE_LABELS: Record<string, string> = {
  SYNTHETIC_TRACK: 'Track',
  FOOTBALL_GROUND: 'Football',
  POLICE_TURF: 'Turf',
  BADMINTON_COURT: 'Badminton',
};

const FACILITY_TABLE_DISPLAY_NAMES: Record<string, string> = {
  SYNTHETIC_TRACK: '400m Synthetic Track',
  FOOTBALL_GROUND: 'Police Parade Football Ground',
  POLICE_TURF: 'Floodlit Police Football Turf',
  BADMINTON_COURT: 'Indoor Wooden Badminton Complex',
};

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

function formatPartitionLabel(partition: string): string {
  switch (partition) {
    case 'HALF_A':
      return 'Half Court A';
    case 'HALF_B':
      return 'Half Court B';
    default:
      return 'Full Court';
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'KP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatRelativeSignup(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function getBookingStatusBadge(status: BackendSlotBookingStatus) {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        dotClass: 'bg-emerald-500',
      };
    case 'PENDING_PAYMENT':
      return {
        label: 'Pending Payment',
        className: 'bg-amber-50 text-amber-800 border border-amber-200/80',
        dotClass: 'bg-amber-500',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        className: 'bg-rose-50 text-rose-700 border border-rose-200/80',
        dotClass: 'bg-rose-500',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        className: 'bg-slate-100 text-slate-600 border border-slate-200/80',
        dotClass: 'bg-slate-400',
      };
  }
}

const FALLBACK_OVERVIEW: ApiAdminDashboardOverview = {
  date: new Date().toISOString().slice(0, 10),
  kpis: {
    total_registered_members: 6,
    active_members_count: 6,
    public_members_count: 4,
    govt_members_count: 2,
    todays_confirmed_bookings: 5,
    todays_total_bookings: 6,
    active_facilities_count: 4,
    bookable_courts_count: 3,
    slot_utilization_rate: 12,
    todays_booked_slots_count: 6,
    todays_total_slots_count: 51,
    monthly_revenue: '6726.00',
    facility_bookings_breakdown: [
      { facility_code: 'POLICE_TURF', facility_name: 'Police Turf', confirmed_count: 2 },
      { facility_code: 'FOOTBALL_GROUND', facility_name: 'Football Ground', confirmed_count: 1 },
      { facility_code: 'BADMINTON_COURT', facility_name: 'Badminton Court', confirmed_count: 2 },
    ],
  },
  todays_bookings: [
    {
      id: 'bk-1',
      booking_code: 'KCP-SLT-2026-3003',
      member_name: 'SI Anandakrishnan M.',
      member_username: 'si_anand',
      member_role: 'GOVT_PERSONNEL',
      facility_code: 'FOOTBALL_GROUND',
      facility_name: 'Kannur Police Parade & Natural Turf Football Ground',
      booking_date: new Date().toISOString().slice(0, 10),
      start_time: '06:00',
      end_time: '07:00',
      court_partition: 'FULL',
      total_amount: '1416.00',
      status: 'CONFIRMED',
    },
    {
      id: 'bk-2',
      booking_code: 'KCP-SLT-2026-3004',
      member_name: 'Kavya S. Nair',
      member_username: 'kavya_nair',
      member_role: 'PUBLIC',
      facility_code: 'BADMINTON_COURT',
      facility_name: 'Kannur Police Indoor Wooden Badminton Court Complex',
      booking_date: new Date().toISOString().slice(0, 10),
      start_time: '08:00',
      end_time: '09:00',
      court_partition: 'FULL',
      total_amount: '472.00',
      status: 'CONFIRMED',
    },
    {
      id: 'bk-3',
      booking_code: 'KCP-SLT-2026-3005',
      member_name: 'Arjun Menon',
      member_username: 'arjun_menon',
      member_role: 'PUBLIC',
      facility_code: 'POLICE_TURF',
      facility_name: 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)',
      booking_date: new Date().toISOString().slice(0, 10),
      start_time: '17:00',
      end_time: '18:00',
      court_partition: 'FULL',
      total_amount: '1652.00',
      status: 'CONFIRMED',
    },
    {
      id: 'bk-4',
      booking_code: 'KCP-SLT-2026-3001',
      member_name: 'Priya Mohan',
      member_username: 'priya_mohan',
      member_role: 'PUBLIC',
      facility_code: 'POLICE_TURF',
      facility_name: 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)',
      booking_date: new Date().toISOString().slice(0, 10),
      start_time: '18:00',
      end_time: '19:00',
      court_partition: 'HALF_A',
      total_amount: '944.00',
      status: 'CONFIRMED',
    },
    {
      id: 'bk-5',
      booking_code: 'KCP-SLT-2026-3006',
      member_name: 'Deepak Rajendran',
      member_username: 'deepak_raj',
      member_role: 'PUBLIC',
      facility_code: 'BADMINTON_COURT',
      facility_name: 'Kannur Police Indoor Wooden Badminton Court Complex',
      booking_date: new Date().toISOString().slice(0, 10),
      start_time: '19:00',
      end_time: '20:00',
      court_partition: 'FULL',
      total_amount: '472.00',
      status: 'CONFIRMED',
    },
  ],
  recent_member_signups: [
    {
      id: 'u-1',
      username: 'kavya_nair',
      full_name: 'Kavya S. Nair',
      email: 'kavya.nair@example.org',
      role: 'PUBLIC',
      account_status: 'ACTIVE',
      created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: 'u-2',
      username: 'deepak_raj',
      full_name: 'Deepak Rajendran',
      email: 'deepak.raj@example.org',
      role: 'PUBLIC',
      account_status: 'ACTIVE',
      created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    },
    {
      id: 'u-3',
      username: 'cpo_rahul',
      full_name: 'CPO Rahul Vijayan',
      email: 'rahul.v@kerala.gov.in',
      role: 'GOVT_PERSONNEL',
      account_status: 'ACTIVE',
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
      id: 'u-4',
      username: 'arjun_menon',
      full_name: 'Arjun Menon',
      email: 'arjun.menon@example.org',
      role: 'PUBLIC',
      account_status: 'ACTIVE',
      created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    },
    {
      id: 'u-5',
      username: 'si_anand',
      full_name: 'SI Anandakrishnan M.',
      email: 'si.anand@kerala.gov.in',
      role: 'GOVT_PERSONNEL',
      account_status: 'ACTIVE',
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    },
  ],
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [overview, setOverview] = useState<ApiAdminDashboardOverview>(FALLBACK_OVERVIEW);
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await adminApi.getDashboardOverview();
      setOverview(data);
    } catch (error) {
      setToastMessage(
        error instanceof ApiError
          ? error.message
          : 'Displaying cached overview metrics while connecting to live server.'
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const { kpis, todays_bookings: todaysBookings, recent_member_signups: recentSignups } = overview;

  const facilityFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    map.set('ALL', 'All Venues');
    kpis.facility_bookings_breakdown.forEach((item) => {
      map.set(
        item.facility_code,
        FACILITY_SHORT_NAMES[item.facility_code] ?? item.facility_name
      );
    });
    todaysBookings.forEach((b) => {
      if (!map.has(b.facility_code)) {
        map.set(b.facility_code, FACILITY_SHORT_NAMES[b.facility_code] ?? b.facility_name);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [kpis.facility_bookings_breakdown, todaysBookings]);

  const totalFacilitiesCount = kpis.total_facilities_count ?? kpis.active_facilities_count;
  const offlineCount =
    (kpis.maintenance_facilities_count ?? 0) + (kpis.closed_facilities_count ?? 0);

  const filteredBookings = useMemo<ApiAdminBookingItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    return todaysBookings.filter((booking) => {
      if (facilityFilter !== 'ALL' && booking.facility_code !== facilityFilter) {
        return false;
      }
      if (!q) return true;
      return (
        booking.member_name.toLowerCase().includes(q) ||
        booking.member_username.toLowerCase().includes(q) ||
        booking.facility_name.toLowerCase().includes(q) ||
        booking.booking_code.toLowerCase().includes(q) ||
        booking.status.toLowerCase().includes(q)
      );
    });
  }, [todaysBookings, facilityFilter, searchQuery]);

  const todayFormatted = useMemo(() => {
    const parsed = new Date(`${overview.date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [overview.date]);

  const monthlyRevenueFormatted = useMemo(() => {
    const val = Number(kpis.monthly_revenue || 0);
    const safeVal = Number.isFinite(val) ? val : 0;
    const hasFraction = Math.abs(safeVal % 1) > 0.001;
    return `₹${safeVal.toLocaleString('en-IN', {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }, [kpis.monthly_revenue]);

  const visibleSignups: ApiAdminMemberSignup[] = recentSignups.slice(0, 6);

  return (
    <div className="relative flex flex-col w-full overflow-x-hidden">
      {/* Subtle Ambient Background Orbs */}
      <div
        aria-hidden="true"
        className="admin-ambient-orb pointer-events-none fixed -top-32 right-[10%] w-[520px] h-[360px] rounded-full bg-blue-200/35 blur-[110px] -z-10"
      />
      <div
        aria-hidden="true"
        className="admin-ambient-orb pointer-events-none fixed top-[340px] -left-24 w-[420px] h-[320px] rounded-full bg-indigo-100/50 blur-[100px] -z-10"
      />

      {/* Main Executive Canvas */}
      <div className="relative w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9 flex flex-col gap-7">
        {/* Dismissible Status Notice */}
        {toastMessage && (
          <div
            role="status"
            className="admin-animate-enter flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-blue-50 text-[#0F172A] border border-blue-200/80 shadow-xs"
          >
            <div className="flex items-center gap-2.5 text-[13.5px] font-semibold">
              <MaterialIcon name="info" className="text-[19px] text-[#165DF5]" filled />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg hover:bg-blue-100/70 text-[#475569] transition-colors"
              aria-label="Dismiss notification"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          </div>
        )}

        {/* 1. Structured Header & Balanced Single-Row Action Bar */}
        <AdminPageHeader
          shiftBadge={`Operations Overview • ${todayFormatted}`}
          officerLabel={
            user ? `${user.full_name} (@${user.username})` : currentStaff.name
          }
          title="Sports Facilities Command Dashboard"
          groundsBadge="Kannur Armed Reserve Police Grounds"
          subtitle="Live overview of registered members, daily court schedules, operational venues, and real-time slot utilization."
          actions={
            <>
              <button
                type="button"
                onClick={loadDashboardData}
                disabled={refreshing}
                title="Refresh dashboard metrics"
                className="admin-btn-secondary px-3.5 inline-flex items-center justify-center gap-1.5 text-[#475569]"
              >
                <MaterialIcon
                  name="refresh"
                  className={`text-[18px] text-[#165DF5] ${refreshing ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/facilities')}
                className="admin-btn-secondary px-4 inline-flex items-center justify-center gap-2"
              >
                <MaterialIcon name="stadium" className="text-[18px] text-[#165DF5]" />
                <span>Facilities &amp; Slots</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/bookings')}
                className="admin-btn-secondary px-4 inline-flex items-center justify-center gap-2"
              >
                <MaterialIcon name="calendar_month" className="text-[18px] text-[#475569]" />
                <span>Bookings</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/members')}
                className="admin-btn-primary px-5 inline-flex items-center justify-center gap-2"
              >
                <MaterialIcon name="group" className="text-[19px]" />
                <span>Member Directory</span>
              </button>
            </>
          }
        />

        {/* 2. Top KPI Metric Row — 4 Equal-Width Staggered Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {/* Card 1: Total Registered Members */}
          <StatCard
            label="Registered Members"
            value={kpis.total_registered_members}
            delayMs={60}
            valueSuffix={
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11.5px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {kpis.active_members_count} Active
              </span>
            }
            icon="groups"
            iconTone="primary"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100/90 text-[12px] font-semibold text-[#334155] tabular-nums">
                {kpis.public_members_count} Public
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50/90 text-[12px] font-semibold text-[#0F50DC] tabular-nums">
                {kpis.govt_members_count} Govt / Police
              </span>
            </div>
            <Link
              to="/admin/members"
              className="group/link inline-flex items-center justify-between text-[13px] text-[#165DF5] font-semibold hover:text-[#0F49C7] transition-colors"
            >
              <span>Open Member Directory</span>
              <MaterialIcon
                name="arrow_forward"
                className="text-[16px] transition-transform duration-200 group-hover/link:translate-x-1"
              />
            </Link>
          </StatCard>

          {/* Card 2: Today's Confirmed Bookings */}
          <StatCard
            label="Today's Confirmed Slots"
            value={kpis.todays_confirmed_bookings}
            delayMs={120}
            valueSuffix={
              <span className="text-[14px] font-semibold text-[#64748B]">
                of {kpis.todays_total_bookings} total
              </span>
            }
            icon="event_available"
            iconTone="secondary"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              {kpis.facility_bookings_breakdown.map((item) => (
                <span
                  key={item.facility_code}
                  className="px-2.5 py-1 rounded-lg bg-slate-100/90 text-[12px] font-semibold text-[#475569] tabular-nums"
                >
                  {item.confirmed_count}{' '}
                  {FACILITY_COMPACT_BADGE_LABELS[item.facility_code] ??
                    (FACILITY_SHORT_NAMES[item.facility_code] ?? item.facility_name).split(' ')[0]}
                </span>
              ))}
            </div>
            <Link
              to="/admin/bookings"
              className="group/link inline-flex items-center justify-between text-[13px] text-[#165DF5] font-semibold hover:text-[#0F49C7] transition-colors"
            >
              <span>View Full Schedule</span>
              <MaterialIcon
                name="arrow_forward"
                className="text-[16px] transition-transform duration-200 group-hover/link:translate-x-1"
              />
            </Link>
          </StatCard>

          {/* Card 3: Active Facilities / Courts */}
          <StatCard
            label="Active Facilities"
            value={kpis.active_facilities_count}
            delayMs={180}
            valueSuffix={
              <span className="text-[15px] font-semibold text-[#64748B]">
                / {totalFacilitiesCount} Venues
              </span>
            }
            icon="stadium"
            iconTone="tertiary"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/75 text-[#334155]">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  offlineCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              <span className="text-[12px] font-semibold truncate">
                {offlineCount > 0
                  ? `${kpis.active_courts_count ?? kpis.bookable_courts_count} active courts • ${offlineCount} paused`
                  : `All ${kpis.active_facilities_count} venues operational${
                      kpis.active_courts_count ? ` (${kpis.active_courts_count} courts)` : ''
                    }`}
              </span>
            </div>
            <Link
              to="/admin/facilities"
              className="group/link inline-flex items-center justify-between text-[13px] text-[#165DF5] font-semibold hover:text-[#0F49C7] transition-colors"
            >
              <span>Manage Facilities &amp; Slots</span>
              <MaterialIcon
                name="arrow_forward"
                className="text-[16px] transition-transform duration-200 group-hover/link:translate-x-1"
              />
            </Link>
          </StatCard>

          {/* Card 4: Slot Utilization Rate */}
          <StatCard
            label="Slot Utilization"
            value={`${kpis.slot_utilization_rate}%`}
            valueTone="primary"
            delayMs={240}
            valueSuffix={
              <span className="text-[12.5px] font-semibold text-[#64748B] tabular-nums">
                {kpis.todays_booked_slots_count} / {kpis.todays_total_slots_count} slots
              </span>
            }
            icon="analytics"
            iconTone="surface"
          >
            <div className="flex flex-col gap-1.5">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="admin-bar-fill h-full bg-gradient-to-r from-[#165DF5] to-[#3B82F6] rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(4, kpis.slot_utilization_rate))}%` }}
                />
              </div>
            </div>
            <Link
              to="/admin/payments"
              className="group/link inline-flex items-center justify-between text-[13px] font-semibold text-[#475569] hover:text-[#165DF5] transition-colors"
            >
              <span>Monthly Revenue</span>
              <span className="inline-flex items-center gap-1 font-display font-bold text-[#0F172A] group-hover/link:text-[#165DF5] tabular-nums">
                {monthlyRevenueFormatted}
                <MaterialIcon
                  name="arrow_forward"
                  className="text-[15px] text-[#165DF5] transition-transform duration-200 group-hover/link:translate-x-1"
                />
              </span>
            </Link>
          </StatCard>
        </div>

        {/* 3. Main Operations Grid: Left Primary Schedule Table + Right Recent Signups */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* LEFT PANEL: Today's Bookings & Schedule */}
          <section
            aria-labelledby="todays-bookings-heading"
            style={{ animationDelay: '280ms' }}
            className="admin-animate-enter admin-surface-card xl:col-span-8 rounded-[26px] p-6 sm:p-7 flex flex-col justify-between gap-6"
          >
            <div className="flex flex-col gap-5">
              {/* Panel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-[#165DF5] shrink-0">
                    <MaterialIcon name="calendar_today" className="text-[20px]" />
                  </div>
                  <div>
                    <h2
                      id="todays-bookings-heading"
                      className="font-display text-[19px] font-bold text-[#0F172A] tracking-[-0.02em] leading-snug"
                    >
                      Today&apos;s Bookings &amp; Schedule
                    </h2>
                    <p className="text-[13px] text-[#64748B] mt-0.5">
                      Confirmed and pending court sessions for {todayFormatted}
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#0F50DC] text-[12px] font-bold whitespace-nowrap tabular-nums">
                  {filteredBookings.length} Scheduled
                </span>
              </div>

              {/* Search & Segmented Venue Filter Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <MaterialIcon
                    name="search"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search member, venue, or booking code..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50/90 border border-slate-200/90 text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#165DF5] focus:ring-4 focus:ring-[#165DF5]/10 transition-all"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 border border-slate-200/75 overflow-x-auto admin-scroll-hidden shrink-0">
                  {facilityFilterOptions.map((chip) => {
                    const active = facilityFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setFacilityFilter(chip.id)}
                        className={
                          active
                            ? 'px-3 py-1.5 rounded-lg bg-[#165DF5] text-white text-[12.5px] font-semibold whitespace-nowrap shadow-xs transition-all duration-150'
                            : 'px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-white/75 text-[12.5px] font-medium whitespace-nowrap transition-all duration-150'
                        }
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clean Structured Bookings Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/85 bg-white">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[#64748B] text-[11px] font-bold uppercase tracking-[0.07em]">
                      <th scope="col" className="py-3.5 px-5">
                        Member
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Venue &amp; Court
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Time Slot
                      </th>
                      <th scope="col" className="py-3.5 px-5 text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.length > 0 ? (
                      filteredBookings.map((booking, idx) => {
                        const badge = getBookingStatusBadge(booking.status);
                        const isGovt = booking.member_role === 'GOVT_PERSONNEL';
                        const conciseVenue =
                          FACILITY_TABLE_DISPLAY_NAMES[booking.facility_code] ??
                          booking.facility_name;

                        return (
                          <tr
                            key={booking.id}
                            style={{ animationDelay: `${Math.min(idx * 45, 270)}ms` }}
                            className="admin-row-enter admin-table-row"
                          >
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-[12.5px] shrink-0 ${
                                    isGovt
                                      ? 'bg-blue-100/90 text-[#0F50DC] ring-1 ring-blue-200'
                                      : 'bg-slate-100 text-[#475569] ring-1 ring-slate-200/90'
                                  }`}
                                >
                                  {getInitials(booking.member_name)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[14px] font-semibold text-[#0F172A] truncate leading-snug">
                                    {booking.member_name}
                                  </span>
                                  <span className="font-mono text-[11.5px] text-[#64748B] truncate mt-0.5">
                                    @{booking.member_username} · {booking.booking_code}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex flex-col min-w-0">
                                <span
                                  title={booking.facility_name}
                                  className="text-[13.5px] font-semibold text-[#1E293B] truncate max-w-[230px]"
                                >
                                  {conciseVenue}
                                </span>
                                <span className="text-[12px] text-[#64748B] mt-0.5">
                                  {formatPartitionLabel(booking.court_partition)}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[12.5px] font-semibold text-[#1E293B] tabular-nums">
                                <MaterialIcon
                                  name="schedule"
                                  className="text-[15px] text-[#165DF5]"
                                />
                                {formatTime12h(booking.start_time)} –{' '}
                                {formatTime12h(booking.end_time)}
                              </span>
                            </td>

                            <td className="py-4 px-5 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${badge.className}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-12 px-5 text-center text-[14px] font-medium text-[#64748B]"
                        >
                          No bookings scheduled today match your current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Footer */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 text-[13px] text-[#64748B]">
              <span className="tabular-nums">
                Showing <strong className="text-[#0F172A]">{filteredBookings.length}</strong> of{' '}
                <strong className="text-[#0F172A]">{todaysBookings.length}</strong> bookings today
              </span>

              <div className="flex items-center gap-3.5">
                <Link
                  to="/admin/facilities"
                  className="font-semibold text-[#475569] hover:text-[#165DF5] transition-colors"
                >
                  Manage Slots
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  to="/admin/bookings"
                  className="group/all inline-flex items-center gap-1 font-semibold text-[#165DF5] hover:text-[#0F49C7] transition-colors"
                >
                  <span>View All Bookings</span>
                  <MaterialIcon
                    name="arrow_forward"
                    className="text-[15px] transition-transform duration-200 group-hover/all:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>
          </section>

          {/* RIGHT PANEL: Recent Member Signups */}
          <section
            aria-labelledby="recent-signups-heading"
            style={{ animationDelay: '340ms' }}
            className="admin-animate-enter admin-surface-card xl:col-span-4 rounded-[26px] p-6 sm:p-7 flex flex-col justify-between gap-6"
          >
            <div className="flex flex-col gap-5">
              {/* Panel Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/70 flex items-center justify-center text-indigo-600 shrink-0">
                    <MaterialIcon name="person_add" className="text-[20px]" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="recent-signups-heading"
                      className="font-display text-[19px] font-bold text-[#0F172A] tracking-[-0.02em] leading-snug"
                    >
                      Recent Signups
                    </h2>
                    <p className="text-[12.5px] text-[#64748B] mt-0.5">
                      Immediate self-service portal accounts
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11.5px] font-bold whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Instant Active
                </span>
              </div>

              {/* Member Signups List */}
              <div className="flex flex-col gap-2.5">
                {visibleSignups.length > 0 ? (
                  visibleSignups.map((member, idx) => {
                    const isGovt = member.role === 'GOVT_PERSONNEL';
                    const isActive = member.account_status === 'ACTIVE';
                    return (
                      <Link
                        key={member.id}
                        to="/admin/members"
                        style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                        className="admin-row-enter admin-signup-item p-3.5 rounded-2xl bg-slate-50/85 border border-slate-200/65 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-[12.5px] shrink-0 ${
                              isGovt
                                ? 'bg-blue-100/90 text-[#0F50DC] ring-1 ring-blue-200'
                                : 'bg-white text-[#475569] ring-1 ring-slate-200'
                            }`}
                          >
                            {getInitials(member.full_name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[14px] font-semibold text-[#0F172A] truncate leading-snug">
                              {member.full_name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[12px] text-[#64748B] mt-0.5 flex-wrap">
                              <span className="font-mono text-[11.5px] truncate max-w-[110px]">
                                @{member.username}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span
                                className={
                                  isGovt
                                    ? 'text-[#0F50DC] font-semibold'
                                    : 'text-[#64748B] font-medium'
                                }
                              >
                                {isGovt ? 'Govt / Police' : 'Public'}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>{formatRelativeSignup(member.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold shrink-0 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {isActive ? 'Active' : member.account_status}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-[14px] font-medium text-[#64748B]">
                    No registered members found yet.
                  </div>
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="pt-4 flex items-center justify-between gap-2 border-t border-slate-100 text-[13px] text-[#64748B]">
              <span>
                Latest <strong className="text-[#0F172A]">{visibleSignups.length}</strong> signups
              </span>
              <Link
                to="/admin/members"
                className="group/dir inline-flex items-center gap-1 font-semibold text-[#165DF5] hover:text-[#0F49C7] transition-colors"
              >
                <span>Member Directory</span>
                <MaterialIcon
                  name="arrow_forward"
                  className="text-[15px] transition-transform duration-200 group-hover/dir:translate-x-0.5"
                />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
