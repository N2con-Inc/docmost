#!/bin/bash
set -e

# DocMost Production to AI Database Migration Script v2
# Created: 2025-12-05
# Purpose: Migrate production data to AI-enabled database with conflict handling

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_FILE="$SCRIPT_DIR/db_backups/production_backup.sql.gz"
LOG_FILE="$SCRIPT_DIR/migration_$(date +%Y%m%d_%H%M%S).log"

echo "========================================"
echo "DocMost Production Data Migration v2"
echo "========================================"
echo "Started: $(date)"
echo "Log file: $LOG_FILE"
echo ""

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if backup exists
if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

log "Step 1: Backing up current AI database (pre-migration)..."
docker compose exec -T db pg_dump -U docmost docmost | gzip > "$SCRIPT_DIR/db_backups/ai_pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz"

log "Step 2: Stopping DocMost application..."
docker compose stop docmost

log "Step 3: Clearing existing data from AI database (keeping schema and migrations)..."
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' 2>&1 | tee -a "$LOG_FILE"
-- Disable triggers temporarily
SET session_replication_role = replica;

-- Clear data from all tables (preserving migrations)
TRUNCATE TABLE attachments CASCADE;
TRUNCATE TABLE auth_accounts CASCADE;
TRUNCATE TABLE auth_providers CASCADE;
TRUNCATE TABLE backlinks CASCADE;
TRUNCATE TABLE billing CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE file_tasks CASCADE;
TRUNCATE TABLE group_users CASCADE;
TRUNCATE TABLE groups CASCADE;
TRUNCATE TABLE page_history CASCADE;
TRUNCATE TABLE pages CASCADE;
TRUNCATE TABLE shares CASCADE;
TRUNCATE TABLE space_members CASCADE;
TRUNCATE TABLE spaces CASCADE;
TRUNCATE TABLE user_mfa CASCADE;
TRUNCATE TABLE user_tokens CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE workspace_invitations CASCADE;
TRUNCATE TABLE workspaces CASCADE;
-- Don't truncate: kysely_migration, kysely_migration_lock, embeddings, api_keys

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'Data cleared successfully' as status;
EOFSQL

log "Step 4: Extracting and importing production data..."
# This approach imports only COPY statements, preserving the AI schema
gunzip -c "$BACKUP_FILE" | grep -A 999999 "^COPY public\." | \
    awk '
    BEGIN { in_copy = 0; skip = 0; }
    
    # Skip migration tables
    /^COPY public\.kysely_migration/ { skip = 1; in_copy = 1; next; }
    /^COPY public\.kysely_migration_lock/ { skip = 1; in_copy = 1; next; }
    
    # Skip AI-only tables that dont exist in production
    /^COPY public\.api_keys/ { skip = 1; in_copy = 1; next; }
    /^COPY public\.embeddings/ { skip = 1; in_copy = 1; next; }
    
    # Start of a COPY block
    /^COPY public\./ {
        if (!skip) {
            in_copy = 1;
            print;
        }
        next;
    }
    
    # End marker
    /^\\.$/ {
        if (in_copy && !skip) {
            print;
        }
        in_copy = 0;
        skip = 0;
        next;
    }
    
    # Copy data lines
    {
        if (in_copy && !skip) {
            print;
        }
    }
    ' | docker compose exec -T db psql -U docmost -d docmost 2>&1 | tee -a "$LOG_FILE"

log "Step 5: Verifying imported data..."
echo "" | tee -a "$LOG_FILE"
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' | tee -a "$LOG_FILE"
\echo 'Data counts after migration:'
\echo ''
SELECT 
    'workspaces' as table_name, COUNT(*) as count FROM workspaces
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'spaces', COUNT(*) FROM spaces  
UNION ALL SELECT 'pages', COUNT(*) FROM pages
UNION ALL SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL SELECT 'comments', COUNT(*) FROM comments
UNION ALL SELECT 'groups', COUNT(*) FROM groups
UNION ALL SELECT 'auth_providers', COUNT(*) FROM auth_providers
UNION ALL SELECT 'auth_accounts', COUNT(*) FROM auth_accounts
UNION ALL SELECT 'embeddings', COUNT(*) FROM embeddings
UNION ALL SELECT 'api_keys', COUNT(*) FROM api_keys
ORDER BY table_name;
EOFSQL

log "Step 6: Starting DocMost application..."
docker compose start docmost

log "Step 7: Waiting for application to initialize..."
sleep 15

log "Step 8: Checking application status..."
docker compose ps | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
docker compose logs --tail=30 docmost | tee -a "$LOG_FILE"

echo ""
log "========================================"
log "Migration completed!"
log "========================================"
echo ""
echo "Summary:"
echo "  - Production data imported into AI database"
echo "  - AI schema and migrations preserved"
echo "  - Application restarted"
echo ""
echo "Next steps:"
echo "  1. Verify login: https://wiki.n2con.com:3050"
echo "  2. Check your pages and spaces are present"
echo "  3. Test AI features (if configured)"
echo "  4. Review migration log: $LOG_FILE"
echo ""
echo "Rollback if needed:"
echo "  cd $SCRIPT_DIR"
echo "  docker compose stop docmost"
echo "  gunzip -c db_backups/ai_pre_migration_*.sql.gz | docker compose exec -T db psql -U docmost -d docmost"
echo "  docker compose start docmost"
echo ""

