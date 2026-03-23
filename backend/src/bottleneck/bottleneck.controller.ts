import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BottleneckService, StageDwellResult, TaskVelocityResult, OverdueResult, WidgetSummaryResult } from './bottleneck.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('analytics/bottleneck')
@UseGuards(JwtAuthGuard)
export class BottleneckController {
  constructor(private readonly bottleneckService: BottleneckService) {}

  @Get('stage-dwell')
  @Permissions('bottleneck:view')
  getStageDwell(): Promise<StageDwellResult[]> {
    return this.bottleneckService.getStageDwellTime();
  }

  @Get('task-velocity')
  @Permissions('bottleneck:view')
  getTaskVelocity(@Query('days') days?: string): Promise<TaskVelocityResult[]> {
    return this.bottleneckService.getTaskVelocity(days ? parseInt(days, 10) : 30);
  }

  @Get('overdue')
  @Permissions('bottleneck:view')
  getOverdue(): Promise<OverdueResult[]> {
    return this.bottleneckService.getOverdueBreakdown();
  }

  @Get('stuck-projects')
  @Permissions('bottleneck:view')
  getStuckProjects(@Query('threshold') threshold?: string) {
    return this.bottleneckService.getStuckProjects(
      threshold ? parseInt(threshold, 10) : 14,
    );
  }

  @Get('widget-summary')
  @Permissions('bottleneck:view')
  getWidgetSummary(): Promise<WidgetSummaryResult> {
    return this.bottleneckService.getWidgetSummary();
  }

  @Post('ai-report')
  @Permissions('reports:view')
  generateAiReport() {
    return this.bottleneckService.generateAiReport();
  }

  @Get('ai-report/latest')
  @Permissions('bottleneck:view')
  getLatestReport() {
    return this.bottleneckService.getLatestAiReport();
  }
}
