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
} from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { CreateUserRateDto } from './dto/create-user-rate.dto';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('time-tracking')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  // ─── Time Entries ─────────────────────────────────────────────────────────

  @Post('entries')
  createEntry(@Body() dto: CreateTimeEntryDto) {
    return this.timeTrackingService.createEntry(dto);
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
  updateEntry(@Param('id') id: string, @Body() dto: Partial<CreateTimeEntryDto>) {
    return this.timeTrackingService.updateEntry(id, dto);
  }

  @Delete('entries/:id')
  deleteEntry(@Param('id') id: string) {
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
