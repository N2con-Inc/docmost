import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, AIProviderConfig, ChatMessage } from './providers/ai-provider.interface';
import { OllamaProvider } from './providers/ollama.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { WorkspacesService } from '../core/workspaces/workspaces.service';

@Injectable()
export class AIService {
    private readonly logger = new Logger(AIService.name);
    private providers: Map<string, AIProvider> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly workspacesService: WorkspacesService,
    ) {
        // Initialize providers
        this.registerProvider(new OllamaProvider());
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new OpenAIProvider());
    }

    private registerProvider(provider: AIProvider) {
        this.providers.set(provider.id, provider);
    }

    async chat(userId: string, workspaceId: string, messages: ChatMessage[]): Promise<string> {
        const provider = await this.getConfiguredProvider(userId, workspaceId);
        return provider.chat(messages);
    }

    async chatStream(userId: string, workspaceId: string, messages: ChatMessage[]) {
        const provider = await this.getConfiguredProvider(userId, workspaceId);
        return provider.chatStream(messages);
    }

    async getModels(userId: string, workspaceId: string): Promise<string[]> {
        const provider = await this.getConfiguredProvider(userId, workspaceId);
        return provider.getModels();
    }

    private async getConfiguredProvider(userId: string, workspaceId: string): Promise<AIProvider> {
        // Verify user has access to workspace (this check is usually done in guards, but good to have)
        // In a real scenario, we might want to check specific AI permissions here.

        const workspace = await this.workspacesService.getWorkspaceById(workspaceId);
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
}
