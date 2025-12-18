# Phase 4: Enhanced Version History with GitHub-Style Diffs
**Status**: Planning Complete - Ready for Implementation
**Date**: 2025-12-17

## Problem Statement
Current version history shows read-only snapshots of previous versions but doesn't show what changed between versions. Users want GitHub-style diff visualization to see exactly what was added, removed, or modified between versions.

## Current State

### Existing Implementation
**Backend** (`apps/server/src/database/repos/page/page-history.repo.ts`):
- Stores complete snapshots in `pageHistory` table
- Fields: pageId, title, content (full ProseMirror JSON), icon, coverPhoto, lastUpdatedById, createdAt
- Can retrieve any historical version
- Ordered by createdAt descending

**Frontend** (`apps/client/src/features/page-history/`):
- `history-modal.tsx` - Modal container
- `history-list.tsx` - List of versions with timestamps
- `history-editor.tsx` - Read-only TipTap editor showing selected version
- No diff visualization currently

**What's Good**:
- Already stores full content for each version
- Uses same backend as Docmost (no deviation)
- Has timestamps and author info
- Modal UI already exists

**What's Missing**:
- No comparison between versions
- Can't see what changed
- No diff highlighting

## Proposed Solution

### Approach: Enhance Existing UI with Diff View
Add a GitHub-style diff view while keeping the existing version browsing. Keep using the same backend storage.

### UI Enhancements

**1. Add Compare Mode Toggle**
In history modal header:
- Switch between "View" mode (current) and "Compare" mode (new)
- When in Compare mode, select two versions to compare

**2. Diff Visualization Options**

**Option A: Side-by-Side Diff** (Like GitHub)
- Left panel: Previous version
- Right panel: Current version
- Line-by-line comparison
- Color coded: red (removed), green (added), gray (unchanged)

**Option B: Unified Diff** (Inline)
- Single view with removed/added lines
- More compact, works better on smaller screens

**Recommendation**: Start with Option B (unified), add Option A later

**3. Text-Level Diff**
For changed lines:
- Show word-level or character-level diffs
- Use `diff` package (already installed) for comparison
- Highlight specific words/chars that changed

### Technical Implementation

#### Diff Algorithm

**Step 1: Convert ProseMirror to Text**
```typescript
function prosemirrorToText(content: JSONContent): string {
  // Extract plain text from ProseMirror JSON
  // Preserve structure (paragraphs, headings, etc.)
}
```

**Step 2: Compute Diff**
```typescript
import { diffWords, diffLines } from 'diff';

function computeDiff(oldContent, newContent) {
  const oldText = prosemirrorToText(oldContent);
  const newText = prosemirrorToText(newContent);
  return diffWords(oldText, newText);
}
```

**Step 3: Render Diff**
- Added text: green background
- Removed text: red background with strikethrough
- Unchanged: normal styling

### Backend Changes
**None required!** 
We already have all the data:
- Each version has full content
- Client-side diff computation
- No database schema changes
- No API changes needed

This keeps us aligned with Docmost's codebase.

### AI Integration

Track which edits were made by AI vs humans:
- Add `editSource` field to track: 'manual', 'ai_chat', 'ai_improvement'
- Show AI edits with special badge/icon
- "Undo AI Changes" button to revert specific AI edits

**Implementation**:
- Add `editSource` field when saving history (optional, nullable)
- Modify `AICollabEditorService` to tag edits with source='ai'
- Add filter in history UI: "Show only AI edits"
- Add bulk revert for AI edits

## UI Design

### Compare Mode Workflow
1. User opens version history
2. Clicks "Compare Versions" button
3. UI shows version selector:
   - "From version" (older)
   - "To version" (newer)
4. Select two versions
5. Click "Show Diff"
6. Diff view displays:
   - Summary: X lines added, Y lines removed
   - Unified diff with color coding
   - Ability to switch to side-by-side view

