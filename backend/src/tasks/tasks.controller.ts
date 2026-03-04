import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../permissions/permissions.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

interface CompleteTaskBody {
  completionNote: string;
}

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @Permissions('tasks:view')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('dueBefore') dueBefore?: string,
    @Query('dueAfter') dueAfter?: string,
  ) {
    const canViewAll = await this.permissionsService.hasPermission(
      user.role,
      'tasks:view_all',
    );
    return this.tasksService.findAll({
      userId: user.id,
      canViewAll,
      status,
      priority,
      entityType,
      entityId,
      assignedToId,
      dueBefore,
      dueAfter,
    });
  }

  @Get('summary')
  @Permissions('tasks:view')
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getMyTasksSummary(user.id);
  }

  @Get('team-summary')
  @Permissions('tasks:view')
  async getTeamSummary(@CurrentUser() user: AuthenticatedUser) {
    const viewAll = await this.permissionsService.hasPermission(user.role, 'tasks:view_all');
    return this.tasksService.getTeamSummary(user.id, viewAll);
  }

  @Get('entity/:entityType/:entityId')
  @Permissions('tasks:view')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.tasksService.findByEntity(entityType, entityId);
  }

  @Get(':id')
  @Permissions('tasks:view')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @Permissions('tasks:create')
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('tasks:edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.update(id, dto, user.id);
  }

  @Post(':id/complete')
  @Permissions('tasks:edit')
  complete(
    @Param('id') id: string,
    @Body() body: CompleteTaskBody,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.complete(id, body.completionNote, user.id);
  }

  @Delete(':id')
  @Permissions('tasks:delete')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
