import { AIProvider, AIProviderConfig, ChatMessage } from './ai-provider.interface';
import { Readable } from 'stream';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

export class AnthropicProvider implements AIProvider {
    id = 'anthropic';
    name = 'Anthropic';
    private model: ChatAnthropic;

    configure(config: AIProviderConfig): void {
        this.model = new ChatAnthropic({
            apiKey: config.apiKey,
            model: config.model || 'claude-3-5-sonnet-20240620',
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
        return [
            'claude-3-5-sonnet-20240620',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
        ];
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        // Anthropic doesn't support embeddings natively in the same way. 
        // Usually people use Voyage AI or similar with Claude.
        // For now, throw error or return empty.
        throw new Error('Embeddings not supported for Anthropic provider yet.');
    }

    async embedQuery(text: string): Promise<number[]> {
        throw new Error('Embeddings not supported for Anthropic provider yet.');
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
