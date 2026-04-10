import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAddendumDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpsertAddendumLineDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedHours: number = 0;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  billableRate: number = 0;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}
