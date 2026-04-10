import { IsString, IsNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  mentionedIds?: string[];
}
