import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AiService } from '../ai/ai.service';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private aiService: AiService,
  ) {}

  @Get('metrics')
  @Permissions('dashboard:view')
  async getMetrics(
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
    @Query('executingCompany') executingCompany?: string,
  ) {
    return this.dashboardService.getMetrics(period, executingCompany || undefined);
  }

  @Get('executive-summary')
  @Permissions('dashboard:view')
  async getExecutiveSummary(
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
    @Query('executingCompany') executingCompany?: string,
  ) {
    const metrics = await this.dashboardService.getMetrics(period, executingCompany || undefined);
    // Provider resolved from DB settings (executiveSummary override → default → env)
    const summary = await this.aiService.generateExecutiveSummary(
      metrics as unknown as Record<string, unknown>,
    );

    return {
      period,
      generatedAt: new Date().toISOString(),
      summary,
      metrics: {
        totalRevenue: metrics.totalRevenue,
        pipelineValue: metrics.pipelineValue,
        winRate: metrics.winRate,
        activeClients: metrics.activeClients,
        activeProjects: metrics.activeProjects,
      },
    };
  }

  @Get('revenue-breakdown')
  @Permissions('dashboard:view')
  async getRevenueBreakdown(
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
    @Query('executingCompany') executingCompany?: string,
  ) {
    const metrics = await this.dashboardService.getMetrics(period, executingCompany || undefined);

    return {
      totalRevenue: metrics.totalRevenue,
      monthlyRevenue: metrics.monthlyRevenue,
      quarterlyRevenue: metrics.quarterlyRevenue,
      byClient: metrics.revenueByClient.slice(0, 10),
      byProject: metrics.revenueByProject.slice(0, 10),
      concentration: metrics.revenueConcentration,
    };
  }

  @Get('project-analytics')
  @Permissions('dashboard:view')
  async getProjectAnalytics(
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
    @Query('executingCompany') executingCompany?: string,
  ) {
    const metrics = await this.dashboardService.getMetrics(period, executingCompany || undefined);

    return {
      totalProjects: metrics.totalProjects,
      activeProjects: metrics.activeProjects,
      byStatus: metrics.projectsByStatus,
      atRisk: metrics.projectsAtRisk,
    };
  }

  @Get('revenue-trend')
  @Permissions('dashboard:view')
  getRevenueTrend(
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
  ) {
    return this.dashboardService.getRevenueTrend(period);
  }

  @Get('lead-volume-trend')
  @Permissions('dashboard:view')
  getLeadVolumeTrend() {
    return this.dashboardService.getLeadVolumeTrend();
  }

  @Get('pipeline-insights')
  @Permissions('dashboard:view')
  getPipelineInsights() {
    return this.dashboardService.getPipelineInsights();
  }
}
