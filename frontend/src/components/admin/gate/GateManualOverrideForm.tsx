import { useState, type FormEvent } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import {
  gateOverrideDefaults,
  gateOverrideFailureClassifications,
  gateOverrideTurnstiles,
} from '@/data/mockData';

export interface ManualOverrideSubmitPayload {
  referenceId: string;
  turnstile: string;
  failureClassification: string;
  justification: string;
}

interface GateManualOverrideFormProps {
  onAuthorizeOverride: (payload: ManualOverrideSubmitPayload) => void;
  onLookupId: (referenceId: string) => void;
}

export function GateManualOverrideForm({
  onAuthorizeOverride,
  onLookupId,
}: GateManualOverrideFormProps) {
  const [referenceId, setReferenceId] = useState(gateOverrideDefaults.referenceId);
  const [turnstile, setTurnstile] = useState(gateOverrideDefaults.turnstile);
  const [failureClassification, setFailureClassification] = useState(
    gateOverrideDefaults.failureClassification,
  );
  const [justification, setJustification] = useState(gateOverrideDefaults.justification);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!referenceId.trim() || !justification.trim()) return;
    onAuthorizeOverride({
      referenceId: referenceId.trim(),
      turnstile,
      failureClassification,
      justification: justification.trim(),
    });
  };

  const handleReset = () => {
    setReferenceId(gateOverrideDefaults.referenceId);
    setTurnstile(gateOverrideDefaults.turnstile);
    setFailureClassification(gateOverrideDefaults.failureClassification);
    setJustification(gateOverrideDefaults.justification);
  };

  return (
    <div
      className="w-full rounded-3xl bg-surface-container-lowest/80 backdrop-blur-3xl shadow-[0_24px_56px_rgba(0,83,205,0.09)] p-6 md:p-10 mb-space-xl"
      id="manual-override-form"
    >
      {/* Section Header with Officer Authority Lockup */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-6 border-b border-surface-container mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
            <MaterialIcon name="admin_panel_settings" className="text-[30px]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-headline-card text-headline-card font-bold text-on-surface">
                Log Supervisory Manual Gate Override
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-caption text-caption font-bold uppercase tracking-wider">
                Rule § 6.28
              </span>
            </div>
            <p className="font-body-default text-body-default text-secondary mt-0.5">
              Authorized desk for manual access granting under Rule § 6.28 in case of biometric
              sensor/optical reader malfunction or valid physical credentials.
            </p>
          </div>
        </div>
        {/* Right Officer In-Charge Badge */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-container-low/80 backdrop-blur-md">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
            <MaterialIcon name="badge" className="text-[20px]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-label-meta text-label-meta font-bold text-on-surface leading-tight">
              {gateOverrideDefaults.officerName}
            </span>
            <span className="font-caption text-caption text-secondary leading-tight">
              {gateOverrideDefaults.officerRole}
            </span>
          </div>
        </div>
      </div>

      {/* Override Form Fields Grid (3 cols x 2 rows) */}
      <form className="space-y-6" onSubmit={handleSubmit} onReset={handleReset}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Field 1: Member / Booking ID */}
          <div className="flex flex-col gap-2">
            <label className="font-label-primary text-label-primary font-semibold text-on-surface flex items-center justify-between">
              <span>Member / Booking ID Reference *</span>
              <button
                type="button"
                onClick={() => onLookupId(referenceId)}
                className="font-caption text-caption text-primary cursor-pointer hover:underline"
              >
                Lookup ID
              </button>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary">
                <MaterialIcon name="badge" className="text-[20px]" />
              </span>
              <input
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-surface-container-low/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-body-default text-body-default transition-all outline-none"
                placeholder="e.g. KCP-MEM-2024-8842 or CIT-4819"
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                required
              />
            </div>
            <span className="font-caption text-caption text-secondary">
              Auto-populates member category &amp; biometric profile
            </span>
          </div>

          {/* Field 2: Facility & Gate */}
          <div className="flex flex-col gap-2">
            <label className="font-label-primary text-label-primary font-semibold text-on-surface">
              Facility &amp; Access Turnstile *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary">
                <MaterialIcon name="door_front" className="text-[20px]" />
              </span>
              <select
                value={turnstile}
                onChange={(e) => setTurnstile(e.target.value)}
                className="w-full h-14 pl-12 pr-10 rounded-2xl bg-surface-container-low/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-body-default text-body-default appearance-none transition-all outline-none"
              >
                {gateOverrideTurnstiles.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-secondary">
                <MaterialIcon name="expand_more" className="text-[20px]" />
              </span>
            </div>
            <span className="font-caption text-caption text-secondary">
              Target gate for instant electronic pulse release
            </span>
          </div>

          {/* Field 3: Technical Failure Classification */}
          <div className="flex flex-col gap-2">
            <label className="font-label-primary text-label-primary font-semibold text-on-surface">
              Technical Failure Classification *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary">
                <MaterialIcon name="device_hub" className="text-[20px]" />
              </span>
              <select
                value={failureClassification}
                onChange={(e) => setFailureClassification(e.target.value)}
                className="w-full h-14 pl-12 pr-10 rounded-2xl bg-surface-container-low/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-body-default text-body-default appearance-none transition-all outline-none"
              >
                {gateOverrideFailureClassifications.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-secondary">
                <MaterialIcon name="expand_more" className="text-[20px]" />
              </span>
            </div>
            <span className="font-caption text-caption text-secondary">
              Audited against hardware telemetry records
            </span>
          </div>

          {/* Field 5: Mandatory Override Justification Notes */}
          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
            <label className="font-label-primary text-label-primary font-semibold text-on-surface">
              Mandatory Override Justification / Notes *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary">
                <MaterialIcon name="notes" className="text-[20px]" />
              </span>
              <input
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-surface-container-low/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-body-default text-body-default transition-all outline-none"
                type="text"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
              />
            </div>
            <span className="font-caption text-caption text-secondary">
              Permanent entry in statutory police administration ledger
            </span>
          </div>
        </div>

        {/* Field 6: Authorizing Officer Signature Banner */}
        <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MaterialIcon name="verified" className="text-[22px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-primary text-label-primary font-bold text-on-surface">
                Authorizing Officer Digital Signature: {gateOverrideDefaults.officerName}
              </span>
              <span className="font-caption text-caption text-secondary">
                System Timestamp: {gateOverrideDefaults.signatureTimestamp} • Hash:{' '}
                {gateOverrideDefaults.signatureHash}
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-label-meta text-label-meta font-bold flex items-center gap-1.5 self-start md:self-auto">
            <MaterialIcon name="lock" className="text-[16px]" />
            Cryptographically Signed
          </span>
        </div>

        {/* Card Footer Actions Cluster */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-surface-container">
          <div className="flex items-center gap-2 text-secondary font-caption text-caption">
            <MaterialIcon name="security" className="text-[18px] text-primary" />
            <span>Recorded in Kannur Police Central Security Audit Vault &amp; Turnstile Firmware.</span>
          </div>
          <div className="flex items-center gap-space-sm justify-end">
            <button
              className="h-14 px-space-lg rounded-full text-secondary hover:text-on-surface hover:bg-surface-container font-label-primary text-label-primary font-semibold transition-colors"
              type="reset"
            >
              Reset Form
            </button>
            <button
              className="h-14 px-space-xl rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-primary text-label-primary font-semibold shadow-[0_8px_24px_rgba(22,107,251,0.30)] hover:shadow-[0_12px_28px_rgba(22,107,251,0.40)] active:scale-[0.985] transition-all flex items-center gap-2.5"
              type="submit"
            >
              <MaterialIcon name="lock_open" className="text-[20px]" />
              <span>Authorize &amp; Unlock Turnstile Gate</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
