import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../permissions/permissions.decorator';

interface AuthenticatedUser {
  id: string;
  role: string;
  email: string;
}
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateCostLogDto } from './dto/create-cost-log.dto';
import { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Permissions('projects:view')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.findAll(user?.id, user?.role);
  }

  @Post()
  @Permissions('projects:create')
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.create(createProjectDto, user?.id);
  }

  @Post('bulk-update')
  @Permissions('projects:edit')
  bulkUpdate(
    @Body() body: { ids: string[]; data: Record<string, unknown> },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.bulkUpdate(
      body.ids,
      body.data,
      user?.id,
      user?.role,
    );
  }

  @Post('bulk-delete')
  @Permissions('projects:delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.bulkDelete(body.ids, user?.id, user?.role);
  }

  @Get('client/:clientId')
  @Permissions('projects:view')
  findByClient(@Param('clientId') clientId: string) {
    return this.projectsService.findByClient(clientId);
  }

  @Get(':id')
  @Permissions('projects:view')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('projects:edit')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.update(
      id,
      updateProjectDto,
      user?.id,
    );
  }

  @Delete(':id')
  @Permissions('projects:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.remove(id, user?.id);
  }

  // --- Cost Logs ---

  @Get(':id/costs')
  @Permissions('costs:view')
  getCostLogs(@Param('id') id: string) {
    return this.projectsService.getCostLogs(id);
  }

  @Post(':id/costs')
  @Permissions('costs:create')
  addCostLog(
    @Param('id') id: string,
    @Body() dto: CreateCostLogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.addCostLog(id, dto, user?.id);
  }

  @Delete(':id/costs/:costId')
  @Permissions('costs:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCostLog(
    @Param('id') id: string,
    @Param('costId') costId: string,
  ) {
    return this.projectsService.removeCostLog(id, costId);
  }

  // --- Crew Assignments ---

  @Get(':id/assignments')
  @Permissions('projects:view')
  getAssignments(@Param('id') id: string) {
    return this.projectsService.getAssignments(id);
  }

  @Post(':id/assignments')
  @Permissions('projects:edit')
  addAssignment(
    @Param('id') id: string,
    @Body() dto: CreateProjectAssignmentDto,
  ) {
    return this.projectsService.addAssignment(id, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  @Permissions('projects:edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.projectsService.removeAssignment(id, assignmentId);
  }
}
