import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AiService } from '../ai/ai.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private aiService: AiService,
    private permissionsService: PermissionsService,
  ) {}

  @Get('metrics')
  async getMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
  ) {
    const permissions = await this.permissionsService.getPermissionsForRole(user.role);
    return this.dashboardService.getMetrics(period, user.id, permissions);
  }

  @Get('executive-summary')
  async getExecutiveSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
  ) {
    const permissions = await this.permissionsService.getPermissionsForRole(user.role);
    const metrics = await this.dashboardService.getMetrics(period, user.id, permissions);
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
  async getRevenueBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
  ) {
    const permissions = await this.permissionsService.getPermissionsForRole(user.role);
    const metrics = await this.dashboardService.getMetrics(period, user.id, permissions);

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
  async getProjectAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
  ) {
    const permissions = await this.permissionsService.getPermissionsForRole(user.role);
    const metrics = await this.dashboardService.getMetrics(period, user.id, permissions);

    return {
      totalProjects: metrics.totalProjects,
      activeProjects: metrics.activeProjects,
      byStatus: metrics.projectsByStatus,
      atRisk: metrics.projectsAtRisk,
    };
  }

  @Get('revenue-trend')
  async getRevenueTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
  ) {
    const permissions = await this.permissionsService.getPermissionsForRole(user.role);
    return this.dashboardService.getRevenueTrend(period, user.id, permissions);
  }

  @Get('lead-volume-trend')
  async getLeadVolumeTrend(@CurrentUser() user: AuthenticatedUser) {
    const permissions = await this.permissionsService.getPermissionsForRole(user.role);
    return this.dashboardService.getLeadVolumeTrend(user.id, permissions);
  }

  @Get('pipeline-insights')
  async getPipelineInsights(@CurrentUser() user: AuthenticatedUser) {
    const permissions = await this.permissionsService.getPermissionsForRole(user.role);
    return this.dashboardService.getPipelineInsights(user.id, permissions);
  }
}
