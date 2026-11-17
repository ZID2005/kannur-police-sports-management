import { useState } from 'react';
import type {
  FacilityTimeSlot,
  OverrideReasonId,
  OverrideReasonOption,
} from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface FacilityOverridePanelProps {
  slot: FacilityTimeSlot;
  reasonOptions: OverrideReasonOption[];
  onConfirmBlock: (
    slotId: string,
    reasonId: OverrideReasonId,
    noteTitle: string,
    noteDescription: string
  ) => void;
  onReleaseSlot: (slotId: string) => void;
  onCancel: () => void;
}

export function FacilityOverridePanel({
  slot,
  reasonOptions,
  onConfirmBlock,
  onReleaseSlot,
  onCancel,
}: FacilityOverridePanelProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<OverrideReasonId>(
    slot.overrideConfig.reasonId
  );
  const [noteTitle, setNoteTitle] = useState<string>(slot.overrideConfig.noteTitle);
  const [noteDescription, setNoteDescription] = useState<string>(
    slot.overrideConfig.noteDescription
  );
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  return (
    <div className="relative bg-surface-container-lowest rounded-3xl p-5 sm:p-7 shadow-[0_24px_50px_rgba(0,83,205,0.12)] ring-2 ring-primary/20 flex flex-col gap-6">
      {/* Modal / Card Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-surface-container-high/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-700">
            <MaterialIcon name="gavel" className="text-[24px]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline-card text-headline-card font-bold text-on-surface">
                {slot.timeRange}
              </span>
              <span className="font-label-primary text-label-primary font-bold text-primary">
                {slot.overrideConfig.courtLabel}
              </span>
              <span className="bg-amber-100 text-amber-900 font-caption text-caption font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Active Override
              </span>
            </div>
            <span className="font-label-meta text-label-meta text-on-surface-variant">
              Duty Officer Slot Override &amp; Authority Block Action Panel
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-caption text-caption text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
            {slot.overrideConfig.officerLabel}
          </span>
        </div>
      </div>

      {/* Drawer Action Form Body */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Override Reason Selection */}
        <div className="flex flex-col gap-3">
          <label className="font-label-primary text-label-primary font-bold text-on-surface flex items-center gap-1.5">
            <MaterialIcon name="category" className="text-[18px] text-primary" />
            Override Classification Reason
          </label>
          <div className="grid grid-cols-2 gap-2">
            {reasonOptions.map((reason) => {
              const isSelected = reason.id === selectedReasonId;
              return (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => setSelectedReasonId(reason.id)}
                  className={
                    isSelected
                      ? 'p-3 rounded-xl bg-primary/10 text-primary font-label-meta text-label-meta font-bold text-left flex items-center gap-2 shadow-sm ring-1 ring-primary/30'
                      : 'p-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-meta text-label-meta font-medium text-left flex items-center gap-2 transition-colors'
                  }
                >
                  <MaterialIcon
                    name={reason.icon}
                    className={`text-[18px] ${isSelected ? '' : 'text-tertiary'}`}
                  />
                  {reason.label}
                </button>
              );
            })}
          </div>

          {/* Reason Details Textarea */}
          <div className="flex flex-col gap-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-label-meta text-label-meta font-medium text-on-surface-variant">
                Specific Internal Note / Event Details
              </label>
              <button
                type="button"
                onClick={() => setIsEditingNote((prev) => !prev)}
                className="font-caption text-caption text-primary hover:underline font-medium"
              >
                {isEditingNote ? 'Done Editing' : 'Edit Note'}
              </button>
            </div>
            {isEditingNote ? (
              <div className="bg-surface-container-low/70 rounded-xl p-3 flex flex-col gap-2">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest font-body-default text-body-default text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Override title..."
                />
                <input
                  type="text"
                  value={noteDescription}
                  onChange={(e) => setNoteDescription(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest font-caption text-caption text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Supporting details..."
                />
              </div>
            ) : (
              <div className="bg-surface-container-low/70 rounded-xl p-3 flex flex-col">
                <span className="font-body-default text-body-default text-on-surface font-medium">
                  {noteTitle}
                </span>
                <span className="font-caption text-caption text-on-surface-variant pt-1">
                  {noteDescription}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Portal Masking & Audit Controls */}
        <div className="flex flex-col justify-between gap-4 bg-surface-container-low/50 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <span className="font-label-primary text-label-primary font-bold text-on-surface flex items-center gap-1.5">
              <MaterialIcon name="visibility_off" className="text-[18px] text-secondary" />
              Citizen Portal Masking &amp; Public Display
            </span>
            <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex items-start gap-3">
              <MaterialIcon
                name="check_circle"
                className="text-[20px] text-emerald-600 mt-0.5"
              />
              <div className="flex flex-col">
                <span className="font-label-meta text-label-meta font-bold text-on-surface">
                  {slot.overrideConfig.maskTitle}
                </span>
                <span className="font-caption text-caption text-on-surface-variant">
                  General public and citizen app users will see this slot as{' '}
                  <strong className="text-on-surface font-semibold">
                    &quot;Already Booked&quot;
                  </strong>{' '}
                  rather than an administrative or security block.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-caption font-caption text-on-surface-variant px-1 pt-1">
              <span>Audited Internal Record</span>
              <span className="font-mono font-bold text-primary">
                {slot.overrideConfig.auditRecordId}
              </span>
            </div>
          </div>

          {/* Action Confirmation Strip */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                onConfirmBlock(slot.id, selectedReasonId, noteTitle, noteDescription)
              }
              className="h-11 px-5 rounded-xl bg-primary text-on-primary hover:bg-primary/95 font-label-primary text-label-primary font-semibold flex items-center gap-2 shadow-[0_4px_14px_rgba(0,83,205,0.30)] transition-all"
            >
              <MaterialIcon name="check" className="text-[18px]" />
              Confirm Authority Block
            </button>
            <button
              type="button"
              onClick={() => onReleaseSlot(slot.id)}
              className="h-11 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-primary text-label-primary font-medium transition-colors"
            >
              Release / Make Available
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="h-11 px-4 rounded-xl text-on-surface-variant hover:text-on-surface font-label-primary text-label-primary font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
