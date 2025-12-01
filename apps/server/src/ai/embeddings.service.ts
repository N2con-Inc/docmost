import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { sql } from 'kysely';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { AIProvider } from './providers/ai-provider.interface';

@Injectable()
export class EmbeddingsService {
    private readonly logger = new Logger(EmbeddingsService.name);

    constructor(@InjectKysely() private readonly db: KyselyDB) { }

    async savePageEmbeddings(
        provider: AIProvider,
        pageId: string,
        content: string,
        metadata: any = {},
    ) {
        // 1. Split content into chunks
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await splitter.createDocuments([content]);
        const texts = docs.map((d) => d.pageContent);

        if (texts.length === 0) return;

        // 2. Generate embeddings
        this.logger.log(`Generating embeddings for page ${pageId} (${texts.length} chunks)`);
        const embeddings = await provider.embedDocuments(texts);

        // 3. Delete existing embeddings for this page
        await this.db
            .deleteFrom('embeddings' as any)
            .where('page_id', '=', pageId)
            .execute();

        // 4. Insert new embeddings
        const values = texts.map((text, i) => ({
            page_id: pageId,
            content: text,
            embedding: sql`vector(${JSON.stringify(embeddings[i])})`,
            metadata: JSON.stringify(metadata),
        }));

        // Kysely doesn't support bulk insert with raw sql values easily for vector type without casting
        // So we might need to do it in a loop or construct a raw query.
        // Let's try to do it with a raw query for efficiency.

        for (const val of values) {
            await this.db.insertInto('embeddings' as any)
                .values({
                    page_id: val.page_id,
                    content: val.content,
                    embedding: val.embedding,
                    metadata: val.metadata
                })
                .execute();
        }

        this.logger.log(`Saved ${embeddings.length} embeddings for page ${pageId}`);
    }

    async search(
        provider: AIProvider,
        query: string,
        limit: number = 5,
        filter?: { pageId?: string }
    ): Promise<{ content: string; metadata: any; score: number }[]> {
        const embedding = await provider.embedQuery(query);
        const embeddingString = JSON.stringify(embedding);

        let queryBuilder = this.db
            .selectFrom('embeddings' as any)
            .select([
                'content',
                'metadata',
                sql<number>`1 - (embedding <=> ${embeddingString}::vector)`.as('score'),
            ])
            .orderBy('score', 'desc')
            .limit(limit);

        if (filter?.pageId) {
            queryBuilder = queryBuilder.where('page_id', '=', filter.pageId);
        }

        const results = await queryBuilder.execute();

        return results.map((r: any) => ({
            content: r.content,
            metadata: r.metadata,
            score: r.score,
        }));
    }
}
