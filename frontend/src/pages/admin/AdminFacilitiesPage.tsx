import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  adminApi,
  type ApiAdminFacilitiesResponse,
  type ApiAdminFacility,
  type ApiManagedSlot,
  type CreateFacilityPayload,
  type CreateSlotPayload,
  type FacilityOperationalStatus,
  type UpdateFacilityPayload,
  type UpdateSlotPayload,
} from '@/api/client';
import '@/styles/adminOps.css';
import { useAuth } from '@/context/AuthContext';
import { currentStaff } from '@/data/mockData';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { FacilityDirectoryCard } from '@/components/admin/facilities/FacilityDirectoryCard';
import { SlotScheduleTable } from '@/components/admin/facilities/SlotScheduleTable';
import { FacilityFormDrawer } from '@/components/admin/facilities/FacilityFormDrawer';
import { SlotFormDrawer } from '@/components/admin/facilities/SlotFormDrawer';

interface ToastState {
  tone: 'success' | 'error';
  title: string;
  subtitle: string;
}

type ActiveDrawerState =
  | null
  | { type: 'add-facility' }
  | { type: 'edit-facility'; facility: ApiAdminFacility }
  | { type: 'add-slot' }
  | { type: 'edit-slot'; slot: ApiManagedSlot };

function getTodayIso(): string {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AdminFacilitiesPage() {
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIso());
  const [directoryData, setDirectoryData] = useState<ApiAdminFacilitiesResponse | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawerState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (title: string, subtitle: string, tone: 'success' | 'error' = 'success') => {
      setToast({ tone, title, subtitle });
      window.setTimeout(() => {
        setToast((prev) => (prev?.title === title ? null : prev));
      }, 4000);
    },
    []
  );

  const loadFacilities = useCallback(
    async (dateStr: string, preferredFacilityId?: string, manualRefresh = false) => {
      if (manualRefresh) setRefreshing(true);
      try {
        const res = await adminApi.listFacilities({ date: dateStr });
        setDirectoryData(res);
        setSelectedFacilityId((prev) => {
          const candidate = preferredFacilityId || prev;
          if (candidate && res.facilities.some((f) => f.id === candidate)) {
            return candidate;
          }
          const turf = res.facilities.find((f) => f.code === 'POLICE_TURF');
          return turf?.id ?? res.facilities[0]?.id ?? '';
        });
      } catch (error) {
        showToast(
          'Unable to Load Facilities',
          error instanceof ApiError ? error.message : 'Failed to connect to sports server.',
          'error'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadFacilities(selectedDate);
  }, [loadFacilities, selectedDate]);

  const facilities = directoryData?.facilities ?? [];
  const summary = directoryData?.summary;

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === selectedFacilityId) ?? facilities[0] ?? null,
    [facilities, selectedFacilityId]
  );

  const handleChangeFacilityStatus = async (
    facilityId: string,
    nextStatus: FacilityOperationalStatus
  ) => {
    setUpdatingStatusId(facilityId);
    try {
      const res = await adminApi.updateFacilityStatus(facilityId, {
        operational_status: nextStatus,
      });
      await loadFacilities(selectedDate, selectedFacilityId || facilityId);
      const statusText =
        nextStatus === 'ACTIVE'
          ? 'Active'
          : nextStatus === 'MAINTENANCE'
            ? 'Maintenance'
            : 'Closed';
      showToast(
        'Facility Status Updated',
        `${res.facility.name} is now marked ${statusText}. Dashboard KPIs synced.`
      );
    } catch (error) {
      showToast(
        'Status Update Failed',
        error instanceof ApiError ? error.message : 'Could not update facility status.',
        'error'
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSaveFacility = async (
    payload: CreateFacilityPayload | UpdateFacilityPayload
  ) => {
    if (activeDrawer?.type === 'add-facility') {
      const res = await adminApi.createFacility(payload as CreateFacilityPayload);
      setActiveDrawer(null);
      await loadFacilities(selectedDate, res.facility.id);
      showToast(
        'Facility Added',
        `${res.facility.name} created with ${res.facility.slots.length} daily time slots.`
      );
    } else if (activeDrawer?.type === 'edit-facility') {
      const res = await adminApi.updateFacility(
        activeDrawer.facility.id,
        payload as UpdateFacilityPayload
      );
      setActiveDrawer(null);
      await loadFacilities(selectedDate, res.facility.id);
      showToast(
        'Facility Updated',
        `Saved updated parameters and fee structure for ${res.facility.name}.`
      );
    }
  };

  const handleSaveSlot = async (payload: CreateSlotPayload | UpdateSlotPayload) => {
    if (!selectedFacility) return;

    if (activeDrawer?.type === 'add-slot') {
      const res = await adminApi.createFacilitySlot(
        selectedFacility.id,
        payload as CreateSlotPayload
      );
      setActiveDrawer(null);
      await loadFacilities(selectedDate, selectedFacility.id);
      showToast(
        'Time Slot Added',
        `Added ${res.slot.start_time} – ${res.slot.end_time} (Capacity: ${res.slot.max_capacity}) to ${selectedFacility.name}.`
      );
    } else if (activeDrawer?.type === 'edit-slot') {
      const res = await adminApi.updateFacilitySlot(
        selectedFacility.id,
        activeDrawer.slot.id,
        payload as UpdateSlotPayload
      );
      setActiveDrawer(null);
      await loadFacilities(selectedDate, selectedFacility.id);
      showToast(
        'Time Slot Updated',
        `Updated ${res.slot.start_time} – ${res.slot.end_time} (Capacity: ${res.slot.max_capacity}).`
      );
    }
  };

  const handleBlockSlot = async (
    slot: ApiManagedSlot,
    payload: {
      block_status: 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT';
      reason: string;
      force_override?: boolean;
    }
  ) => {
    if (!selectedFacility) return;
    setBusySlotId(slot.id);
    try {
      await adminApi.toggleFacilitySlotBlock(selectedFacility.id, slot.id, {
        blocked: true,
        date: selectedDate,
        block_status: payload.block_status,
        reason: payload.reason || undefined,
        force_override: payload.force_override,
      });
      await loadFacilities(selectedDate, selectedFacility.id);
      showToast(
        payload.block_status === 'BLOCKED_MAINTENANCE'
          ? 'Slot Blocked for Maintenance'
          : 'Slot Reserved for Department',
        `${slot.start_time} – ${slot.end_time} on ${selectedDate} updated.`
      );
    } catch (error) {
      showToast(
        'Block Action Failed',
        error instanceof ApiError ? error.message : 'Unable to block time slot.',
        'error'
      );
    } finally {
      setBusySlotId(null);
    }
  };

  const handleUnblockSlot = async (slot: ApiManagedSlot) => {
    if (!selectedFacility) return;
    setBusySlotId(slot.id);
    try {
      await adminApi.toggleFacilitySlotBlock(selectedFacility.id, slot.id, {
        blocked: false,
        date: selectedDate,
      });
      await loadFacilities(selectedDate, selectedFacility.id);
      showToast(
        'Slot Reopened',
        `${slot.start_time} – ${slot.end_time} on ${selectedDate} is now open for bookings.`
      );
    } catch (error) {
      showToast(
        'Unblock Failed',
        error instanceof ApiError ? error.message : 'Unable to unblock time slot.',
        'error'
      );
    } finally {
      setBusySlotId(null);
    }
  };

  const handleDeleteSlot = async (slot: ApiManagedSlot) => {
    if (!selectedFacility) return;
    setBusySlotId(slot.id);
    try {
      await adminApi.deleteFacilitySlot(selectedFacility.id, slot.id, selectedDate);
      await loadFacilities(selectedDate, selectedFacility.id);
      showToast(
        'Time Slot Deleted',
        `Removed ${slot.start_time} – ${slot.end_time} from ${selectedFacility.name}.`
      );
    } catch (error) {
      showToast(
        'Cannot Delete Slot',
        error instanceof ApiError ? error.message : 'Unable to delete time slot.',
        'error'
      );
    } finally {
      setBusySlotId(null);
    }
  };

  return (
    <div className="admin-ops-page flex flex-col w-full">
      <div className="relative w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-9 flex flex-col gap-7">
        {/* Ambient Subtle Executive Glows */}
        <div className="admin-ambient-orb pointer-events-none absolute -top-24 left-1/4 w-[520px] h-[300px] bg-[#165DF5]/[0.07] rounded-full blur-[120px] -z-10" />
        <div
          className="admin-ambient-orb pointer-events-none absolute top-56 right-12 w-96 h-72 bg-sky-400/[0.08] rounded-full blur-[110px] -z-10"
          style={{ animationDelay: '-9s' }}
        />

        {/* Executive Page Header */}
        <AdminPageHeader
          shiftBadge={
            summary
              ? `${summary.active_facilities} of ${summary.total_facilities} Venues Active · ${summary.active_courts} Active Courts`
              : 'Facilities & Slot Operations'
          }
          officerLabel={user ? `${user.full_name} (@${user.username})` : currentStaff.name}
          title="Facilities & Slot Manager"
          groundsBadge="Kannur Armed Reserve Police Grounds"
          subtitle="Configure sports venues, toggle operational availability, manage Public vs. Govt/Police tariffs, and schedule daily time slots."
          actions={
            <>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => loadFacilities(selectedDate, selectedFacilityId, true)}
                className="admin-btn-secondary px-4 inline-flex items-center gap-2 disabled:opacity-60"
              >
                <MaterialIcon
                  name="refresh"
                  className={`text-[18px] text-slate-500 ${refreshing ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawer({ type: 'add-facility' })}
                className="admin-btn-primary px-5 inline-flex items-center gap-2"
              >
                <MaterialIcon name="add_circle" className="text-[19px]" />
                <span>Add Facility</span>
              </button>
            </>
          }
        />

        {/* Section 1: Sports Facility Directory */}
        <section aria-labelledby="facility-directory-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2
                id="facility-directory-heading"
                className="font-display text-[17px] font-bold text-[#0F172A] tracking-[-0.02em]"
              >
                Sports Venue Directory
              </h2>
              {summary && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white border border-slate-200/90 text-slate-600 text-[11.5px] font-semibold tabular-nums shadow-2xs">
                    {summary.total_facilities} Venues
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] text-[11.5px] font-semibold tabular-nums">
                    {summary.slot_utilization_rate}% Daily Utilization
                  </span>
                </div>
              )}
            </div>
            <span className="text-[12.5px] text-slate-500 font-medium">
              Select a venue card to manage its daily slot timeline
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-[214px] rounded-[22px] bg-white/80 border border-slate-200/80 animate-pulse p-5"
                />
              ))}
            </div>
          ) : facilities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
              {facilities.map((facility, idx) => (
                <FacilityDirectoryCard
                  key={facility.id}
                  facility={facility}
                  isSelected={selectedFacility?.id === facility.id}
                  isUpdatingStatus={updatingStatusId === facility.id}
                  delayMs={idx * 65}
                  onSelect={(id) => setSelectedFacilityId(id)}
                  onEdit={(fac) => setActiveDrawer({ type: 'edit-facility', facility: fac })}
                />
              ))}
            </div>
          ) : (
            <div className="admin-surface-card rounded-[24px] p-12 text-center">
              <p className="text-[14px] text-slate-500 font-medium">
                No sports facilities configured yet. Use &ldquo;Add Facility&rdquo; to create your
                first venue.
              </p>
            </div>
          )}
        </section>

        {/* Section 2: Daily Slot Operations Workspace */}
        {selectedFacility && (
          <SlotScheduleTable
            facility={selectedFacility}
            selectedDate={selectedDate}
            isUpdatingStatus={updatingStatusId === selectedFacility.id}
            onChangeDate={(nextDate) => setSelectedDate(nextDate)}
            onChangeFacilityStatus={handleChangeFacilityStatus}
            onEditFacility={(fac) => setActiveDrawer({ type: 'edit-facility', facility: fac })}
            onRestoreFacilityActive={(id) => handleChangeFacilityStatus(id, 'ACTIVE')}
            onOpenAddSlot={() => setActiveDrawer({ type: 'add-slot' })}
            onOpenEditSlot={(slot) => setActiveDrawer({ type: 'edit-slot', slot })}
            onBlockSlot={handleBlockSlot}
            onUnblockSlot={handleUnblockSlot}
            onDeleteSlot={handleDeleteSlot}
            busySlotId={busySlotId}
          />
        )}
      </div>

      {/* Single-Level Slide-Over Drawers */}
      {(activeDrawer?.type === 'add-facility' || activeDrawer?.type === 'edit-facility') && (
        <FacilityFormDrawer
          mode={activeDrawer.type === 'add-facility' ? 'create' : 'edit'}
          facility={activeDrawer.type === 'edit-facility' ? activeDrawer.facility : null}
          onClose={() => setActiveDrawer(null)}
          onSubmit={handleSaveFacility}
        />
      )}

      {selectedFacility &&
        (activeDrawer?.type === 'add-slot' || activeDrawer?.type === 'edit-slot') && (
          <SlotFormDrawer
            mode={activeDrawer.type === 'add-slot' ? 'create' : 'edit'}
            facility={selectedFacility}
            selectedDate={selectedDate}
            slot={activeDrawer.type === 'edit-slot' ? activeDrawer.slot : null}
            onClose={() => setActiveDrawer(null)}
            onSubmit={handleSaveSlot}
          />
        )}

      {/* Executive Toast Notification */}
      <div
        role="status"
        className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 pointer-events-none flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border max-w-md ${
          toast?.tone === 'error'
            ? 'bg-rose-600 border-rose-500 text-white'
            : 'bg-[#0F172A] border-slate-700/80 text-white'
        } ${toast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
      >
        <MaterialIcon
          name={toast?.tone === 'error' ? 'error' : 'verified'}
          className={`text-[21px] shrink-0 ${
            toast?.tone === 'error' ? 'text-white' : 'text-emerald-400'
          }`}
        />
        <div className="flex flex-col">
          <span className="font-display text-[13.5px] font-bold text-white leading-snug">
            {toast?.title ?? ''}
          </span>
          <span className="text-[12px] text-slate-300 leading-snug">{toast?.subtitle ?? ''}</span>
        </div>
      </div>
    </div>
  );
}
