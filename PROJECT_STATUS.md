# Docmost AI Integration - Project Status

**Last Updated**: December 18, 2025  
**Deployment**: https://wiki.n2con.com:3050  
**Docker Image**: `docmost-ai:latest`

## Project Overview
This is a comprehensive AI integration project for Docmost (wiki/documentation platform), adding advanced AI capabilities while maintaining the core Docmost functionality.

## Completed Phases

### Phase 1: AI Context Foundation ✅
**Status**: Complete  
**Deployed**: Yes

- MCP-based wiki pages server with full CRUD operations
- Page content and metadata access via AI tools
- Attachment text extraction and search
- Space-aware operations with proper permissions
- Full integration with AI chat system

### Phase 2: AI Chat Sidebar ✅
**Status**: Complete  
**Deployed**: Yes

- Persistent AI chat sidebar on all pages
- Context-aware conversations with access to:
  - Current page content
  - Page attachments (including full PDF text)
  - Related pages and search results
  - Workspace context
- Clean, integrated UI matching Docmost design
- New Chat button for fresh conversations
- Dark mode support with proper contrast

### Phase 3: AI as Collaborative Editor ✅
**Status**: Complete  
**Deployed**: Yes

**Implementation**:
- `AICollabEditorService` - Applies AI edits through Yjs transactions
- Direct Yjs document manipulation for real-time collaborative editing
- Dual-layer content extraction (frontend + backend) ensures only pure content is inserted
- Live editing API: `POST /api/ai/chat/live-edit`

**Features**:
- AI edits pages like a collaborative user (similar to Google Docs)
- Real-time updates visible to all connected users
- Preserves document structure and formatting
- Chat sidebar persists across page navigation
- Manual "New Chat" button for starting fresh conversations

**Technical Details**:
- Backend: `apps/server/src/ai/services/ai-collab-editor.service.ts`
- API: `POST /api/ai/chat/live-edit` in `ai.controller.ts`
- Frontend: `ai-chat-sidebar.tsx` with persistent history
- Content extraction: `content-extractor.ts` (client) + `AICollabEditorService.extractPureContent()` (server)

### Phase 4.1: Basic Diff View ✅
**Status**: Complete  
**Deployed**: Yes  
**Completed**: December 18, 2025

**Implementation**:
- Line-by-line unified diff view with GitHub-style presentation
- View/Compare mode toggle in history modal
- Version selection via checkboxes
- Proper color coding for both light and dark modes

**Created Components**:
- `prosemirror-to-text.ts` - Converts ProseMirror JSON to plain text
- `content-diff.ts` - Computes diffs using diff package
- `history-diff-renderer.tsx` - Renders unified diff with colors
- `history-diff-view.tsx` - Main diff display component
- `history-compare-selector.tsx` - Version selector (not currently used)

**Modified Components**:
- `history-atoms.ts` - Added `compareModeAtom` and `compareVersionsAtom`
- `history-modal-body.tsx` - Added View/Compare mode toggle
- `history-list.tsx` - Updated for version selection in compare mode
- `history-item.tsx` - Added checkbox display for compare mode

**Features**:
- Toggle between View mode (original) and Compare mode
- Select any two versions using checkboxes
- Line-by-line diff with +/- prefixes
- Color coding with proper contrast:
  - **Dark mode**: Bright green/red text on dark backgrounds
  - **Light mode**: Dark green/red text on light backgrounds
- Left border indicators (green for added, red for removed)
- Version metadata display (dates and authors)
- Separate title and content diffs

## In-Progress Phases

### Phase 4.2: Side-by-Side Diff View 🔄
**Status**: Planned  
**Priority**: Medium

**Goal**: Add side-by-side diff option for easier comparison of large changes

**Planned Features**:
- Toggle between unified and side-by-side views
- Synchronized scrolling
- Line number display
- Inline change highlighting within lines

### Phase 4.3: AI Edit Tracking with Undo 🔄
**Status**: Planned  
**Priority**: Medium

**Goal**: Track which edits were made by AI and provide undo functionality

**Planned Features**:
- Add `editSource` field to version metadata ('user' | 'ai')
- AI edit badges in version history
- "Undo AI Changes" button to revert AI edits
- Visual distinction for AI-generated content in history

**Technical Approach**:
- Backend migration to add `editSource` column to page_history table
- Update version creation logic to track source
- Frontend UI badges and filtering
- Selective undo functionality

## Future Phases

### Phase 5: AI-Powered Search & Discovery
**Status**: Not Started  
**Goal**: Enhanced search with semantic understanding and AI-powered recommendations

### Phase 6: AI Content Generation Templates
**Status**: Not Started  
**Goal**: Pre-built prompts and templates for common documentation tasks

### Phase 7: Multi-Document AI Operations
**Status**: Not Started  
**Goal**: AI operations across multiple pages (bulk updates, consistency checks, etc.)

## Technical Stack

### Backend
- NestJS framework
- Yjs for collaborative editing
- Hocuspocus WebSocket server
- PostgreSQL with pgvector
- MCP (Model Context Protocol) for AI integration

### Frontend
- React with TypeScript
- TipTap editor (ProseMirror-based)
- Mantine UI components
- Jotai for state management

### AI Integration
- MCP Wiki Pages server for context
- OpenAI-compatible API endpoints
- Streaming responses for real-time updates
- Tool calling for page operations

## Deployment Information

**Environment**: Docker Compose stack  
**Location**: `/pool/data/docmost-AI`  
**URL**: https://wiki.n2con.com:3050

**Services**:
- `docmost` - Main application (port 3050)
- `db` - PostgreSQL with pgvector
- `redis` - Session and cache storage
- `db-backup` - Automated database backups

## Development Workflow

1. Make code changes
2. Build: `docker compose build`
3. Deploy: `docker compose down && docker compose up -d`
4. Verify: `docker compose ps`

## Documentation Files

- `PHASE4_VERSION_HISTORY_PLAN.md` - Detailed Phase 4 implementation plan
- `PROJECT_STATUS.md` - This file (project overview and status)
- `README_APPS.md` - Server application inventory (if exists)

## Notes

- All phases maintain backward compatibility with core Docmost features
- AI features are additive and do not modify existing Docmost behavior
- Full git history maintained for all changes
- Co-authored commits: `Co-Authored-By: Warp <agent@warp.dev>`
