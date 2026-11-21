import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  adminApi,
  type ApiAdminBookingItem,
  type BackendSlotBookingStatus,
} from '@/api/client';
import '@/styles/adminMemberships.css';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { useAuth } from '@/context/AuthContext';
import { currentStaff } from '@/data/mockData';

type StatusFilterId = 'ALL' | BackendSlotBookingStatus;

const PAGE_SIZE = 10;

const STATUS_FILTERS: Array<{ id: StatusFilterId; label: string }> = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const FACILITY_SHORT_NAMES: Record<string, string> = {
  SYNTHETIC_TRACK: 'Synthetic Track',
  FOOTBALL_GROUND: 'Football Ground',
  POLICE_TURF: 'Police Turf',
  BADMINTON_COURT: 'Badminton Court',
};

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

function formatDateDisplay(isoDate: string): string {
  const dt = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

function getStatusStyle(status: BackendSlotBookingStatus) {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
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
        className: 'bg-error-container/50 text-on-error-container border border-error/20',
        dotClass: 'bg-error',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        className: 'bg-surface-container text-secondary border border-outline-variant/40',
        dotClass: 'bg-secondary',
      };
  }
}

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<ApiAdminBookingItem[]>([]);
  const [summary, setSummary] = useState({
    total_bookings: 0,
    confirmed_count: 0,
    pending_payment_count: 0,
    cancelled_count: 0,
    todays_confirmed_count: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterId>('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      const res = await adminApi.listBookings();
      setSummary(res.summary);
      setBookings(res.bookings);
    } catch (error) {
      setToastMessage(
        error instanceof ApiError ? error.message : 'Unable to fetch slot bookings.'
      );
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const facilityFilters = useMemo(() => {
    const map = new Map<string, string>([
      ['ALL', 'All Facilities'],
      ['POLICE_TURF', 'Police Turf'],
      ['FOOTBALL_GROUND', 'Football Ground'],
      ['BADMINTON_COURT', 'Badminton Court'],
    ]);
    bookings.forEach((b) => {
      if (!map.has(b.facility_code)) {
        map.set(b.facility_code, FACILITY_SHORT_NAMES[b.facility_code] ?? b.facility_name);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (facilityFilter !== 'ALL' && b.facility_code !== facilityFilter) return false;
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (selectedDate && b.booking_date !== selectedDate) return false;
      if (!q) return true;
      return (
        b.booking_code.toLowerCase().includes(q) ||
        b.member_name.toLowerCase().includes(q) ||
        b.member_username.toLowerCase().includes(q) ||
        b.facility_name.toLowerCase().includes(q)
      );
    });
  }, [bookings, facilityFilter, statusFilter, selectedDate, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const hasFilters = Boolean(
    searchQuery || facilityFilter !== 'ALL' || statusFilter !== 'ALL' || selectedDate
  );

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full max-w-[1440px] mx-auto overflow-hidden px-4 sm:px-6 lg:px-margin-desktop py-space-lg lg:py-space-xl flex flex-col gap-space-lg lg:gap-space-xl">
        <div className="absolute -top-32 left-1/3 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-64 right-10 w-[400px] h-[250px] bg-secondary-container/30 rounded-full blur-[100px] pointer-events-none -z-10" />

        {toastMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-space-md px-5 py-3.5 rounded-2xl bg-primary-fixed text-on-primary-fixed shadow-sm border border-primary/20"
          >
            <div className="flex items-center gap-2.5">
              <MaterialIcon name="info" className="text-[20px] text-primary" filled />
              <span className="font-label-primary text-label-primary font-semibold">
                {toastMessage}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg hover:bg-primary/10 text-on-primary-fixed transition-colors"
              aria-label="Dismiss notification"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
          </div>
        )}

        {/* 1. Header */}
        <AdminPageHeader
          shiftBadge="Court & Facility Schedule"
          officerLabel={user ? `${user.full_name} (@${user.username})` : currentStaff.name}
          title="Bookings & Schedule Ledger"
          groundsBadge="Kannur Armed Reserve Police Grounds"
          subtitle="Complete overview of hourly turf, football ground, and indoor badminton court bookings across all dates."
          actions={
            <>
              <Link
                to="/admin/dashboard"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low font-label-primary text-label-primary font-semibold transition-all"
              >
                <MaterialIcon name="arrow_back" className="text-[18px] text-primary" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/admin/facilities"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:bg-primary-container font-label-primary text-label-primary font-semibold transition-all"
              >
                <MaterialIcon name="stadium" className="text-[20px]" />
                <span>Manage Facilities &amp; Slots</span>
              </Link>
            </>
          }
        />

        {/* 2. 4 Equal-Width KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md items-stretch">
          <StatCard
            label="Total Bookings"
            value={summary.total_bookings}
            icon="calendar_month"
            iconTone="primary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              All scheduled &amp; recorded facility reservations
            </span>
          </StatCard>

          <StatCard
            label="Today's Confirmed"
            value={summary.todays_confirmed_count}
            valueTone="primary"
            icon="event_available"
            iconTone="secondary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              Active confirmed slots scheduled for today
            </span>
          </StatCard>

          <StatCard
            label="All Confirmed"
            value={summary.confirmed_count}
            icon="verified"
            iconTone="tertiary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              Paid &amp; locked court reservations
            </span>
          </StatCard>

          <StatCard
            label="Pending Payment"
            value={summary.pending_payment_count}
            icon="schedule"
            iconTone="surface"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              {summary.cancelled_count} cancelled / refunded booking(s)
            </span>
          </StatCard>
        </div>

        {/* 3. Bookings Directory Table Card */}
        <section className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                <MaterialIcon name="event_note" className="text-[20px]" />
              </div>
              <div>
                <h2 className="font-headline-card text-headline-card text-on-surface font-semibold tracking-tight">
                  Scheduled Facility Bookings
                </h2>
                <p className="font-caption text-caption text-secondary">
                  Filter by venue, date, or payment confirmation status.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadBookings}
                className="px-3.5 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-meta text-label-meta font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <MaterialIcon name="refresh" className="text-[16px]" />
                <span>Refresh</span>
              </button>
              <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-bold">
                {filteredBookings.length} Bookings
              </span>
            </div>
          </div>

          {/* Search & Facility Filter Row */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1">
                <MaterialIcon
                  name="search"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search member name, @username, or booking reference..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container-low font-label-meta text-label-meta text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container transition-all"
                />
              </div>
              <input
                type="date"
                aria-label="Filter by date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 px-3.5 rounded-xl bg-surface-container-low font-label-meta text-label-meta text-on-surface focus:outline-none focus:bg-surface-container transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 admin-memberships-scroll">
              {facilityFilters.map((chip) => {
                const active = facilityFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setFacilityFilter(chip.id);
                      setCurrentPage(1);
                    }}
                    className={
                      active
                        ? 'px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-meta text-label-meta font-medium whitespace-nowrap shadow-sm'
                        : 'px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-meta text-label-meta font-medium whitespace-nowrap transition-colors'
                    }
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Chips */}
          <div className="flex items-center justify-between gap-space-sm flex-wrap pt-1 border-t border-surface-container-low">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 admin-memberships-scroll">
              <span className="font-caption text-caption text-secondary font-semibold mr-1">
                Status:
              </span>
              {STATUS_FILTERS.map((st) => {
                const active = statusFilter === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st.id);
                      setCurrentPage(1);
                    }}
                    className={
                      active
                        ? 'px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-bold whitespace-nowrap'
                        : 'px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-caption text-caption font-medium whitespace-nowrap transition-colors'
                    }
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFacilityFilter('ALL');
                  setStatusFilter('ALL');
                  setSelectedDate('');
                  setCurrentPage(1);
                }}
                className="font-caption text-caption text-primary font-semibold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto rounded-2xl border border-surface-container">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-surface-container-low text-secondary font-caption text-caption uppercase tracking-wider">
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Booking Ref
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Member Name
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Facility &amp; Court
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Date &amp; Time Slot
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-right">
                    Amount
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container bg-surface-container-lowest">
                {paginatedBookings.length > 0 ? (
                  paginatedBookings.map((booking) => {
                    const badge = getStatusStyle(booking.status);
                    const isGovt = booking.member_role === 'GOVT_PERSONNEL';
                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-[12.5px] font-semibold text-primary">
                            {booking.booking_code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-label-meta shrink-0 ${
                                isGovt
                                  ? 'bg-primary-fixed text-primary'
                                  : 'bg-secondary-fixed text-secondary'
                              }`}
                            >
                              {getInitials(booking.member_name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-primary text-label-primary font-semibold text-on-surface">
                                {booking.member_name}
                              </span>
                              <span className="font-caption text-caption text-secondary">
                                @{booking.member_username} •{' '}
                                {isGovt ? 'Govt / Police' : 'Public'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-label-meta text-label-meta font-semibold text-on-surface">
                              {booking.facility_name}
                            </span>
                            <span className="font-caption text-caption text-on-surface-variant">
                              {formatPartitionLabel(booking.court_partition)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-label-meta text-label-meta font-semibold text-on-surface">
                              {formatDateDisplay(booking.booking_date)}
                            </span>
                            <span className="font-caption text-caption text-secondary">
                              {formatTime12h(booking.start_time)} –{' '}
                              {formatTime12h(booking.end_time)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-label-meta text-label-meta font-semibold text-on-surface">
                          ₹{Number(booking.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-caption text-caption font-semibold ${badge.className}`}
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
                      colSpan={6}
                      className="py-12 px-4 text-center font-label-primary text-label-primary text-on-surface-variant"
                    >
                      No bookings found for the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="pt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-surface-container font-label-meta text-label-meta text-secondary">
            <span>
              Showing{' '}
              {filteredBookings.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredBookings.length)} of{' '}
              {filteredBookings.length} matching bookings
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-meta text-label-meta font-semibold hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={
                    pageNum === safePage
                      ? 'w-8 h-8 rounded-lg bg-primary text-on-primary font-label-meta text-label-meta font-bold shadow-xs'
                      : 'w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-meta text-label-meta font-medium transition-colors'
                  }
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-meta text-label-meta font-semibold hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
