import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class CreateTimeEntryDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  taskId?: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  billable?: boolean;

  @IsNumber()
  @IsOptional()
  hourlyRate?: number;

  @IsString()
  @IsOptional()
  source?: string;
}
