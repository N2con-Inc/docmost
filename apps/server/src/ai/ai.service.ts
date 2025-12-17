import { Injectable, Logger, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, AIProviderConfig, ChatMessage } from './providers/ai-provider.interface';
import { OllamaProvider } from './providers/ollama.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { WorkspaceService } from '../core/workspace/services/workspace.service';
import { EmbeddingsService } from './embeddings.service';
import { WebSearchService } from './tools/web-search.service';
import { McpService } from './mcp/mcp.service';
import { RefactorAgent } from './agents/refactor.agent';
import { ConsistencyAgent } from './agents/consistency.agent';
import { PageService } from '../core/page/services/page.service';
import { JSONContent } from '@tiptap/core';
import { tiptapExtensions } from '../collaboration/collaboration.util';
import { generateHTML } from '../common/helpers/prosemirror/html';

@Injectable()
export class AIService {
    private readonly logger = new Logger(AIService.name);
    private providers: Map<string, AIProvider> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly workspaceService: WorkspaceService,
        private readonly embeddingsService: EmbeddingsService,
        private readonly webSearchService: WebSearchService,
        private readonly mcpService: McpService,
        @Inject(forwardRef(() => RefactorAgent))
        private readonly refactorAgent: RefactorAgent,
        @Inject(forwardRef(() => ConsistencyAgent))
        private readonly consistencyAgent: ConsistencyAgent,
        @Inject(forwardRef(() => PageService))
        private readonly pageService: PageService,
    ) {
        // Initialize providers
        this.registerProvider(new OllamaProvider());
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new OpenAIProvider());
    }

    private registerProvider(provider: AIProvider) {
        this.providers.set(provider.id, provider);
    }

    async chat(
        userId: string, 
        workspaceId: string, 
        messages: ChatMessage[],
        pageId?: string,
        selectedText?: string
    ): Promise<string> {
        const provider = await this.getConfiguredProvider(userId, workspaceId);
        
        // Inject page context if pageId is provided
        const enrichedMessages = await this.enrichMessagesWithContext(
            messages, 
            pageId, 
            selectedText,
            workspaceId
        );

        const webSearchTool = this.webSearchService.getTool();
        const refactorTool = this.refactorAgent.getToolWithContext(userId, workspaceId);
        const consistencyTool = this.consistencyAgent.getToolWithContext(userId, workspaceId);
        const mcpTools = await this.mcpService.getTools(userId, workspaceId);

        const tools = [webSearchTool, refactorTool, consistencyTool, ...mcpTools];
        return provider.chat(enrichedMessages, tools);
    }

    async chatStream(
        userId: string, 
        workspaceId: string, 
        messages: ChatMessage[],
        pageId?: string,
        selectedText?: string
    ) {
        const provider = await this.getConfiguredProvider(userId, workspaceId);
        
        // Inject page context if pageId is provided
        const enrichedMessages = await this.enrichMessagesWithContext(
            messages, 
            pageId, 
            selectedText,
            workspaceId
        );

        return provider.chatStream(enrichedMessages);
    }

    private async enrichMessagesWithContext(
        messages: ChatMessage[],
        pageId?: string,
        selectedText?: string,
        workspaceId?: string
    ): Promise<ChatMessage[]> {
        if (!pageId) {
            return messages;
        }

        try {
            // Fetch page data with content
            const page = await this.pageService.findById(pageId, true, false, false);
            
            if (!page) {
                this.logger.warn(`Page ${pageId} not found for context enrichment`);
                return messages;
            }

            // Convert page content to HTML then to plain text
            let pageContent = '';
            if (page.content) {
                try {
                    const html = generateHTML(page.content as JSONContent, tiptapExtensions);
                    // Strip HTML tags for plain text
                    pageContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                } catch (err) {
                    this.logger.error(`Failed to generate HTML from page content: ${(err as Error).message}`);
                    // Fallback: stringify the content
                    pageContent = JSON.stringify(page.content);
                }
            }

            // Build context message
            let contextMessage = `You are viewing a document titled "${page.title}".`;
            
            if (pageContent && pageContent.length > 0) {
                // Limit content size to avoid token limits (approx 10k chars = ~2.5k tokens)
                const maxContentLength = 10000;
                if (pageContent.length > maxContentLength) {
                    pageContent = pageContent.substring(0, maxContentLength) + '... (content truncated)';
                }
                contextMessage += `\n\nDocument content:\n${pageContent}`;
            }

            if (selectedText && selectedText.trim().length > 0) {
                contextMessage += `\n\nThe user has selected the following text:\n"${selectedText}"`;
            }

            contextMessage += '\n\nIMPORTANT Instructions for content insertion:\n- When providing content to insert, ONLY provide the content itself\n- Do NOT add explanations, commentary, or descriptions before or after\n- Always use proper Markdown formatting (# for headers, ** for bold, * for italic, - for lists, ``` for code)\n- Preserve paragraph breaks with blank lines\n- Keep formatting consistent with the document style\n\nFor questions or analysis, provide normal conversational responses.\nFor content insertion requests (\"write\", \"create\", \"improve\", \"rewrite\"), provide ONLY the insertable content without any explanation.';

            // Inject context as first system message or prepend to existing system message
            const systemMessageIndex = messages.findIndex(m => m.role === 'system');
            
            if (systemMessageIndex >= 0) {
                // Prepend to existing system message
                messages[systemMessageIndex].content = contextMessage + '\n\n' + messages[systemMessageIndex].content;
            } else {
                // Add new system message at the beginning
                messages = [
                    { role: 'system', content: contextMessage },
                    ...messages
                ];
            }

            return messages;
        } catch (err) {
            this.logger.error(`Failed to enrich messages with context: ${(err as Error).message}`);
            return messages;
        }
    }

    async getModels(userId: string, workspaceId: string): Promise<string[]> {
        const provider = await this.getConfiguredProvider(userId, workspaceId);
        return provider.getModels();
    }

    async search(userId: string, workspaceId: string, query: string, limit: number = 5) {
        const provider = await this.getConfiguredEmbeddingProvider(userId, workspaceId);
        return this.embeddingsService.search(provider, query, limit);
    }

    async getProviderForWorkspace(workspaceId: string): Promise<AIProvider | null> {
        try {
            const workspace = await this.workspaceService.findById(workspaceId);
            if (!workspace) return null;

            const aiSettings = workspace.settings?.['ai'];
            if (!aiSettings || !aiSettings.enabled) return null;

            const providerId = aiSettings.provider;
            const provider = this.providers.get(providerId);

            if (!provider) return null;

            provider.configure(aiSettings.config);
            return provider;
        } catch (error) {
            this.logger.error(`Failed to get provider for workspace ${workspaceId}: ${(error as any).message}`);
            return null;
        }
    }

    async getEmbeddingProviderForWorkspace(workspaceId: string): Promise<AIProvider | null> {
        try {
            const workspace = await this.workspaceService.findById(workspaceId);
            if (!workspace) return null;

            const aiSettings = workspace.settings?.['ai'];
            if (!aiSettings || !aiSettings.enabled) return null;

            const providerId = aiSettings.embeddingProvider || 'same';

            if (providerId === 'same') {
                return this.getProviderForWorkspace(workspaceId);
            }

            const provider = this.providers.get(providerId);
            if (!provider) return null;

            // Construct embedding config
            const config = {
                ...aiSettings.config,
                apiKey: aiSettings.config.embeddingApiKey || aiSettings.config.apiKey,
                baseUrl: aiSettings.config.embeddingBaseUrl || aiSettings.config.baseUrl,
                model: aiSettings.config.embeddingModel,
            };

            provider.configure(config);
            return provider;
        } catch (error) {
            this.logger.error(`Failed to get embedding provider for workspace ${workspaceId}: ${(error as any).message}`);
            return null;
        }
    }

    private async getConfiguredProvider(userId: string, workspaceId: string): Promise<AIProvider> {
        const workspace = await this.workspaceService.findById(workspaceId);
        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        const aiSettings = workspace.settings?.['ai'];
        if (!aiSettings || !aiSettings.enabled) {
            throw new ForbiddenException('AI features are not enabled for this workspace');
        }

        const providerId = aiSettings.provider;
        const provider = this.providers.get(providerId);

        if (!provider) {
            throw new NotFoundException(`AI Provider ${providerId} not found`);
        }

        provider.configure(aiSettings.config);
        return provider;
    }

    private async getConfiguredEmbeddingProvider(userId: string, workspaceId: string): Promise<AIProvider> {
        const workspace = await this.workspaceService.findById(workspaceId);
        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        const aiSettings = workspace.settings?.['ai'];
        if (!aiSettings || !aiSettings.enabled) {
            throw new ForbiddenException('AI features are not enabled for this workspace');
        }

        const providerId = aiSettings.embeddingProvider || 'same';

        if (providerId === 'same') {
            return this.getConfiguredProvider(userId, workspaceId);
        }

        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new NotFoundException(`Embedding Provider ${providerId} not found`);
        }

        // Construct embedding config
        const config = {
            ...aiSettings.config,
            apiKey: aiSettings.config.embeddingApiKey || aiSettings.config.apiKey,
            baseUrl: aiSettings.config.embeddingBaseUrl || aiSettings.config.baseUrl,
            model: aiSettings.config.embeddingModel,
        };

        provider.configure(config);
        return provider;
    }
}
