import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsEnum(['CEO', 'ADMIN', 'BDM', 'SALES', 'DESIGNER', 'QS'])
  @IsOptional()
  role?: string;
}
