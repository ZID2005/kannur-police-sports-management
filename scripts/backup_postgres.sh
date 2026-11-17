#!/usr/bin/env bash
# ==============================================================================
# Kannur City Police Sports Facilities Management System
# Automated Daily On-Premise PostgreSQL Backup Script
#
# Usage:
#   chmod +x scripts/backup_postgres.sh
#   ./scripts/backup_postgres.sh
#
# Recommended Crontab Entry (Daily at 02:00 AM IST):
#   0 2 * * * /opt/kcp-sports/scripts/backup_postgres.sh >> /var/log/kcp_pg_backup.log 2>&1
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load optional .env configuration if present
if [ -f "${PROJECT_ROOT}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
  set +a
fi

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-kcp_sports_postgres}"
DB_NAME="${POSTGRES_DB:-kcp_sports_db}"
DB_USER="${POSTGRES_USER:-kcp_app_user}"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/kcp_sports_db_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] Starting PostgreSQL backup for database '${DB_NAME}'..."

if docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  docker exec -t "${CONTAINER_NAME}" \
    pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-acl --clean --if-exists \
    | gzip -9 > "${BACKUP_FILE}"
else
  echo "[$(date -Iseconds)] ERROR: PostgreSQL container '${CONTAINER_NAME}' is not running." >&2
  exit 1
fi

if [ ! -s "${BACKUP_FILE}" ]; then
  echo "[$(date -Iseconds)] ERROR: Generated backup file is empty: ${BACKUP_FILE}" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

echo "[$(date -Iseconds)] Backup completed successfully: ${BACKUP_FILE}"
echo "[$(date -Iseconds)] SHA-256 Checksum written: ${CHECKSUM_FILE}"

# Prune backups and checksums older than RETENTION_DAYS
find "${BACKUP_DIR}" -type f \( -name "kcp_sports_db_*.sql.gz" -o -name "kcp_sports_db_*.sql.gz.sha256" \) -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -Iseconds)] Pruned backups older than ${RETENTION_DAYS} days."
