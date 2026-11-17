import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiError,
  adminApi,
  facilitiesApi,
  type ApiAdminSlot,
  type ApiFacility,
  type BackendCourtPartition,
  type BackendFacilityCode,
} from '@/api/client';
import '@/styles/adminOps.css';
import type {
  CourtScopeFilterId,
  FacilityAdminId,
  FacilityAdminItem,
  FacilityDateOption,
  FacilityRuleParameter,
  FacilitySlotAction,
  FacilityTimeSlot,
  OverrideReasonId,
} from '@/types/adminOps';
import {
  facilityAdminList,
  facilityCourtScopeOptions,
  facilityOverrideReasons,
} from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { FacilitySwitcherBar } from '@/components/admin/facilities/FacilitySwitcherBar';
import { FacilityRulesCard } from '@/components/admin/facilities/FacilityRulesCard';
import { FacilityDateFilterBar } from '@/components/admin/facilities/FacilityDateFilterBar';
import { FacilitySlotRow } from '@/components/admin/facilities/FacilitySlotRow';
import { FacilityOverridePanel } from '@/components/admin/facilities/FacilityOverridePanel';
import {
  FacilityEditRulesModal,
  FacilityManualBookingModal,
} from '@/components/admin/facilities/FacilityModals';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface ToastState {
  title: string;
  subtitle: string;
}

type LiveFacilityTimeSlot = FacilityTimeSlot & {
  startTime?: string;
  endTime?: string;
  blockId?: string;
  halfABlockId?: string;
  halfBBlockId?: string;
};

const FACILITY_ID_TO_CODE: Record<FacilityAdminId, BackendFacilityCode> = {
  track: 'SYNTHETIC_TRACK',
  football: 'FOOTBALL_GROUND',
  turf: 'POLICE_TURF',
  badminton: 'BADMINTON_COURT',
};

