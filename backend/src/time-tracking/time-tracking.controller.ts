import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { CreateUserRateDto } from './dto/create-user-rate.dto';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Permissions } from '../permissions/permissions.decorator';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('time-tracking')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(
    private readonly timeTrackingService: TimeTrackingService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // ─── Time Entries ─────────────────────────────────────────────────────────

  @Post('entries')
  @Permissions('time_tracking:create')
  createEntry(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTimeEntryDto) {
    // Always use the authenticated user's ID — ignore any client-supplied userId
    return this.timeTrackingService.createEntry({ ...dto, userId: user.id });
  }

  @Get('entries')
  @Permissions('time_tracking:view')
  async getEntries(
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    // P0-5: Restrict userId param — only time_tracking:manage_all can query other users
    const canManageAll = await this.permissionsService.hasPermission(user.role, 'time_tracking:manage_all');
    const effectiveUserId = canManageAll ? userId : user.id;

    return this.timeTrackingService.getEntries({
      userId: effectiveUserId,
      projectId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch('entries/:id')
  @Permissions('time_tracking:edit')
  async updateEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTimeEntryDto>,
  ) {
    // Strictly own-only — nobody can edit another person's time entries
    const entry = await this.timeTrackingService.getEntryById(id);
    if (entry.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own time entries');
    }
    // Strip userId from updates — cannot reassign entries
    const { userId: _, ...safeDto } = dto;
    return this.timeTrackingService.updateEntry(id, safeDto);
  }

  @Delete('entries/:id')
  @HttpCode(204)
  @Permissions('time_tracking:edit')
  async deleteEntry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    // Strictly own-only — nobody can delete another person's time entries
    const entry = await this.timeTrackingService.getEntryById(id);
    if (entry.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own time entries');
    }
    return this.timeTrackingService.deleteEntry(id);
  }

  // ─── User Rates ───────────────────────────────────────────────────────────

  @Post('rates')
  @Permissions('time_tracking:create')
  createRate(@Body() dto: CreateUserRateDto) {
    return this.timeTrackingService.createRate(dto);
  }

  @Get('rates/:userId')
  @Permissions('time_tracking:view')
  getRates(@Param('userId') userId: string) {
    return this.timeTrackingService.getRatesForUser(userId);
  }

  // ─── Budgets ──────────────────────────────────────────────────────────────

  @Post('budgets')
  @Permissions('time_tracking:create')
  upsertBudget(@Body() dto: CreateProjectBudgetDto) {
    return this.timeTrackingService.upsertBudget(dto);
  }

  // ─── Summaries ────────────────────────────────────────────────────────────

  @Get('summary/project/:id')
  @Permissions('time_tracking:view')
  getProjectSummary(@Param('id') id: string) {
    return this.timeTrackingService.getProjectSummary(id);
  }

  @Get('summary/user/:id')
  @Permissions('time_tracking:view')
  getUserSummary(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeTrackingService.getUserSummary(id, startDate, endDate);
  }

  @Get('timesheet')
  @Permissions('time_tracking:view')
  getTimesheet(
    @Query('startDate') startDate: string,
    @Query('userId') userId?: string,
  ) {
    return this.timeTrackingService.getWeeklyTimesheet(startDate, userId);
  }
}
