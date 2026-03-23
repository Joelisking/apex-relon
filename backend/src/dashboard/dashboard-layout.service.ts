import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

export interface WidgetConfig {
  id: string;
  type:
    | 'MetricCard'
    | 'AreaChart'
    | 'BarChart'
    | 'FunnelChart'
    | 'TaskList'
    | 'LeadsList'
    | 'AIPanel'
    | 'BottleneckWidget';
  position: { x: number; y: number };
  size: { w: number; h: number };
  config: {
    title?: string;
    metric?: string;
    dateRange?: string;
    groupBy?: string;
    filters?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

const CEO_LAYOUT: WidgetConfig[] = [
  {
    id: 'ceo-revenue',
    type: 'MetricCard',
    position: { x: 0, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Total Revenue', metric: 'totalRevenue' },
  },
  {
    id: 'ceo-pipeline',
    type: 'MetricCard',
    position: { x: 3, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Pipeline Value', metric: 'pipelineValue' },
  },
  {
    id: 'ceo-clients',
    type: 'MetricCard',
    position: { x: 6, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Active Clients', metric: 'activeClients' },
  },
  {
    id: 'ceo-winrate',
    type: 'MetricCard',
    position: { x: 9, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Win Rate', metric: 'winRate' },
  },
  {
    id: 'ceo-revenue-chart',
    type: 'AreaChart',
    position: { x: 0, y: 1 },
    size: { w: 8, h: 2 },
    config: { title: 'Revenue Trend', metric: 'monthlyRevenue' },
  },
  {
    id: 'ceo-ai-summary',
    type: 'AIPanel',
    position: { x: 8, y: 1 },
    size: { w: 4, h: 2 },
    config: { title: 'AI Executive Summary' },
  },
  {
    id: 'ceo-bottleneck',
    type: 'BottleneckWidget',
    position: { x: 0, y: 3 },
    size: { w: 12, h: 3 },
    config: { title: 'Bottleneck Analysis' },
  },
  {
    id: 'ceo-funnel',
    type: 'FunnelChart',
    position: { x: 0, y: 6 },
    size: { w: 6, h: 2 },
    config: { title: 'Pipeline Funnel' },
  },
  {
    id: 'ceo-top-clients',
    type: 'BarChart',
    position: { x: 6, y: 6 },
    size: { w: 6, h: 2 },
    config: {
      title: 'Top Clients by Revenue',
      metric: 'revenueByClient',
    },
  },
  {
    id: 'ceo-tasks',
    type: 'TaskList',
    position: { x: 0, y: 8 },
    size: { w: 12, h: 2 },
    config: { title: 'My Tasks' },
  },
];

const BDM_LAYOUT: WidgetConfig[] = [
  {
    id: 'bdm-pipeline',
    type: 'MetricCard',
    position: { x: 0, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Pipeline Value', metric: 'pipelineValue' },
  },
  {
    id: 'bdm-leads',
    type: 'MetricCard',
    position: { x: 3, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Active Leads', metric: 'totalLeads' },
  },
  {
    id: 'bdm-winrate',
    type: 'MetricCard',
    position: { x: 6, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Win Rate', metric: 'winRate' },
  },
  {
    id: 'bdm-avgdeal',
    type: 'MetricCard',
    position: { x: 9, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Avg Deal Size', metric: 'avgDealSize' },
  },
  {
    id: 'bdm-funnel',
    type: 'FunnelChart',
    position: { x: 0, y: 1 },
    size: { w: 6, h: 3 },
    config: { title: 'Pipeline Funnel' },
  },
  {
    id: 'bdm-leads-list',
    type: 'LeadsList',
    position: { x: 6, y: 1 },
    size: { w: 6, h: 3 },
    config: { title: 'Hot Leads' },
  },
  {
    id: 'bdm-tasks',
    type: 'TaskList',
    position: { x: 0, y: 4 },
    size: { w: 12, h: 2 },
    config: { title: 'My Tasks' },
  },
];

const QS_LAYOUT: WidgetConfig[] = [
  {
    id: 'qs-projects',
    type: 'MetricCard',
    position: { x: 0, y: 0 },
    size: { w: 4, h: 1 },
    config: { title: 'Active Projects', metric: 'activeProjects' },
  },
  {
    id: 'qs-atrisk',
    type: 'MetricCard',
    position: { x: 4, y: 0 },
    size: { w: 4, h: 1 },
    config: { title: 'At-Risk Projects', metric: 'projectsAtRisk' },
  },
  {
    id: 'qs-revenue',
    type: 'MetricCard',
    position: { x: 8, y: 0 },
    size: { w: 4, h: 1 },
    config: { title: 'Total Revenue', metric: 'totalRevenue' },
  },
  {
    id: 'qs-status-chart',
    type: 'BarChart',
    position: { x: 0, y: 1 },
    size: { w: 6, h: 3 },
    config: {
      title: 'Projects by Status',
      metric: 'projectsByStatus',
    },
  },
  {
    id: 'qs-tasks',
    type: 'TaskList',
    position: { x: 6, y: 1 },
    size: { w: 6, h: 3 },
    config: { title: 'My Tasks' },
  },
];

const ADMIN_LAYOUT: WidgetConfig[] = [
  {
    id: 'admin-revenue',
    type: 'MetricCard',
    position: { x: 0, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Total Revenue', metric: 'totalRevenue' },
  },
  {
    id: 'admin-pipeline',
    type: 'MetricCard',
    position: { x: 3, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Pipeline Value', metric: 'pipelineValue' },
  },
  {
    id: 'admin-projects',
    type: 'MetricCard',
    position: { x: 6, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Active Projects', metric: 'activeProjects' },
  },
  {
    id: 'admin-clients',
    type: 'MetricCard',
    position: { x: 9, y: 0 },
    size: { w: 3, h: 1 },
    config: { title: 'Active Clients', metric: 'activeClients' },
  },
  {
    id: 'admin-revenue-chart',
    type: 'AreaChart',
    position: { x: 0, y: 1 },
    size: { w: 12, h: 2 },
    config: { title: 'Revenue Trend', metric: 'monthlyRevenue' },
  },
  {
    id: 'admin-bottleneck',
    type: 'BottleneckWidget',
    position: { x: 0, y: 3 },
    size: { w: 12, h: 3 },
    config: { title: 'Bottleneck Analysis' },
  },
  {
    id: 'admin-funnel',
    type: 'FunnelChart',
    position: { x: 0, y: 6 },
    size: { w: 6, h: 2 },
    config: { title: 'Pipeline Funnel' },
  },
  {
    id: 'admin-tasks',
    type: 'TaskList',
    position: { x: 6, y: 6 },
    size: { w: 6, h: 2 },
    config: { title: 'My Tasks' },
  },
];

const DEFAULT_LAYOUT: WidgetConfig[] = [
  {
    id: 'default-pipeline',
    type: 'MetricCard',
    position: { x: 0, y: 0 },
    size: { w: 4, h: 1 },
    config: { title: 'Pipeline Value', metric: 'pipelineValue' },
  },
  {
    id: 'default-leads',
    type: 'MetricCard',
    position: { x: 4, y: 0 },
    size: { w: 4, h: 1 },
    config: { title: 'Active Leads', metric: 'totalLeads' },
  },
  {
    id: 'default-projects',
    type: 'MetricCard',
    position: { x: 8, y: 0 },
    size: { w: 4, h: 1 },
    config: { title: 'Active Projects', metric: 'activeProjects' },
  },
  {
    id: 'default-tasks',
    type: 'TaskList',
    position: { x: 0, y: 1 },
    size: { w: 6, h: 3 },
    config: { title: 'My Tasks' },
  },
  {
    id: 'default-leads-list',
    type: 'LeadsList',
    position: { x: 6, y: 1 },
    size: { w: 6, h: 3 },
    config: { title: 'Recent Leads' },
  },
];

const ROLE_DEFAULTS: Record<string, WidgetConfig[]> = {
  CEO: CEO_LAYOUT,
  BDM: BDM_LAYOUT,
  SALES: BDM_LAYOUT,
  QS: QS_LAYOUT,
  ADMIN: ADMIN_LAYOUT,
};

@Injectable()
export class DashboardLayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getRoleDefaults(role: string): Promise<WidgetConfig[]> {
    if (ROLE_DEFAULTS[role]) return ROLE_DEFAULTS[role];
    // Dynamic generation for custom roles based on their permissions
    const permissions = await this.permissionsService.getPermissionsForRole(role);
    return this.buildLayoutFromPermissions(new Set(permissions));
  }

  private buildLayoutFromPermissions(perms: Set<string>): WidgetConfig[] {
    const widgets: WidgetConfig[] = [];
    const has = (p: string) => perms.has(p);

    // Row 0: metric cards (up to 4, 3 cols each)
    const metricCards: WidgetConfig[] = [];
    if (has('reports:view')) {
      metricCards.push({
        id: 'dyn-revenue',
        type: 'MetricCard',
        position: { x: metricCards.length * 3, y: 0 },
        size: { w: 3, h: 1 },
        config: { title: 'Total Revenue', metric: 'totalRevenue' },
      });
    }
    if (has('leads:view')) {
      metricCards.push({
        id: 'dyn-pipeline',
        type: 'MetricCard',
        position: { x: metricCards.length * 3, y: 0 },
        size: { w: 3, h: 1 },
        config: { title: 'Pipeline Value', metric: 'pipelineValue' },
      });
      metricCards.push({
        id: 'dyn-winrate',
        type: 'MetricCard',
        position: { x: metricCards.length * 3, y: 0 },
        size: { w: 3, h: 1 },
        config: { title: 'Win Rate', metric: 'winRate' },
      });
    }
    if (has('projects:view')) {
      metricCards.push({
        id: 'dyn-projects',
        type: 'MetricCard',
        position: { x: metricCards.length * 3, y: 0 },
        size: { w: 3, h: 1 },
        config: { title: 'Active Projects', metric: 'activeProjects' },
      });
    }
    if (has('clients:view') && metricCards.length < 4) {
      metricCards.push({
        id: 'dyn-clients',
        type: 'MetricCard',
        position: { x: metricCards.length * 3, y: 0 },
        size: { w: 3, h: 1 },
        config: { title: 'Active Clients', metric: 'activeClients' },
      });
    }
    widgets.push(...metricCards.slice(0, 4));

    // Row 1+: larger content widgets
    let yPos = metricCards.length > 0 ? 1 : 0;

    if (has('leads:view')) {
      widgets.push({
        id: 'dyn-funnel',
        type: 'FunnelChart',
        position: { x: 0, y: yPos },
        size: { w: 6, h: 3 },
        config: { title: 'Pipeline Funnel' },
      });
      widgets.push({
        id: 'dyn-leads-list',
        type: 'LeadsList',
        position: { x: 6, y: yPos },
        size: { w: 6, h: 3 },
        config: { title: 'Recent Leads' },
      });
      yPos += 3;
    } else if (has('projects:view')) {
      widgets.push({
        id: 'dyn-projects-chart',
        type: 'BarChart',
        position: { x: 0, y: yPos },
        size: { w: 6, h: 3 },
        config: { title: 'Projects by Status', metric: 'projectsByStatus' },
      });
      yPos += 3;
    }

    if (has('tasks:view')) {
      widgets.push({
        id: 'dyn-tasks',
        type: 'TaskList',
        position: { x: has('leads:view') || has('projects:view') ? 0 : 0, y: yPos },
        size: { w: 12, h: 2 },
        config: { title: 'My Tasks' },
      });
    }

    return widgets.length > 0 ? widgets : DEFAULT_LAYOUT;
  }

  async getLayout(
    userId: string,
    role: string,
  ): Promise<{ widgets: WidgetConfig[]; isDefault: boolean }> {
    const record = await this.prisma.dashboardLayout.findUnique({
      where: { userId },
    });

    if (record) {
      return {
        widgets: record.widgets as unknown as WidgetConfig[],
        isDefault: false,
      };
    }

    return { widgets: await this.getRoleDefaults(role), isDefault: true };
  }

  async saveLayout(
    userId: string,
    widgets: WidgetConfig[],
  ): Promise<{ widgets: WidgetConfig[] }> {
    const record = await this.prisma.dashboardLayout.upsert({
      where: { userId },
      update: { widgets: widgets as any },
      create: { userId, widgets: widgets as any },
    });

    return { widgets: record.widgets as unknown as WidgetConfig[] };
  }

  async resetLayout(userId: string): Promise<void> {
    await this.prisma.dashboardLayout.deleteMany({
      where: { userId },
    });
  }
}
