import { IsString, IsOptional, IsNumber, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCostBreakdownDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @ValidateIf((o) => o.mileageQty !== null)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  mileageQty?: number | null;

  @ValidateIf((o) => o.mileageRate !== null)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  mileageRate?: number | null;

  @ValidateIf((o) => o.lodgingQty !== null)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lodgingQty?: number | null;

  @ValidateIf((o) => o.lodgingRate !== null)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lodgingRate?: number | null;

  @ValidateIf((o) => o.perDiemQty !== null)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  perDiemQty?: number | null;

  @ValidateIf((o) => o.perDiemRate !== null)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  perDiemRate?: number | null;

  @ValidateIf((o) => o.roundedFee !== null)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  roundedFee?: number | null;

  @IsString()
  @IsOptional()
  projectId?: string;
}
