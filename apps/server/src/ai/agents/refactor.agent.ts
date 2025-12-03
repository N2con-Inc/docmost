import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PageService } from '../../core/page/services/page.service';
import { AITool } from '../providers/ai-provider.interface';
import { z } from 'zod';

@Injectable()
export class RefactorAgent {
    private readonly logger = new Logger(RefactorAgent.name);

    constructor(
        @Inject(forwardRef(() => AIService))
        private readonly aiService: AIService,
        private readonly pageService: PageService,
    ) { }

    getTool(): AITool {
        return {
            name: 'refactor_page',
            description: 'Analyze a page and suggest splitting it into sub-pages if it is too long or complex.',
            schema: z.object({
                pageId: z.string().describe('The ID of the page to analyze'),
            }),
            func: async ({ pageId }) => {
                // We need to pass userId and workspaceId. 
                // Since tools are called within a context where we might not have them directly in arguments,
                // we might need to rely on the caller to provide them or bind them.
                // However, for now, let's assume the tool call arguments will include them or we handle it differently.
                // Wait, the tool signature is fixed by the schema.
                // The `AIService` calling this tool knows the `userId` and `workspaceId`.
                // But `func` only receives the arguments defined in schema.

                // Solution: The `func` needs to be bound or we need to pass context.
                // But `AITool` interface defines `func: (args: any) => Promise<any>`.

                // Ideally, the agent shouldn't call `aiService.chat` recursively if it's just a tool.
                // But here the agent *is* using AI to do the analysis.
                // So it IS a recursive call (Agent calls LLM).

                // I will add userId and workspaceId to the schema for now, 
                // or better, I will change `getTool` to accept context.
                // But `getTool` returns a static definition.

                // Let's make `getTool` return a tool that requires `userId` and `workspaceId` in the args.
                // The LLM should be able to provide them if they are in the context? 
                // No, the LLM doesn't know the internal IDs usually.

                // Better approach: `AIService` should bind the context when registering the tool?
                // Or `getTool(userId, workspaceId)` returns a closure.
                throw new Error("RefactorAgent tool requires context binding");
            },
        };
    }

    // We'll use a factory method to get the tool with context
    getToolWithContext(userId: string, workspaceId: string): AITool {
        return {
            name: 'refactor_page',
            description: 'Analyze a page and suggest splitting it into sub-pages if it is too long or complex.',
            schema: z.object({
                pageId: z.string().describe('The ID of the page to analyze'),
            }),
            func: async ({ pageId }) => this.analyzePage(userId, workspaceId, pageId),
        };
    }

    async analyzePage(userId: string, workspaceId: string, pageId: string): Promise<string> {
        const page = await this.pageService.findById(pageId, true);
        if (!page) {
            throw new Error('Page not found');
        }

        // Extract text content from page (assuming Tiptap JSON)
        const content = JSON.stringify(page.content);

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
