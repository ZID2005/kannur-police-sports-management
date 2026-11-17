import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type { PassData } from '@/types/bookings';

interface PassRightSidebarProps {
  pass: PassData;
  onActionToast: (message: string) => void;
}

export function PassRightSidebar({ pass, onActionToast }: PassRightSidebarProps) {
  return (
    <div className="lg:col-span-5 flex flex-col gap-6">
      {/* Action Toolbar */}
      <div className="rounded-[28px] bg-surface-container-lowest/80 backdrop-blur-xl p-6 md:p-7 shadow-[0_8px_24px_rgba(0,83,205,0.06)] flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-2">
          <div className="w-9 h-9 rounded-xl bg-primary-fixed/50 flex items-center justify-center text-primary">
            <MaterialIcon name="downloading" className="text-[20px]" />
          </div>
          <h2 className="font-headline-card text-headline-card text-on-surface">
            Pass Actions
          </h2>
        </div>

        <button
          type="button"
          onClick={() =>
            onActionToast(`Downloading PDF Membership Card (${pass.memberId})...`)
          }
          className="w-full h-14 rounded-[20px] bg-primary text-on-primary font-body-medium text-body-medium font-semibold shadow-[0_8px_24px_rgba(0,83,205,0.28)] hover:bg-primary-container transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <MaterialIcon name="file_download" className="text-[20px]" />
          <span>Download PDF Membership Card</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onActionToast('Digital pass added to Apple / Google Wallet.')
          }
          className="w-full h-14 rounded-[20px] bg-surface-container-low/70 hover:bg-surface-container-high transition-colors font-body-medium text-body-medium font-semibold text-on-surface flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <MaterialIcon name="account_balance_wallet" className="text-[20px]" />
          <span>Add to Apple / Google Wallet</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onActionToast(`Preparing official treasury receipt (${pass.receiptAmount})...`)
          }
          className="w-full h-14 rounded-[20px] bg-surface-container-low/70 hover:bg-surface-container-high transition-colors font-body-medium text-body-medium font-semibold text-on-surface flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <MaterialIcon name="receipt_long" className="text-[20px]" />
          <span>Print Official Receipt ({pass.receiptAmount})</span>
        </button>
      </div>

      {/* Biometric Access Guide & Regulations */}
      <div className="rounded-[28px] bg-surface-container-lowest/80 backdrop-blur-xl p-6 md:p-7 shadow-[0_8px_24px_rgba(0,83,205,0.06)] flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-secondary-container/50 flex items-center justify-center text-secondary">
            <MaterialIcon name="fingerprint" className="text-[20px]" />
          </div>
          <div>
            <h2 className="font-headline-card text-headline-card text-on-surface leading-tight">
              {pass.accessGuideTitle}
            </h2>
            <span className="font-caption text-caption text-tertiary">
              {pass.accessGuideSubtitle}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {pass.biometricSteps.map((step) => (
            <div
              key={step.stepNumber}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container-low/50"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-label-meta text-label-meta font-bold">
                {step.stepNumber}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-label-primary text-label-primary font-semibold text-on-surface">
                  {step.title}
                </span>
                <p className="font-caption text-caption text-on-surface-variant">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Operating Reminders & Footwear Specs */}
        <div className="p-4 rounded-2xl bg-secondary-container/20 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-on-secondary-container font-label-primary text-label-primary font-semibold">
            <MaterialIcon name="schedule" className="text-[18px]" />
            <span>{pass.dailyHoursText}</span>
          </div>
          <p className="font-caption text-caption text-tertiary leading-relaxed">
            {pass.trackRulesText}
          </p>
        </div>
      </div>

      {/* Transaction & Treasury Challan Summary (phone link removed per privacy policy) */}
      <div className="rounded-[28px] bg-surface-container-lowest/80 backdrop-blur-xl p-6 md:p-7 shadow-[0_8px_24px_rgba(0,83,205,0.06)] flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <MaterialIcon name="account_balance" className="text-primary text-[20px]" />
            <span className="font-headline-card text-headline-card text-on-surface">
              Challan Summary
            </span>
          </div>
          <span className="font-headline-card text-headline-card font-bold text-primary">
            {pass.challanTotal}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {pass.challanRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between font-label-meta text-label-meta"
            >
              <span className="text-tertiary">{row.label}</span>
              <span
                className={
                  row.isMono
                    ? 'font-mono font-medium text-on-surface'
                    : 'font-medium text-on-surface'
                }
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-3 flex items-center justify-between font-caption text-caption text-tertiary">
          <span>{pass.dutyDeskLabel}</span>
          <span className="font-medium text-primary">{pass.dutyDeskLocation}</span>
        </div>
      </div>
    </div>
  );
}
