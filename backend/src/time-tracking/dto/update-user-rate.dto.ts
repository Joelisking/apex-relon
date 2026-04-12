import { IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class UpdateUserRateDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  rate?: number;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string | null;
}
