import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class BulkAssignTasksDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  taskIds: string[];

  @IsString()
  assignedToId: string;
}
