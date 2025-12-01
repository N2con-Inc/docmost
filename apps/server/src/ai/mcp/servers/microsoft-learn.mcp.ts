import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { WebSearchService } from '../../tools/web-search.service';

@Injectable()
export class MicrosoftLearnMCP {
    constructor(private readonly webSearchService: WebSearchService) { }

    getTools() {
        return [
            {
                name: 'search_microsoft_learn',
                description: 'Search Microsoft Learn documentation for technical information.',
                inputSchema: z.object({
                    query: z.string().describe('The search query'),
                }),
                func: async ({ query }: { query: string }) => {
                    const searchResult = await this.webSearchService.search(`site:learn.microsoft.com ${query}`);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: searchResult
                            }
                        ]
                    };
                }
            }
        ];
    }
}
