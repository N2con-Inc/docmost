/**
 * Extracts insertable content from AI responses
 * Handles code blocks, quoted sections, and structured content
 */

export interface ExtractedContent {
    full: string;           // Full response
    extracted: string;      // Extracted content (if found)
    hasExtraction: boolean; // Whether extraction was successful
}

export function extractInsertableContent(content: string): ExtractedContent {
    const trimmed = content.trim();
    
    // Try to extract code blocks (```language...```)
    const codeBlockMatch = trimmed.match(/```[\w]*\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        return {
            full: content,
            extracted: codeBlockMatch[1].trim(),
            hasExtraction: true,
        };
    }
    
    // Try to extract content after common AI prefixes (one-liners only)
    const prefixPatterns = [
        /^(?:Here'?s? (?:the|a) (?:revised |improved |updated |corrected )?(?:version|text|content|paragraph|section):\s*\n+)/i,
        /^(?:Here you go:\s*\n+)/i,
        /^(?:Sure[,!]?\s*\n+)/i,
        /^(?:Certainly[,!]?\s*\n+)/i,
        /^(?:Here'?s? what I (?:suggest|recommend|propose):\s*\n+)/i,
    ];
    
    for (const pattern of prefixPatterns) {
        if (pattern.test(trimmed)) {
            const withoutPrefix = trimmed.replace(pattern, '').trim();
            if (withoutPrefix && withoutPrefix !== trimmed) {
                // Remove trailing sign-offs
                const cleaned = removeTrailingSignoffs(withoutPrefix);
                return {
                    full: content,
                    extracted: cleaned,
                    hasExtraction: true,
                };
            }
        }
    }
    
    // Check if response starts with a short intro line followed by content
    const lines = trimmed.split('\n');
    if (lines.length > 2) {
        const firstLine = lines[0].trim().toLowerCase();
        // If first line is short and looks like an intro
        if (firstLine.length < 80 && (
            firstLine.includes('here') ||
            firstLine.includes('sure') ||
            firstLine.includes('certainly') ||
            firstLine.endsWith(':')
        )) {
            // Check if second line is empty (intro + blank + content pattern)
            if (lines[1].trim() === '') {
                const contentLines = lines.slice(2);
                const extracted = contentLines.join('\n').trim();
                if (extracted) {
                    const cleaned = removeTrailingSignoffs(extracted);
                    return {
                        full: content,
                        extracted: cleaned,
                        hasExtraction: true,
                    };
                }
            }
        }
    }
    
    // Remove trailing sign-offs even if no other extraction happened
    const cleaned = removeTrailingSignoffs(trimmed);
    if (cleaned !== trimmed) {
        return {
            full: content,
            extracted: cleaned,
            hasExtraction: true,
        };
    }
    
    // No extraction possible, return full content
    return {
        full: content,
        extracted: content,
        hasExtraction: false,
    };
}

/**
 * Removes common AI sign-offs from the end of content
 */
function removeTrailingSignoffs(content: string): string {
    const signoffPatterns = [
        /\n\n(?:Let me know if|Feel free to|I hope this|Would you like|Is there anything)/i,
        /\n\n(?:Please let me know|Don't hesitate to|If you need)/i,
    ];
    
    let result = content;
    for (const pattern of signoffPatterns) {
        const match = result.match(pattern);
        if (match && match.index !== undefined) {
            result = result.substring(0, match.index).trim();
        }
    }
    
    return result;
}

/**
 * Gets the best content to insert - extracted if available, otherwise full
 */
export function getInsertableContent(content: string): string {
    const { extracted } = extractInsertableContent(content);
    return extracted;
}
