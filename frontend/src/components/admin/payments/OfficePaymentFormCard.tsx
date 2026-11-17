import { useState, type FormEvent } from 'react';
import type { OfficePaymentFormValues, OfficeSelectOption } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface OfficePaymentFormCardProps {
  defaultValues: OfficePaymentFormValues;
  facilityOptions: OfficeSelectOption[];
  modeOptions: OfficeSelectOption[];
  officerName: string;
  officerPin: string;
  onSubmitPayment: (values: OfficePaymentFormValues) => void;
}

export function OfficePaymentFormCard({
  defaultValues,
  facilityOptions,
  modeOptions,
  officerName,
  officerPin,
  onSubmitPayment,
}: OfficePaymentFormCardProps) {
  const [formValues, setFormValues] = useState<OfficePaymentFormValues>(defaultValues);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmitPayment(formValues);
  };

  const handleReset = () => {
    setFormValues(defaultValues);
  };

  return (
    <div
      className="relative z-10 p-6 md:p-8 rounded-3xl bg-surface-container-lowest/70 backdrop-blur-3xl shadow-[0_20px_48px_rgba(0,83,205,0.08)] flex flex-col gap-space-lg scroll-mt-20"
      id="office-record-section"
    >
      {/* Card Header Lockup */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b-0 pb-2">
        <div className="flex items-start gap-space-md">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-[0_4px_16px_rgba(0,83,205,0.25)] shrink-0">
            <MaterialIcon name="point_of_sale" className="text-[24px]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline-card text-headline-card text-on-surface font-semibold">
                Record Office Treasury Payment
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-caption text-caption font-semibold">
                Authorized Desk
              </span>
            </div>
            <p className="font-body-default text-body-default text-on-surface-variant mt-0.5">
              Authorized desk for recording physical challans, government departmental dues, and
              in-person verified payments.
            </p>
          </div>
        </div>

        {/* Duty Officer Chip */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container-low/90 text-on-surface self-start md:self-auto shadow-sm">
          <MaterialIcon name="shield_person" className="text-primary text-[20px]" />
          <div className="flex flex-col text-left">
            <span className="font-label-meta text-label-meta font-semibold leading-tight">
              {officerName} (PIN: {officerPin})
            </span>
            <span className="font-caption text-caption text-on-surface-variant leading-none">
              Duty Officer Kannur City • Welfare Accounts Desk
            </span>
          </div>
        </div>
      </div>

      {/* Balanced 3-Column / 2-Row Form Grid */}
      <form className="flex flex-col gap-space-lg" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {/* Field 1: Applicant / Organiser Reference */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-medium flex items-center justify-between">
              <span>Applicant / Member Reference</span>
              <span className="font-caption text-caption text-primary">Lookup ID</span>
            </label>
            <div className="relative">
              <MaterialIcon
                name="badge"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
              />
              <input
                type="text"
                required
                value={formValues.applicantRef}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, applicantRef: e.target.value }))
                }
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-surface-container-low/70 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-label-primary text-label-primary outline-none transition-all"
              />
            </div>
            <span className="font-caption text-caption text-on-surface-variant pl-1">
              Auto-mapped to Kerala Police Welfare PIN: 549210
            </span>
          </div>

          {/* Field 2: Treasury Receipt / Challan Number */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-medium flex items-center justify-between">
              <span>Treasury Receipt / Challan Number</span>
              <span className="font-caption text-caption text-error font-medium">* Required</span>
            </label>
            <div className="relative">
              <MaterialIcon
                name="tag"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
              />
              <input
                type="text"
                required
                value={formValues.challanNumber}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, challanNumber: e.target.value }))
                }
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-surface-container-low/70 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-label-primary text-label-primary outline-none transition-all font-mono"
              />
            </div>
            <span className="font-caption text-caption text-on-surface-variant pl-1">
              Enter TR-5 or Sub-Treasury e-Challan Reference
            </span>
          </div>

          {/* Field 3: Amount Received */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-medium flex items-center justify-between">
              <span>Amount Received (₹)</span>
              <span className="font-caption text-caption text-emerald-700 font-medium">
                Govt 50% Applied
              </span>
            </label>
            <div className="relative">
              <MaterialIcon
                name="currency_rupee"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
              />
              <input
                type="number"
                step="0.01"
                required
                value={formValues.amount}
                onChange={(e) => setFormValues((prev) => ({ ...prev, amount: e.target.value }))}
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-surface-container-low/70 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-label-primary text-label-primary outline-none transition-all font-semibold"
              />
            </div>
            <span className="font-caption text-caption text-on-surface-variant pl-1">
              Inclusive of 18% GST (SGST 9% + CGST 9%)
            </span>
          </div>

          {/* Field 4: Facility Allocated */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-medium">
              Facility Allocated
            </label>
            <div className="relative">
              <MaterialIcon
                name="stadium"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
              />
              <select
                required
                value={formValues.facilityValue}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    facilityValue: e.target.value as OfficePaymentFormValues['facilityValue'],
                  }))
                }
                className="w-full h-14 pl-12 pr-10 rounded-xl bg-surface-container-low/70 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-label-primary text-label-primary outline-none transition-all appearance-none cursor-pointer"
              >
                {facilityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <MaterialIcon
                name="expand_more"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]"
              />
            </div>
            <span className="font-caption text-caption text-on-surface-variant pl-1">
              Slot schedule validated for morning hours
            </span>
          </div>

          {/* Field 5: Payment Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-medium">
              Payment Mode
            </label>
            <div className="relative">
              <MaterialIcon
                name="payments"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
              />
              <select
                required
                value={formValues.paymentMode}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    paymentMode: e.target.value as OfficePaymentFormValues['paymentMode'],
                  }))
                }
                className="w-full h-14 pl-12 pr-10 rounded-xl bg-surface-container-low/70 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 text-on-surface font-label-primary text-label-primary outline-none transition-all appearance-none cursor-pointer"
              >
                {modeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <MaterialIcon
                name="expand_more"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]"
              />
            </div>
            <span className="font-caption text-caption text-on-surface-variant pl-1">
              Requires dual officer signature on counterfoil
            </span>
          </div>

          {/* Field 6: Date & Time */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-meta text-label-meta text-on-surface font-medium">
              Entry Timestamp
            </label>
            <div className="relative">
              <MaterialIcon
                name="schedule"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]"
              />
              <input
                type="text"
                readOnly
                value={formValues.entryTimestamp}
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-surface-container-low/40 text-on-surface-variant font-label-primary text-label-primary outline-none cursor-not-allowed"
              />
            </div>
            <span className="font-caption text-caption text-on-surface-variant pl-1">
              System clock synchronized with State Data Centre
            </span>
          </div>
        </div>

        {/* Form Submission & Actions Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-2">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <MaterialIcon name="lock" className="text-[18px] text-emerald-600" />
            <span className="font-caption text-caption">
              Cryptographically recorded in Kannur Police Central Audit Vault
            </span>
          </div>
          <div className="flex items-center gap-space-sm w-full sm:w-auto">
            <button
              type="reset"
              onClick={handleReset}
              className="flex-1 sm:flex-none h-14 px-6 rounded-full hover:bg-surface-container text-on-surface-variant font-label-primary text-label-primary transition-colors"
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none h-14 px-8 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-primary text-label-primary shadow-[0_8px_24px_rgba(0,83,205,0.28)] hover:shadow-[0_12px_28px_rgba(0,83,205,0.35)] transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <MaterialIcon name="check_circle" className="text-[20px]" />
              <span>Record &amp; Issue Official Receipt</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
