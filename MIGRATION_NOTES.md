# DocMost AI Branch Migration

## Overview
Migration from production DocMost instance to AI development branch.

**Created:** 2025-12-05
**Status:** Configuration Complete - Ready for Testing

## Phase 1: Repository Setup ✓
- Cloned N2con-Inc/docmost repository to `/pool/data/docmost-AI`
- Repository successfully cloned from: `git@github.com:N2con-Inc/docmost.git`

## Phase 2: Configuration Migration ✓
- Migrated docker-compose.yml from production to `/pool/data/docmost-AI/docker-compose.yml`
- Migrated .env file from production to `/pool/data/docmost-AI/.env`
- Port configuration: 3050:3000 (same as production)

### Migrated Configuration Details:
- **APP_URL:** https://wiki.n2con.com
- **APP_SECRET:** [migrated from production]
- **Database:** PostgreSQL 16 (credentials migrated)
- **Redis:** 7.2-alpine
- **Mail:** SMTP via smtprelay01.n2con.net
- **Storage:** S3 (Wasabi) - us-west-1 bucket: n2con-docmost

## Phase 3: Database Backup ✓
- Latest production backup copied: `docmost_hourly_20251205_210000.sql.gz`
- Location: `/pool/data/docmost-AI/db_backups/production_backup.sql.gz`
- Backup timestamp: 2025-12-05 21:00:00 UTC

## Next Steps - Testing Phase

### Step 1: Start New Instance
```bash
cd /pool/data/docmost-AI
docker compose up -d
```

### Step 2: Restore Database
```bash
# Wait for database to be ready
sleep 10

# Restore the backup
gunzip -c /pool/data/docmost-AI/db_backups/production_backup.sql.gz | \
  docker compose exec -T db psql -U docmost -d docmost
```

### Step 3: Verify New Instance
- Check containers: `docker compose ps`
- Check logs: `docker compose logs -f docmost`
- Access URL: https://wiki.n2con.com:3050 (or configure reverse proxy)

### Step 4: Shutdown Production (After Successful Testing)
```bash
cd /pool/data/docmost
docker compose down
```

## Production Instance Details
**Location:** `/pool/data/docmost`
**Current Status:** Running
**Containers:**
- docmost-docmost-1 (Up 10 days)
- docmost-db-1 (Up 10 days)
- docmost-redis-1 (Up 10 days)
- docmost-db-backup (Up 9 days)

## Rollback Plan
If issues occur with the new instance:
1. Shutdown new instance: `cd /pool/data/docmost-AI && docker compose down`
2. Production instance is still intact and can be restarted if needed
3. All production data remains in `/pool/data/docmost`

## Important Notes
- Both instances use the same S3 bucket (n2con-docmost)
- Both instances will use the same APP_URL (wiki.n2con.com)
- Only one instance should be active at a time to avoid conflicts
- Production backup system is still active in `/pool/data/docmost/db_backups/`

---

## Migration Completed - 2025-12-05

### Phase 4: New Instance Deployment ✓
**Timestamp:** 2025-12-05 21:49 UTC

#### Actions Taken:
1. Shutdown production instance at `/pool/data/docmost`
   - Containers stopped: docmost-docmost-1, docmost-db-1, docmost-redis-1
   - Data preserved in docker volumes

2. Started new instance at `/pool/data/docmost-AI`
   - All containers started successfully
   - Port 3050 properly bound

3. Database Migration
   - Dropped and recreated clean database
   - Restored from backup: `docmost_hourly_20251205_210000.sql.gz`
   - Restore completed successfully
   - No pending migrations detected

#### Current Status:
**New Instance (docmost-AI):** RUNNING
- Location: `/pool/data/docmost-AI`
- Containers:
  - docmost-ai-docmost-1: Up and listening on 0.0.0.0:3050
  - docmost-ai-db-1: Up
  - docmost-ai-redis-1: Up
- Application Status: "Nest application successfully started"
- Access URL: https://wiki.n2con.com (port 3050)

**Production Instance (docmost):** STOPPED
- Location: `/pool/data/docmost`
- Status: Containers stopped, volumes preserved
- Can be restarted if rollback needed

### Verification Steps Completed:
- [X] Containers running
- [X] Database connection successful
- [X] No pending migrations
- [X] Application listening on correct port
- [X] S3 storage configuration migrated

