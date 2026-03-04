import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';

export class FormFieldDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsString()
  type: string;

  @IsBoolean()
  required: boolean;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];
}
