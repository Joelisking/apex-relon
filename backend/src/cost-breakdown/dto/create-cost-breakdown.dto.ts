import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCostBreakdownDto {
  @IsString()
  title: string;

  @IsUUID()
  @IsOptional()
  jobTypeId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;
}
