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

export interface AITool {
    name: string;
    description: string;
    schema: any;
    func: (input: any) => Promise<any>;
}

export interface AIProvider {
    id: string;
    name: string;

    configure(config: AIProviderConfig): void;

    chat(messages: ChatMessage[], tools?: AITool[]): Promise<string>;

    chatStream(messages: ChatMessage[], tools?: AITool[]): Promise<Readable>;

    getModels(): Promise<string[]>;

    embedDocuments(documents: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
}
