import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class GenerateProposalDto {
  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  costBreakdownId?: string;

  @IsString()
  @IsOptional()
  replaceProposalId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  totalAmount?: string;

  @IsString()
  @IsOptional()
  salutation?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

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

  @IsString()
  @IsOptional()
  suite?: string;

  @IsString()
  @IsOptional()
  timeline?: string;

  @IsString()
  @IsOptional()
  proposalDate?: string;

  @IsString()
  @IsOptional()
  projectName?: string;

  @IsString()
  @IsOptional()
  projectAddress?: string;

  @IsBoolean()
  @IsOptional()
  saveAddressToClient?: boolean;

  @IsObject()
  @IsOptional()
  dynamicValues?: Record<string, string>;

  @IsObject()
  @IsOptional()
  tableCellValues?: Record<string, string>;

  @IsObject()
  @IsOptional()
  paragraphOverrides?: Record<string, string>;
}
