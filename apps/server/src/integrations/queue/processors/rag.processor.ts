import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QueueJob, QueueName } from '../constants';
import { EmbeddingsService } from '../../../ai/embeddings.service';
import { AIService } from '../../../ai/ai.service';
import { PageRepo } from '@docmost/db/repos/page/page.repo';

@Processor(QueueName.RAG_QUEUE)
export class RagProcessor extends WorkerHost {
    private readonly logger = new Logger(RagProcessor.name);

    constructor(
        private readonly embeddingsService: EmbeddingsService,
        private readonly aiService: AIService,
        private readonly pageRepo: PageRepo,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        switch (job.name) {
            case QueueJob.RAG_INDEX_PAGE:
                return this.indexPage(job.data.pageId, job.data.workspaceId);
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
        }
    }

    private async indexPage(pageId: string, workspaceId: string) {
        this.logger.log(`Indexing page ${pageId} for workspace ${workspaceId}`);

        // 1. Fetch page content
        const page = await this.pageRepo.findById(pageId, { includeContent: true });
        if (!page) {
            this.logger.warn(`Page ${pageId} not found, skipping indexing`);
            return;
        }

        // 2. Get AI Provider for this workspace
        // We need to bypass the userId check in AIService since this is a background job.
        // However, AIService.getProvider requires userId.
        // We might need to refactor AIService or fetch the provider directly here.
        // Let's try to use AIService but we need a "system" user or similar, or just fetch the settings directly.
        // Actually, AIService has `getProvider(workspaceId, userId)`.
        // If we don't have a userId (background job), we might need to fetch the workspace settings directly.

        // Let's assume for now we can get the provider without a userId if we modify AIService, 
        // or we just fetch the settings from the workspace repo.
        // But AIService encapsulates the logic of choosing the provider.

        // WORKAROUND: For now, let's fetch the workspace settings and instantiate the provider manually 
        // or add a method to AIService to get provider by workspaceId only (if allowed).
        // But wait, `getProvider` checks permissions? No, it just gets the config.
        // Let's look at `AIService.getProvider`.

        try {
            // We'll need to add a method to AIService to get provider by workspaceId for internal use.
            // For now, let's assume we can add `getProviderForWorkspace(workspaceId)` to AIService.
            const provider = await this.aiService.getProviderForWorkspace(workspaceId);

            if (!provider) {
                this.logger.warn(`No AI provider configured for workspace ${workspaceId}, skipping indexing`);
                return;
            }

            // 3. Generate and save embeddings
            // We can include metadata like title, path, etc.
            const metadata = {
                title: page.title,
                workspaceId: workspaceId,
                // path: ... (we might need to calculate the path)
            };

            // We need to convert the Tiptap JSON content to plain text or Markdown.
            // Since we don't have a Tiptap converter handy on the server side easily without dependencies,
            // we might rely on the client sending the text, OR we use a simple JSON-to-text extractor.
            // `page.content` is JSON.
            // Let's assume for this MVP we extract text from the JSON structure simply.

            const contentText = this.extractTextFromTiptap(page.content);

            await this.embeddingsService.savePageEmbeddings(provider, pageId, contentText, metadata);

        } catch (error) {
            this.logger.error(`Failed to index page ${pageId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    private extractTextFromTiptap(content: any): string {
        if (!content) return '';
        if (typeof content === 'string') return content; // Should be JSON, but just in case

        let text = '';
        if (content.type === 'text') {
            text += content.text;
        }

        if (content.content && Array.isArray(content.content)) {
            content.content.forEach((child: any) => {
                text += this.extractTextFromTiptap(child) + ' ';
            });
        }

        return text.trim();
    }
}
