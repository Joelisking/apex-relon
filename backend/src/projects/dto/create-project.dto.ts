import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  contractedValue: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  endOfProjectValue?: number;

  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  completedDate?: Date;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  projectManagerId?: string;

  @IsString()
  @IsOptional()
  designerId?: string;

  @IsString()
  @IsOptional()
  qsId?: string;

  @IsOptional()
  @Type(() => Date)
  estimatedDueDate?: Date;

  @IsOptional()
  @Type(() => Date)
  closedDate?: Date;

  @IsString()
  @IsOptional()
  riskStatus?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estimatedRevenue?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  teamMemberIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serviceTypeIds?: string[];

  @IsString()
  @IsOptional()
  county?: string;
}
