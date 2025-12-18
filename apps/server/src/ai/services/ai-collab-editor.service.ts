import { Injectable, Logger } from '@nestjs/common';
import * as Y from 'yjs';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { tiptapExtensions } from '../../collaboration/collaboration.util';
import { markdownToHtml } from '@docmost/editor-ext';

export interface LiveEditOptions {
  pageId: string;
  content: string;
  mode: 'insert' | 'replace' | 'append';
  position?: { from: number; to: number };
  workspaceId: string;
  userId: string;
  typingSpeed?: number;
}

@Injectable()
export class AICollabEditorService {
  private readonly logger = new Logger(AICollabEditorService.name);
  private activeEdits: Map<string, boolean> = new Map();

  constructor(
    private readonly pageRepo: PageRepo,
  ) {}

  async applyLiveEdit(options: LiveEditOptions): Promise<{ success: boolean; operationId: string }> {
    const operationId = `ai-edit-${options.pageId}-${Date.now()}`;
    this.activeEdits.set(operationId, true);

    try {
      const page = await this.pageRepo.findById(options.pageId, {
        includeYdoc: true,
        includeContent: true,
      });

      if (!page) {
        throw new Error(`Page not found: ${options.pageId}`);
      }

      let ydoc: Y.Doc;
      
      if (page.ydoc) {
        ydoc = new Y.Doc();
        const dbState = new Uint8Array(page.ydoc);
        Y.applyUpdate(ydoc, dbState);
        this.logger.debug(`Loaded existing ydoc for page ${options.pageId}`);
      } else if (page.content) {
        ydoc = TiptapTransformer.toYdoc(page.content, 'default', tiptapExtensions);
        this.logger.debug(`Converted content to ydoc for page ${options.pageId}`);
      } else {
        ydoc = new Y.Doc();
        this.logger.debug(`Created new ydoc for page ${options.pageId}`);
      }

      // Clean the content before processing
      const cleanContent = this.extractPureContent(options.content);
      this.logger.debug(`Content before cleaning: ${options.content.substring(0, 100)}...`);
      this.logger.debug(`Content after cleaning: ${cleanContent.substring(0, 100)}...`);

      const html = await Promise.resolve(markdownToHtml(cleanContent));
      
      const contentJson = this.parseHtmlToProseMirror(html);
      const contentYdoc = TiptapTransformer.toYdoc(contentJson, 'default', tiptapExtensions);
      const contentFragment = contentYdoc.getXmlFragment('default');

      const targetFragment = ydoc.getXmlFragment('default');

      ydoc.transact(() => {
        if (options.mode === 'replace' && options.position) {
          const length = options.position.to - options.position.from;
          if (length > 0) {
            targetFragment.delete(options.position.from, length);
          }
          this.insertFragment(targetFragment, contentFragment, options.position.from);
        } else if (options.mode === 'append') {
          const endPos = targetFragment.length;
          this.insertFragment(targetFragment, contentFragment, endPos);
        } else {
          const insertPos = options.position?.from || targetFragment.length;
          this.insertFragment(targetFragment, contentFragment, insertPos);
        }
      });

      const tiptapJson = TiptapTransformer.fromYdoc(ydoc, 'default');
      const ydocState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

      await this.pageRepo.updatePage(
        {
          content: tiptapJson,
          ydoc: ydocState,
          lastUpdatedById: options.userId,
        },
        options.pageId,
      );

      this.logger.log(`AI live edit completed for page ${options.pageId}`);
      
      return { success: true, operationId };
    } catch (error) {
      this.logger.error(`AI live edit failed for page ${options.pageId}`, error);
      throw error;
    } finally {
      this.activeEdits.delete(operationId);
    }
  }

  /**
   * Extract pure content from AI responses, removing all chat/explanatory text
   */
  private extractPureContent(content: string): string {
    let cleaned = content.trim();

    // Remove code block markers if entire content is wrapped
    const codeBlockMatch = cleaned.match(/^```[\w]*\n([\s\S]*?)\n```$/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    // Remove common AI prefixes
    const prefixPatterns = [
      /^(?:Here'?s? (?:the|a|an) (?:revised |improved |updated |corrected |rewritten |simplified |enhanced )?(?:version|text|content|paragraph|section|draft)s?:\s*\n+)/i,
      /^(?:Here you go:\s*\n+)/i,
      /^(?:Sure[,!]?\s*(?:here'?s?|here it is)?:?\s*\n+)/i,
      /^(?:Certainly[,!]?\s*(?:here'?s?|here it is)?:?\s*\n+)/i,
      /^(?:Of course[,!]?\s*(?:here'?s?|here it is)?:?\s*\n+)/i,
      /^(?:Absolutely[,!]?\s*(?:here'?s?|here it is)?:?\s*\n+)/i,
      /^(?:I'?(?:ve|'ve) (?:revised|improved|updated|rewritten|simplified) (?:it|the text|this):\s*\n+)/i,
    ];

    for (const pattern of prefixPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Remove trailing AI sign-offs
    const signoffPatterns = [
      /\n\n(?:Let me know if|Feel free to|I hope this|Would you like|Is there anything|Should I)/i,
      /\n\n(?:Please let me know|Don't hesitate to|If you need|If you'd like)/i,
      /\n\n(?:Note:|Note that|Keep in mind|Remember that)/i,
    ];

    for (const pattern of signoffPatterns) {
      const match = cleaned.match(pattern);
      if (match && match.index !== undefined) {
        cleaned = cleaned.substring(0, match.index);
      }
    }

    // Remove leading explanatory lines
    const lines = cleaned.split('\n');
    let startIndex = 0;

    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i].trim().toLowerCase();
      
      if (line === '') {
        startIndex = i + 1;
        continue;
      }

      // Skip obvious AI chat lines
      if (
        line.startsWith('i ') ||
        line.startsWith('i\'') ||
        line.includes('let me ') ||
        (line.length < 80 && line.includes('here'))
      ) {
        startIndex = i + 1;
        continue;
      }

      break;
    }

    if (startIndex > 0 && startIndex < lines.length) {
      cleaned = lines.slice(startIndex).join('\n');
    }

    return cleaned.trim();
  }

  private insertFragment(target: Y.XmlFragment, source: Y.XmlFragment, position: number): void {
    const nodes = source.toArray();
    nodes.forEach((node, index) => {
      if (node instanceof Y.XmlElement || node instanceof Y.XmlText) {
        const clonedNode = node.clone();
        target.insert(position + index, [clonedNode]);
      }
    });
  }

  private parseHtmlToProseMirror(html: string): any {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: text ? [
            {
              type: 'text',
              text: text,
            }
          ] : []
        }
      ]
    };
  }

  async cancelEdit(operationId: string): Promise<boolean> {
    if (this.activeEdits.has(operationId)) {
      this.activeEdits.set(operationId, false);
      return true;
    }
    return false;
  }
}
