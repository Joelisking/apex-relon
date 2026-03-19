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

@Controller('time-tracking')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  // ─── Time Entries ─────────────────────────────────────────────────────────

  @Post('entries')
  createEntry(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTimeEntryDto) {
    // Always use the authenticated user's ID — ignore any client-supplied userId
    return this.timeTrackingService.createEntry({ ...dto, userId: user.id });
  }

  @Get('entries')
  getEntries(
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timeTrackingService.getEntries({
      userId,
      projectId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch('entries/:id')
  async updateEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTimeEntryDto>,
  ) {
    // Verify ownership — only the entry owner or admin/owner role can edit
    const entry = await this.timeTrackingService.getEntryById(id);
    if (entry.userId !== user.id && user.role !== 'owner' && user.role !== 'admin') {
      throw new ForbiddenException('You can only edit your own time entries');
    }
    // Strip userId from updates — cannot reassign entries
    const { userId: _, ...safeDto } = dto;
    return this.timeTrackingService.updateEntry(id, safeDto);
  }

  @Delete('entries/:id')
  @HttpCode(204)
  async deleteEntry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const entry = await this.timeTrackingService.getEntryById(id);
    if (entry.userId !== user.id && user.role !== 'owner' && user.role !== 'admin') {
      throw new ForbiddenException('You can only delete your own time entries');
    }
    return this.timeTrackingService.deleteEntry(id);
  }

  // ─── User Rates ───────────────────────────────────────────────────────────

  @Post('rates')
  createRate(@Body() dto: CreateUserRateDto) {
    return this.timeTrackingService.createRate(dto);
  }

  @Get('rates/:userId')
  getRates(@Param('userId') userId: string) {
    return this.timeTrackingService.getRatesForUser(userId);
  }

  // ─── Budgets ──────────────────────────────────────────────────────────────

  @Post('budgets')
  upsertBudget(@Body() dto: CreateProjectBudgetDto) {
    return this.timeTrackingService.upsertBudget(dto);
  }

  // ─── Summaries ────────────────────────────────────────────────────────────

  @Get('summary/project/:id')
  getProjectSummary(@Param('id') id: string) {
    return this.timeTrackingService.getProjectSummary(id);
  }

  @Get('summary/user/:id')
  getUserSummary(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeTrackingService.getUserSummary(id, startDate, endDate);
  }

  @Get('timesheet')
  getTimesheet(
    @Query('startDate') startDate: string,
    @Query('userId') userId?: string,
  ) {
    return this.timeTrackingService.getWeeklyTimesheet(startDate, userId);
  }
}
