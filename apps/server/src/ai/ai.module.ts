import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { EmbeddingsService } from './embeddings.service';
import { ConfigModule } from '@nestjs/config';
import { WorkspacesModule } from '../core/workspaces/workspaces.module';

import { WebSearchService } from './tools/web-search.service';
import { RefactorAgent } from './agents/refactor.agent';
import { ConsistencyAgent } from './agents/consistency.agent';
import { McpService } from './mcp/mcp.service';
import { StyleGuideMCP } from './mcp/servers/style-guide.mcp';
import { MicrosoftLearnMCP } from './mcp/servers/microsoft-learn.mcp';
import { MicrosoftGraphMCP } from './mcp/servers/microsoft-graph.mcp';

@Module({
    imports: [
        ConfigModule,
        WorkspacesModule,
        PageModule,
    ],
    controllers: [AIController],
    providers: [AIService, EmbeddingsService, WebSearchService, RefactorAgent, ConsistencyAgent, McpService, StyleGuideMCP, MicrosoftLearnMCP, MicrosoftGraphMCP],
    exports: [AIService, EmbeddingsService, WebSearchService, RefactorAgent, ConsistencyAgent, McpService],
})
export class AIModule { }
