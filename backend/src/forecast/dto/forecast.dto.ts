import { IsInt, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertForecastTargetDto {
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @IsInt()
  @Min(2020)
  @Type(() => Number)
  year: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  targetAmount: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
