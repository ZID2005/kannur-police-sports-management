import type { AuditLogEntry } from '@/types/gate';

interface AuditLogTableRowProps {
  entry: AuditLogEntry;
}

export function AuditLogTableRow({ entry }: AuditLogTableRowProps) {
  return (
    <tr className="hover:bg-surface-container-low/40 transition-colors group">
      <td className="py-4 px-4 align-top whitespace-nowrap">
        <div className="flex flex-col">
          <span className="font-medium text-on-surface">{entry.date}</span>
          <span className="font-caption text-caption text-outline font-mono">{entry.timeIst}</span>
        </div>
      </td>
      <td className="py-4 px-4 align-top whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-full ${entry.officerAvatarClass} flex items-center justify-center font-bold text-[11px]`}
          >
            {entry.officerInitials}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-on-surface leading-tight">{entry.officerName}</span>
            <span className="font-caption text-caption text-outline leading-tight">
              {entry.officerMeta}
            </span>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 align-top whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${entry.categoryBadgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${entry.categoryDotClass} mr-1.5`} />
          {entry.categoryLabel}
        </span>
      </td>
      <td className="py-4 px-4 align-top">
        <div className="flex flex-col max-w-xs">
          <span
            className={`font-medium ${entry.actionTitleClass ?? 'text-on-surface'} leading-snug`}
          >
            {entry.actionTitle}
          </span>
          <span className="font-caption text-caption text-outline">{entry.actionSubtitle}</span>
        </div>
      </td>
      <td className="py-4 px-4 align-top whitespace-nowrap">
        <div className="flex flex-col">
          <span
            className={`font-mono ${entry.targetRefClass ?? 'text-primary'} font-semibold text-[13px]`}
          >
            {entry.targetRefId}
          </span>
          <span className="font-caption text-caption text-outline">{entry.targetSubtitle}</span>
        </div>
      </td>
      <td className="py-4 px-4 align-top">
        <p className="font-caption text-caption text-on-surface-variant leading-relaxed max-w-sm">
          {entry.reason}
        </p>
      </td>
    </tr>
  );
}
