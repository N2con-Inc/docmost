import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PageService } from '../../core/page/services/page.service';

@Injectable()
export class RefactorAgent {
    private readonly logger = new Logger(RefactorAgent.name);

    constructor(
        private readonly aiService: AIService,
        private readonly pageService: PageService,
    ) { }

    async analyzePage(userId: string, workspaceId: string, pageId: string): Promise<string> {
        const page = await this.pageService.findById(pageId, true);
        if (!page) {
            throw new Error('Page not found');
        }

        // Extract text content from page (assuming Tiptap JSON)
        // For now, we'll use a simplified text extraction or just pass the JSON string if it's not too huge.
        // Ideally, we should use the same text extraction logic as in RagProcessor.
        const content = JSON.stringify(page.content); // Simplified for now

        const prompt = `
        You are an expert content editor. Analyze the following page content and determine if it should be split into smaller sub-pages.
        If the content is too long, complex, or covers multiple distinct topics, suggest a structure for splitting it.
        
        Content:
        ${content}
        
        Provide your suggestions in a clear, actionable format.
        `;

        return this.aiService.chat(userId, workspaceId, [{ role: 'user', content: prompt }]);
    }
}
