import { useEffect, useState, type FormEvent } from 'react';
import type { ApiSettlementReceipt } from '@/api/client';
import type { OfficePaymentFormValues, OfficeSelectOption } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface OfficePaymentFormCardProps {
  defaultValues: OfficePaymentFormValues;
  facilityOptions: OfficeSelectOption[];
  modeOptions: OfficeSelectOption[];
  officerName: string;
  officerUsername: string;
  onSubmitPayment: (values: OfficePaymentFormValues) => Promise<void> | void;
  lastReceipt?: ApiSettlementReceipt | null;
  onDismissReceipt?: () => void;
}

const INPUT_CLASS =
  'w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200/95 text-[#0F172A] text-[13.5px] font-medium placeholder:text-slate-400 outline-none focus:border-[#165DF5] focus:ring-2 focus:ring-[#165DF5]/15 transition-all';

function formatInr(value?: string | number | null): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function OfficePaymentFormCard({
  defaultValues,
  facilityOptions,
  modeOptions,
  officerName,
  officerUsername,
  onSubmitPayment,
  lastReceipt,
  onDismissReceipt,
}: OfficePaymentFormCardProps) {
  const [formValues, setFormValues] = useState<OfficePaymentFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormValues((prev) => ({
      ...prev,
      facilityCode: facilityOptions.some((o) => o.value === prev.facilityCode)
        ? prev.facilityCode
        : (facilityOptions[0]?.value ?? defaultValues.facilityCode),
    }));
  }, [facilityOptions, defaultValues.facilityCode]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitPayment(formValues);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormValues({
      ...defaultValues,
      entryTimestamp: new Date().toLocaleString('en-IN'),
    });
  };

  return (
    <section
      id="office-record-section"
      aria-labelledby="office-receipt-heading"
      style={{ animationDelay: '300ms' }}
      className="admin-animate-enter admin-surface-card rounded-[26px] p-5 sm:p-7 flex flex-col gap-6 scroll-mt-28"
    >
      {/* Card Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#165DF5] to-[#0053CD] flex items-center justify-center text-white shadow-md shadow-[#165DF5]/25 shrink-0">
            <MaterialIcon name="point_of_sale" className="text-[22px]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2
                id="office-receipt-heading"
                className="font-display text-[19px] font-extrabold text-[#0F172A] tracking-[-0.02em]"
              >
                Record Office Treasury Receipt
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] text-[11px] font-semibold">
                Authorized Accounts Desk
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Settle verified offline challans or counter receipts for pending bookings or passes.
              Each entry appends an immutable audit log record.
            </p>
          </div>
        </div>

        {/* Duty Officer Chip */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-50/95 border border-slate-200/85 self-start md:self-auto shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#EFF5FF] text-[#165DF5] flex items-center justify-center shrink-0">
            <MaterialIcon name="shield_person" className="text-[18px]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[12.5px] font-bold text-[#0F172A] leading-tight">
              {officerName}
            </span>
            <span className="text-[11px] text-slate-500 font-mono leading-tight mt-0.5">
              @{officerUsername} · Accounts Desk
            </span>
          </div>
        </div>
      </div>

      {/* Structured Form Grid */}
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Field 1: Booking / Pass Reference */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="office-booking-ref"
              className="text-[12.5px] font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>
                Booking / Pass Reference Code <span className="text-rose-500">*</span>
              </span>
            </label>
            <div className="relative">
              <MaterialIcon
                name="confirmation_number"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none"
              />
              <input
                id="office-booking-ref"
                type="text"
                required
                placeholder="e.g., KCP-SLT-2026-3002"
                value={formValues.applicantRef}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, applicantRef: e.target.value }))
                }
                className={`${INPUT_CLASS} pl-10 font-mono`}
              />
            </div>
            <span className="text-[11.5px] text-slate-400">
              Pending booking code, pass code, or record UUID
            </span>
          </div>

          {/* Field 2: Treasury Receipt / Challan Number */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="office-challan-ref"
              className="text-[12.5px] font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>
                Treasury Challan / Receipt Ref <span className="text-rose-500">*</span>
              </span>
            </label>
            <div className="relative">
              <MaterialIcon
                name="tag"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none"
              />
              <input
                id="office-challan-ref"
                type="text"
                required
                placeholder="TR-KCP-2026-1001"
                value={formValues.challanNumber}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, challanNumber: e.target.value }))
                }
                className={`${INPUT_CLASS} pl-10 font-mono`}
              />
            </div>
            <span className="text-[11.5px] text-slate-400">
              TR-5 challan number or counter slip reference
            </span>
          </div>

          {/* Field 3: Amount Received (Optional check) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="office-amount-received"
              className="text-[12.5px] font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>Total Amount Received (₹)</span>
              <span className="text-[11px] font-medium text-slate-400">Optional</span>
            </label>
            <div className="relative">
              <MaterialIcon
                name="currency_rupee"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none"
              />
              <input
                id="office-amount-received"
                type="number"
                step="0.01"
                min="0"
                placeholder="Auto-calculated from tariff"
                value={formValues.amount}
                onChange={(e) => setFormValues((prev) => ({ ...prev, amount: e.target.value }))}
                className={`${INPUT_CLASS} pl-10 font-semibold tabular-nums`}
              />
            </div>
            <span className="text-[11.5px] text-slate-400">
              Leave blank to apply official tariff + 18% GST
            </span>
          </div>

          {/* Field 4: Facility */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="office-facility-select"
              className="text-[12.5px] font-semibold text-slate-700"
            >
              Facility
            </label>
            <select
              id="office-facility-select"
              required
              value={formValues.facilityCode}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, facilityCode: e.target.value }))
              }
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              {facilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Field 5: Collection Channel */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="office-payment-mode"
              className="text-[12.5px] font-semibold text-slate-700"
            >
              Collection Channel
            </label>
            <select
              id="office-payment-mode"
              required
              value={formValues.paymentMode}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  paymentMode: e.target.value as OfficePaymentFormValues['paymentMode'],
                }))
              }
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              {modeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Field 6: Entry Timestamp */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="office-entry-timestamp"
              className="text-[12.5px] font-semibold text-slate-700"
            >
              Entry Timestamp
            </label>
            <input
              id="office-entry-timestamp"
              type="text"
              readOnly
              value={formValues.entryTimestamp}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 text-[13px] font-mono outline-none cursor-not-allowed tabular-nums"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MaterialIcon name="lock" className="text-[14px]" />
            </span>
            <span className="text-[12.5px] font-medium">
              Automatically logged to the immutable Admin Audit Log upon settlement
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="admin-btn-secondary flex-1 sm:flex-none px-4 inline-flex items-center justify-center"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn-primary flex-1 sm:flex-none px-5 inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <MaterialIcon
                name={submitting ? 'progress_activity' : 'check_circle'}
                className={`text-[18px] ${submitting ? 'animate-spin' : ''}`}
              />
              <span>{submitting ? 'Recording...' : 'Record & Issue Receipt'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Issued Office Receipt Summary */}
      {lastReceipt && (
        <div
          className="admin-panel-expand rounded-2xl bg-emerald-50/45 border border-emerald-200/85 p-4 sm:p-5 flex flex-col gap-3.5"
          aria-live="polite"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-200/60">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MaterialIcon name="receipt_long" className="text-[19px]" />
              </span>
              <div className="flex flex-col">
                <span className="font-display text-[14px] font-bold text-[#0F172A]">
                  Issued Office Receipt ·{' '}
                  <span className="font-mono text-[#165DF5]">{lastReceipt.receipt_no}</span>
                </span>
                <span className="text-[12px] text-slate-600">
                  Ref:{' '}
                  <span className="font-mono font-semibold text-[#0F172A]">
                    {lastReceipt.booking_or_pass_code}
                  </span>{' '}
                  · {lastReceipt.facility_name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  lastReceipt.user_category === 'GOVT_PERSONNEL'
                    ? 'bg-[#EFF5FF] text-[#165DF5] border-[#DCE8FE]'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {lastReceipt.user_category === 'GOVT_PERSONNEL' ? 'Govt / Police' : 'Public'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                Office Settled
              </span>
              <span className="text-[11.5px] text-slate-500 tabular-nums">
                {new Date(lastReceipt.issued_at).toLocaleString('en-IN')}
              </span>
              {onDismissReceipt && (
                <button
                  type="button"
                  onClick={onDismissReceipt}
                  aria-label="Dismiss receipt summary"
                  className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <MaterialIcon name="close" className="text-[17px]" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 tabular-nums">
            <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                Base Fee
              </span>
              <span className="text-[14px] font-bold text-[#0F172A]">
                {formatInr(lastReceipt.pricing_breakdown.base_fee)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                Concession
                {lastReceipt.pricing_breakdown.concession_percent > 0
                  ? ` (${lastReceipt.pricing_breakdown.concession_percent}%)`
                  : ''}
              </span>
              <span
                className={`text-[14px] font-bold ${
                  Number(lastReceipt.pricing_breakdown.concession_discount) > 0
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                {Number(lastReceipt.pricing_breakdown.concession_discount) > 0
                  ? `−${formatInr(lastReceipt.pricing_breakdown.concession_discount)}`
                  : '₹0.00'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                Taxable Subtotal
              </span>
              <span className="text-[14px] font-bold text-[#0F172A]">
                {formatInr(lastReceipt.pricing_breakdown.taxable_subtotal)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                GST ({lastReceipt.pricing_breakdown.gst_rate}%)
              </span>
              <span className="text-[14px] font-bold text-[#0F172A]">
                +{formatInr(lastReceipt.pricing_breakdown.gst_amount)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-[#EFF5FF] border border-[#BFDBFE] col-span-2 sm:col-span-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#165DF5]">
                Total Paid
              </span>
              <span className="font-display text-[15px] font-extrabold text-[#165DF5]">
                {formatInr(lastReceipt.pricing_breakdown.final_total_paid)}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
