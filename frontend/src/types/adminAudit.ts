import type { BackendAuditEntityType } from '@/api/client';

export type AuditCategoryFilter = 'ALL' | 'FACILITIES' | 'SLOTS' | 'PAYMENTS' | 'ACCOUNTS';

export type AuditEntityFilter = 'ALL' | BackendAuditEntityType;

export interface AuditCategoryTabItem {
  id: AuditCategoryFilter;
  label: string;
}

export interface AuditStatCardData {
  id: string;
  label: string;
  value: string;
  icon: string;
  iconBgClass: string;
  iconTextClass: string;
  trendText?: string;
  trendIcon?: string;
  metaItems: {
    text: string;
    className?: string;
  }[];
}

export interface AuditMetadataBadge {
  label: string;
  tone: 'neutral' | 'primary' | 'amber' | 'emerald' | 'error';
}

export interface AuditLogEntry {
  id: string;
  isoTimestamp: string;
  date: string;
  timeIst: string;
  officerInitials: string;
  officerAvatarClass: string;
  officerName: string;
  officerUsername: string;
  officerRole: string;
  ipAddress: string;
  actionCategory: string;
  categoryLabel: string;
  categoryBadgeClass: string;
  categoryDotClass: string;
  entityType: BackendAuditEntityType;
  entityLabel: string;
  entityBadgeClass: string;
  actionTitle: string;
  targetRefId: string;
  targetLabel: string;
  reason: string;
  metaBadges: AuditMetadataBadge[];
}
