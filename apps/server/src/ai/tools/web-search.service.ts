import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

@Injectable()
export class WebSearchService {
    private readonly logger = new Logger(WebSearchService.name);
    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('TAVILY_API_KEY');
    }

    async search(query: string): Promise<string> {
        if (!this.apiKey) {
            this.logger.warn('Tavily API key not found. Web search is disabled.');
            return 'Web search is disabled. Please configure TAVILY_API_KEY.';
        }

        try {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    query: query,
                    search_depth: 'basic',
                    include_answer: true,
                    max_results: 5,
                }),
            });

            if (!response.ok) {
                throw new Error(`Tavily API error: ${response.statusText}`);
            }

            const data = await response.json();

            // Format the results
            let resultString = `Answer: ${data.answer}\n\nSources:\n`;
            data.results.forEach((result: any) => {
                resultString += `- [${result.title}](${result.url}): ${result.content}\n`;
            });

            return resultString;
        } catch (error) {
            this.logger.error('Failed to perform web search', error);
            return `Failed to perform web search: ${(error as any).message}`;
        }
    }

    getTool() {
        return {
            name: 'web_search',
            description: 'Search the web for current information.',
            schema: z.object({
                query: z.string().describe('The search query'),
            }),
            func: async ({ query }: { query: string }) => {
                return this.search(query);
            },
        };
    }
}
