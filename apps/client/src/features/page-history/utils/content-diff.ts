import { diffWords, diffLines, Change } from 'diff';
import { prosemirrorToText, prosemirrorToMarkdown, JSONContent } from './prosemirror-to-text';

export interface DiffResult {
  changes: Change[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

/**
 * Compute word-level diff between two ProseMirror content objects
 */
export function computeContentDiff(
  oldContent: JSONContent | null | undefined,
  newContent: JSONContent | null | undefined,
  mode: 'words' | 'lines' = 'words'
): DiffResult {
  // Convert ProseMirror to text
  const oldText = prosemirrorToText(oldContent);
  const newText = prosemirrorToText(newContent);

  // Compute diff
  const changes = mode === 'words' 
    ? diffWords(oldText, newText)
    : diffLines(oldText, newText);

  // Calculate statistics
  const stats = {
    added: 0,
    removed: 0,
    unchanged: 0,
  };

  for (const change of changes) {
    if (change.added) {
      stats.added += change.count || 0;
    } else if (change.removed) {
      stats.removed += change.count || 0;
    } else {
      stats.unchanged += change.count || 0;
    }
  }

  return { changes, stats };
}

/**
 * Compute diff preserving markdown formatting
 * More accurate for structured content
 */
export function computeMarkdownDiff(
  oldContent: JSONContent | null | undefined,
  newContent: JSONContent | null | undefined
): DiffResult {
  const oldMarkdown = prosemirrorToMarkdown(oldContent);
  const newMarkdown = prosemirrorToMarkdown(newContent);

  const changes = diffWords(oldMarkdown, newMarkdown);

  const stats = {
    added: 0,
    removed: 0,
    unchanged: 0,
  };

  for (const change of changes) {
    if (change.added) {
      stats.added += change.count || 0;
    } else if (change.removed) {
      stats.removed += change.count || 0;
    } else {
      stats.unchanged += change.count || 0;
    }
  }

  return { changes, stats };
}

/**
 * Format diff statistics for display
 */
export function formatDiffStats(stats: DiffResult['stats']): string {
  const parts: string[] = [];
  
  if (stats.added > 0) {
    parts.push(`+${stats.added} ${stats.added === 1 ? 'word' : 'words'}`);
  }
  
  if (stats.removed > 0) {
    parts.push(`-${stats.removed} ${stats.removed === 1 ? 'word' : 'words'}`);
  }
  
  if (parts.length === 0) {
    return 'No changes';
  }
  
  return parts.join(', ');
}

/**
 * Check if content has meaningful changes
 * Ignores whitespace-only changes
 */
export function hasSignificantChanges(changes: Change[]): boolean {
  return changes.some(change => {
    if (!change.added && !change.removed) {
      return false;
    }
    // Check if change is more than just whitespace
    return change.value.trim().length > 0;
  });
}
