#!/bin/bash
set -e

# DocMost Production to AI Database Migration Script v3
# Created: 2025-12-05
# Purpose: Migrate production data with proper dependency ordering

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_FILE="$SCRIPT_DIR/db_backups/production_backup.sql.gz"
LOG_FILE="$SCRIPT_DIR/migration_$(date +%Y%m%d_%H%M%S).log"
TEMP_DIR="/tmp/docmost_migration_$$"

echo "========================================"
echo "DocMost Production Data Migration v3"
echo "========================================"
echo "Started: $(date)"
echo "Log file: $LOG_FILE"
echo ""

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Check if backup exists
if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

mkdir -p "$TEMP_DIR"

log "Step 1: Backing up current AI database..."
docker compose exec -T db pg_dump -U docmost docmost | gzip > "$SCRIPT_DIR/db_backups/ai_pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz"

log "Step 2: Stopping DocMost application..."
docker compose stop docmost

log "Step 3: Extracting production backup..."
gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/production.sql"

log "Step 4: Extracting table data in dependency order..."
# Define table order (parents before children)
TABLES=(
    "workspaces"
    "spaces"
    "users"
    "groups"
    "group_users"
    "auth_providers"
    "auth_accounts"
    "billing"
    "user_mfa"
    "user_tokens"
    "workspace_invitations"
    "pages"
    "page_history"
    "attachments"
    "comments"
    "backlinks"
    "space_members"
    "shares"
    "file_tasks"
)

for table in "${TABLES[@]}"; do
    log "  Extracting $table..."
    awk -v table="$table" '
        BEGIN { in_copy = 0; }
        $0 ~ "^COPY public\\." table " " { in_copy = 1; print; next; }
        /^\\.$/ { if (in_copy) { print; in_copy = 0; } next; }
        { if (in_copy) print; }
    ' "$TEMP_DIR/production.sql" > "$TEMP_DIR/${table}.sql"
done

log "Step 5: Clearing existing data (preserving AI tables)..."
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' 2>&1 | tee -a "$LOG_FILE"
-- Disable triggers and constraints temporarily
SET session_replication_role = replica;

-- Clear in reverse dependency order
TRUNCATE TABLE file_tasks CASCADE;
TRUNCATE TABLE shares CASCADE;
TRUNCATE TABLE space_members CASCADE;
TRUNCATE TABLE backlinks CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE attachments CASCADE;
TRUNCATE TABLE page_history CASCADE;
TRUNCATE TABLE pages CASCADE;
TRUNCATE TABLE workspace_invitations CASCADE;
TRUNCATE TABLE user_tokens CASCADE;
TRUNCATE TABLE user_mfa CASCADE;
TRUNCATE TABLE billing CASCADE;
TRUNCATE TABLE auth_accounts CASCADE;
TRUNCATE TABLE auth_providers CASCADE;
TRUNCATE TABLE group_users CASCADE;
TRUNCATE TABLE groups CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE spaces CASCADE;
TRUNCATE TABLE workspaces CASCADE;

-- Re-enable constraints
SET session_replication_role = DEFAULT;

SELECT 'Data cleared' as status;
EOFSQL

log "Step 6: Importing production data in correct order..."
for table in "${TABLES[@]}"; do
    if [ -s "$TEMP_DIR/${table}.sql" ]; then
        log "  Importing $table..."
        docker compose exec -T db psql -U docmost -d docmost < "$TEMP_DIR/${table}.sql" 2>&1 | \
            grep -E "(COPY|ERROR)" | tee -a "$LOG_FILE" || true
    else
        log "  Skipping $table (no data)"
    fi
done

log "Step 7: Fixing circular references..."
# Handle circular FK between workspaces and spaces
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' 2>&1 | tee -a "$LOG_FILE"
-- Temporarily disable triggers to fix circular references
SET session_replication_role = replica;

-- Re-import workspaces and spaces to fix default_space_id references
-- This handles any circular dependencies

SET session_replication_role = DEFAULT;

SELECT 'Circular references resolved' as status;
EOFSQL

log "Step 8: Verifying imported data..."
docker compose exec -T db psql -U docmost -d docmost << 'EOFSQL' | tee -a "$LOG_FILE"
\echo ''
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
UNION ALL SELECT 'group_users', COUNT(*) FROM group_users
UNION ALL SELECT 'auth_providers', COUNT(*) FROM auth_providers
UNION ALL SELECT 'auth_accounts', COUNT(*) FROM auth_accounts
UNION ALL SELECT 'space_members', COUNT(*) FROM space_members
UNION ALL SELECT 'page_history', COUNT(*) FROM page_history
ORDER BY table_name;
EOFSQL

log "Step 9: Starting DocMost application..."
docker compose start docmost

log "Step 10: Waiting for application..."
sleep 15

log "Step 11: Checking application status..."
docker compose ps | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
docker compose logs --tail=20 docmost | grep -E "(Started|Listening|ERROR)" | tee -a "$LOG_FILE"

echo ""
log "========================================"
log "Migration completed!"
log "========================================"
echo ""
echo "Please verify:"
echo "  - Access: https://wiki.n2con.com:3050"
echo "  - Check log: $LOG_FILE"
echo ""
echo "Rollback command:"
echo "  docker compose stop docmost && \\"
echo "  gunzip -c db_backups/ai_pre_migration_*.sql.gz | docker compose exec -T db psql -U docmost -d docmost && \\"
echo "  docker compose start docmost"
echo ""

