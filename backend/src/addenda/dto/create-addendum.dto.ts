import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAddendumLineDto {
  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  serviceItemId?: string;

  @IsString()
  @IsOptional()
  serviceItemSubtaskId?: string;

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

export class CreateAddendumDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAddendumLineDto)
  @IsOptional()
  lines?: CreateAddendumLineDto[];
}
