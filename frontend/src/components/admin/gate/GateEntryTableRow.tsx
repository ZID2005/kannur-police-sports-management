import { Link } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { GateEntryStatusBadge } from './GateEntryStatusBadge';
import type { GateEntryRecord } from '@/types/gate';

interface GateEntryTableRowProps {
  entry: GateEntryRecord;
  onInspectEntry: (entry: GateEntryRecord) => void;
}

export function GateEntryTableRow({ entry, onInspectEntry }: GateEntryTableRowProps) {
  return (
    <tr
      className={`hover:bg-surface-container-low/40 transition-colors ${entry.rowHighlightClass ?? ''}`.trim()}
    >
      <td className="py-4 px-4 whitespace-nowrap font-label-meta text-label-meta">
        <span className="font-bold text-on-surface">{entry.time}</span>
        <span className="text-secondary block text-caption">{entry.date}</span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full ${entry.avatarClass} font-bold flex items-center justify-center font-label-meta text-label-meta shrink-0`}
          >
            {entry.initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-primary text-label-primary font-bold text-on-surface truncate">
              {entry.memberName}
            </span>
            <span className="font-caption text-caption text-secondary truncate">{entry.memberSub}</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 whitespace-nowrap">
        <span
          className={`px-2.5 py-1 rounded-full ${entry.categoryClass} font-label-meta text-label-meta font-medium`}
        >
          {entry.category}
        </span>
      </td>
      <td className="py-4 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 font-label-primary text-label-primary">
          <MaterialIcon name={entry.facilityIcon} className={`text-[18px] ${entry.facilityIconClass}`} />
          <span>{entry.facility}</span>
        </div>
      </td>
      <td className="py-4 px-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${entry.verificationBadgeClass} font-label-meta text-label-meta font-semibold`}
        >
          <MaterialIcon name={entry.verificationIcon} className="text-[16px]" />
          {entry.verificationStage}
        </span>
      </td>
      <td className="py-4 px-4 max-w-xs">
        <p
          className={`font-caption text-caption ${entry.remarksClass ?? 'text-secondary'} truncate`}
          title={entry.remarks}
        >
          {entry.remarks}
        </p>
      </td>
      <td className="py-4 px-4 whitespace-nowrap">
        <GateEntryStatusBadge status={entry.status} />
      </td>
      <td className="py-4 px-4 whitespace-nowrap text-right">
        {entry.status === 'Rejected' ? (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => onInspectEntry(entry)}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-error hover:text-red-700 transition-colors"
              title="View Incident Details"
            >
              <MaterialIcon name="report_problem" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => onInspectEntry(entry)}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors"
              title="Escalate to Desk"
            >
              <MaterialIcon name="support_agent" className="text-[18px]" />
            </button>
          </div>
        ) : entry.status === 'Override' ? (
          <div className="inline-flex items-center gap-1">
            <Link
              to="/membership/pass"
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors"
              title="View Pass"
            >
              <MaterialIcon name="badge" className="text-[18px]" />
            </Link>
            <button
              type="button"
              onClick={() => onInspectEntry(entry)}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-indigo-600 transition-colors"
              title="View Officer Signature"
            >
              <MaterialIcon name="draw" className="text-[18px]" />
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1">
            <Link
              to="/membership/pass"
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors"
              title="View Digital Pass"
            >
              <MaterialIcon name="badge" className="text-[18px]" />
            </Link>
            <Link
              to="/admin/audit-log"
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors"
              title="Entry Audit Log"
            >
              <MaterialIcon name="history" className="text-[18px]" />
            </Link>
          </div>
        )}
      </td>
    </tr>
  );
}
