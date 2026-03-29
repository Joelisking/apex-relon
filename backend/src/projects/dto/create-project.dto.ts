import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCostSegmentDto } from './create-cost-segment.dto';

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

  @IsString()
  @IsOptional()
  projectManagerId?: string;

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  county?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCostSegmentDto)
  @IsOptional()
  costSegments?: CreateCostSegmentDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  activeOptionalStages?: string[];
}
