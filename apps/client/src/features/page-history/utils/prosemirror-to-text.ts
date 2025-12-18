/**
 * Converts ProseMirror JSON content to plain text
 * Preserves document structure (paragraphs, headings, lists, etc.)
 */

export interface JSONContent {
  type?: string;
  text?: string;
  content?: JSONContent[];
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

/**
 * Extract plain text from ProseMirror JSON while preserving structure
 */
export function prosemirrorToText(content: JSONContent | null | undefined): string {
  if (!content) {
    return '';
  }

  return nodeToText(content);
}

/**
 * Recursively convert a node to text
 */
function nodeToText(node: JSONContent): string {
  // Handle text nodes
  if (node.type === 'text') {
    return node.text || '';
  }

  // Handle nodes without content
  if (!node.content || node.content.length === 0) {
    // Some nodes should produce line breaks or special characters
    switch (node.type) {
      case 'hardBreak':
        return '\n';
      case 'horizontalRule':
        return '\n---\n';
      default:
        return '';
    }
  }

  // Process children
  const childText = node.content.map(child => nodeToText(child)).join('');

  // Add appropriate whitespace/formatting based on node type
  switch (node.type) {
    case 'doc':
      return childText;
    
    case 'paragraph':
      return childText + '\n\n';
    
    case 'heading':
      const level = node.attrs?.level || 1;
      const prefix = '#'.repeat(level) + ' ';
      return prefix + childText + '\n\n';
    
    case 'blockquote':
      return '> ' + childText.split('\n').join('\n> ') + '\n\n';
    
    case 'codeBlock':
      const lang = node.attrs?.language || '';
      return '```' + lang + '\n' + childText + '```\n\n';
    
    case 'bulletList':
      return childText + '\n';
    
    case 'orderedList':
      return childText + '\n';
    
    case 'listItem':
      return '- ' + childText.trim() + '\n';
    
    case 'table':
      return childText + '\n';
    
    case 'tableRow':
      return '| ' + childText.trim() + ' |\n';
    
    case 'tableCell':
    case 'tableHeader':
      return childText.trim() + ' | ';
    
    default:
      return childText;
  }
}

/**
 * Extract text with markdown-like formatting preserved
 * Useful for more accurate diffs that consider structure
 */
export function prosemirrorToMarkdown(content: JSONContent | null | undefined): string {
  if (!content) {
    return '';
  }

  return nodeToMarkdown(content);
}

function nodeToMarkdown(node: JSONContent): string {
  // Handle text nodes with marks
  if (node.type === 'text') {
    let text = node.text || '';
    
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `**${text}**`;
            break;
          case 'italic':
            text = `*${text}*`;
            break;
          case 'code':
            text = `\`${text}\``;
            break;
          case 'link':
            text = `[${text}](${mark.attrs?.href || ''})`;
            break;
          case 'strike':
            text = `~~${text}~~`;
            break;
        }
      }
    }
    
    return text;
  }

  // Handle nodes without content
  if (!node.content || node.content.length === 0) {
    switch (node.type) {
      case 'hardBreak':
        return '\n';
      case 'horizontalRule':
        return '\n---\n';
      default:
        return '';
    }
  }

  // Process children
  const childText = node.content.map(child => nodeToMarkdown(child)).join('');

  // Add appropriate markdown formatting
  switch (node.type) {
    case 'doc':
      return childText;
    
    case 'paragraph':
      return childText + '\n\n';
    
    case 'heading':
      const level = node.attrs?.level || 1;
      return '#'.repeat(level) + ' ' + childText + '\n\n';
    
    case 'blockquote':
      return '> ' + childText.split('\n').join('\n> ') + '\n\n';
    
    case 'codeBlock':
      const lang = node.attrs?.language || '';
      return '```' + lang + '\n' + childText + '```\n\n';
    
    case 'bulletList':
      return childText + '\n';
    
    case 'orderedList':
      return childText + '\n';
    
    case 'listItem':
      return '- ' + childText.trim() + '\n';
    
    default:
      return childText;
  }
}
