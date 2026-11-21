import { Fragment } from 'react';
import type { AuditLogEntry, AuditMetadataBadge } from '@/types/adminAudit';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface AuditLogTableRowProps {
  entry: AuditLogEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  delayMs?: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatCompactRef(ref: string): string {
  if (UUID_REGEX.test(ref)) {
    return `${ref.slice(0, 8)}…${ref.slice(-4)}`;
  }
  return ref;
}

function getConciseOfficerName(fullName: string): string {
  return fullName.replace(/\s*\([^)]*\)\s*/g, '').trim() || fullName;
}

function getMetaBadgeClass(tone: AuditMetadataBadge['tone']): string {
  switch (tone) {
    case 'primary':
      return 'bg-[#EFF5FF] text-[#165DF5] border border-[#DCE8FE]';
    case 'amber':
      return 'bg-amber-50 text-amber-800 border border-amber-200/80';
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    case 'error':
      return 'bg-rose-50 text-rose-700 border border-rose-200/80';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200/80';
  }
}

function getEntityChipClass(entityType: AuditLogEntry['entityType']): string {
  switch (entityType) {
    case 'PAYMENT':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
    case 'SLOT':
      return 'bg-amber-50 text-amber-800 border border-amber-200/80';
    case 'FACILITY':
      return 'bg-[#EFF5FF] text-[#165DF5] border border-[#DCE8FE]';
    case 'USER':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200/80';
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200/80';
  }
}

function getCategoryPillClasses(actionCategory: string): {
  pill: string;
  dot: string;
} {
  const code = actionCategory.toUpperCase();
  if (code.includes('PAYMENT') || code.includes('RECEIPT')) {
    return {
      pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      dot: 'bg-emerald-500',
    };
  }
  if (code.includes('BLOCK') || code.includes('DELETE') || code.includes('SUSPEND')) {
    return {
      pill: 'bg-amber-50 text-amber-800 border border-amber-200/80',
      dot: 'bg-amber-500',
    };
  }
  if (code.includes('FACILITY') || code.includes('SLOT')) {
    return {
      pill: 'bg-[#EFF5FF] text-[#165DF5] border border-[#DCE8FE]',
      dot: 'bg-[#165DF5]',
    };
  }
  if (code.includes('AUTH') || code.includes('LOGIN') || code.includes('USER')) {
    return {
      pill: 'bg-sky-50 text-sky-700 border border-sky-200/80',
      dot: 'bg-sky-500',
    };
  }
  return {
    pill: 'bg-slate-100 text-slate-700 border border-slate-200/85',
    dot: 'bg-slate-400',
  };
}

/**
 * Strictly read-only table row for immutable audit log records.
 * No edit or delete controls are permitted on audit log entries.
 */
