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
    );
  }

  @Post('bulk-delete')
  @Permissions('projects:delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.bulkDelete(body.ids, user?.id);
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

  @Post('convert-lead/:leadId')
  @Permissions('projects:create')
  convertLead(
    @Param('leadId') leadId: string,
    @Body() body: { clientId: string; projectManagerId?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.convertLead(
      leadId,
      body.clientId,
      body.projectManagerId,
      user?.id,
    );
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
}
