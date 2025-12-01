import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { AIService } from './ai.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { UserEntity } from '../users/user.entity';
import { Response } from 'express';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
    constructor(private readonly aiService: AIService) { }

    @Post('chat')
    async chat(@User() user: UserEntity, @Body() body: ChatRequestDto) {
        // Assuming workspaceId is available in user context or passed in body. 
        // For now, let's assume the user's active workspace or passed via header/body.
        // Ideally, we should get workspaceId from the request context or body.
        // Let's assume for now we use the user's last active workspace or similar.
        // But wait, the service needs workspaceId to get settings.
        // I'll add workspaceId to the DTO or extract it from headers if the app uses a specific header.
        // Checking existing controllers might help.

        // For now, I'll assume the client sends X-Workspace-ID header or similar, 
        // but since I don't see that pattern yet, I'll just use a placeholder or 
        // maybe the user entity has a workspaceId if they are scoped.
        // Looking at `UserEntity`, it has `workspaceId`.

        return this.aiService.chat(user.id, user.workspaceId, body.messages);
    }

    @Post('chat/stream')
    async chatStream(@User() user: UserEntity, @Body() body: ChatRequestDto, @Res() res: Response) {
        const stream = await this.aiService.chatStream(user.id, user.workspaceId, body.messages);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        stream.pipe(res);
    }

    @Post('models')
    async getModels(@User() user: UserEntity) {
        return this.aiService.getModels(user.id, user.workspaceId);
    }
}
