import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  IsBoolean,
} from 'class-validator';

export class CreatePtoPolicyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsPositive()
  maxDaysPerYear: number;

  @IsString()
  @IsOptional()
  accrualType?: string;

  @IsNumber()
  @IsOptional()
  carryoverMax?: number;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;
}

export class UpdatePtoPolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  maxDaysPerYear?: number;

  @IsString()
  @IsOptional()
  accrualType?: string;

  @IsNumber()
  @IsOptional()
  carryoverMax?: number;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;
}

export class CreatePtoRequestDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @IsPositive()
  hours: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  policyId?: string;
}

export class ReviewPtoRequestDto {
  @IsString()
  @IsNotEmpty()
  action: string; // 'APPROVE' | 'DENY'

  @IsString()
  @IsOptional()
  deniedReason?: string;
}
