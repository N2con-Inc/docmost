import { AIProvider, AIProviderConfig, ChatMessage } from './ai-provider.interface';
import { Readable } from 'stream';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';

export class OllamaProvider implements AIProvider {
    id = 'ollama';
    name = 'Ollama';
    private model: ChatOllama;

    configure(config: AIProviderConfig): void {
        this.model = new ChatOllama({
            baseUrl: config.baseUrl || 'http://localhost:11434',
            model: config.model || 'llama3',
        });
    }

    async chat(messages: ChatMessage[], tools?: any[]): Promise<string> {
        const langchainMessages = this.mapMessages(messages);

        if (tools && tools.length > 0) {
            const modelWithTools = this.model.bindTools(tools.map(t => ({
                name: t.name,
                description: t.description,
                schema: t.schema,
            })));

            const response = await modelWithTools.invoke(langchainMessages);

            if (response.tool_calls && response.tool_calls.length > 0) {
                // Handle tool calls
                const toolMessages: BaseMessage[] = [response];
                for (const toolCall of response.tool_calls) {
                    const tool = tools.find(t => t.name === toolCall.name);
                    if (tool) {
                        try {
                            const result = await tool.func(toolCall.args);
                            toolMessages.push(new ToolMessage({
                                tool_call_id: toolCall.id,
                                content: JSON.stringify(result),
                            }));
                        } catch (error) {
                            toolMessages.push(new ToolMessage({
                                tool_call_id: toolCall.id,
                                content: `Error: ${(error as Error).message}`,
                            }));
                        }
                    }
                }

                // Call model again with tool results
                const finalResponse = await modelWithTools.invoke([...langchainMessages, ...toolMessages]);
                return finalResponse.content as string;
            }

            return response.content as string;
        }

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
        // Ollama has a list endpoint, but langchain might not expose it directly on the ChatOllama instance easily without a specific call.
        // However, we can use the fetch API to call the ollama instance directly if we have the baseUrl.
        // Or we can just return a static list if we can't easily reach it, but the user wants to see available models.
        // Let's try to fetch from the baseUrl.
        try {
            const baseUrl = this.model.lc_kwargs?.baseUrl || 'http://localhost:11434';
            const response = await fetch(`${baseUrl}/api/tags`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.models?.map((m: any) => m.name) || [];
        } catch (e) {
            return [];
        }
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        // ChatOllama doesn't have embedDocuments directly usually, it's on OllamaEmbeddings.
        // We might need to instantiate an OllamaEmbeddings instance or use the model if it supports it.
        // For simplicity, let's assume we use a separate OllamaEmbeddings instance or similar.
        // Actually, for this POC, let's try to use the configured model for embeddings if possible, 
        // or default to 'nomic-embed-text' or similar if the user hasn't specified an embedding model.
        // But the AIProviderConfig only has one model.
        // Let's instantiate OllamaEmbeddings with the same config.
        const { OllamaEmbeddings } = await import('@langchain/ollama');
        const embeddings = new OllamaEmbeddings({
            baseUrl: this.model.lc_kwargs?.baseUrl,
            model: this.model.lc_kwargs?.model, // Ideally user picks an embedding model, but for now reuse or default
        });
        return embeddings.embedDocuments(documents);
    }

    async embedQuery(text: string): Promise<number[]> {
        const { OllamaEmbeddings } = await import('@langchain/ollama');
        const embeddings = new OllamaEmbeddings({
            baseUrl: this.model.lc_kwargs?.baseUrl,
            model: this.model.lc_kwargs?.model,
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
