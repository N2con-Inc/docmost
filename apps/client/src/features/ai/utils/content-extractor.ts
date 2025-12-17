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
    
    // Try to extract content within quotes (for when AI wraps content in quotes)
    const quotedMatch = trimmed.match(/^["'](.+)["']$/s);
    if (quotedMatch && quotedMatch[1]) {
        return {
            full: content,
            extracted: quotedMatch[1].trim(),
            hasExtraction: true,
        };
    }
    
    // Try to extract content after common AI prefixes
    const prefixPatterns = [
        /^(?:Here'?s? (?:the|a) (?:revised |improved |updated |corrected )?(?:version|text|content|paragraph|section):\s*)/i,
        /^(?:Here you go:\s*)/i,
        /^(?:Sure[,!]?\s*)/i,
        /^(?:Certainly[,!]?\s*)/i,
    ];
    
    for (const pattern of prefixPatterns) {
        if (pattern.test(trimmed)) {
            const withoutPrefix = trimmed.replace(pattern, '').trim();
            // Check if there's a line break, take content after it
            const lines = withoutPrefix.split('\n');
            if (lines.length > 1) {
                // Skip the first line if it looks like a description
                const firstLine = lines[0].toLowerCase();
                if (firstLine.length < 100 && (
                    firstLine.includes('below') ||
                    firstLine.includes('following') ||
                    firstLine.includes(':')
                )) {
                    const extracted = lines.slice(1).join('\n').trim();
                    if (extracted) {
                        return {
                            full: content,
                            extracted,
                            hasExtraction: true,
                        };
                    }
                }
            }
            // Otherwise use the content without prefix
            if (withoutPrefix && withoutPrefix !== trimmed) {
                return {
                    full: content,
                    extracted: withoutPrefix,
                    hasExtraction: true,
                };
            }
        }
    }
    
    // Check if response has explanatory text followed by actual content
    // Pattern: explanation + blank line + content
    const parts = trimmed.split(/\n\s*\n/);
    if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1].trim();
        const secondToLast = parts[parts.length - 2].trim();
        
        // If last part is substantial and doesn't look like a conclusion
        if (lastPart.length > 50 && 
            !lastPart.toLowerCase().startsWith('let me know') &&
            !lastPart.toLowerCase().startsWith('i hope') &&
            !lastPart.toLowerCase().startsWith('feel free')) {
            return {
                full: content,
                extracted: lastPart,
                hasExtraction: true,
            };
        }
        
        // If second to last is substantial and last is short (likely a sign-off)
        if (secondToLast.length > 50 && lastPart.length < 50) {
            return {
                full: content,
                extracted: secondToLast,
                hasExtraction: true,
            };
        }
    }
    
    // No extraction possible, return full content
    return {
        full: content,
        extracted: content,
        hasExtraction: false,
    };
}

/**
 * Gets the best content to insert - extracted if available, otherwise full
 */
export function getInsertableContent(content: string): string {
    const { extracted } = extractInsertableContent(content);
    return extracted;
}
