#!/bin/bash
set -e

# DocMost Production to AI Database Migration Script
# Created: 2025-12-05
# Purpose: Migrate production data to AI-enabled database

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_FILE="$SCRIPT_DIR/db_backups/production_backup.sql.gz"
TEMP_SQL="/tmp/production_data_only.sql"
LOG_FILE="$SCRIPT_DIR/migration_$(date +%Y%m%d_%H%M%S).log"

echo "========================================"
echo "DocMost Production Data Migration"
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

log "Step 1: Extracting production backup..."
gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"

log "Step 2: Creating filtered data import..."
# Extract only the data (COPY commands and INSERTs), skip schema creation
cat "$TEMP_SQL" | awk '
BEGIN { in_copy = 0; skip_table = 0; }

# Skip migration tables - we want to keep AI migrations
/^COPY public\.kysely_migration/ { skip_table = 1; in_copy = 1; next; }
/^COPY public\.kysely_migration_lock/ { skip_table = 1; in_copy = 1; next; }

# Start of COPY block for data tables
/^COPY public\./ { 
    if (!skip_table) {
        in_copy = 1; 
        print;
    }
    next; 
}

# End of COPY block
/^\\.$/ { 
    if (in_copy && !skip_table) {
        print;
    }
    in_copy = 0; 
    skip_table = 0;
    next; 
}

# Data lines in COPY block
{ 
    if (in_copy && !skip_table) {
        print;
    }
}
' > "${TEMP_SQL}.data"

log "Step 3: Backing up current AI database..."
docker compose exec -T db pg_dump -U docmost docmost | gzip > "$SCRIPT_DIR/db_backups/ai_pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz"

log "Step 4: Stopping DocMost application..."
docker compose stop docmost

log "Step 5: Importing production data..."
# Import the data - this will fail on conflicts but continue
docker compose exec -T db psql -U docmost -d docmost < "${TEMP_SQL}.data" 2>&1 | tee -a "$LOG_FILE" | grep -E "(COPY|ERROR|INSERT)" || true

log "Step 6: Verifying data counts..."
echo "" | tee -a "$LOG_FILE"
echo "Data verification:" | tee -a "$LOG_FILE"
docker compose exec -T db psql -U docmost -d docmost -c "
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'workspaces', COUNT(*) FROM workspaces
UNION ALL SELECT 'spaces', COUNT(*) FROM spaces  
UNION ALL SELECT 'pages', COUNT(*) FROM pages
UNION ALL SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL SELECT 'comments', COUNT(*) FROM comments
UNION ALL SELECT 'groups', COUNT(*) FROM groups
UNION ALL SELECT 'embeddings', COUNT(*) FROM embeddings
ORDER BY table_name;
" | tee -a "$LOG_FILE"

log "Step 7: Starting DocMost application..."
docker compose start docmost

log "Step 8: Waiting for application to start..."
sleep 10

log "Step 9: Checking application logs..."
docker compose logs --tail=20 docmost | tee -a "$LOG_FILE"

# Cleanup
rm -f "$TEMP_SQL" "${TEMP_SQL}.data"

echo ""
log "========================================"
log "Migration completed!"
log "========================================"
echo ""
echo "Next steps:"
echo "1. Check application logs: docker compose logs -f docmost"
echo "2. Access https://wiki.n2con.com:3050 to verify"
echo "3. Check migration log: $LOG_FILE"
echo ""
echo "Rollback available at: $SCRIPT_DIR/db_backups/ai_pre_migration_*.sql.gz"
echo ""

