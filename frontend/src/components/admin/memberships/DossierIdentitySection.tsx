import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type { AdminMembershipApplication } from '@/types/adminMemberships';

export interface DossierIdentitySectionProps {
  application: AdminMembershipApplication;
}

export function DossierIdentitySection({ application }: DossierIdentitySectionProps) {
  return (
    <div className="lg:col-span-7 flex flex-col gap-space-lg">
      {/* Profile & Biometric Card */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[32px] p-space-md sm:p-space-xl shadow-md relative overflow-hidden flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="p-2.5 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
              <MaterialIcon name="badge" className="text-[24px]" />
            </span>
            <div>
              <span className="font-label-meta text-label-meta text-secondary font-medium tracking-wide uppercase">
                Dossier Profile
              </span>
              <h2 className="font-headline-card text-headline-card text-on-surface">
                Applicant Identity &amp; Bio-Credentials
              </h2>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-meta text-label-meta font-semibold">
            <MaterialIcon name="verified" className="text-[14px]" />
            Identity Validated
          </span>
        </div>

        {/* Main Officer Identity Tile */}
        <div className="p-space-md rounded-[24px] bg-surface-container-low flex flex-col sm:flex-row gap-space-md items-start sm:items-center">
          {/* Photo with Biometric Verified Badge */}
          <div className="relative shrink-0 w-32 h-36 rounded-2xl overflow-hidden shadow-sm bg-surface-container-high">
            <img
              className="w-full h-full object-cover"
              alt={application.photoAlt}
              src={application.photoUrl}
            />
            <div className="absolute bottom-0 inset-x-0 bg-primary/90 backdrop-blur-md px-1.5 py-1 text-center">
              <span className="text-on-primary font-caption text-[10px] leading-tight block font-medium">
                {application.biometricMatchLabel}
              </span>
            </div>
          </div>

          {/* Profile Attributes */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-headline-card text-headline-card text-on-surface font-bold tracking-tight">
                {application.applicantName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-md bg-primary text-on-primary font-caption text-caption font-semibold">
                {application.pen ? `PEN: ${application.pen}` : application.tagLabel}
              </span>
            </div>
            <p className="font-label-primary text-label-primary text-primary font-semibold flex items-center gap-1">
              <MaterialIcon name="military_tech" className="text-[16px]" />
              {application.designation}
            </p>
            <div className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 rounded-xl bg-primary-fixed/60 text-on-primary-fixed font-label-meta text-label-meta">
              <MaterialIcon name="percent" className="text-[16px] text-primary" />
              <span>
                {application.concessionBannerText}
                <strong>{application.concessionHighlightText}</strong>
              </span>
            </div>

            {/* Quick Vital Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 text-on-surface-variant font-label-meta text-label-meta">
              <div>
                <span className="text-secondary block font-caption text-caption">
                  DOB / Age
                </span>
                <span className="text-on-surface font-medium">
                  {application.dobAgeLabel}
                </span>
              </div>
              <div>
                <span className="text-secondary block font-caption text-caption">Gender</span>
                <span className="text-on-surface font-medium">{application.gender}</span>
              </div>
              <div>
                <span className="text-secondary block font-caption text-caption">
                  Father&apos;s Name
                </span>
                <span className="text-on-surface font-medium">
                  {application.fatherName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employment & Service Card */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[32px] p-space-md sm:p-space-xl shadow-md flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="p-2.5 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center">
              <MaterialIcon name="corporate_fare" className="text-[22px]" />
            </span>
            <div>
              <span className="font-label-meta text-label-meta text-secondary font-medium uppercase tracking-wide">
                Official Posting
              </span>
              <h4 className="font-headline-card text-headline-card text-on-surface">
                Service Records &amp; Station Deputation
              </h4>
            </div>
          </div>
          <span className="flex items-center gap-1 text-primary font-caption text-caption font-semibold">
            <MaterialIcon name="lan" className="text-[15px]" />
            {application.syncBadgeLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-1">
          <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-1">
            <span className="font-caption text-caption text-secondary">
              Deputed Station / Unit
            </span>
            <span className="font-label-primary text-label-primary text-on-surface font-semibold">
              {application.deputedUnit}
            </span>
            <span className="font-caption text-caption text-on-surface-variant">
              {application.deputedLocation}
            </span>
          </div>
          <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-1">
            <span className="font-caption text-caption text-secondary">
              Intranet Confirmation Status
            </span>
            <div className="flex items-center gap-1.5 text-primary font-label-primary text-label-primary font-semibold">
              <MaterialIcon name="verified_user" className="text-[18px]" />
              <span>{application.intranetStatusLabel}</span>
            </div>
            <span className="font-caption text-caption text-on-surface-variant">
              {application.intranetSubtext}
            </span>
          </div>
        </div>
      </div>

      {/* Address Details Card */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[32px] p-space-md sm:p-space-xl shadow-md flex flex-col gap-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="p-2.5 rounded-2xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
            <MaterialIcon name="home_pin" className="text-[22px]" />
          </span>
          <div>
            <span className="font-label-meta text-label-meta text-secondary font-medium uppercase tracking-wide">
              Residence Verification
            </span>
            <h4 className="font-headline-card text-headline-card text-on-surface">
              Jurisdiction &amp; Address Verification
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-caption text-caption text-secondary uppercase font-semibold">
                Present Address
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-secondary-fixed text-on-secondary-fixed font-medium">
                {application.presentAddressWard}
              </span>
            </div>
            <p className="font-body-default text-body-default text-on-surface leading-snug">
              {application.presentAddressLines.map((line, i) => (
                <span key={line}>
                  {line}
                  {i < application.presentAddressLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>

          <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-caption text-caption text-secondary uppercase font-semibold">
                Permanent Address
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-surface-container-high text-on-surface-variant font-medium">
                {application.permanentAddressRelation}
              </span>
            </div>
            <p className="font-body-default text-body-default text-on-surface leading-snug">
              {application.permanentAddressLines.map((line, i) => (
                <span key={line}>
                  {line}
                  {i < application.permanentAddressLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      {/* Facility Usage & Intent Card */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[32px] p-space-md sm:p-space-xl shadow-md flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="p-2.5 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
              <MaterialIcon name="sports_score" className="text-[22px]" />
            </span>
            <div>
              <span className="font-label-meta text-label-meta text-secondary font-medium uppercase tracking-wide">
                Facility Selection
              </span>
              <h4 className="font-headline-card text-headline-card text-on-surface">
                Athletic Facility &amp; Slot Allocation
              </h4>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary-fixed/60 text-primary font-label-meta text-label-meta font-bold">
            {application.slotAllocationBadge}
          </span>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <span className="font-headline-card text-headline-card text-on-surface">
              {application.facilityFullTitle}
            </span>
            <span className="font-label-meta text-label-meta text-secondary flex items-center gap-1.5">
              <MaterialIcon name="stadium" className="text-[16px] text-primary" />
              {application.facilityLocation}
            </span>
            <span className="font-caption text-caption text-on-surface-variant mt-1">
              <strong>Declared Purpose:</strong> {application.declaredPurpose}
            </span>
          </div>

          {/* Mini Visual Track Capacity Chart SVG */}
          <div className="flex flex-col items-center bg-surface-container-lowest p-3 rounded-2xl shadow-sm shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-container-high"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-primary"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={application.trackCapacityDash}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <span className="absolute font-label-meta text-label-meta font-bold text-on-surface">
                {application.trackCapacityPercent}%
              </span>
            </div>
            <span className="font-caption text-[11px] text-secondary mt-1 font-medium">
              {application.trackOpenSlotsLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