function formatDateIso(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildAdminDateOptions(): Array<FacilityDateOption & { isoDate: string }> {
  const base = new Date();
  return [-1, 0, 1, 2, 3].map((offset) => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + offset);
    const isoDate = formatDateIso(dt);
    const labelPrefix =
      offset === -1 ? 'Yesterday' : offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : dt.toLocaleDateString('en-US', { weekday: 'short' });
    const shortDay = dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
    return {
      id: isoDate,
      isoDate,
      label: `${labelPrefix}, ${shortDay}`,
      dayName: dt.toLocaleDateString('en-US', { weekday: 'long' }),
    };
  });
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr ?? '00'} ${suffix}`;
}

function mapAdminSlotToUi(
  slot: ApiAdminSlot,
  facilityId: FacilityAdminId,
  isPartitionable: boolean,
  officerLabel: string
): LiveFacilityTimeSlot {
  const slotId = `${facilityId}-${slot.start_time}`;
  const timeRange = `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`;
  const fullPart = slot.partitions?.FULL;
  const halfA = slot.partitions?.HALF_A;
  const halfB = slot.partitions?.HALF_B;

  const isSplitView =
    isPartitionable &&
    halfA &&
    halfB &&
    (halfA.status !== fullPart?.status || halfB.status !== fullPart?.status || halfA.status !== halfB.status);

  if (isSplitView && halfA && halfB) {
    const mapHalf = (
      part: typeof halfA,
      halfId: 'half-a' | 'half-b',
      label: string
    ) => {
      const status: 'booked' | 'available' | 'blocked' =
        part.status === 'AUTHORITY_BLOCKED'
          ? 'blocked'
          : part.status === 'BOOKED'
            ? 'booked'
            : 'available';
      return {
        id: halfId,
        label,
        status,
        detailsText:
          status === 'blocked'
            ? `Authority Blocked: ${part.internal_reason ?? 'Duty Hold'}`
            : status === 'booked'
              ? `${part.user_full_name ?? 'Member'} (${part.booking_code ?? 'BOOKED'})`
              : 'Available for Public or Police Squad',
        rightLabel: status === 'blocked' ? "Public: 'Already Booked'" : undefined,
        actionLabel: status === 'blocked' ? 'Unblock' : status === 'available' ? 'Quick Block' : undefined,
      };
    };

    return {
      id: slotId,
      facilityId,
      startTime: slot.start_time,
      endTime: slot.end_time,
      blockId: fullPart?.block_id ?? halfA.block_id ?? halfB.block_id,
      halfABlockId: halfA.block_id,
      halfBBlockId: halfB.block_id,
      timeRange,
      timeSubtitle: 'Split 5s Allocation',
      timeSubtitleTone: 'primary',
      status: 'split',
      statusBadgeLabel: 'Split Court',
      statusBadgeIcon: 'call_split',
      courtScope: 'split',
      splitSubtitle: 'Half Court A & Half Court B',
      splitStatusBadge: 'Partial Occupancy',
      splitHalves: [
        mapHalf(halfA, 'half-a', 'Half Court A (North)'),
        mapHalf(halfB, 'half-b', 'Half Court B (South)'),
      ],
      actions: [
        { id: 'quick-block', label: 'Block Full Court', icon: 'lock_clock', variant: 'amber' },
      ],
      overrideConfig: {
        reasonId: 'drill',
        noteTitle: slot.internal_reason || 'Departmental Priority Block',
        noteDescription: 'Authority slot hold for Kannur City Police operations.',
        auditRecordId: fullPart?.block_id ?? 'NEW-BLOCK',
        officerLabel,
        courtLabel: 'Police Turf (Full / Half)',
        maskTitle: "Public Portal Mask: 'Already Booked'",
        maskDescription: 'Citizens see this slot as Already Booked.',
      },
    };
  }

  if (slot.status === 'AUTHORITY_BLOCKED') {
    const blockId = fullPart?.block_id ?? halfA?.block_id ?? halfB?.block_id;
    return {
      id: slotId,
      facilityId,
      startTime: slot.start_time,
      endTime: slot.end_time,
      blockId,
      timeRange,
      timeSubtitle: 'Authority Hold',
      timeSubtitleTone: 'tertiary',
      status: 'blocked',
      statusBadgeLabel: 'Authority Blocked',
      statusBadgeIcon: 'lock',
      courtScope: 'full',
      bannerTone: 'amber',
      bannerIcon: 'gavel',
      bannerTitle: slot.internal_reason || 'Authority Blocked',
      bannerSubtitle: `Officer: ${fullPart?.created_by_officer?.full_name ?? officerLabel}`,
      bannerRightTag: "Public shows: 'Already Booked'",
      bannerRightTagTone: 'amber',
      actions: [
        { id: 'details', label: 'Details', icon: 'info', variant: 'neutral' },
        { id: 'release', label: 'Release', variant: 'muted' },
      ],
      overrideConfig: {
        reasonId: 'drill',
        noteTitle: slot.internal_reason || 'Authority Blocked',
        noteDescription: 'Active administrative authority block.',
        auditRecordId: blockId ?? 'BLOCKED',
        officerLabel,
        courtLabel: 'Full Facility',
        maskTitle: "Public Portal Mask: 'Already Booked'",
        maskDescription: 'Masked as Already Booked on citizen portal.',
      },
    };
  }

  if (slot.status === 'BOOKED') {
    return {
      id: slotId,
      facilityId,
      startTime: slot.start_time,
      endTime: slot.end_time,
      timeRange,
      timeSubtitle: 'Confirmed Reservation',
      timeSubtitleTone: 'secondary',
      status: 'booked',
      statusBadgeLabel: 'Booked',
      statusBadgeIcon: 'verified',
      courtScope: 'full',
      bannerTone: 'secondary',
      bannerIcon: 'groups',
      bannerTitle: slot.user_full_name || 'Citizen / Officer Booking',
      bannerSubtitle: `Booking Ref: ${slot.booking_code ?? 'CONFIRMED'}`,
      bannerRightTag: fullPart?.booking_status ?? 'CONFIRMED',
      bannerRightTagTone: 'primary-text',
      actions: [
        { id: 'quick-block', label: 'Override Block', icon: 'gavel', variant: 'amber' },
        { id: 'challan', label: 'Payments', icon: 'receipt_long', variant: 'subtle' },
      ],
      overrideConfig: {
        reasonId: 'security',
        noteTitle: 'Emergency Authority Override',
        noteDescription: `Overrides booking ${slot.booking_code ?? ''}`,
        auditRecordId: slot.booking_code ?? 'OVERRIDE',
        officerLabel,
        courtLabel: 'Full Facility',
        maskTitle: "Public Portal Mask: 'Already Booked'",
        maskDescription: 'Confirmed bookings will be cancelled if force override is confirmed.',
      },
    };
  }

  return {
    id: slotId,
    facilityId,
    startTime: slot.start_time,
    endTime: slot.end_time,
    timeRange,
    timeSubtitle: 'Free for Reservation',
    timeSubtitleTone: 'emerald',
    status: 'available',
    statusBadgeLabel: 'Available',
    courtScope: 'full',
    bannerTone: 'neutral',
    bannerIcon: 'check_circle',
    bannerTitle: 'Public Slot Available',
    bannerSubtitle: 'Open for citizen & government personnel online booking',
    bannerRightTag: 'Live on Public Portal',
    bannerRightTagTone: 'emerald-tag',
    actions: [
      { id: 'quick-block', label: 'Quick Block Slot', icon: 'lock_clock', variant: 'amber' },
    ],
    overrideConfig: {
      reasonId: 'drill',
      noteTitle: 'Departmental Duty / Drill',
      noteDescription: 'Reserved for Kannur City Police scheduled training.',
      auditRecordId: 'NEW-BLOCK',
      officerLabel,
      courtLabel: 'Full Facility',
      maskTitle: "Public Portal Mask: 'Already Booked'",
      maskDescription: 'Masked as Already Booked on citizen portal.',
    },
  };
}

export default function AdminFacilitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dateOptions = useMemo(() => buildAdminDateOptions(), []);

  const [facilities, setFacilities] = useState<FacilityAdminItem[]>(facilityAdminList);
  const [liveFacilitiesMap, setLiveFacilitiesMap] = useState<
    Record<string, ApiFacility>
  >({});
  const [selectedFacilityId, setSelectedFacilityId] = useState<FacilityAdminId>('turf');
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(1);
  const [selectedScope, setSelectedScope] = useState<CourtScopeFilterId>('all');
  const [slots, setSlots] = useState<LiveFacilityTimeSlot[]>([]);
  const [activeOverrideSlotId, setActiveOverrideSlotId] = useState<string | null>(null);
  const [maintenanceClosedFacilities, setMaintenanceClosedFacilities] = useState<
    Record<FacilityAdminId, boolean>
  >({
    track: false,
    football: false,
    turf: false,
    badminton: false,
  });

  const [isEditRulesOpen, setIsEditRulesOpen] = useState<boolean>(false);
  const [manualBookingSlot, setManualBookingSlot] = useState<FacilityTimeSlot | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((title: string, subtitle: string) => {
    setToast({ title, subtitle });
    window.setTimeout(() => {
      setToast((prev) => (prev?.title === title ? null : prev));
    }, 3800);
  }, []);

  useEffect(() => {
    facilitiesApi
      .list()
      .then((res) => {
        const byCode: Record<string, ApiFacility> = {};
        res.facilities.forEach((f) => {
          byCode[f.code] = f;
        });
        setLiveFacilitiesMap(byCode);
      })
      .catch(() => {});
  }, []);

  const activeFacilityCode = FACILITY_ID_TO_CODE[selectedFacilityId];
  const activeDateOption = dateOptions[selectedDateIndex] ?? dateOptions[1];

  const fetchSlots = useCallback(async () => {
    try {
      const res = await adminApi.getFacilitySlots(
        activeFacilityCode,
        activeDateOption.isoDate
      );
      const officerLabel = user ? `${user.full_name} (@${user.username})` : 'Duty Officer';
      const mapped = res.slots.map((s) =>
        mapAdminSlotToUi(s, selectedFacilityId, res.facility.is_partitionable, officerLabel)
      );
      setSlots(mapped);
    } catch (error) {
      showToast(
        'Slot Sync Error',
        error instanceof ApiError ? error.message : 'Unable to load facility slots.'
      );
    }
  }, [activeFacilityCode, activeDateOption.isoDate, selectedFacilityId, user, showToast]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const activeFacility = useMemo(
    () => facilities.find((item) => item.id === selectedFacilityId) ?? facilities[0],
    [facilities, selectedFacilityId]
  );

  const visibleSlots = useMemo(() => {
    if (selectedScope === 'all') return slots;
    if (selectedScope === 'full') {
      return slots.filter((slot) => slot.courtScope === 'full');
    }
    return slots.filter((slot) => slot.courtScope === 'split');
  }, [slots, selectedScope]);

  const bookedOrBlockedCount = useMemo(
    () =>
      slots.filter(
        (slot) => slot.status === 'booked' || slot.status === 'blocked' || slot.status === 'split'
      ).length,
    [slots]
  );

  const handleSelectFacility = (id: FacilityAdminId) => {
    setSelectedFacilityId(id);
    setSelectedScope('all');
    setActiveOverrideSlotId(null);
  };

  const handleConfirmBlock = async (
    slotId: string,
    reasonId: OverrideReasonId,
    noteTitle: string,
    noteDescription: string
  ) => {
    const targetSlot = slots.find((s) => s.id === slotId);
    if (!targetSlot?.startTime) return;
    const reasonObj = facilityOverrideReasons.find((r) => r.id === reasonId);
    const internalReason = `${reasonObj?.label ?? 'Authority Block'}: ${noteTitle}${
      noteDescription ? ` — ${noteDescription}` : ''
    }`;

    try {
      await adminApi.createSlotBlock({
        facility_code: activeFacilityCode,
        block_date: activeDateOption.isoDate,
        start_time: targetSlot.startTime,
        end_time: targetSlot.endTime,
        court_partition: 'FULL',
        internal_reason: internalReason,
        force_override: targetSlot.status === 'booked',
      });
      setActiveOverrideSlotId(null);
      showToast(
        'Authority Block Confirmed',
        `${targetSlot.timeRange} locked on ${activeDateOption.isoDate}. Citizen portal mask active.`
      );
      await fetchSlots();
    } catch (error) {
      showToast(
        'Authority Block Failed',
        error instanceof ApiError ? error.message : 'Could not create authority block.'
      );
    }
  };

  const handleReleaseSlot = async (slotId: string) => {
    const targetSlot = slots.find((s) => s.id === slotId);
    if (!targetSlot?.blockId) {
      showToast('No Active Block', 'No authority block ID found for this slot.');
      return;
    }

    try {
      await adminApi.deleteSlotBlock(targetSlot.blockId);
      if (activeOverrideSlotId === slotId) {
        setActiveOverrideSlotId(null);
      }
      showToast(
        'Slot Released to Public Portal',
        `${targetSlot.timeRange} is now live and open for online reservation.`
      );
      await fetchSlots();
    } catch (error) {
      showToast(
        'Release Failed',
        error instanceof ApiError ? error.message : 'Unable to release authority block.'
      );
    }
  };

  const handleSlotAction = (slot: FacilityTimeSlot, actionId: FacilitySlotAction['id']) => {
    switch (actionId) {
      case 'quick-block':
      case 'details':
      case 'manage':
      case 'actions':
        setActiveOverrideSlotId(slot.id);
        break;
      case 'release':
        handleReleaseSlot(slot.id);
        break;
      case 'manual-booking':
      case 'assign':
        setManualBookingSlot(slot);
        break;
      case 'challan':
        navigate('/admin/payments');
        break;
      case 'gate-pass':
        navigate('/admin/gate-entries');
        break;
      case 'maintenance-log':
        navigate('/admin/audit-log');
        break;
      case 'roster':
      case 'summary':
        showToast(
          `${actionId === 'roster' ? 'Squad Roster' : 'Slot Summary'} — ${slot.timeRange}`,
          `${slot.bannerTitle ?? ''} (${slot.bannerRightTag ?? 'Verified'})`
        );
        break;
    }
  };

  const handleToggleSplitHalfBlock = async (slotId: string, halfId: 'half-a' | 'half-b') => {
    const targetSlot = slots.find((s) => s.id === slotId);
    if (!targetSlot?.startTime) return;

    const partition: BackendCourtPartition = halfId === 'half-a' ? 'HALF_A' : 'HALF_B';
    const existingHalfBlockId =
      halfId === 'half-a' ? targetSlot.halfABlockId : targetSlot.halfBBlockId;

    try {
      if (existingHalfBlockId) {
        await adminApi.deleteSlotBlock(existingHalfBlockId);
        showToast(
          'Split Court Released',
          `${partition} unblocked for ${targetSlot.timeRange}.`
        );
      } else {
        await adminApi.createSlotBlock({
          facility_code: activeFacilityCode,
          block_date: activeDateOption.isoDate,
          start_time: targetSlot.startTime,
          end_time: targetSlot.endTime,
          court_partition: partition,
          internal_reason: `Duty Officer Hold (${partition})`,
        });
        showToast(
          'Split Court Blocked',
          `${partition} blocked for ${targetSlot.timeRange}.`
        );
      }
      await fetchSlots();
    } catch (error) {
      showToast(
        'Split Court Error',
        error instanceof ApiError ? error.message : 'Unable to update split court status.'
      );
    }
  };

  const handleSaveRules = (updatedParameters: FacilityRuleParameter[]) => {
    setFacilities((prev) =>
      prev.map((item) =>
        item.id === selectedFacilityId ? { ...item, parameters: updatedParameters } : item
      )
    );
    setIsEditRulesOpen(false);
    showToast(
      'Facility Rules Updated',
      `Operational parameters for ${activeFacility.name} saved.`
    );
  };

  const handleToggleMaintenanceClosure = () => {
    const nextState = !maintenanceClosedFacilities[selectedFacilityId];
    setMaintenanceClosedFacilities((prev) => ({
      ...prev,
      [selectedFacilityId]: nextState,
    }));
    setFacilities((prev) =>
      prev.map((item) =>
        item.id === selectedFacilityId
          ? {
              ...item,
              operationalStatus: nextState ? 'Maintenance Closure' : 'Operational & Online',
            }
          : item
      )
    );
    showToast(
      nextState ? 'Facility Maintenance Closure Active' : 'Facility Re-opened Online',
      nextState
        ? `${activeFacility.name} marked for maintenance inspection.`
        : `${activeFacility.name} is now live.`
    );
  };

  const handleConfirmManualBooking = (
    _slotId: string,
    organiserTitle: string,
    _subtitleMeta: string
  ) => {
    setManualBookingSlot(null);
    showToast('Manual Desk Note', `Recorded desk note for ${organiserTitle}.`);
  };

  const liveFacMeta = liveFacilitiesMap[activeFacilityCode];

  return (
    <div className="admin-ops-page flex flex-col w-full">
      <div className="relative w-full max-w-7xl mx-auto px-margin-desktop py-space-lg flex flex-col gap-space-lg">
        {/* Ambient Backdrop Light Glows (Contained) */}
        <div className="pointer-events-none absolute -top-12 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-60" />
        <div className="pointer-events-none absolute top-48 right-12 w-80 h-80 bg-secondary-container/40 rounded-full blur-3xl opacity-50" />

        {/* Facility Switcher: Segmented Pill Controller */}
        <FacilitySwitcherBar
          facilities={facilities.map((f) => {
            const live = liveFacilitiesMap[FACILITY_ID_TO_CODE[f.id]];
            return live ? { ...f, name: live.name } : f;
          })}
          selectedFacilityId={selectedFacilityId}
          onSelectFacility={handleSelectFacility}
          bookedCount={bookedOrBlockedCount}
          totalCount={slots.length || activeFacility.totalSlotsCount}
        />

        {/* Section 2: Configuration & Operational Parameters Card */}
        <FacilityRulesCard
          facility={
            liveFacMeta
              ? {
                  ...activeFacility,
                  name: liveFacMeta.name,
                  subtitle: `${liveFacMeta.operating_start} – ${liveFacMeta.operating_end} • Daily Cap: ${liveFacMeta.daily_user_hour_cap} hrs/day`,
                }
              : activeFacility
          }
          isMaintenanceClosureActive={maintenanceClosedFacilities[selectedFacilityId]}
          onOpenEditRules={() => setIsEditRulesOpen(true)}
          onToggleMaintenanceClosure={handleToggleMaintenanceClosure}
        />

        {/* Section 3: Interactive Daily Slot Grid & Date Controls */}
        <div className="relative z-10 flex flex-col gap-space-md">
          {/* Date Bar & Filter Controls */}
          <FacilityDateFilterBar
            dateOptions={dateOptions}
            selectedDateIndex={selectedDateIndex}
            onSelectDateIndex={(idx) => {
              setSelectedDateIndex(idx);
              setActiveOverrideSlotId(null);
            }}
            courtScopeOptions={facilityCourtScopeOptions}
            selectedScope={selectedScope}
            onSelectScope={setSelectedScope}
          />

          {/* Time Slots Grid Container */}
          <div className="flex flex-col gap-3">
            {visibleSlots.map((slot) => {
              if (slot.id === activeOverrideSlotId) {
                return (
                  <FacilityOverridePanel
                    key={slot.id}
                    slot={slot}
                    reasonOptions={facilityOverrideReasons}
                    onConfirmBlock={handleConfirmBlock}
                    onReleaseSlot={handleReleaseSlot}
                    onCancel={() => setActiveOverrideSlotId(null)}
                  />
                );
              }

              return (
                <FacilitySlotRow
                  key={slot.id}
                  slot={slot}
                  onSlotAction={handleSlotAction}
                  onToggleSplitHalfBlock={handleToggleSplitHalfBlock}
                />
              );
            })}
          </div>
        </div>

        {/* Clean Spacing Anchor */}
        <div className="w-full h-8" />
      </div>

      {/* Modals */}
      {isEditRulesOpen && (
        <FacilityEditRulesModal
          facility={activeFacility}
          onClose={() => setIsEditRulesOpen(false)}
          onSaveRules={handleSaveRules}
        />
      )}

      {manualBookingSlot && (
        <FacilityManualBookingModal
          slot={manualBookingSlot}
          facilityName={activeFacility.name}
          onClose={() => setManualBookingSlot(null)}
          onConfirmBooking={handleConfirmManualBooking}
        />
      )}

      {/* Notification Toast */}
      <div
        className={`fixed bottom-8 right-8 z-50 transform transition-all duration-300 pointer-events-none flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-2xl ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
        }`}
      >
        <MaterialIcon name="verified" className="text-emerald-400 text-[22px]" />
        <div className="flex flex-col">
          <span className="font-label-primary text-label-primary font-medium text-white">
            {toast?.title ?? 'Slot Updated'}
          </span>
          <span className="font-caption text-caption text-surface-variant">
            {toast?.subtitle ?? ''}
          </span>
        </div>
      </div>
    </div>
  );
}
