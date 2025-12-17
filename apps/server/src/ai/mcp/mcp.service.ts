import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ConfigService } from '@nestjs/config';
import { AITool } from '../providers/ai-provider.interface';
import { z } from 'zod';
import { StyleGuideMCP } from './servers/style-guide.mcp';
import { MicrosoftLearnMCP } from './servers/microsoft-learn.mcp';
import { MicrosoftGraphMCP } from './servers/microsoft-graph.mcp';
import { WikiPagesMCP } from './servers/wiki-pages.mcp';

@Injectable()
export class McpService implements OnModuleInit {
    private readonly logger = new Logger(McpService.name);
    private clients: Client[] = [];

    constructor(
        private readonly configService: ConfigService,
        private readonly styleGuideMCP: StyleGuideMCP,
        private readonly microsoftLearnMCP: MicrosoftLearnMCP,
        private readonly microsoftGraphMCP: MicrosoftGraphMCP,
        private readonly wikiPagesMCP: WikiPagesMCP,
    ) { }

    async onModuleInit() {
        // Initialize connections to configured MCP servers
        // For now, we might not have any external ones configured, but this is where we'd set them up.
        // We will also initialize our internal "servers" here or inject them.
    }

    async getTools(userId: string, workspaceId: string): Promise<AITool[]> {
        const tools: AITool[] = [];

        // Add internal tools
        const styleGuideTools = this.styleGuideMCP.getTools();
        for (const tool of styleGuideTools) {
            tools.push({
                name: tool.name,
                description: tool.description,
                schema: tool.inputSchema,
                func: tool.func,
            });
        }

        const msLearnTools = this.microsoftLearnMCP.getTools();
        for (const tool of msLearnTools) {
            tools.push({
                name: tool.name,
                description: tool.description,
                schema: tool.inputSchema,
                func: tool.func,
            });
        }

        const msGraphTools = this.microsoftGraphMCP.getTools();
        for (const tool of msGraphTools) {
            tools.push({
                name: tool.name,
                description: tool.description,
                schema: tool.inputSchema,
                func: tool.func,
            });
        }

        const wikiTools = this.wikiPagesMCP.getTools();
        for (const tool of wikiTools) {
            tools.push({
                name: tool.name,
                description: tool.description,
                schema: tool.inputSchema,
                func: tool.func,
            });
        }

        for (const client of this.clients) {
            try {
                const result = await client.listTools();
                for (const tool of result.tools) {
                    tools.push({
                        name: tool.name,
                        description: tool.description || '',
                        schema: tool.inputSchema,
                        func: async (args: any) => {
                            const callResult = await client.callTool({
                                name: tool.name,
                                arguments: args,
                            });
                            return callResult;
                        },
                    });
                }
            } catch (error) {
                this.logger.error(`Failed to list tools for client: ${(error as any).message}`);
            }
        }

        return tools;
    }
}
