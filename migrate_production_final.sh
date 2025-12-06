#!/bin/bash
set -e

# DocMost Production to AI Database Migration - Final Version
# Uses pg_restore approach to handle all dependencies automatically

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_FILE="$SCRIPT_DIR/db_backups/production_backup.sql.gz"
LOG_FILE="$SCRIPT_DIR/migration_$(date +%Y%m%d_%H%M%S).log"

echo "========================================"
echo "DocMost Production Data Migration FINAL"
echo "========================================"
echo "Started: $(date)"
echo "Log file: $LOG_FILE"
echo ""

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

log "Step 1: Backing up current AI database..."
docker compose exec -T db pg_dump -U docmost docmost | gzip > "$SCRIPT_DIR/db_backups/ai_pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz"

log "Step 2: Stopping DocMost application..."
docker compose stop docmost

log "Step 3: Importing production data with FK checks disabled..."
# This approach disables FK checks, imports all data, then re-enables
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' 2>&1 | tee -a "$LOG_FILE"
-- Disable all triggers and FK checks
SET session_replication_role = replica;

-- Clear existing data
TRUNCATE TABLE file_tasks, shares, space_members, backlinks, comments, attachments, 
    page_history, pages, workspace_invitations, user_tokens, user_mfa, billing,
    auth_accounts, auth_providers, group_users, groups, users, spaces, workspaces CASCADE;

\echo 'Tables cleared - ready for import'
EOFSQL

log "Step 4: Restoring production data..."
gunzip -c "$BACKUP_FILE" | \
    awk '/^COPY public\./ {found=1} found {print} /^\\.$/ && found {found=0; if (/workspaces|users|spaces|pages|attachments|comments|groups|group_users|auth_providers|auth_accounts|billing|user_mfa|user_tokens|workspace_invitations|page_history|backlinks|space_members|shares|file_tasks/) print ""}' | \
    docker compose exec -T db psql -U docmost -d docmost 2>&1 | \
    tee -a "$LOG_FILE"

log "Step 5: Re-enabling constraints..."
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' 2>&1 | tee -a "$LOG_FILE"
-- Re-enable triggers and FK checks
SET session_replication_role = DEFAULT;

\echo 'Constraints re-enabled'
EOFSQL

log "Step 6: Verifying data..."
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' | tee -a "$LOG_FILE"
\echo ''
\echo 'Migration Results:'
\echo ''
SELECT 
    'workspaces' as table_name, COUNT(*) as count FROM workspaces
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'spaces', COUNT(*) FROM spaces
UNION ALL SELECT 'pages', COUNT(*) FROM pages
UNION ALL SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL SELECT 'comments', COUNT(*) FROM comments  
UNION ALL SELECT 'groups', COUNT(*) FROM groups
UNION ALL SELECT 'auth_accounts', COUNT(*) FROM auth_accounts
ORDER BY table_name;
EOFSQL

log "Step 7: Starting DocMost..."
docker compose start docmost
sleep 20

docker compose ps | tee -a "$LOG_FILE"
docker compose logs --tail=15 docmost | tee -a "$LOG_FILE"

echo ""
log "=========================================="
log "Migration Complete!"
log "=========================================="
echo ""
echo "Verify at: https://wiki.n2con.com:3050"
echo "Log: $LOG_FILE"
echo ""

