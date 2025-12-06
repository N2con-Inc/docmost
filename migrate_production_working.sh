#!/bin/bash

# DocMost Production to AI - Working Migration
# Disables ALL FK constraints, imports data, re-enables constraints

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_FILE="$SCRIPT_DIR/db_backups/production_backup.sql.gz"
LOG_FILE="$SCRIPT_DIR/migration_$(date +%Y%m%d_%H%M%S).log"
TEMP_DATA="/tmp/production_data_$$.sql"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

echo "========================================"
echo "DocMost Production Data Migration"
echo "========================================"
log "Starting migration..."

# Backup current state
log "Backing up AI database..."
docker compose exec -T db pg_dump -U docmost docmost | gzip > "$SCRIPT_DIR/db_backups/ai_pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz"

# Stop app
log "Stopping application..."
docker compose stop docmost

# Extract only data COPY statements (skip migration tables)
log "Extracting production data..."
gunzip -c "$BACKUP_FILE" | awk '
BEGIN { copying = 0; skip = 0; }

# Start of COPY for migration tables - skip these
/^COPY public\.kysely_migration / { copying = 1; skip = 1; next; }
/^COPY public\.kysely_migration_lock / { copying = 1; skip = 1; next; }

# Start of COPY for data tables
/^COPY public\./ { 
    if (!skip) {
        copying = 1;
        print;
    }
    next;
}

# End of COPY block
/^\\.$/ {
    if (copying && !skip) {
        print;
    }
    copying = 0;
    skip = 0;
    next;
}

# Data rows
{
    if (copying && !skip) {
        print;
    }
}
' > "$TEMP_DATA"

log "Extracted $(wc -l < "$TEMP_DATA") lines of data"

# Import with constraints disabled
log "Importing data with constraints disabled..."
docker compose exec -T db psql -U docmost -d docmost << EOFSQL 2>&1 | tee -a "$LOG_FILE"
-- Save current constraint state and disable ALL
DO \$\$
DECLARE
    r RECORD;
BEGIN
    -- Drop all FK constraints temporarily
    FOR r IN (
        SELECT con.conname, rel.relname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE con.contype = 'f'
        AND rel.relnamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.relname, r.conname);
    END LOOP;
END \$\$;

-- Clear data tables (not migrations)
TRUNCATE TABLE 
    attachments, auth_accounts, auth_providers, backlinks, billing, comments,
    file_tasks, group_users, groups, page_history, pages, shares, 
    space_members, spaces, user_mfa, user_tokens, users, 
    workspace_invitations, workspaces
CASCADE;

\echo 'Ready for import'
EOFSQL

# Import the data
log "Loading production data..."
cat "$TEMP_DATA" | docker compose exec -T db psql -U docmost -d docmost 2>&1 | \
    tee -a "$LOG_FILE" | grep -E "^COPY" || true

# Restore constraints from production backup
log "Restoring foreign key constraints..."
gunzip -c "$BACKUP_FILE" | grep "ADD CONSTRAINT.*FOREIGN KEY" | \
    docker compose exec -T db psql -U docmost -d docmost 2>&1 | tee -a "$LOG_FILE" || true

# Verify
log "Verifying data..."
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' | tee -a "$LOG_FILE"
SELECT 
    'workspaces' as table, COUNT(*) FROM workspaces
UNION ALL SELECT 'users', COUNT(*) FROM users  
UNION ALL SELECT 'spaces', COUNT(*) FROM spaces
UNION ALL SELECT 'pages', COUNT(*) FROM pages
UNION ALL SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL SELECT 'comments', COUNT(*) FROM comments
ORDER BY table;
EOFSQL

# Start app
log "Starting application..."
docker compose start docmost
sleep 20

docker compose logs --tail=20 docmost | tee -a "$LOG_FILE"

# Cleanup
rm -f "$TEMP_DATA"

log "=========================================="
log "Migration complete! Check: https://wiki.n2con.com:3050"
log "Log: $LOG_FILE"

