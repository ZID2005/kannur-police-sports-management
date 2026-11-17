import { useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  FacilityAdminItem,
  FacilityRuleParameter,
  FacilityTimeSlot,
} from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface EditRulesModalProps {
  facility: FacilityAdminItem;
  onClose: () => void;
  onSaveRules: (updatedParameters: FacilityRuleParameter[]) => void;
}

export function FacilityEditRulesModal({
  facility,
  onClose,
  onSaveRules,
}: EditRulesModalProps) {
  const [params, setParams] = useState<FacilityRuleParameter[]>(facility.parameters);

  const handleParamChange = (id: string, field: 'value' | 'subtext', text: string) => {
    setParams((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: text } : item))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
      <div className="glass-modal w-full max-w-2xl rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 border-b border-surface-container-high pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <MaterialIcon name="tune" className="text-[24px]" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline-card text-headline-card text-on-surface font-bold">
                Edit Operational Rules — {facility.name}
              </h3>
              <span className="font-caption text-caption text-on-surface-variant">
                Changes take effect immediately across citizen &amp; departmental booking portals
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {params.map((param) => (
            <div
              key={param.id}
              className="bg-surface-container-low/80 rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-caption text-caption text-on-surface-variant font-semibold uppercase tracking-wider">
                  {param.label}
                </span>
                <MaterialIcon name={param.icon} className="text-[18px] text-secondary" />
              </div>
              <input
                type="text"
                value={param.value}
                onChange={(e) => handleParamChange(param.id, 'value', e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest font-label-primary text-label-primary font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/25"
              />
              <input
                type="text"
                value={param.subtext}
                onChange={(e) => handleParamChange(param.id, 'subtext', e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest/80 font-caption text-caption text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-primary text-label-primary font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSaveRules(params)}
            className="h-11 px-6 rounded-xl bg-primary text-on-primary hover:bg-primary/95 font-label-primary text-label-primary font-semibold flex items-center gap-2 shadow-md transition-all"
          >
            <MaterialIcon name="save" className="text-[18px]" />
            Save Facility Parameters
          </button>
        </div>
      </div>
    </div>
  );
}

interface ManualBookingModalProps {
  slot: FacilityTimeSlot;
  facilityName: string;
  onClose: () => void;
  onConfirmBooking: (slotId: string, organiserTitle: string, subtitleMeta: string) => void;
}

export function FacilityManualBookingModal({
  slot,
  facilityName,
  onClose,
  onConfirmBooking,
}: ManualBookingModalProps) {
  const [organiserTitle, setOrganiserTitle] = useState(
    'Departmental Squad / Citizen Desk Allocation'
  );
  const [memberRef, setMemberRef] = useState('SI Anil Kumar (PIN 549210)');
  const [challanRef, setChallanRef] = useState('TR-KNR-2024-4490');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
      <div className="glass-modal w-full max-w-lg rounded-3xl p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4 border-b border-surface-container-high pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
              <MaterialIcon name="event_available" className="text-[22px]" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline-card text-headline-card text-on-surface font-bold">
                Manual Desk Booking ({slot.timeRange})
              </h3>
              <span className="font-caption text-caption text-on-surface-variant">
                {facilityName} • Duty Officer Desk Allocation
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-semibold">
              Squad / Team / Booking Title
            </label>
            <input
              type="text"
              value={organiserTitle}
              onChange={(e) => setOrganiserTitle(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container-low font-label-primary text-label-primary text-on-surface outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-semibold">
              Lead Officer / Member Reference
            </label>
            <input
              type="text"
              value={memberRef}
              onChange={(e) => setMemberRef(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container-low font-label-primary text-label-primary text-on-surface outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-semibold">
              Challan / Payment Reference
            </label>
            <input
              type="text"
              value={challanRef}
              onChange={(e) => setChallanRef(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container-low font-mono text-label-primary text-on-surface outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            to="/admin/payments"
            className="font-caption text-caption text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <MaterialIcon name="payments" className="text-[16px]" />
            Open Payment Ledger
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-primary text-label-primary font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                onConfirmBooking(
                  slot.id,
                  organiserTitle,
                  `Lead: ${memberRef} • Challan #${challanRef}`
                )
              }
              className="h-11 px-5 rounded-xl bg-primary text-on-primary hover:bg-primary/95 font-label-primary text-label-primary font-semibold flex items-center gap-1.5 shadow-md transition-all"
            >
              <MaterialIcon name="check_circle" className="text-[18px]" />
              Confirm Allocation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
