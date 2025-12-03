import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PageService } from '../../core/page/services/page.service';
import { AITool } from '../providers/ai-provider.interface';
import { z } from 'zod';

@Injectable()
export class ConsistencyAgent {
    private readonly logger = new Logger(ConsistencyAgent.name);

    constructor(
        @Inject(forwardRef(() => AIService))
        private readonly aiService: AIService,
        private readonly pageService: PageService,
    ) { }

    getToolWithContext(userId: string, workspaceId: string): AITool {
        return {
            name: 'check_consistency',
            description: 'Analyze a page for consistency in tone, terminology, and formatting.',
            schema: z.object({
                pageId: z.string().describe('The ID of the page to analyze'),
            }),
            func: async ({ pageId }) => this.analyzeConsistency(userId, workspaceId, pageId),
        };
    }

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