### Visual Design
**Diff Colors** (matching GitHub):
- Added: `#d1f4d1` background (light mode), `#1a3a1a` (dark mode)
- Removed: `#ffd4d4` background (light mode), `#3a1a1a` (dark mode)
- Changed word: Bold with darker shade

**Diff Indicators**:
- `+` prefix for added lines
- `-` prefix for removed lines
- Line numbers on left

## Files to Create

### Frontend - Version History
- `apps/client/src/features/page-history/components/history-diff-view.tsx`
- `apps/client/src/features/page-history/components/history-compare-selector.tsx`
- `apps/client/src/features/page-history/components/history-diff-renderer.tsx`
- `apps/client/src/features/page-history/utils/content-diff.ts`
- `apps/client/src/features/page-history/utils/prosemirror-to-text.ts`

### Frontend - AI Version Tracking
- `apps/client/src/features/ai/hooks/use-ai-version-tracking.ts` - Track AI edits with metadata
- `apps/client/src/features/ai/components/ai-edit-history.tsx` - Show list of recent AI edits
- `apps/client/src/features/ai/utils/ai-snapshot.ts` - Create snapshots before AI edits

### Backend (Optional - for AI tracking)
- Migration to add `editSource` column to `pageHistory`
- Update history listener to capture source

## Files to Modify

### Frontend - Version History
- `apps/client/src/features/page-history/components/history-modal-body.tsx` - Add compare mode
- `apps/client/src/features/page-history/components/history-modal.tsx` - Handle compare state
- `apps/client/src/features/page-history/components/history-list.tsx` - Add version selection, show AI badges

### Frontend - AI Panel
- `apps/client/src/features/ai/components/ai-chat-sidebar.tsx` - Add "Undo AI Changes" button
- `apps/client/src/features/ai/hooks/use-ai-live-edit.ts` - Integrate with version tracking

### Backend (Optional)
- `apps/server/src/database/repos/page/page-history.repo.ts` - Store editSource
- `apps/server/src/ai/services/ai-collab-editor.service.ts` - Tag AI edits

## Benefits

1. **Better Understanding** - See exactly what changed
2. **Familiar UX** - GitHub-style diffs are widely understood
3. **No Backend Changes** - Uses existing data, no schema migration required
4. **AI Transparency** - Can track and review AI-made changes
5. **Selective Undo** - Revert specific changes
6. **Audit Trail** - Clear history of who changed what

## Implementation Phases

### Phase 4.1: Basic Diff View
1. Add text extraction from ProseMirror
2. Implement unified diff renderer
3. Add compare mode toggle
4. Create version selector UI

### Phase 4.2: Enhanced Visualization
1. Add side-by-side view option
2. Improve word-level highlighting
3. Add diff statistics
4. Keyboard navigation

### Phase 4.3: AI Integration
1. Add editSource tracking
2. AI edit badges in history
3. Filter by edit source
4. Batch AI edit revert

## Technical Notes

- Use existing `diff` package (v5.2.0) - already installed
- ProseMirror JSON → Text conversion can be recursive
- Consider caching diff results for performance
- Diff computation is client-side - no server load
- Large documents: consider chunking or lazy loading

## Alternative Approach: Use Docmost's Text Content

Each page already has `textContent` field (plain text version).
Instead of converting ProseMirror → Text, we could:
1. Store textContent snapshot in history
2. Diff against stored textContent
3. Faster, simpler

**Trade-off**: Loses formatting context but much simpler to implement.

## AI Version Tracking Details

### use-ai-version-tracking Hook
Create versioning hook that:
- Snapshots document state before AI edits
- Stores AI edit metadata (timestamp, prompt, affected ranges)
- Provides undo/redo specific to AI changes
- Integrates with existing page history system

### Enhanced Undo Options
- Add "Undo AI Changes" button in AI panel
- Show list of recent AI edits with preview
- Allow selective undo of individual AI edits
- Leverage existing page-history service for persistence

## Implementation Order

