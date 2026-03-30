import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class GenerateProposalDto {
  @IsString()
  @IsOptional()
  quoteId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

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
}
