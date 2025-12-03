import { Test, TestingModule } from '@nestjs/testing';
import { RagProcessor } from './rag.processor';
import { EmbeddingsService } from '../../../ai/embeddings.service';
import { AIService } from '../../../ai/ai.service';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { Job } from 'bullmq';
import { QueueJob } from '../constants';
import { Logger } from '@nestjs/common';

jest.mock('@langchain/textsplitters', () => {
    return {
        RecursiveCharacterTextSplitter: jest.fn(),
    };
});

jest.mock('../../../ai/ai.service', () => {
    return {
        AIService: jest.fn().mockImplementation(() => {
            return {
                getProviderForWorkspace: jest.fn(),
            };
        }),
    };
});

describe('RagProcessor', () => {
    let processor: RagProcessor;
    let embeddingsService: EmbeddingsService;
    let aiService: AIService;
    let pageRepo: PageRepo;

    const mockEmbeddingsService = {
        savePageEmbeddings: jest.fn(),
    };

    const mockAiService = {
        getProviderForWorkspace: jest.fn(),
    };

    const mockPageRepo = {
        findById: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RagProcessor,
                { provide: EmbeddingsService, useValue: mockEmbeddingsService },
                { provide: AIService, useValue: mockAiService },
                { provide: PageRepo, useValue: mockPageRepo },
            ],
        }).compile();

        processor = module.get<RagProcessor>(RagProcessor);
        embeddingsService = module.get<EmbeddingsService>(EmbeddingsService);
        aiService = module.get<AIService>(AIService);
        pageRepo = module.get<PageRepo>(PageRepo);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('process', () => {
        it('should call indexPage for RAG_INDEX_PAGE job', async () => {
            const job = {
                name: QueueJob.RAG_INDEX_PAGE,
                data: { pageId: 'page-1', workspaceId: 'ws-1' },
            } as Job;

            const indexPageSpy = jest.spyOn(processor as any, 'indexPage').mockResolvedValue(undefined);

            await processor.process(job);

            expect(indexPageSpy).toHaveBeenCalledWith('page-1', 'ws-1');
        });

        it('should log warning for unknown job name', async () => {
            const job = {
                name: 'UNKNOWN_JOB',
                data: {},
            } as Job;

            const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

            await processor.process(job);

            expect(loggerSpy).toHaveBeenCalledWith('Unknown job name: UNKNOWN_JOB');
        });
    });

    describe('indexPage', () => {
        const pageId = 'page-1';
        const workspaceId = 'ws-1';
        const mockPage = {
            id: pageId,
            title: 'Test Page',
            content: {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Hello World' }],
                    },
                ],
            },
        };
        const mockProvider = { id: 'test-provider' };

        it('should skip if page not found', async () => {
            mockPageRepo.findById.mockResolvedValue(null);
            const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

            await (processor as any).indexPage(pageId, workspaceId);

            expect(mockPageRepo.findById).toHaveBeenCalledWith(pageId, { includeContent: true });
            expect(loggerSpy).toHaveBeenCalledWith(`Page ${pageId} not found, skipping indexing`);
            expect(mockAiService.getProviderForWorkspace).not.toHaveBeenCalled();
        });

        it('should skip if no provider configured', async () => {
            mockPageRepo.findById.mockResolvedValue(mockPage);
            mockAiService.getProviderForWorkspace.mockResolvedValue(null);
            const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

            await (processor as any).indexPage(pageId, workspaceId);

            expect(mockAiService.getProviderForWorkspace).toHaveBeenCalledWith(workspaceId);
            expect(loggerSpy).toHaveBeenCalledWith(`No AI provider configured for workspace ${workspaceId}, skipping indexing`);
            expect(mockEmbeddingsService.savePageEmbeddings).not.toHaveBeenCalled();
        });

        it('should extract text and save embeddings', async () => {
            mockPageRepo.findById.mockResolvedValue(mockPage);
            mockAiService.getProviderForWorkspace.mockResolvedValue(mockProvider);

            await (processor as any).indexPage(pageId, workspaceId);

            expect(mockEmbeddingsService.savePageEmbeddings).toHaveBeenCalledWith(
                mockProvider,
                pageId,
                'Hello World',
                { title: 'Test Page', workspaceId: workspaceId }
            );
        });

        it('should handle errors', async () => {
            mockPageRepo.findById.mockRejectedValue(new Error('DB Error'));
            await expect((processor as any).indexPage(pageId, workspaceId)).rejects.toThrow('DB Error');
        });
    });

    describe('extractTextFromTiptap', () => {
        it('should return empty string for null content', () => {
            expect((processor as any).extractTextFromTiptap(null)).toBe('');
        });

        it('should return content if it is already a string', () => {
            expect((processor as any).extractTextFromTiptap('some text')).toBe('some text');
        });

        it('should extract text from nested tiptap json', () => {
            const content = {
                type: 'doc',
                content: [
                    {
                        type: 'heading',
                        content: [{ type: 'text', text: 'Title' }],
                    },
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Hello' },
                            { type: 'text', text: 'World' },
                        ],
                    },
                ],
            };

            const text = (processor as any).extractTextFromTiptap(content);
            expect(text.replace(/\s+/g, ' ')).toBe('Title Hello World');
        });
    });
});
