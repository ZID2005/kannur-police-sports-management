import { useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import type {
  AdminClearanceCheck,
  AdminMembershipApplication,
  AdminWorkflowTimelineEvent,
} from '@/types/adminMemberships';

export interface DossierVerificationSectionProps {
  application: AdminMembershipApplication;
  timeline: AdminWorkflowTimelineEvent[];
  onActionNotice?: (message: string) => void;
}

const clearanceBadgeStyles: Record<AdminClearanceCheck['status'], string> = {
  CLEAR: 'bg-secondary-fixed text-on-secondary-fixed',
  PENDING: 'bg-tertiary-fixed text-on-tertiary-fixed',
  FLAGGED: 'bg-error-container text-on-error-container',
};

const timelineDotStyles: Record<
  AdminWorkflowTimelineEvent['state'],
  { dot: string; title: string }
> = {
  COMPLETED: {
    dot: 'bg-primary ring-4 ring-surface-container-lowest',
    title: 'text-on-surface font-semibold',
  },
  CURRENT: {
    dot: 'bg-error ring-4 ring-surface-container-lowest animate-pulse',
    title: 'text-primary font-bold',
  },
  REVISION: {
    dot: 'bg-tertiary ring-4 ring-surface-container-lowest',
    title: 'text-tertiary font-bold',
  },
  REJECTED: {
    dot: 'bg-error ring-4 ring-surface-container-lowest',
    title: 'text-error font-bold',
  },
};

export function DossierVerificationSection({
  application,
  timeline,
  onActionNotice,
}: DossierVerificationSectionProps) {
  const [inspectExpanded, setInspectExpanded] = useState(false);

  return (
    <div className="lg:col-span-5 flex flex-col gap-space-lg">
      {/* Official Document Preview Container */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[32px] p-space-md sm:p-space-lg shadow-md flex flex-col gap-space-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-space-sm min-w-0">
            <span className="p-2 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <MaterialIcon name="document_scanner" className="text-[20px]" />
            </span>
            <div className="min-w-0">
              <h4 className="font-headline-card text-headline-card text-on-surface truncate">
                Official Credentials Document
              </h4>
              <p className="font-caption text-caption text-secondary truncate">
                {application.documentFileName} ({application.documentFileSize})
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-caption font-bold shrink-0">
            {application.documentSignBadge}
          </span>
        </div>

        {/* Document Visual Frame / Faux PDF Inspection Canvas */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-low p-4 sm:p-6 shadow-inner flex flex-col gap-3">
          {/* Simulated Official Document Card Header */}
          <div className="flex items-center justify-between pb-3 border-b-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-[12px]">
                KP
              </div>
              <div className="flex flex-col">
                <span className="font-label-meta text-label-meta font-bold text-on-surface uppercase tracking-tight">
                  {application.documentDeptTitle}
                </span>
                <span className="text-[10px] text-secondary">
                  {application.documentDeptSubtitle}
                </span>
              </div>
            </div>
            <MaterialIcon name="shield" className="text-primary text-[28px]" />
          </div>

          {/* Faux ID Card Layout */}
          <div
            className={`p-3 bg-surface-container-lowest rounded-xl shadow-sm flex items-center gap-3 transition-all ${
              inspectExpanded ? 'py-5 ring-2 ring-primary/30' : ''
            }`}
          >
            <div
              className={`${
                inspectExpanded ? 'w-20 h-24' : 'w-14 h-16'
              } bg-surface-container-high rounded-lg overflow-hidden shrink-0 transition-all`}
            >
              <img
                className="w-full h-full object-cover"
                alt={application.documentThumbAlt}
                src={application.documentThumbUrl}
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-label-primary text-label-primary font-bold text-on-surface">
                {application.documentCardHolder}
              </span>
              <span className="font-caption text-caption text-secondary">
                {application.documentCardRole}
              </span>
              <span className="text-[11px] font-mono text-primary font-medium">
                {application.documentCardMeta}
              </span>
              {inspectExpanded && (
                <span className="mt-1.5 text-[11px] text-on-surface-variant">
                  Dossier Ref: {application.dossierNumber} • Submitted{' '}
                  {application.submittedFullTimestamp}
                </span>
              )}
            </div>
          </div>

          {/* Digital Seal & Cryptographic Watermark Graphic */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-secondary">
            <div className="flex items-center gap-1">
              <MaterialIcon
                name="enhanced_encryption"
                className="text-[14px] text-primary"
              />
              <span className="font-mono">{application.documentHash}</span>
            </div>
            <span className="font-semibold text-primary">
              {application.documentVaultBadge}
            </span>
          </div>

          {/* Document Tools */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInspectExpanded((prev) => !prev)}
              className="w-full py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors font-label-meta text-label-meta text-on-surface flex items-center justify-center gap-1.5"
            >
              <MaterialIcon
                name={inspectExpanded ? 'fullscreen_exit' : 'fullscreen'}
                className="text-[16px]"
              />
              <span>{inspectExpanded ? 'Collapse View' : 'Inspect PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onActionNotice?.(
                  `GovVault signed copy (${application.documentFileName}) queued for encrypted download.`
                )
              }
              className="w-full py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors font-label-meta text-label-meta text-on-surface flex items-center justify-center gap-1.5"
            >
              <MaterialIcon name="download" className="text-[16px]" />
              <span>Download Vault Copy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automated Clearance & Risk Assessment Card */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[32px] p-space-md sm:p-space-lg shadow-md flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="p-2 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center">
              <MaterialIcon name="security" className="text-[20px]" />
            </span>
            <div>
              <span className="font-label-meta text-label-meta text-secondary font-medium uppercase tracking-wide">
                Multi-Tier Clearance
              </span>
              <h4 className="font-headline-card text-headline-card text-on-surface">
                Automated Background Checks
              </h4>
            </div>
          </div>
          <MaterialIcon name="gpp_good" className="text-primary text-[22px]" />
        </div>

        <div className="flex flex-col gap-2.5">
          {application.clearanceChecks.map((check) => (
            <div
              key={check.id}
              className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center shrink-0">
                  <MaterialIcon name={check.icon} className="text-[16px]" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-primary text-label-primary font-semibold text-on-surface truncate">
                    {check.title}
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant truncate">
                    {check.subtitle}
                  </span>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-md font-caption text-caption font-bold shrink-0 ${clearanceBadgeStyles[check.status]}`}
              >
                {check.badgeText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Application Timeline & Action Audit Log */}
      <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[32px] p-space-md sm:p-space-lg shadow-md flex flex-col gap-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="p-2 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center">
            <MaterialIcon name="history_edu" className="text-[20px]" />
          </span>
          <div>
            <span className="font-label-meta text-label-meta text-secondary font-medium uppercase tracking-wide">
              Audit Trail
            </span>
            <h4 className="font-headline-card text-headline-card text-on-surface">
              Chronological Workflow Log
            </h4>
          </div>
        </div>

        <div className="relative pl-6 flex flex-col gap-4">
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-surface-container-high" />
          {timeline.map((evt) => {
            const dotStyle = timelineDotStyles[evt.state];
            return (
              <div key={evt.id} className="relative flex items-start gap-3">
                <div
                  className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ${dotStyle.dot}`}
                />
                <div className="flex flex-col">
                  <span className={`font-label-meta text-label-meta ${dotStyle.title}`}>
                    {evt.title}
                  </span>
                  <span className="font-caption text-caption text-secondary">
                    {evt.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
