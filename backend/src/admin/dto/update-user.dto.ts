import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsEnum(['Active', 'Inactive', 'Suspended'])
  status?: string;

  @IsOptional()
  @IsEnum(['CEO', 'ADMIN', 'BDM', 'SALES', 'DESIGNER', 'QS'])
  role?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}
