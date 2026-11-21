import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  adminApi,
  type ApiAdminMemberDirectoryItem,
  type BackendAccountStatus,
  type BackendGender,
} from '@/api/client';
import '@/styles/adminMemberships.css';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { useAuth } from '@/context/AuthContext';
import { currentStaff } from '@/data/mockData';

type RoleFilterId = 'ALL' | 'PUBLIC' | 'GOVT_PERSONNEL';
type AccountStatusFilterId = 'ALL' | BackendAccountStatus;
type GenderFilterId = 'ALL' | BackendGender;

const PAGE_SIZE = 10;

const ROLE_FILTERS: Array<{ id: RoleFilterId; label: string }> = [
  { id: 'ALL', label: 'All Members' },
  { id: 'PUBLIC', label: 'General Public' },
  { id: 'GOVT_PERSONNEL', label: 'Govt / Police' },
];

const STATUS_FILTERS: Array<{ id: AccountStatusFilterId; label: string }> = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'BANNED', label: 'Banned' },
];

const GENDER_FILTERS: Array<{ id: GenderFilterId; label: string }> = [
  { id: 'ALL', label: 'All Genders' },
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'TRANSGENDER', label: 'Transgender' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'KP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatJoinedDate(isoString: string): string {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return 'Recently joined';
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDob(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const dt = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatGenderBadge(gender?: BackendGender | null): { label: string; className: string } {
  switch (gender) {
    case 'MALE':
      return {
        label: 'Male',
        className: 'bg-sky-50 text-sky-800 border border-sky-200/80',
      };
    case 'FEMALE':
      return {
        label: 'Female',
        className: 'bg-violet-50 text-violet-800 border border-violet-200/80',
      };
    case 'TRANSGENDER':
      return {
        label: 'Transgender',
        className: 'bg-teal-50 text-teal-800 border border-teal-200/80',
      };
    default:
      return {
        label: 'Not Set',
        className: 'bg-surface-container text-secondary border border-surface-container-high',
      };
  }
}

export default function AdminMembershipsPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<ApiAdminMemberDirectoryItem[]>([]);
  const [summary, setSummary] = useState({
    total_members: 0,
    active_count: 0,
    public_count: 0,
    govt_count: 0,
    active_track_passes: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilterId>('ALL');
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilterId>('ALL');
  const [genderFilter, setGenderFilter] = useState<GenderFilterId>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<ApiAdminMemberDirectoryItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const res = await adminApi.listMembers();
      setSummary(res.summary);
      setMembers(res.members);
      setSelectedMember((prev) =>
        prev ? res.members.find((m) => m.id === prev.id) ?? null : null
      );
    } catch (error) {
      setToastMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load registered member directory.'
      );
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'ALL' && m.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && m.account_status !== statusFilter) return false;
      if (genderFilter !== 'ALL' && m.gender !== genderFilter) return false;
      if (!q) return true;
      return (
        m.full_name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.active_pass_code ?? '').toLowerCase().includes(q) ||
        (m.city_locality ?? '').toLowerCase().includes(q) ||
        (m.present_address ?? '').toLowerCase().includes(q) ||
        (m.pin_code ?? '').toLowerCase().includes(q) ||
        (m.designation ?? '').toLowerCase().includes(q)
      );
    });
  }, [members, roleFilter, statusFilter, genderFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMembers = filteredMembers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setGenderFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full max-w-[1440px] mx-auto overflow-hidden px-4 sm:px-6 lg:px-margin-desktop py-space-lg lg:py-space-xl flex flex-col gap-space-lg lg:gap-space-xl">
        {/* Ambient Glows */}
        <div className="absolute -top-32 left-1/3 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-64 right-10 w-[400px] h-[250px] bg-secondary-container/30 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Status Notification */}
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

        {/* 1. Page Header */}
        <AdminPageHeader
          shiftBadge="Self-Service Member Registry"
          officerLabel={user ? `${user.full_name} (@${user.username})` : currentStaff.name}
          title="Member Directory"
          groundsBadge="Kannur Armed Reserve Police Grounds"
          subtitle="Complete directory of registered public and government personnel members with demographics, residential addresses, and active pass records."
          actions={
            <>
              <Link
                to="/admin/dashboard"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low font-label-primary text-label-primary font-semibold transition-all"
              >
                <MaterialIcon name="arrow_back" className="text-[18px] text-primary" />
                <span>Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={loadMembers}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:bg-primary-container font-label-primary text-label-primary font-semibold transition-all"
              >
                <MaterialIcon name="refresh" className="text-[20px]" />
                <span>Refresh Directory</span>
              </button>
            </>
          }
        />

        {/* 2. Summary KPI Strip — 4 Equal-Width Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md items-stretch">
          <StatCard
            label="Total Registered Members"
            value={summary.total_members}
            icon="groups"
            iconTone="primary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              Self-registered portal user accounts
            </span>
          </StatCard>

          <StatCard
            label="Active Accounts"
            value={summary.active_count}
            valueTone="primary"
            valueSuffix={
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-caption text-caption font-semibold">
                Immediate Access
              </span>
            }
            icon="verified_user"
            iconTone="secondary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              {summary.active_track_passes} active Synthetic Track pass(es)
            </span>
          </StatCard>

          <StatCard
            label="General Public"
            value={summary.public_count}
            icon="person"
            iconTone="tertiary"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              Standard citizen facility access accounts
            </span>
          </StatCard>

          <StatCard
            label="Govt / Police Personnel"
            value={summary.govt_count}
            icon="local_police"
            iconTone="surface"
          >
            <span className="font-caption text-caption text-on-surface-variant">
              Departmental &amp; government employee accounts
            </span>
          </StatCard>
        </div>

        {/* 3. Member Directory Table Card */}
        <section className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                <MaterialIcon name="group" className="text-[20px]" />
              </div>
              <div>
                <h2 className="font-headline-card text-headline-card text-on-surface font-semibold tracking-tight">
                  Registered Members Registry
                </h2>
                <p className="font-caption text-caption text-secondary">
                  Click any member record to view full onboarding demographics, residential address, and track profile.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-bold">
              {filteredMembers.length} Registered Members
            </span>
          </div>

          {/* Search & Role Filter Chips */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm pt-1">
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
                placeholder="Search by name, @username, pass code, locality, address, PIN, or designation..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container-low font-label-meta text-label-meta text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 admin-memberships-scroll">
              {ROLE_FILTERS.map((chip) => {
                const active = roleFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setRoleFilter(chip.id);
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

          {/* Gender & Status Filter Strip */}
          <div className="flex items-center justify-between gap-space-md flex-wrap pt-1 border-t border-surface-container-low">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 admin-memberships-scroll">
                <span className="font-caption text-caption text-secondary font-semibold mr-1">
                  Gender:
                </span>
                {GENDER_FILTERS.map((gf) => {
                  const active = genderFilter === gf.id;
                  return (
                    <button
                      key={gf.id}
                      type="button"
                      onClick={() => {
                        setGenderFilter(gf.id);
                        setCurrentPage(1);
                      }}
                      className={
                        active
                          ? 'px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-caption text-caption font-bold whitespace-nowrap'
                          : 'px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-caption text-caption font-medium whitespace-nowrap transition-colors'
                      }
                    >
                      {gf.label}
                    </button>
                  );
                })}
              </div>

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
            </div>

            {(searchQuery ||
              roleFilter !== 'ALL' ||
              statusFilter !== 'ALL' ||
              genderFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="font-caption text-caption text-primary font-semibold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Member Rows Table */}
          <div className="overflow-x-auto rounded-2xl border border-surface-container">
            <table className="w-full text-left border-collapse min-w-[920px]">
              <thead>
                <tr className="bg-surface-container-low text-secondary font-caption text-caption uppercase tracking-wider">
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Member
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Category &amp; Gender
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Residential Address
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Bookings &amp; Pass
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-right">
                    Status &amp; Record
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container bg-surface-container-lowest">
                {paginatedMembers.length > 0 ? (
                  paginatedMembers.map((member) => {
                    const isGovt = member.role === 'GOVT_PERSONNEL';
                    const isActive = member.account_status === 'ACTIVE';
                    const genderBadge = formatGenderBadge(member.gender);
                    const dobFormatted = formatDob(member.date_of_birth);
                    const isSelected = selectedMember?.id === member.id;

                    return (
                      <tr
                        key={member.id}
                        onClick={() => setSelectedMember(isSelected ? null : member)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-fixed/30'
                            : 'hover:bg-surface-container-low/50'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-label-meta shrink-0 ${
                                isGovt
                                  ? 'bg-primary-fixed text-primary'
                                  : 'bg-secondary-fixed text-secondary'
                              }`}
                            >
                              {getInitials(member.full_name)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-label-primary text-label-primary font-semibold text-on-surface truncate">
                                {member.full_name}
                              </span>
                              <span className="font-caption text-caption text-secondary truncate">
                                @{member.username}
                                {member.email ? ` • ${member.email}` : ''}
                              </span>
                              {isGovt && member.designation && (
                                <span className="font-caption text-[11px] text-primary font-medium truncate">
                                  {member.designation}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md font-caption text-caption font-semibold ${
                                  isGovt
                                    ? 'bg-primary-fixed text-on-primary-fixed'
                                    : 'bg-surface-container text-secondary'
                                }`}
                              >
                                {isGovt ? 'Govt / Police' : 'General Public'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md font-caption text-caption font-semibold ${genderBadge.className}`}
                              >
                                {genderBadge.label}
                              </span>
                            </div>
                            {dobFormatted && (
                              <span className="font-caption text-[11px] text-secondary">
                                DOB: {dobFormatted}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-[270px]">
                          {member.present_address || member.city_locality || member.pin_code ? (
                            <div className="flex flex-col min-w-0">
                              <span className="font-label-meta text-label-meta font-semibold text-on-surface truncate">
                                {[member.city_locality, member.pin_code].filter(Boolean).join(' • ') ||
                                  'Address Saved'}
                              </span>
                              <span className="font-caption text-caption text-secondary truncate">
                                {member.present_address || member.permanent_address || '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="font-caption text-caption text-outline italic">
                              Address pending onboarding
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-label-meta text-label-meta font-semibold text-on-surface">
                              {member.confirmed_bookings_count} Confirmed Booking
                              {member.confirmed_bookings_count === 1 ? '' : 's'}
                            </span>
                            <span className="font-caption text-caption text-secondary">
                              {member.active_pass_code
                                ? `Active Pass: ${member.active_pass_code}`
                                : 'Hourly Slot Member'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-caption text-caption font-semibold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                  : 'bg-error-container/50 text-on-error-container border border-error/20'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? 'bg-emerald-500' : 'bg-error'
                                }`}
                              />
                              {isActive ? 'Active' : member.account_status}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMember(isSelected ? null : member);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary-fixed hover:text-primary text-on-surface-variant font-caption text-caption font-semibold transition-colors"
                            >
                              {isSelected ? 'Close' : 'Details'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 px-4 text-center font-label-primary text-label-primary text-on-surface-variant"
                    >
                      No registered members match your current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Selected Member Onboarding Record Detail Panel */}
          {selectedMember && (
            <div className="rounded-2xl bg-surface-container-low/80 border border-primary/20 p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-surface-container-high">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold text-[16px] shrink-0">
                    {getInitials(selectedMember.full_name)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-headline-card text-headline-card font-bold text-on-surface">
                        {selectedMember.full_name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-md font-caption text-caption font-semibold ${
                          formatGenderBadge(selectedMember.gender).className
                        }`}
                      >
                        {formatGenderBadge(selectedMember.gender).label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed font-caption text-caption font-semibold">
                        {selectedMember.role === 'GOVT_PERSONNEL'
                          ? 'Govt / Police'
                          : 'General Public'}
                      </span>
                    </div>
                    <p className="font-caption text-caption text-secondary mt-0.5">
                      @{selectedMember.username}
                      {selectedMember.email ? ` • ${selectedMember.email}` : ''} • Joined{' '}
                      {formatJoinedDate(selectedMember.created_at)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-secondary hover:text-on-surface font-caption text-caption font-semibold shadow-xs"
                >
                  <MaterialIcon name="close" className="text-[16px]" />
                  <span>Close Record</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
                {/* Demographics */}
                <div className="rounded-xl bg-surface-container-lowest p-4 flex flex-col gap-2 shadow-xs">
                  <span className="font-caption text-caption font-bold uppercase tracking-wider text-primary">
                    Personal Demographics
                  </span>
                  <div>
                    <span className="text-secondary block text-[11px]">Gender</span>
                    <span className="font-semibold text-on-surface">
                      {formatGenderBadge(selectedMember.gender).label}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary block text-[11px]">Date of Birth</span>
                    <span className="font-semibold text-on-surface">
                      {formatDob(selectedMember.date_of_birth) ?? 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary block text-[11px]">
                      Father&apos;s / Mother&apos;s Name
                    </span>
                    <span className="font-medium text-on-surface">
                      {selectedMember.parent_name ?? 'Not provided'}
                    </span>
                  </div>
                </div>

                {/* Residential Address */}
                <div className="rounded-xl bg-surface-container-lowest p-4 flex flex-col gap-2 shadow-xs">
                  <span className="font-caption text-caption font-bold uppercase tracking-wider text-primary">
                    Residential Address
                  </span>
                  <div>
                    <span className="text-secondary block text-[11px]">Present Address</span>
                    <span className="font-medium text-on-surface leading-snug block">
                      {[
                        selectedMember.present_address,
                        selectedMember.city_locality,
                        selectedMember.pin_code ? `PIN ${selectedMember.pin_code}` : null,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary block text-[11px]">Permanent Address</span>
                    <span className="font-medium text-on-surface leading-snug block">
                      {selectedMember.permanent_address ?? 'Not provided'}
                    </span>
                  </div>
                </div>

                {/* Track & Department Profile */}
                <div className="rounded-xl bg-surface-container-lowest p-4 flex flex-col gap-2 shadow-xs">
                  <span className="font-caption text-caption font-bold uppercase tracking-wider text-primary">
                    {selectedMember.role === 'GOVT_PERSONNEL'
                      ? 'Department & Track Profile'
                      : 'Track & Athletic Profile'}
                  </span>
                  {selectedMember.role === 'GOVT_PERSONNEL' && (
                    <div>
                      <span className="text-secondary block text-[11px]">
                        Designation &amp; Office
                      </span>
                      <span className="font-semibold text-on-surface block">
                        {selectedMember.designation ?? 'Not provided'}
                      </span>
                      {selectedMember.office_address && (
                        <span className="text-secondary text-[12px] block">
                          {selectedMember.office_address}
                        </span>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="text-secondary block text-[11px]">Track Purpose</span>
                    <span className="font-medium text-on-surface block">
                      {selectedMember.track_purpose ?? 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary block text-[11px]">
                      Registered Sportsperson
                    </span>
                    <span className="font-medium text-on-surface block">
                      {selectedMember.is_registered_sportsperson
                        ? `Yes — ${selectedMember.sport_discipline ?? 'Unspecified'}${
                            selectedMember.association_details
                              ? ` (${selectedMember.association_details})`
                              : ''
                          }`
                        : 'No'}
                    </span>
                  </div>
                  {selectedMember.active_pass_code && (
                    <div className="pt-1 border-t border-surface-container">
                      <span className="text-secondary block text-[11px]">Active Pass</span>
                      <span className="font-mono font-bold text-primary">
                        {selectedMember.active_pass_code}
                      </span>
                      {selectedMember.active_pass_plan && (
                        <span className="text-secondary text-[11.5px] block">
                          {selectedMember.active_pass_plan}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="pt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-surface-container font-label-meta text-label-meta text-secondary">
            <span>
              Showing{' '}
              {filteredMembers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredMembers.length)} of{' '}
              {filteredMembers.length} matching members ({members.length} total)
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
