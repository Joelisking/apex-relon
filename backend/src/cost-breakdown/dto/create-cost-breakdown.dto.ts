import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCostBreakdownDto {
  @IsString()
  title: string;

  @IsUUID()
  @IsOptional()
  serviceTypeId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
