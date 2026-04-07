import { IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateCostBreakdownLineDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedSubtaskIds?: string[];
}
