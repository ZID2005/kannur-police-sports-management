import type { AuditCategoryTabItem, AuditEntityFilter, AuditStatCardData } from '@/types/adminAudit';

export const auditLedgerHeader = {
  shiftBadge: 'Immutable Compliance Vault • Append-Only',
  title: 'System Audit Log & Immutable Activity Trail',
  groundsBadge: 'Kannur Armed Reserve Police Grounds',
  subtitle:
    'Chronological administrative operations across facilities, time-slot schedules, office payment reconciliations, and account actions recorded under Departmental IT Rules § 6.24 & § 10.7.',
  statutoryNoticeTitle: 'Statutory Append-Only Audit Guarantee (Rules § 6.24 & § 10.7):',
  statutoryNoticeBody:
    'Every facility update, slot schedule change, block/unblock action, and office receipt is timestamped and appended to the immutable Kannur City Police audit ledger. Entries cannot be modified or deleted.',
};

export const auditStatCards: AuditStatCardData[] = [
  {
    id: 'total-events',
    label: 'Total Logged Events',
    value: '0',
    icon: 'verified_user',
    iconBgClass: 'bg-primary-fixed',
    iconTextClass: 'text-primary',
    trendText: 'Append-Only',
    trendIcon: 'lock',
    metaItems: [{ text: '100% immutable', className: 'text-outline' }],
  },
  {
    id: 'facility-actions',
    label: 'Facility Operations',
    value: '0',
    icon: 'stadium',
    iconBgClass: 'bg-secondary-fixed',
    iconTextClass: 'text-secondary',
    metaItems: [{ text: 'Created & Edited' }, { text: 'Status Toggles' }],
  },
  {
    id: 'slot-controls',
    label: 'Slot & Schedule Controls',
    value: '0',
    icon: 'calendar_month',
    iconBgClass: 'bg-tertiary-fixed',
    iconTextClass: 'text-tertiary',
    metaItems: [
      { text: 'Blocks & Unblocks', className: 'font-medium text-primary' },
      { text: 'Deletions logged' },
    ],
  },
  {
    id: 'payments-accounts',
    label: 'Payments & Account Audits',
    value: '0',
    icon: 'receipt_long',
    iconBgClass: 'bg-primary-fixed',
    iconTextClass: 'text-primary',
    metaItems: [{ text: 'Office Receipts' }, { text: 'Officer Auth' }],
  },
];

export const auditCategoryTabs: AuditCategoryTabItem[] = [
  { id: 'ALL', label: 'All Logs' },
  { id: 'FACILITIES', label: 'Facilities' },
  { id: 'SLOTS', label: 'Slots & Schedule' },
  { id: 'PAYMENTS', label: 'Payments & Receipts' },
  { id: 'ACCOUNTS', label: 'Accounts & Auth' },
];

export const auditEntityFilterOptions: Array<{ id: AuditEntityFilter; label: string }> = [
  { id: 'ALL', label: 'All Entities' },
  { id: 'FACILITY', label: 'Facility' },
  { id: 'SLOT', label: 'Time Slot' },
  { id: 'PAYMENT', label: 'Payment' },
  { id: 'USER', label: 'Account / Officer' },
  { id: 'SYSTEM', label: 'System' },
];
