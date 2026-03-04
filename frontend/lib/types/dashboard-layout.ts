export type WidgetType =
  | 'MetricCard'
  | 'AreaChart'
  | 'BarChart'
  | 'FunnelChart'
  | 'TaskList'
  | 'LeadsList'
  | 'AIPanel';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
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

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  MetricCard: 'Metric Card',
  AreaChart: 'Area Chart',
  BarChart: 'Bar Chart',
  FunnelChart: 'Funnel Chart',
  TaskList: 'Task List',
  LeadsList: 'Leads List',
  AIPanel: 'AI Panel',
};

export const AVAILABLE_METRICS = [
  { value: 'totalRevenue', label: 'Total Revenue' },
  { value: 'monthlyRevenue', label: 'Monthly Revenue' },
  { value: 'quarterlyRevenue', label: 'Quarterly Revenue' },
  { value: 'pipelineValue', label: 'Pipeline Value' },
  { value: 'totalLeads', label: 'Total Leads' },
  { value: 'wonLeads', label: 'Won Leads' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'avgDealSize', label: 'Avg Deal Size' },
  { value: 'activeClients', label: 'Active Clients' },
  { value: 'totalProjects', label: 'Total Projects' },
  { value: 'activeProjects', label: 'Active Projects' },
  { value: 'projectsAtRisk', label: 'Projects at Risk' },
  { value: 'revenueByClient', label: 'Revenue by Client' },
  { value: 'projectsByStatus', label: 'Projects by Status' },
];
