export type WidgetType =
  | 'MetricCard'
  | 'AreaChart'
  | 'BarChart'
  | 'FunnelChart'
  | 'TaskList'
  | 'LeadsList'
  | 'AIPanel'
  | 'BottleneckWidget';

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

// Single source of truth for widget types.
// Add requiredPermissions here when adding a new widget type.
export const WIDGET_DEFINITIONS: Record<WidgetType, { label: string; requiredPermissions: string[] }> = {
  MetricCard: { label: 'Metric Card',   requiredPermissions: [] },  // gated per-metric
  AreaChart:  { label: 'Area Chart',    requiredPermissions: [] },  // gated per-metric
  BarChart:   { label: 'Bar Chart',     requiredPermissions: [] },  // gated per-metric
  FunnelChart:{ label: 'Funnel Chart',  requiredPermissions: ['leads:view'] },
  TaskList:   { label: 'Task List',     requiredPermissions: ['tasks:view'] },
  LeadsList:  { label: 'Prospective Projects List', requiredPermissions: ['leads:view'] },
  AIPanel:         { label: 'AI Panel',            requiredPermissions: ['reports:view', 'leads:view', 'clients:view'] },
  BottleneckWidget: { label: 'Bottleneck Analysis', requiredPermissions: ['bottleneck:view'] },
};

// Derived — no need to maintain separately
export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = Object.fromEntries(
  Object.entries(WIDGET_DEFINITIONS).map(([k, v]) => [k, v.label]),
) as Record<WidgetType, string>;

export const WIDGET_PERMISSION_MAP: Record<WidgetType, string[]> = Object.fromEntries(
  Object.entries(WIDGET_DEFINITIONS).map(([k, v]) => [k, v.requiredPermissions]),
) as Record<WidgetType, string[]>;

// Single source of truth for metrics.
// Add requiredPermissions here when adding a new metric.
export const AVAILABLE_METRICS = [
  { value: 'totalRevenue',    label: 'Total Revenue',       requiredPermissions: ['reports:view', 'clients:view'] },
  { value: 'monthlyRevenue',  label: 'Monthly Revenue',     requiredPermissions: ['reports:view', 'clients:view'] },
  { value: 'quarterlyRevenue',label: 'Quarterly Revenue',   requiredPermissions: ['reports:view', 'clients:view'] },
  { value: 'pipelineValue',   label: 'Pipeline Value',      requiredPermissions: ['leads:view'] },
  { value: 'totalLeads',      label: 'Total Prospective Projects', requiredPermissions: ['leads:view'] },
  { value: 'wonLeads',        label: 'Won Prospective Projects',  requiredPermissions: ['leads:view'] },
  { value: 'winRate',         label: 'Win Rate',            requiredPermissions: ['leads:view', 'clients:view'] },
  { value: 'avgDealSize',     label: 'Avg Deal Size',       requiredPermissions: ['leads:view'] },
  { value: 'activeClients',   label: 'Active Clients',      requiredPermissions: ['clients:view'] },
  { value: 'totalProjects',   label: 'Total Projects',      requiredPermissions: ['projects:view'] },
  { value: 'activeProjects',  label: 'Active Projects',     requiredPermissions: ['projects:view'] },
  { value: 'projectsAtRisk',  label: 'Projects at Risk',    requiredPermissions: ['projects:view'] },
  { value: 'revenueByClient', label: 'Revenue by Client',   requiredPermissions: ['reports:view', 'clients:view'] },
  { value: 'projectsByStatus',label: 'Projects by Status',  requiredPermissions: ['projects:view'] },
] as const;

// Derived — no need to maintain separately
export const METRIC_PERMISSION_MAP: Record<string, string[]> = Object.fromEntries(
  AVAILABLE_METRICS.map((m) => [m.value, [...m.requiredPermissions]]),
);
