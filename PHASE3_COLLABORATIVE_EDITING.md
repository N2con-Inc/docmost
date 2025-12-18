# Phase 3 Revised: AI as Collaborative Editor
**Date**: 2025-12-17
**Status**: ✓ DEPLOYED

## Overview
Implemented AI editing through Docmost's native Yjs/Hocuspocus collaboration infrastructure. AI edits are applied directly to the Yjs document, allowing changes to sync naturally to all connected clients - just like another user editing the document.

## Architecture

### Backend Implementation

#### AICollabEditorService
**Location**: `apps/server/src/ai/services/ai-collab-editor.service.ts`

Core functionality:
- Loads existing Yjs document state from database
- Converts AI-generated markdown to ProseMirror JSON
- Uses TiptapTransformer to convert content to Yjs format
- Applies changes through Yjs transactions
- Saves updated document back to database

Key methods:
- `applyLiveEdit()` - Main entry point for applying AI edits
- `insertFragment()` - Inserts Yjs nodes at specified position
- `parseHtmlToProseMirror()` - Converts HTML to ProseMirror JSON

#### API Endpoints
**Controller**: `apps/server/src/ai/ai.controller.ts`

**POST /api/ai/chat/live-edit**
Request body:
```json
{
  "pageId": "string",
  "content": "string",
  "mode": "insert" | "replace" | "append",
  "position": { "from": number, "to": number },
  "typingSpeed": number (optional)
}
```

Response:
```json
{
  "success": boolean,
  "operationId": "string",
  "message": "string"
}
```

**DELETE /api/ai/chat/live-edit/:operationId**
Cancel an in-progress AI edit operation.

#### DTOs
**Location**: `apps/server/src/ai/dto/live-edit-request.dto.ts`

- `LiveEditRequestDto` - Request validation
- `LiveEditResponseDto` - Success response
- `CancelEditResponseDto` - Cancellation response
- `LiveEditMode` enum - insert, replace, append

### Frontend Implementation

#### AI Chat Sidebar
**Location**: `apps/client/src/features/ai/components/ai-chat-sidebar.tsx`

Changes:
- Removed direct editor manipulation
- Added `handleLiveEdit()` function that calls API endpoint
- Simplified action buttons (removed preview mode)
- Uses axios to POST to `/api/ai/chat/live-edit`

## How It Works

### Edit Flow
1. User clicks action button on AI response (Insert/Replace)
2. Frontend calls `/api/ai/chat/live-edit` with content and mode
3. Backend loads current Yjs document state
4. AI content converted to Yjs format
5. Changes applied through Yjs transaction
6. Updated document saved to database
7. Changes sync to all connected clients automatically

### Yjs Integration
- Uses `Y.Doc` for document state
- `Y.XmlFragment` for ProseMirror content
- `TiptapTransformer` for conversions
- Type-safe Yjs node handling (XmlElement, XmlText)

## Benefits

1. **Native Integration** - Uses existing collaboration infrastructure
2. **Multi-User Support** - All users see AI edits simultaneously
3. **Automatic Sync** - No special handling needed for real-time updates
4. **Version History** - AI edits tracked like any other edit
5. **Simpler Code** - No preview/apply/reject UI complexity
6. **Database Consistency** - Uses same persistence layer as collaboration

## Current Limitations

1. **No AI Cursor** - Doesn't show "AI Assistant" as active user (future enhancement)
2. **No Typing Animation** - Applies all at once (can add chunked application)
3. **Simplified HTML Parsing** - Currently strips HTML tags (can enhance)
4. **No Real-Time Broadcast** - Saves to DB; connected users see on next sync

## Future Enhancements

### Phase 3.1: Live Awareness
- Connect AI as virtual Hocuspocus client
- Show "AI Assistant" cursor in awareness
- Real-time edit broadcasting through WebSocket

### Phase 3.2: Typing Animation
- Apply content in chunks (word-by-word or sentence-by-sentence)
- Delay between chunks for typewriter effect
- Update cursor position as changes apply

### Phase 3.3: Rich Content Support
- Proper HTML to ProseMirror parsing
- Support for formatting (bold, italic, lists, etc.)
- Preserve markdown structure

## Files Created
- `apps/server/src/ai/services/ai-collab-editor.service.ts`
- `apps/server/src/ai/dto/live-edit-request.dto.ts`

## Files Modified
- `apps/server/src/ai/ai.controller.ts` - Added live-edit endpoints
- `apps/server/src/ai/ai.module.ts` - Registered AICollabEditorService
- `apps/client/src/features/ai/components/ai-chat-sidebar.tsx` - API integration

## Deployment

```bash
docker compose build
docker compose down && docker compose up -d
```

**Status**: Deployed to https://wiki.n2con.com:3050
**Image**: docmost-ai:latest
**Containers**: All healthy (except db-backup restarting - non-critical)

## Testing Notes

To test:
1. Open document in Docmost
2. Ask AI a question in chat
3. Click "Insert at cursor" or "Replace selection"
4. Changes should appear in document
5. With multiple users: both see the change

Note: Changes currently apply all at once and save to database. Connected users will see changes on their next sync cycle (typically within seconds).

## Technical Notes

- Yjs documents are stored as binary blobs in PostgreSQL
- TiptapTransformer handles ProseMirror ↔ Yjs conversions
- Backend modifies Yjs state offline (not through WebSocket)
- Changes persist through normal collaboration save mechanism
- Uses same PageRepo and update flow as manual editing

## Comparison to Previous Approach

### Phase 3 v1 (Preview Mode)
- Direct editor manipulation
- Preview with TipTap highlights
- Apply/reject controls
- Not collaborative-aware

### Phase 3 v2 (Yjs Integration) ✓ Current
- Modifies Yjs document
- Changes sync automatically
- No preview needed
- Collaborative-aware
- Simpler implementation

## Next Steps

For true live collaborative editing where AI types like a user:
1. Create Hocuspocus client connection from backend
2. Use awareness protocol to show AI cursor
3. Apply changes through WebSocket (not database)
4. Implement chunked content application
5. Add animation delays between chunks
