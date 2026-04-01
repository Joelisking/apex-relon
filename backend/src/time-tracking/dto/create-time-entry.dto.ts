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
  // When the caller has time_tracking:enter_for_others, this sets the entry's owner
  @IsUUID()
  @IsOptional()
  targetUserId?: string;

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

  @IsUUID()
  @IsOptional()
  workCodeId?: string;

  @IsUUID()
  @IsOptional()
  serviceItemId?: string;

  @IsUUID()
  @IsOptional()
  serviceItemSubtaskId?: string;
}
