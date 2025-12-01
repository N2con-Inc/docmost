import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
    @IsString()
    @IsNotEmpty()
    role: 'system' | 'user' | 'assistant';

    @IsString()
    @IsNotEmpty()
    content: string;
}

export class ChatRequestDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatMessageDto)
    messages: ChatMessageDto[];
}
