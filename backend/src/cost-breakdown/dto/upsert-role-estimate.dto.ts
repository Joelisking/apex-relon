import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertRoleEstimateDto {
  @IsString()
  @IsNotEmpty()
  subtaskId: string;

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