export function AuditLogTableRow({
  entry,
  isExpanded,
  onToggleExpand,
  delayMs = 0,
}: AuditLogTableRowProps) {
  const categoryStyle = getCategoryPillClasses(entry.actionCategory);
  const entityStyle = getEntityChipClass(entry.entityType);
  const displayOfficer = getConciseOfficerName(entry.officerName);
  const compactRef = formatCompactRef(entry.targetRefId);

  return (
    <Fragment>
      <tr
        onClick={onToggleExpand}
        style={{ animationDelay: `${delayMs}ms` }}
        className={`admin-row-enter admin-table-row cursor-pointer group ${
          isExpanded ? 'bg-[#EFF5FF]/55' : ''
        }`}
      >
        {/* Timestamp */}
        <td className="py-4 px-5 align-top whitespace-nowrap">
          <div className="flex flex-col tabular-nums" title={`ISO Timestamp: ${entry.isoTimestamp}`}>
            <span className="text-[13px] font-semibold text-[#0F172A]">{entry.date}</span>
            <span className="font-mono text-[11.5px] text-slate-400 mt-0.5">
              {entry.timeIst} IST
            </span>
          </div>
        </td>

        {/* Authorizing Officer */}
        <td className="py-4 px-5 align-top whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EFF5FF] border border-[#DCE8FE] text-[#165DF5] flex items-center justify-center font-display font-bold text-[11px] shrink-0">
              {entry.officerInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span
                title={entry.officerName}
                className="text-[13px] font-semibold text-[#0F172A] leading-snug truncate max-w-[185px]"
              >
                {displayOfficer}
              </span>
              <span className="font-mono text-[11px] text-slate-400 mt-0.5">
                @{entry.officerUsername}
              </span>
            </div>
          </div>
        </td>

        {/* Action Type */}
        <td className="py-4 px-5 align-top whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${categoryStyle.pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${categoryStyle.dot}`} />
            {entry.categoryLabel}
          </span>
        </td>

        {/* Target Entity */}
        <td className="py-4 px-5 align-top">
          <div className="flex flex-col items-start gap-1 max-w-[235px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-wider ${entityStyle}`}
              >
                {entry.entityLabel}
              </span>
              <span
                title={entry.targetRefId}
                className="font-mono text-[12px] font-semibold text-[#165DF5] truncate max-w-[155px]"
              >
                {compactRef}
              </span>
            </div>
            <span className="text-[12px] text-slate-500 leading-snug line-clamp-2">
              {entry.targetLabel}
            </span>
          </div>
        </td>

        {/* Operation Summary, Metadata Badges & Expand Chevron */}
        <td className="py-4 px-5 align-top">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5 max-w-md min-w-0">
              <span className="text-[13px] font-medium text-[#0F172A] leading-snug">
                {entry.actionTitle}
              </span>
              {entry.metaBadges.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.metaBadges.map((badge, idx) => (
                    <span
                      key={`${entry.id}-meta-${idx}`}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${getMetaBadgeClass(
                        badge.tone
                      )}`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              )}
              {entry.reason && (
                <p className="text-[12px] text-slate-500 leading-relaxed">{entry.reason}</p>
              )}
            </div>

            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse audit metadata' : 'Inspect immutable metadata'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                isExpanded
                  ? 'bg-[#165DF5] text-white rotate-180'
                  : 'text-slate-400 group-hover:text-[#165DF5] group-hover:bg-[#EFF5FF]'
              }`}
            >
              <MaterialIcon name="expand_more" className="text-[18px]" />
            </button>
          </div>
        </td>
      </tr>

      {/* Read-Only Immutable Event Evidence Inspector */}
      {isExpanded && (
        <tr className="bg-slate-50/75">
          <td colSpan={5} className="px-5 py-4">
            <div className="admin-panel-expand rounded-2xl bg-white border border-slate-200/90 p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="verified_user" className="text-[16px] text-emerald-600" />
                  <span className="font-display text-[12.5px] font-bold text-[#0F172A]">
                    Immutable Audit Record Evidence
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-semibold">
                  <MaterialIcon name="lock" className="text-[12px]" />
                  Append-Only DB Record
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-slate-50/90 border border-slate-200/75 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    Event Action Code
                  </span>
                  <div className="font-mono text-[12px] font-semibold text-[#0F172A] mt-0.5 break-all">
                    {entry.actionCategory}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50/90 border border-slate-200/75 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    Full Target Reference
                  </span>
                  <div className="font-mono text-[12px] font-semibold text-[#165DF5] mt-0.5 break-all">
                    {entry.targetRefId}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50/90 border border-slate-200/75 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    Officer &amp; Role
                  </span>
                  <div className="text-[12px] font-semibold text-[#0F172A] mt-0.5">
                    {entry.officerName}
                  </div>
                  <div className="font-mono text-[10.5px] text-slate-500 mt-0.5">
                    @{entry.officerUsername} · {entry.officerRole}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50/90 border border-slate-200/75 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    ISO Timestamp &amp; Origin
                  </span>
                  <div className="font-mono text-[11.5px] font-semibold text-[#0F172A] mt-0.5 tabular-nums">
                    {entry.isoTimestamp}
                  </div>
                  <div className="font-mono text-[10.5px] text-slate-500 mt-0.5">
                    Source IP: {entry.ipAddress || 'Internal'}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