1. **Phase 4.1: Basic Diff View**
   - Start with ProseMirror to text conversion
   - Implement unified diff renderer
   - Add UI for selecting versions
   
2. **Phase 4.2: Enhanced Visualization**
   - Polish diff display
   - Add statistics and navigation
   
3. **Phase 4.3: AI Integration**
   - Add tracking for AI edits
   - Implement undo functionality

## Phase 4.1 Implementation Status - COMPLETED

**Date Completed**: December 17, 2024

### Components Created
1. **Utilities**:
   - `prosemirror-to-text.ts` - Converts ProseMirror JSON to plain text with structure
   - `content-diff.ts` - Computes word/line diffs using diff package

2. **UI Components**:
   - `history-diff-renderer.tsx` - Renders unified diff with GitHub-style colors
   - `history-diff-view.tsx` - Main diff view that fetches and displays diffs
   - `history-compare-selector.tsx` - Version selector component (created but not currently used)

3. **Modified Components**:
   - `history-atoms.ts` - Added `compareModeAtom` and `compareVersionsAtom`
   - `history-modal-body.tsx` - Added View/Compare mode toggle
   - `history-list.tsx` - Updated to support version selection in compare mode
   - `history-item.tsx` - Added checkbox display for compare mode

### Features Implemented
- Toggle between View mode (original behavior) and Compare mode
- Select any two versions from history list (checkboxes in compare mode)
- GitHub-style unified diff view with color coding:
  - Green background for added content
  - Red background for removed content
  - Works in both light and dark modes
- Metadata display showing version dates and authors
- Handles title and content diffs separately

### Deployment
- Built: Docker image `docmost-ai:latest`
- Deployed: https://wiki.n2con.com:3050
- All containers healthy and running

### Testing Needed
Manual testing should verify:
1. Compare mode toggle works
2. Version selection with checkboxes
3. Diff display accuracy
4. Color coding in light/dark modes
5. Performance with large documents

---

### Testing Results - Phase 4.1

**Date Tested**: December 18, 2025

#### Dark Mode Testing
- ✅ Compare mode toggle works correctly
- ✅ Checkbox selection functions properly (fully clickable)
- ✅ Version selection state management working
- ✅ Diff colors highly visible with excellent contrast:
  - Removed: Bright red text (#ff8080) on dark red background (#4a0a0a)
  - Added: Bright green text (#a3f0a3) on dark green background (#0d3a0d)
- ✅ Line-by-line display with proper formatting
- ✅ +/- prefixes displayed correctly
- ✅ Left border indicators (green/red) visible

#### Light Mode Testing
- ✅ Compare mode toggle works correctly
- ✅ Checkbox selection functions properly
- ✅ Version selection state management working
- ✅ Diff colors highly visible with excellent contrast:
  - Removed: Dark red text (#d32f2f) on light pink background (#ffebe9)
  - Added: Dark green text (#0d5e0d) on light green background (#e6ffed)
- ✅ Line-by-line display with proper formatting
- ✅ +/- prefixes displayed correctly
- ✅ Left border indicators (green/red) visible

#### Issues Fixed During Testing
1. **Checkbox not clickable** - Fixed by removing `stopPropagation()` and allowing checkbox to be fully interactive
2. **Poor color contrast** - Replaced Mantine CSS variables with explicit hex colors for both light and dark modes
3. **Text readability** - Changed from inline word-level to line-by-line diff for better clarity

#### Overall Result
Phase 4.1 is fully functional and provides an excellent user experience for comparing document versions in both light and dark modes.

---

## Next Steps

### Immediate (Phase 4.2 - Optional)
- Implement side-by-side diff view as an alternative to unified view
- Add view toggle button (Unified/Split)
- Implement synchronized scrolling for side-by-side view

### Future (Phase 4.3 - Optional)
- Add AI edit tracking with `editSource` field
- Implement "Undo AI Changes" functionality
- Add AI edit badges in version history list

### Phase 5 and Beyond
- AI-powered search and discovery
- Content generation templates
- Multi-document operations

