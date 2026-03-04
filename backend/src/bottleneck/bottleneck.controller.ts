import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BottleneckService, StageDwellResult, TaskVelocityResult, OverdueResult } from './bottleneck.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics/bottleneck')
@UseGuards(JwtAuthGuard)
export class BottleneckController {
  constructor(private readonly bottleneckService: BottleneckService) {}

  @Get('stage-dwell')
  getStageDwell(): Promise<StageDwellResult[]> {
    return this.bottleneckService.getStageDwellTime();
  }

  @Get('task-velocity')
  getTaskVelocity(@Query('days') days?: string): Promise<TaskVelocityResult[]> {
    return this.bottleneckService.getTaskVelocity(days ? parseInt(days, 10) : 30);
  }

  @Get('overdue')
  getOverdue(): Promise<OverdueResult[]> {
    return this.bottleneckService.getOverdueBreakdown();
  }

  @Get('stuck-projects')
  getStuckProjects(@Query('threshold') threshold?: string) {
    return this.bottleneckService.getStuckProjects(
      threshold ? parseInt(threshold, 10) : 14,
    );
  }

  @Post('ai-report')
  generateAiReport() {
    return this.bottleneckService.generateAiReport();
  }

  @Get('ai-report/latest')
  getLatestReport() {
    return this.bottleneckService.getLatestAiReport();
  }
}
