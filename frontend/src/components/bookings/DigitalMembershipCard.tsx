import { useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { SyntheticQrCode, TurnstileBarcode } from '@/components/bookings/SyntheticQrCode';
import type { PassData } from '@/types/bookings';

interface DigitalMembershipCardProps {
  pass: PassData;
}

export function DigitalMembershipCard({ pass }: DigitalMembershipCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMemberId = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pass.memberId).catch(() => {
        // Ignore clipboard errors in restricted environments
      });
    }
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="lg:col-span-7 flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-[32px] bg-surface-container-lowest/90 backdrop-blur-[40px] p-6 md:p-8 shadow-[0_20px_48px_rgba(0,83,205,0.10)]">
        {/* Holographic security gradient glow behind card */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary-fixed/50 blur-[90px] pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-60 h-60 rounded-full bg-secondary-fixed/50 blur-[90px] pointer-events-none" />

        {/* Card Header & Badge Lockup */}
        <div className="relative z-10 flex items-center justify-between pb-6 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shadow-inner">
              <MaterialIcon name="local_police" className="text-[28px]" filled />
            </div>
            <div className="flex flex-col">
              <span className="font-caption text-caption font-bold tracking-widest text-primary uppercase">
                {pass.councilName}
              </span>
              <span className="font-headline-card text-headline-card text-on-surface">
                {pass.passTitle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary shadow-[0_4px_12px_rgba(0,83,205,0.25)]">
            <MaterialIcon name="verified" className="text-[15px]" filled />
            <span className="font-label-meta text-label-meta font-bold tracking-wide uppercase">
              {pass.verifiedBadgeText}
            </span>
          </div>
        </div>

        {/* Credential Identity Core */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 rounded-2xl bg-surface-container-lowest/70 backdrop-blur-md">
          <div className="relative shrink-0">
            <img
              alt={pass.photoAlt}
              className="w-24 h-28 object-cover rounded-2xl shadow-md"
              src={pass.photoUrl}
            />
            <div className="absolute -bottom-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-caption text-caption font-bold text-on-surface">
                {pass.liveStatusText}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-headline-card text-headline-card text-on-surface truncate">
                {pass.memberName}
              </h2>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary-container/40">
                <span className="font-label-meta text-label-meta font-mono font-semibold text-on-secondary-container">
                  {pass.departmentalCode}
                </span>
              </div>
            </div>
            <p className="font-label-primary text-label-primary text-secondary">
              {pass.designation}
            </p>
            <div className="mt-2 pt-2 flex flex-wrap items-center gap-2">
              <span className="font-caption text-caption text-tertiary">Member ID:</span>
              <span className="font-label-meta text-label-meta font-mono font-bold text-primary">
                {pass.memberId}
              </span>
              <button
                type="button"
                onClick={handleCopyMemberId}
                title="Copy Member ID"
                className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-surface-container-high transition-colors text-tertiary"
              >
                <MaterialIcon name="content_copy" className="text-[15px]" />
              </button>
              {copied && (
                <span className="font-caption text-caption text-primary">Copied</span>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Pass Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6">
          {pass.details.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-surface-container-low/60 flex flex-col gap-1"
            >
              <span className="font-caption text-caption text-tertiary font-medium">
                {item.label}
              </span>
              <span className="font-label-primary text-label-primary font-semibold text-on-surface">
                {item.value}
              </span>
              <span
                className={
                  item.highlightSubtext
                    ? 'font-caption text-caption text-primary font-semibold'
                    : 'font-caption text-caption text-tertiary'
                }
              >
                {item.subtext}
              </span>
            </div>
          ))}
        </div>

        {/* Scannable Verification Core & Security Strip */}
        <div className="relative z-10 p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-5">
            <SyntheticQrCode seed={pass.qrSeed} variant="pass" />
            <div className="flex flex-col gap-1 text-left">
              <span className="font-label-meta text-label-meta font-bold text-on-surface uppercase tracking-wider">
                {pass.qrTitle}
              </span>
              <span className="font-caption text-caption text-tertiary">
                {pass.qrDescription}
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-primary">
                <MaterialIcon name="sensors" className="text-[16px]" />
                <span className="font-caption text-caption font-semibold">
                  {pass.nfcBadgeText}
                </span>
              </div>
            </div>
          </div>

          <TurnstileBarcode caption={pass.barcodeCaption} />
        </div>

        {/* Microtext legal disclaimer strip */}
        <div className="relative z-10 pt-4 mt-4 flex items-center justify-between text-tertiary">
          <span className="font-caption text-caption text-[11px] leading-tight max-w-sm">
            {pass.legalDisclaimer}
          </span>
          <span className="font-caption text-caption text-[11px] font-mono">
            {pass.nodeId}
          </span>
        </div>
      </div>

      {/* Venue Mini Photo Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low/80 p-4 flex items-center gap-4">
        <img
          alt={pass.venuePhotoAlt}
          className="w-20 h-16 object-cover rounded-xl shrink-0"
          src={pass.venuePhotoUrl}
        />
        <div className="flex flex-col">
          <span className="font-label-primary text-label-primary font-semibold text-on-surface">
            {pass.venueCardTitle}
          </span>
          <span className="font-caption text-caption text-tertiary">
            {pass.venueCardAddress}
          </span>
        </div>
      </div>
    </div>
  );
}
