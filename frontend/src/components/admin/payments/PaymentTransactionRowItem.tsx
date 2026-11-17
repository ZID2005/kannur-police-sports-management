import { Link } from 'react-router-dom';
import type { PaymentTransactionRow } from '@/types/adminOps';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface PaymentTransactionRowItemProps {
  row: PaymentTransactionRow;
  onDownloadReceipt: (row: PaymentTransactionRow) => void;
}

export function PaymentTransactionRowItem({
  row,
  onDownloadReceipt,
}: PaymentTransactionRowItemProps) {
  const avatarClass = (() => {
    switch (row.avatarTone) {
      case 'primary':
        return 'bg-primary/10 text-primary';
      case 'secondary':
        return 'bg-secondary-container/60 text-secondary';
      case 'amber':
        return 'bg-amber-100 text-amber-800';
      case 'primary-fixed':
        return 'bg-primary-fixed text-primary';
      default:
        return 'bg-surface-container text-on-surface-variant';
    }
  })();

  const categoryBadgeClass =
    row.categoryTone === 'primary-fixed'
      ? 'bg-primary-fixed text-on-primary-fixed'
      : 'bg-surface-container text-on-surface-variant';

  const modeIconColorClass = (() => {
    switch (row.paymentModeIconTone) {
      case 'emerald':
        return 'text-emerald-600';
      case 'primary':
        return 'text-primary';
      case 'blue':
        return 'text-blue-600';
      default:
        return 'text-tertiary';
    }
  })();

  const statusPillNode = (() => {
    switch (row.status) {
      case 'settled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-label-meta text-label-meta font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> {row.statusLabel}
          </span>
        );
      case 'treasury':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-label-meta text-label-meta font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> {row.statusLabel}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-label-meta text-label-meta font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> {row.statusLabel}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-tertiary font-label-meta text-label-meta font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> {row.statusLabel}
          </span>
        );
    }
  })();

  return (
    <tr className="hover:bg-surface-container-low/40 transition-colors group">
      <td className="py-4 px-6">
        <div className="flex flex-col">
          <span
            className={`font-medium ${
              row.isRefund ? 'text-error' : 'text-primary'
            } font-mono text-[14px]`}
          >
            {row.receiptId}
          </span>
          <span className="font-caption text-caption text-on-surface-variant">
            {row.timestamp}
          </span>
        </div>
      </td>

      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full ${avatarClass} flex items-center justify-center font-semibold text-xs`}
          >
            {row.memberInitials}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-on-surface leading-tight">
              {row.memberName}
            </span>
            <span className="font-caption text-caption text-on-surface-variant">
              {row.memberMeta}
            </span>
          </div>
        </div>
      </td>

      <td className="py-4 px-6">
        <span
          className={`px-2.5 py-1 rounded-full ${categoryBadgeClass} font-caption text-caption font-medium`}
        >
          {row.categoryLabel}
        </span>
      </td>

      <td className="py-4 px-6">
        <div className="flex flex-col">
          <span className="font-medium text-on-surface">{row.facilityName}</span>
          <span className="font-caption text-caption text-on-surface-variant">
            {row.facilityPurpose}
          </span>
        </div>
      </td>

      <td className="py-4 px-6">
        <div className="flex items-center gap-1.5 text-on-surface">
          <MaterialIcon
            name={row.paymentModeIcon}
            className={`text-[18px] ${modeIconColorClass}`}
          />
          <span className="font-body-default text-[14px]">{row.paymentModeLabel}</span>
        </div>
      </td>

      <td
        className={`py-4 px-6 text-right font-semibold ${
          row.isRefund ? 'text-error' : 'text-on-surface'
        }`}
      >
        {row.amountFormatted}
      </td>

      <td className="py-4 px-6 text-center">{statusPillNode}</td>

      <td className="py-4 px-6 text-right">
        <div className="inline-flex items-center gap-1 opacity-90 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onDownloadReceipt(row)}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
            title={row.downloadTitle}
          >
            <MaterialIcon name="download" className="text-[20px]" />
          </button>
          <Link
            to="/admin/audit-log"
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
            title="Audit Trail"
          >
            <MaterialIcon name="visibility" className="text-[20px]" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
