import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
} from 'class-validator';

export enum CustomFieldEntityType {
  LEAD = 'LEAD',
  CLIENT = 'CLIENT',
  PROJECT = 'PROJECT',
}

export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  URL = 'URL',
}

export class CreateCustomFieldDefinitionDto {
  @IsEnum(CustomFieldEntityType)
  entityType: CustomFieldEntityType;

  @IsString()
  label: string;

  @IsString()
  fieldKey: string;

  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCustomFieldDefinitionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetCustomFieldValueDto {
  @IsString()
  definitionId: string;

  value: unknown; // JSON value — validated at service layer based on fieldType
}

export class BulkSetCustomFieldValuesDto {
  @IsArray()
  fields: SetCustomFieldValueDto[];
}
