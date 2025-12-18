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
    
    // Try to extract quoted content (markdown quotes)
    const quoteMatch = trimmed.match(/^>\s*([\s\S]+?)(?:\n\n|$)/m);
    if (quoteMatch && quoteMatch[1]) {
        return {
            full: content,
            extracted: quoteMatch[1].trim(),
            hasExtraction: true,
        };
    }
    
    // Try to extract content after common AI prefixes
    const prefixPatterns = [
        /^(?:Here'?s? (?:the|a|an) (?:revised |improved |updated |corrected |rewritten |simplified |enhanced )?(?:version|text|content|paragraph|section|draft)s?:\s*\n+)/i,
        /^(?:Here you go:\s*\n+)/i,
        /^(?:Sure[,!]?\s*(?:here'?s?|here it is)?:?\s*\n+)/i,
        /^(?:Certainly[,!]?\s*(?:here'?s?|here it is)?:?\s*\n+)/i,
        /^(?:Of course[,!]?\s*(?:here'?s?|here it is)?:?\s*\n+)/i,
        /^(?:Absolutely[,!]?\s*(?:here'?s?|here it is)?:?\s*\n+)/i,
        /^(?:Here'?s? what I (?:suggest|recommend|propose|have):\s*\n+)/i,
        /^(?:I'?(?:ve|'ve) (?:revised|improved|updated|rewritten|simplified) (?:it|the text|this):\s*\n+)/i,
        /^(?:Let me (?:revise|improve|update|rewrite|simplify) (?:that|this|it):\s*\n+)/i,
        /^(?:How about this:\s*\n+)/i,
        /^(?:Try this:\s*\n+)/i,
    ];
    
    for (const pattern of prefixPatterns) {
        if (pattern.test(trimmed)) {
            const withoutPrefix = trimmed.replace(pattern, '').trim();
            if (withoutPrefix && withoutPrefix !== trimmed) {
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
        if (firstLine.length < 100 && (
            firstLine.includes('here') ||
            firstLine.includes('sure') ||
            firstLine.includes('certainly') ||
            firstLine.includes('of course') ||
            firstLine.includes('absolutely') ||
            firstLine.endsWith(':') ||
            firstLine.includes('revised') ||
            firstLine.includes('improved') ||
            firstLine.includes('updated')
        )) {
            // Check if second line is empty (intro + blank + content pattern)
            if (lines[1].trim() === '') {
                const contentLines = lines.slice(2);
                const extracted = contentLines.join('\n').trim();
                if (extracted) {
                    const cleaned = removeTrailingSignoffs(extracted);
                    // Make sure we're not returning the entire original if cleaning did nothing
                    if (cleaned.length < trimmed.length * 0.95) {
                        return {
                            full: content,
                            extracted: cleaned,
                            hasExtraction: true,
                        };
                    }
                }
            }
        }
    }
    
    // Check for explanatory text before/after actual content
    // Pattern: AI explanation + content + AI explanation
    const withoutSignoffs = removeTrailingSignoffs(trimmed);
    const withoutPrefixesAndSignoffs = removeLeadingExplanations(withoutSignoffs);
    
    if (withoutPrefixesAndSignoffs !== trimmed && withoutPrefixesAndSignoffs.length > 0) {
        return {
            full: content,
            extracted: withoutPrefixesAndSignoffs,
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
 * Removes common AI explanatory text from the beginning
 */
function removeLeadingExplanations(content: string): string {
    const lines = content.split('\n');
    let startIndex = 0;
    
    // Skip lines that look like AI chat/explanation
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i].trim().toLowerCase();
        
        // Skip empty lines
        if (line === '') {
            startIndex = i + 1;
            continue;
        }
        
        // Skip lines that are clearly AI chat
        if (
            line.startsWith('i ') ||
            line.startsWith('i\'') ||
            line.includes('i\'ve ') ||
            line.includes('i have ') ||
            line.includes('let me ') ||
            (line.length < 100 && (
                line.includes('here') ||
                line.includes('this') ||
                line.endsWith(':')
            ))
        ) {
            startIndex = i + 1;
            continue;
        }
        
        // Found content line, stop skipping
        break;
    }
    
    if (startIndex > 0 && startIndex < lines.length) {
        return lines.slice(startIndex).join('\n').trim();
    }
    
    return content;
}

/**
 * Removes common AI sign-offs from the end of content
 */
function removeTrailingSignoffs(content: string): string {
    const signoffPatterns = [
        /\n\n(?:Let me know if|Feel free to|I hope this|Would you like|Is there anything|Should I|Do you want|Would you prefer)/i,
        /\n\n(?:Please let me know|Don't hesitate to|If you need|If you'd like|If this)/i,
        /\n\n(?:Happy to|Glad to|I can|I'd be happy to|I'm happy to)/i,
        /\n\n(?:Note:|Note that|Keep in mind|Remember|Important:|Tip:)/i,
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
