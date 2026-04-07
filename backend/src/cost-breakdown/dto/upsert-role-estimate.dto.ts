import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertRoleEstimateDto {
  @IsString()
  role: string;

  @IsNumber()
  @Min(0)
  estimatedHours: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;
}
