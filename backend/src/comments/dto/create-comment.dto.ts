import { IsString, IsNotEmpty, IsArray, IsOptional, IsUUID, IsIn } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  mentionedIds?: string[];

  @IsString()
  @IsIn(['TEAM', 'PRIVATE'])
  @IsOptional()
  visibility?: string;
}
