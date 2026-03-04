import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('leads/:leadId/activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Post()
  @Permissions('leads:edit')
  async createActivity(
    @Param('leadId') leadId: string,
    @Request() req,
    @Body() createActivityDto: CreateActivityDto,
  ) {
    return this.activitiesService.createActivity(
      leadId,
      req.user.id,
      createActivityDto,
    );
  }

  @Get()
  @Permissions('leads:view')
  async getActivities(@Param('leadId') leadId: string) {
    return this.activitiesService.getActivitiesByLead(leadId);
  }

  @Delete(':activityId')
  @Permissions('leads:edit')
  async deleteActivity(
    @Param('activityId') activityId: string,
    @Request() req,
  ) {
    return this.activitiesService.deleteActivity(
      activityId,
      req.user.id,
    );
  }
}

@Controller('clients/:clientId/activities')
@UseGuards(JwtAuthGuard)
export class ClientActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Post()
  @Permissions('clients:edit')
  async createActivity(
    @Param('clientId') clientId: string,
    @Request() req,
    @Body() createActivityDto: CreateActivityDto,
  ) {
    return this.activitiesService.createActivityForClient(
      clientId,
      req.user.id,
      createActivityDto,
    );
  }

  @Get()
  @Permissions('clients:view')
  async getActivities(@Param('clientId') clientId: string) {
    return this.activitiesService.getActivitiesByClient(clientId);
  }

  @Delete(':activityId')
  @Permissions('clients:edit')
  async deleteActivity(
    @Param('activityId') activityId: string,
    @Request() req,
  ) {
    return this.activitiesService.deleteActivity(
      activityId,
      req.user.id,
    );
  }
}

@Controller('projects/:projectId/activities')
@UseGuards(JwtAuthGuard)
export class ProjectActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Post()
  @Permissions('projects:edit')
  async createActivity(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body() createActivityDto: CreateActivityDto,
  ) {
    return this.activitiesService.createActivityForProject(
      projectId,
      req.user.id,
      createActivityDto,
    );
  }

  @Get()
  @Permissions('projects:view')
  async getActivities(@Param('projectId') projectId: string) {
    return this.activitiesService.getActivitiesByProject(projectId);
  }

  @Delete(':activityId')
  @Permissions('projects:edit')
  async deleteActivity(
    @Param('activityId') activityId: string,
    @Request() req,
  ) {
    return this.activitiesService.deleteActivity(
      activityId,
      req.user.id,
    );
  }
}
