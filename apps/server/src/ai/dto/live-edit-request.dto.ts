import { IsString, IsEnum, IsOptional, IsObject, IsNumber } from 'class-validator';

export enum LiveEditMode {
  INSERT = 'insert',
  REPLACE = 'replace',
  APPEND = 'append',
}

export class LiveEditRequestDto {
  @IsString()
  pageId: string;

  @IsString()
  content: string;

  @IsEnum(LiveEditMode)
  mode: LiveEditMode;

  @IsOptional()
  @IsObject()
  position?: {
    from: number;
    to: number;
  };

  @IsOptional()
  @IsNumber()
  typingSpeed?: number;
}

export class LiveEditResponseDto {
  success: boolean;
  operationId: string;
  message?: string;
}

export class CancelEditResponseDto {
  success: boolean;
  operationId: string;
}
