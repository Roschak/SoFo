#!/usr/bin/env bash
# SOFO database backup (PRD §131) — pg_dump the sofo-db container.
# Usage: ./scripts/backup-db.sh [backup_dir]
# Schedule (Windows Task Scheduler / cron):
#   0 2 * * *  /path/to/sofo/scripts/backup-db.sh /var/backups/sofo
set -euo pipefail

CONTAINER="${CONTAINER:-sofo-db}"
PG_USER="${PG_USER:-sofo}"
PG_DB="${PG_DB:-sofo}"
BACKUP_DIR="${1:-./data/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/sofo-$STAMP.sql.gz"

echo "[backup] dumping $CONTAINER/$PG_DB → $TARGET"
docker exec "$CONTAINER" pg_dump -U "$PG_USER" "$PG_DB" | gzip > "$TARGET"

echo "[backup] pruning backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name 'sofo-*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -print -delete

echo "[backup] done: $TARGET ($(du -h "$TARGET" | cut -f1))"
