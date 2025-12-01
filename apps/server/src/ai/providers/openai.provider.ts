import { AIProvider, AIProviderConfig, ChatMessage } from './ai-provider.interface';
import { Readable } from 'stream';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

export class OpenAIProvider implements AIProvider {
    id = 'openai';
    name = 'OpenAI / Compatible';
    private model: ChatOpenAI;

    configure(config: AIProviderConfig): void {
        this.model = new ChatOpenAI({
            openAIApiKey: config.apiKey || 'not-needed-for-local',
            configuration: {
                baseURL: config.baseUrl,
            },
            modelName: config.model || 'gpt-4o',
        });
    }

    async chat(messages: ChatMessage[]): Promise<string> {
        const langchainMessages = this.mapMessages(messages);
        const response = await this.model.invoke(langchainMessages);
        return response.content as string;
    }

    async chatStream(messages: ChatMessage[]): Promise<Readable> {
        const langchainMessages = this.mapMessages(messages);
        const stream = await this.model.stream(langchainMessages);

        const readable = new Readable({
            read() { },
        });

        (async () => {
            try {
                for await (const chunk of stream) {
                    readable.push(chunk.content);
                }
                readable.push(null);
            } catch (error) {
                readable.emit('error', error);
            }
        })();

        return readable;
    }

    async getModels(): Promise<string[]> {
        // For OpenAI/Compatible, we can try to fetch models if the user provided a baseUrl.
        // If it's standard OpenAI, we can return a static list or fetch.
        // Let's try to fetch using the client if possible, or just return common ones.
        // Since this is often used for LMStudio/x.ai, fetching is better.
        try {
            // @ts-ignore
            const baseUrl = this.model.configuration?.baseURL || 'https://api.openai.com/v1';
            // @ts-ignore
            const apiKey = this.model.configuration?.apiKey;

            const response = await fetch(`${baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
            }

            const data = await response.json();
            return data.data?.map((m: any) => m.id) || [];
        } catch (e) {
            return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
        }
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        const { OpenAIEmbeddings } = await import('@langchain/openai');
        // @ts-ignore
        const baseUrl = this.model.configuration?.baseURL;
        // @ts-ignore
        const apiKey = this.model.configuration?.apiKey;

        const embeddings = new OpenAIEmbeddings({
            apiKey,
            configuration: {
                baseURL: baseUrl,
            },
            modelName: 'text-embedding-3-small', // Default for OpenAI. For others, might need config.
        });
        return embeddings.embedDocuments(documents);
    }

    async embedQuery(text: string): Promise<number[]> {
        const { OpenAIEmbeddings } = await import('@langchain/openai');
        // @ts-ignore
        const baseUrl = this.model.configuration?.baseURL;
        // @ts-ignore
        const apiKey = this.model.configuration?.apiKey;

        const embeddings = new OpenAIEmbeddings({
            apiKey,
            configuration: {
                baseURL: baseUrl,
            },
            modelName: 'text-embedding-3-small',
        });
        return embeddings.embedQuery(text);
    }

    private mapMessages(messages: ChatMessage[]) {
        return messages.map(msg => {
            switch (msg.role) {
                case 'system': return new SystemMessage(msg.content);
                case 'user': return new HumanMessage(msg.content);
                case 'assistant': return new AIMessage(msg.content);
                default: return new HumanMessage(msg.content);
            }
        });
    }
}
