import { IsString, IsOptional } from 'class-validator';

export class CreateProposalTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  jobTypeId?: string;
}
