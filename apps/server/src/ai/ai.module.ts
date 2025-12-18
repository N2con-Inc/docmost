import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { EmbeddingsService } from './embeddings.service';
import { AICollabEditorService } from './services/ai-collab-editor.service';
import { ConfigModule } from '@nestjs/config';
import { WorkspaceModule } from '../core/workspace/workspace.module';
import { PageModule } from '../core/page/page.module';
import { DatabaseModule } from '../database/database.module';

import { WebSearchService } from './tools/web-search.service';
import { RefactorAgent } from './agents/refactor.agent';
import { ConsistencyAgent } from './agents/consistency.agent';
import { McpService } from './mcp/mcp.service';
import { StyleGuideMCP } from './mcp/servers/style-guide.mcp';
import { MicrosoftLearnMCP } from './mcp/servers/microsoft-learn.mcp';
import { MicrosoftGraphMCP } from './mcp/servers/microsoft-graph.mcp';
import { WikiPagesMCP } from './mcp/servers/wiki-pages.mcp';

@Module({
    imports: [
        ConfigModule,
        WorkspaceModule,
        PageModule,
        DatabaseModule,
    ],
    controllers: [AIController],
    providers: [
        AIService, 
        EmbeddingsService, 
        AICollabEditorService,
        WebSearchService, 
        RefactorAgent, 
        ConsistencyAgent, 
        McpService, 
        StyleGuideMCP, 
        MicrosoftLearnMCP, 
        MicrosoftGraphMCP, 
        WikiPagesMCP
    ],
    exports: [
        AIService, 
        EmbeddingsService, 
        AICollabEditorService,
        WebSearchService, 
        RefactorAgent, 
        ConsistencyAgent, 
        McpService
    ],
})
export class AIModule { }
