import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { ConfigModule } from '@nestjs/config';
import { WorkspacesModule } from '../core/workspaces/workspaces.module';

@Module({
    imports: [ConfigModule, WorkspacesModule],
    controllers: [AIController],
    providers: [AIService],
    exports: [AIService],
})
export class AIModule { }