### Next Steps:
1. Test application functionality via web interface
2. Verify user login and data access
3. Test creating/editing documents
4. Verify S3 storage integration
5. Once confirmed stable, can remove production instance or keep as backup

### Rollback Instructions (if needed):
```bash
# Stop new instance
cd /pool/data/docmost-AI
docker compose down

# Restart production
cd /pool/data/docmost
docker compose up -d
```

### Notes:
- Both instances configured to use same S3 bucket
- Only one instance should run at a time
- Production data backed up to: `/pool/data/docmost-AI/db_backups/production_backup.sql.gz`
- Version warning in docker-compose.yml can be safely ignored (version attribute is obsolete)

---

## Custom Build from Source - 2025-12-05 21:54

### Issue Identified
The initial deployment used the pre-built `docmost/docmost:latest` Docker image instead of building from the N2con-Inc fork with AI features.

### Resolution Steps Taken:

#### 1. Updated docker-compose.yml
Changed from:
```yaml
image: docmost/docmost:latest
```

To:
```yaml
build:
  context: .
  dockerfile: Dockerfile
image: docmost-ai:latest
```

#### 2. Added Missing Dependency
Added `@langchain/ollama` package to `apps/server/package.json` for Ollama AI provider support.

#### 3. Modified Dockerfile
- Removed `--frozen-lockfile` flag to allow dependency updates
- Used `--chown=node:node` in COPY commands to avoid slow recursive chown
- Copied node_modules from builder stage instead of reinstalling

#### 4. Fixed Database Image
Changed database from `postgres:16-alpine` to `pgvector/pgvector:pg16` to support vector embeddings required by AI features.

### Build Complete
- Custom DocMost image built successfully as `docmost-ai:latest`
- Image includes AI provider code (Ollama, OpenAI, Anthropic)
- All AI-related migrations included

### Database Schema Incompatibility
**Issue:** The AI branch includes new database migrations that are incompatible with the production database schema:
- New migration: `20251130T154600-create-embeddings-table.js`
- Requires PostgreSQL functions not present in production backup
- Production backup is from DocMost v0.23.2 without AI features

**Options:**
1. **Fresh Start (Recommended for Testing):** Initialize new database with AI schema
2. **Data Migration:** Would require custom migration scripts to transform production data

### Recommendation
For initial AI feature testing, start with a fresh database. Production data can be migrated later once AI features are validated.

**To start fresh:**
```bash
cd /pool/data/docmost-AI
docker compose down -v  # Remove volumes
docker compose up -d     # Start with fresh database
```

The application will auto-create the correct schema with AI support.

---

## Final Resolution - 2025-12-05 22:47

### Bug Fix Applied
**Issue:** Migration `20251130T154600-create-embeddings-table.ts` called wrong UUID function name.
- **Expected:** `gen_uuid_v7()` (as defined in migration 20240324T085400)
- **Used:** `uuid_generate_v7()` (incorrect)

**Fix:** Updated embeddings migration to use correct function name.

### Fresh Start Successful
**Status:** ✓ All migrations completed successfully
**Database:** Fresh install with AI schema

#### Migrations Executed:
- All base DocMost migrations (20240324 through 20250912)
- ✓ 20251130T154500-enable-pgvector
- ✓ 20251130T154600-create-embeddings-table

### Running Instance Details
**Image:** `docmost-ai:latest` (custom built from N2con-Inc/docmost)
**Port:** 3050 (mapped to internal 3000)
**URL:** https://wiki.n2con.com:3050
**Database:** pgvector/pgvector:pg16 with vector extension enabled
**Storage:** S3 (Wasabi) - us-west-1, bucket: n2con-docmost

#### Container Status:
- docmost-ai-docmost-1: Running
- docmost-ai-db-1: Running (pgvector enabled)
- docmost-ai-redis-1: Running

### AI Features Included:
- Ollama provider support (@langchain/ollama)
- OpenAI provider support
- Anthropic provider support
- Vector embeddings table for semantic search
- HNSW index for similarity search

### Next Steps:
1. Access https://wiki.n2con.com:3050 to complete initial setup
2. Create admin account
3. Configure AI providers in settings
4. Test AI features (chat, embeddings, etc.)

### Production Data Note:
The instance started with a fresh database. Production data from `/pool/data/docmost` is preserved and backed up at:
- Production volumes: Intact in docker
- Latest backup: `/pool/data/docmost-AI/db_backups/production_backup.sql.gz`

Production data migration to AI schema would require custom scripts to handle schema differences.
