import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('embeddings')
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v7()`))
        .addColumn('page_id', 'uuid', (col) => col.notNull().references('pages.id').onDelete('cascade'))
        .addColumn('content', 'text', (col) => col.notNull())
        .addColumn('embedding', sql`vector(1536)`, (col) => col.notNull()) // Assuming OpenAI/compatible 1536 dim
        .addColumn('metadata', 'jsonb')
        .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
        .execute();

    // Create an HNSW index for faster similarity search
    await sql`CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('embeddings').execute();
}
