import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDate,
  IsEmail,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  expectedValue: number;

  @IsString()
  @IsNotEmpty()
  stage: string;

  @IsString()
  @IsOptional()
  jobTypeId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  jobTypeIds?: string[];

  @IsString()
  @IsNotEmpty()
  urgency: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  likelyStartDate?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsOptional()
  projectName?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zip?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  contractedValue?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  county?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  teamMemberIds?: string[];
}
