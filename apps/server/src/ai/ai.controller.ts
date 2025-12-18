import { Body, Controller, Post, Res, UseGuards, Delete, Param } from '@nestjs/common';
import { AIService } from './ai.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SearchRequestDto } from './dto/search-request.dto';
import { LiveEditRequestDto, LiveEditResponseDto, CancelEditResponseDto } from './dto/live-edit-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { User } from '@docmost/db/types/entity.types';
import { Response } from 'express';
import { AICollabEditorService } from './services/ai-collab-editor.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
    constructor(
        private readonly aiService: AIService,
        private readonly aiCollabEditorService: AICollabEditorService,
    ) { }

    @Post('chat')
    async chat(@AuthUser() user: User, @Body() body: ChatRequestDto) {
        return this.aiService.chat(
            user.id, 
            user.workspaceId, 
            body.messages, 
            body.pageId,
            body.selectedText,
            body.includeRelatedDocs,
            body.includeWikiStructure,
            body.includeAttachments
        );
    }

    @Post('chat/stream')
    async chatStream(@AuthUser() user: User, @Body() body: ChatRequestDto, @Res() res: Response) {
        const stream = await this.aiService.chatStream(
            user.id, 
            user.workspaceId, 
            body.messages,
            body.pageId,
            body.selectedText,
            body.includeRelatedDocs,
            body.includeWikiStructure,
            body.includeAttachments
        );

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        stream.pipe(res);
    }

    @Post('chat/live-edit')
    async liveEdit(@AuthUser() user: User, @Body() body: LiveEditRequestDto): Promise<LiveEditResponseDto> {
        const result = await this.aiCollabEditorService.applyLiveEdit({
            pageId: body.pageId,
            content: body.content,
            mode: body.mode,
            position: body.position,
            workspaceId: user.workspaceId,
            userId: user.id,
            typingSpeed: body.typingSpeed || 50,
        });

        return {
            success: result.success,
            operationId: result.operationId,
            message: 'AI edit applied successfully',
        };
    }

    @Delete('chat/live-edit/:operationId')
    async cancelLiveEdit(
        @AuthUser() user: User,
        @Param('operationId') operationId: string
    ): Promise<CancelEditResponseDto> {
        const success = await this.aiCollabEditorService.cancelEdit(operationId);
        
        return {
            success,
            operationId,
        };
    }

    @Post('models')
    async getModels(@AuthUser() user: User) {
        return this.aiService.getModels(user.id, user.workspaceId);
    }

    @Post('search')
    async search(@AuthUser() user: User, @Body() body: SearchRequestDto) {
        return this.aiService.search(user.id, user.workspaceId, body.query, body.limit);
    }
}
