import { Readable } from 'stream';

export interface AIProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    [key: string]: any;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIProvider {
    id: string;
    name: string;

    configure(config: AIProviderConfig): void;

    chat(messages: ChatMessage[]): Promise<string>;

    chatStream(messages: ChatMessage[]): Promise<Readable>;

    getModels(): Promise<string[]>;

    embedDocuments(documents: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
}
