import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SearchRequestDto {
    @IsString()
    query: string;

    @IsNumber()
    @IsOptional()
    limit?: number;
}
