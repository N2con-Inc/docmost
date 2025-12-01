import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PageService } from '../../core/page/services/page.service';

@Injectable()
export class ConsistencyAgent {
    private readonly logger = new Logger(ConsistencyAgent.name);

    constructor(
        private readonly aiService: AIService,
        private readonly pageService: PageService,
    ) { }

    async analyzeConsistency(userId: string, workspaceId: string, pageId: string): Promise<string> {
        const page = await this.pageService.findById(pageId, true);
        if (!page) {
            throw new Error('Page not found');
        }

        const content = JSON.stringify(page.content);

        const prompt = `
        You are an expert content editor. Analyze the following page content for consistency in tone, terminology, and formatting.
        Identify any inconsistencies or areas where the writing style shifts abruptly.
        
        Content:
        ${content}
        
        Provide a report on the consistency of the document, highlighting specific examples and suggesting improvements.
        `;

        return this.aiService.chat(userId, workspaceId, [{ role: 'user', content: prompt }]);
    }
}
