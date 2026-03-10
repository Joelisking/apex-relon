import { IsString, IsNotEmpty } from 'class-validator';

export class CreateProjectAssignmentDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  role: string;
}
