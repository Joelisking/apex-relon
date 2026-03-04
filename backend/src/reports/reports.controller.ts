import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeadsReportingService } from './services/leads-reporting.service';
import { ProjectsReportingService } from './services/projects-reporting.service';
import { ClientsReportingService } from './services/clients-reporting.service';
import { RepsReportingService } from './services/reps-reporting.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { PermissionsService } from '../permissions/permissions.service';

interface AuthenticatedUser {
  id: string;
  role: string;
  email: string;
  teamId?: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private leadsReportingService: LeadsReportingService,
    private projectsReportingService: ProjectsReportingService,
    private clientsReportingService: ClientsReportingService,
    private repsReportingService: RepsReportingService,
    private permissionsService: PermissionsService,
  ) {}

  /** Enrich the authenticated user with a `canViewAll` flag derived from their permissions. */
  private async enrichUser(user: AuthenticatedUser) {
    const canViewAll = await this.permissionsService.hasPermission(
      user.role,
      'reports:view_all',
    );
    return { ...user, canViewAll };
  }

  // Leads Reports
  @Get('leads/overview')
  @Permissions('reports:view')
  async getLeadsOverview(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsReportingService.getOverview(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('leads/stage-analysis')
  @Permissions('reports:view')
  async getLeadsStageAnalysis(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsReportingService.getStageAnalysis(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('leads/conversion-funnel')
  @Permissions('reports:view')
  async getLeadsConversionFunnel(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsReportingService.getConversionFunnel(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('leads/revenue-by-rep')
  @Permissions('reports:view')
  async getLeadsRevenueByRep(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsReportingService.getRevenueByRep(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('leads/overdue')
  @Permissions('reports:view')
  async getLeadsOverdue(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsReportingService.getOverdueLeads(
      filters,
      await this.enrichUser(user),
    );
  }

  // Projects Reports
  @Get('projects/overview')
  @Permissions('reports:view')
  async getProjectsOverview(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsReportingService.getOverview(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('projects/profitability')
  @Permissions('reports:view')
  async getProjectsProfitability(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsReportingService.getProfitabilityData(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('projects/risk-distribution')
  @Permissions('reports:view')
  async getProjectsRiskDistribution(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsReportingService.getRiskDistribution(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('projects/cost-breakdown')
  @Permissions('reports:view')
  async getProjectsCostBreakdown(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsReportingService.getCostBreakdown(
      filters,
      await this.enrichUser(user),
    );
  }

  // Clients Reports
  @Get('clients/overview')
  @Permissions('reports:view')
  async getClientsOverview(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsReportingService.getOverview(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('clients/revenue-analysis')
  @Permissions('reports:view')
  async getClientsRevenueAnalysis(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsReportingService.getRevenueAnalysis(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('clients/health-trends')
  @Permissions('reports:view')
  async getClientsHealthTrends(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsReportingService.getHealthTrends(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('clients/retention-metrics')
  @Permissions('reports:view')
  async getClientsRetentionMetrics(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsReportingService.getRetentionMetrics(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('clients/engagement-trends')
  @Permissions('reports:view')
  async getClientsEngagementTrends(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsReportingService.getEngagementTrends(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('clients/health-score-trends')
  @Permissions('reports:view')
  async getClientsHealthScoreTrends(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsReportingService.getHealthScoreTrends(
      filters,
      await this.enrichUser(user),
    );
  }

  // Sales Reps Reports
  @Get('reps/overview')
  @Permissions('reports:view')
  async getRepsOverview(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repsReportingService.getOverview(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('reps/performance')
  @Permissions('reports:view')
  async getRepsPerformance(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repsReportingService.getPerformanceData(
      filters,
      await this.enrichUser(user),
    );
  }

  @Get('reps/stage-time')
  @Permissions('reports:view')
  async getRepsStageTime(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.repsReportingService.getStageTimeByRep(
      filters,
      await this.enrichUser(user),
    );
  }
}
