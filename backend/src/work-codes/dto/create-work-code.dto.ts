import { IsInt, IsString, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateWorkCodeDto {
  @IsInt()
  code: number;

  @IsString()
  name: string;

  @IsInt()
  division: number;

  @IsInt()
  @IsOptional()
  parentCode?: number;

  @IsBoolean()
  @IsOptional()
  isMainTask?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
