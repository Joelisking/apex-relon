import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface WidgetConfig {
  id: string;
  type:
    | 'MetricCard'
    | 'AreaChart'
    | 'BarChart'
    | 'FunnelChart'
    | 'TaskList'
    | 'LeadsList'
    | 'AIPanel';
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
    id: 'ceo-funnel',
    type: 'FunnelChart',
    position: { x: 0, y: 3 },
    size: { w: 6, h: 2 },
    config: { title: 'Pipeline Funnel' },
  },
  {
    id: 'ceo-top-clients',
    type: 'BarChart',
    position: { x: 6, y: 3 },
    size: { w: 6, h: 2 },
    config: {
      title: 'Top Clients by Revenue',
      metric: 'revenueByClient',
    },
  },
  {
    id: 'ceo-tasks',
    type: 'TaskList',
    position: { x: 0, y: 5 },
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
    id: 'admin-funnel',
    type: 'FunnelChart',
    position: { x: 0, y: 3 },
    size: { w: 6, h: 2 },
    config: { title: 'Pipeline Funnel' },
  },
  {
    id: 'admin-tasks',
    type: 'TaskList',
    position: { x: 6, y: 3 },
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
  QS: QS_LAYOUT,
  ADMIN: ADMIN_LAYOUT,
};

@Injectable()
export class DashboardLayoutService {
  constructor(private readonly prisma: PrismaService) {}

  getRoleDefaults(role: string): WidgetConfig[] {
    return ROLE_DEFAULTS[role] ?? DEFAULT_LAYOUT;
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

    return { widgets: this.getRoleDefaults(role), isDefault: true };
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
