import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { WorkspaceService } from '../core/workspace/services/workspace.service';
import { EmbeddingsService } from './embeddings.service';
import { WebSearchService } from './tools/web-search.service';
import { McpService } from './mcp/mcp.service';
import { RefactorAgent } from './agents/refactor.agent';
import { ConsistencyAgent } from './agents/consistency.agent';

// Mock the providers to avoid importing LangChain dependencies which cause Jest ESM issues
jest.mock('./providers/ollama.provider', () => ({
    OllamaProvider: jest.fn().mockImplementation(() => ({
        id: 'ollama',
        configure: jest.fn(),
    })),
}));
jest.mock('./providers/anthropic.provider', () => ({
    AnthropicProvider: jest.fn().mockImplementation(() => ({
        id: 'anthropic',
        configure: jest.fn(),
    })),
}));
jest.mock('./providers/openai.provider', () => ({
    OpenAIProvider: jest.fn().mockImplementation(() => ({
        id: 'openai',
        configure: jest.fn(),
    })),
}));

// Mock other services to avoid deep dependency issues (like BullMQ)
jest.mock('../core/workspace/services/workspace.service', () => ({
    WorkspaceService: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
    })),
}));
jest.mock('./embeddings.service', () => ({
    EmbeddingsService: jest.fn().mockImplementation(() => ({
        search: jest.fn(),
    })),
}));
jest.mock('./tools/web-search.service', () => ({
    WebSearchService: jest.fn().mockImplementation(() => ({
        getTool: jest.fn(),
    })),
}));
jest.mock('./mcp/mcp.service', () => ({
    McpService: jest.fn().mockImplementation(() => ({
        getTools: jest.fn(),
    })),
}));
jest.mock('./agents/refactor.agent', () => ({
    RefactorAgent: jest.fn().mockImplementation(() => ({
        getToolWithContext: jest.fn(),
    })),
}));
jest.mock('./agents/consistency.agent', () => ({
    ConsistencyAgent: jest.fn().mockImplementation(() => ({
        getToolWithContext: jest.fn(),
    })),
}));

describe('AIService', () => {
    let service: AIService;
    let workspaceService: WorkspaceService;

    const mockConfigService = {
        get: jest.fn(),
    };

    const mockWorkspaceService = {
        findById: jest.fn(),
    };

    const mockEmbeddingsService = {
        search: jest.fn(),
    };

    const mockWebSearchService = {
        getTool: jest.fn(),
    };

    const mockMcpService = {
        getTools: jest.fn(),
    };

    const mockRefactorAgent = {
        getToolWithContext: jest.fn(),
    };

    const mockConsistencyAgent = {
        getToolWithContext: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AIService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: WorkspaceService, useValue: mockWorkspaceService },
                { provide: EmbeddingsService, useValue: mockEmbeddingsService },
                { provide: WebSearchService, useValue: mockWebSearchService },
                { provide: McpService, useValue: mockMcpService },
                { provide: RefactorAgent, useValue: mockRefactorAgent },
                { provide: ConsistencyAgent, useValue: mockConsistencyAgent },
            ],
        }).compile();

        service = module.get<AIService>(AIService);
        workspaceService = module.get<WorkspaceService>(WorkspaceService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getEmbeddingProviderForWorkspace', () => {
        it('should return null if workspace not found', async () => {
            mockWorkspaceService.findById.mockResolvedValue(null);
            const provider = await service.getEmbeddingProviderForWorkspace('ws-1');
            expect(provider).toBeNull();
        });

        it('should return null if AI not enabled', async () => {
            mockWorkspaceService.findById.mockResolvedValue({ settings: { ai: { enabled: false } } });
            const provider = await service.getEmbeddingProviderForWorkspace('ws-1');
            expect(provider).toBeNull();
        });

        it('should return chat provider if embeddingProvider is "same"', async () => {
            mockWorkspaceService.findById.mockResolvedValue({
                settings: {
                    ai: {
                        enabled: true,
                        provider: 'openai',
                        embeddingProvider: 'same',
                        config: { apiKey: 'test-key' }
                    }
                }
            });

            const provider = await service.getEmbeddingProviderForWorkspace('ws-1');
            expect(provider).toBeDefined();
            expect(provider?.id).toBe('openai');
        });

        it('should return specific embedding provider if configured', async () => {
            mockWorkspaceService.findById.mockResolvedValue({
                settings: {
                    ai: {
                        enabled: true,
                        provider: 'anthropic',
                        embeddingProvider: 'openai',
                        config: {
                            apiKey: 'anthropic-key',
                            embeddingApiKey: 'openai-key'
                        }
                    }
                }
            });

            const provider = await service.getEmbeddingProviderForWorkspace('ws-1');
            expect(provider).toBeDefined();
            expect(provider?.id).toBe('openai');
        });

        it('should return null if configured embedding provider does not exist', async () => {
            mockWorkspaceService.findById.mockResolvedValue({
                settings: {
                    ai: {
                        enabled: true,
                        provider: 'openai',
                        embeddingProvider: 'non-existent',
                        config: {}
                    }
                }
            });

            const provider = await service.getEmbeddingProviderForWorkspace('ws-1');
            expect(provider).toBeNull();
        });
    });
});
