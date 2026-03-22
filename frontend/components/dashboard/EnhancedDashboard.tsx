'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { settingsApi } from '@/lib/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  BrainCircuit,
  Wand2,
  Lightbulb,
  Loader2,
  AlertTriangle,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  ListTodo,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
// Loader2 kept for the AI button loading state
import {
  dashboardApi,
  type DashboardMetrics,
  type ExecutiveSummaryResponse,
  type PipelineInsights,
} from '@/lib/api/dashboard';
import { tasksApi } from '@/lib/api/tasks-client';
import { ForecastPanel } from '@/components/dashboard/ForecastPanel';
import { toast } from 'sonner';
import type { Task, TaskSummary } from '@/lib/types';

interface EnhancedDashboardProps {
  initialPeriod?: 'week' | 'month' | 'quarter';
}

// ── Priority badge colours ─────────────────────────────────────────────────
const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'text-red-700 bg-red-50 border-red-200',
  HIGH: 'text-orange-700 bg-orange-50 border-orange-200',
  MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
  LOW: 'text-muted-foreground bg-muted border-border/60',
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'due today';
  if (diffDays === 1) return 'due tomorrow';
  return `due in ${diffDays}d`;
}

function MyTasksWidget() {
  const { data: summary, isLoading: summaryLoading } =
    useQuery<TaskSummary>({
      queryKey: ['tasks-summary'],
      queryFn: () => tasksApi.getSummary(),
      staleTime: 2 * 60 * 1000,
    });

  // Fetch overdue + due today tasks (dueBefore = tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueBefore = tomorrow.toISOString().split('T')[0];

  const { data: urgentTasks = [], isLoading: tasksLoading } =
    useQuery<Task[]>({
      queryKey: ['tasks-urgent', dueBefore],
      queryFn: () => tasksApi.getAll({ status: 'OPEN', dueBefore }),
      staleTime: 2 * 60 * 1000,
    });

  const isLoading = summaryLoading || tasksLoading;
  const displayTasks = urgentTasks.slice(0, 5);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border/40">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/60">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card px-4 py-3 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
        <div className="divide-y divide-border/40">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 flex items-center gap-3">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statsBar = [
    {
      label: 'Overdue',
      value: summary?.overdue ?? 0,
      valueClass: 'text-destructive',
    },
    {
      label: 'Due Today',
      value: summary?.dueToday ?? 0,
      valueClass: 'text-amber-600',
    },
    {
      label: 'Upcoming',
      value: summary?.upcoming ?? 0,
      valueClass: 'text-foreground',
    },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">My Tasks</span>
        </div>
        <a
          href="/tasks"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          View all
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px bg-border/60">
        {statsBar.map((stat) => (
          <div
            key={stat.label}
            className="relative bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-1">
              {stat.label}
            </p>
            <p
              className={cn(
                'text-[22px] font-bold tabular-nums leading-none',
                stat.valueClass,
              )}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Task list */}
      {displayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            You&apos;re all caught up!
          </p>
        </div>
      ) : (
        <div>
          {displayTasks.map((task) => {
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date();
            const relDate = task.dueDate
              ? formatRelativeDate(task.dueDate)
              : null;

            return (
              <div
                key={task.id}
                className="px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-snug truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {relDate && (
                      <span
                        className={cn(
                          'text-[11px] tabular-nums',
                          isOverdue
                            ? 'text-destructive font-medium'
                            : 'text-amber-600',
                        )}>
                        {relDate}
                      </span>
                    )}
                    {task.entityType && task.entityId && (
                      <span className="text-[11px] text-muted-foreground">
                        {task.entityType.charAt(0) +
                          task.entityType.slice(1).toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium shrink-0 mt-0.5',
                    PRIORITY_BADGE[task.priority] ??
                      PRIORITY_BADGE.LOW,
                  )}>
                  {task.priority.charAt(0) +
                    task.priority.slice(1).toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EnhancedDashboard({
  initialPeriod = 'month',
}: EnhancedDashboardProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>(
    initialPeriod,
  );
  const [aiSummary, setAiSummary] =
    useState<ExecutiveSummaryResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [pipelineInsights, setPipelineInsights] =
    useState<PipelineInsights | null>(null);
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [pipelineExpanded, setPipelineExpanded] = useState(false);

  const {
    data: metrics,
    isLoading,
    isFetching,
    error,
  } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics', period],
    queryFn: () =>
      dashboardApi.getMetrics(period),
    staleTime: 5 * 60 * 1000, // 5 minutes — dashboard data doesn't change second-to-second
    placeholderData: keepPreviousData, // show previous period's data while new period loads
  });

  const { data: revenueTrend = [] } = useQuery({
    queryKey: ['dashboard-revenue-trend'],
    queryFn: () => dashboardApi.getRevenueTrend(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: leadVolumeTrend = [] } = useQuery({
    queryKey: ['dashboard-lead-volume-trend'],
    queryFn: () => dashboardApi.getLeadVolumeTrend(),
    staleTime: 10 * 60 * 1000,
  });

  const handleGenerateInsight = async () => {
    if (!metrics) return;
    try {
      setLoadingAI(true);
      const summary = await dashboardApi.getExecutiveSummary(period);
      setAiSummary(summary);
      toast.success('AI executive summary generated');
    } catch (error) {
      toast.error('Failed to generate AI summary', {
        description:
          error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleGeneratePipelineInsights = async () => {
    setLoadingPipeline(true);
    try {
      const insights = await dashboardApi.getPipelineInsights();
      setPipelineInsights(insights);
      setPipelineExpanded(true);
      toast.success('Pipeline insights generated');
    } catch {
      toast.error('Failed to generate pipeline insights');
    } finally {
      setLoadingPipeline(false);
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Time metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-6 w-6 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Charts */}
        <div className="grid gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-52" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-75 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Bottom cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <Skeleton
                    key={j}
                    className="h-14 w-full rounded-lg"
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    toast.error('Failed to load dashboard metrics');
  }

  const metricsCards = [
    {
      label: 'Total Revenue',
      value: `$${(metrics.totalRevenue / 1000).toFixed(0)}k`,
      change:
        period === 'month'
          ? `$${(metrics.monthlyRevenue / 1000).toFixed(0)}k this month`
          : `$${(metrics.quarterlyRevenue / 1000).toFixed(0)}k this quarter`,
    },
    {
      label: 'Win Rate',
      value: `${metrics.winRate}%`,
      change: `${metrics.wonLeads}/${metrics.wonLeads + metrics.lostLeads} deals closed`,
    },
    {
      label: 'Active Projects',
      value: metrics.activeProjects.toString(),
      change: `${metrics.projectsAtRisk.length} at risk`,
    },
  ];

  const timeMetrics = [
    {
      label: 'Avg Time to Quote',
      value: `${metrics.avgTimeToQuote} days`,
    },
    {
      label: 'Avg Time to Close',
      value: `${metrics.avgTimeToClose} days`,
    },
  ];

  const funnelData = metrics.funnelDropOff.filter(
    (stage) => stage.stage !== 'Lost',
  );

  const STATUS_COLOR_PALETTE = [
    'oklch(0.55 0.03 250)',
    'oklch(0.55 0.08 155)',
    'oklch(0.70 0.12 85)',
    'oklch(0.58 0.10 35)',
    'oklch(0.50 0.01 50)',
    'oklch(0.22 0.02 50)',
    'oklch(0.55 0.08 260)',
  ];

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            Real-time business performance metrics
            {isFetching && !isLoading && (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            onClick={() => setPeriod('week')}
            size="sm">
            This Week
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            onClick={() => setPeriod('month')}
            size="sm">
            This Month
          </Button>
          <Button
            variant={period === 'quarter' ? 'default' : 'outline'}
            onClick={() => setPeriod('quarter')}
            size="sm">
            This Quarter
          </Button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricsCards.map((metric, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {metric.label}
              </p>
              <p className="text-2xl font-display">{metric.value}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {timeMetrics.map((metric, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 flex items-center gap-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-2xl font-display">
                  {metric.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Revenue by Client
            </CardTitle>
            <CardDescription>
              Top 10 revenue contributors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.revenueByClient.slice(0, 10)}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                  vertical={false}
                />
                <XAxis
                  dataKey="clientName"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    `$${(value / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.995 0.003 80)',
                    border: '1px solid oklch(0.90 0.008 80)',
                    borderRadius: '8px',
                  }}
                  formatter={(value?: number) => [
                    `$${(value || 0).toLocaleString()}`,
                    'Revenue',
                  ]}
                />
                <Bar
                  dataKey="revenue"
                  fill="oklch(0.22 0.02 50)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Sales Funnel
            </CardTitle>
            <CardDescription>
              Lead progression & drop-off rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.995 0.003 80)',
                    border: '1px solid oklch(0.90 0.008 80)',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="oklch(0.55 0.08 155)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-[#b8873a]" />
            Monthly Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1">
                  <stop
                    offset="5%"
                    stopColor="#b8873a"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="#b8873a"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) =>
                  v >= 1000000
                    ? `$${(v / 1000000).toFixed(1)}M`
                    : v >= 1000
                      ? `$${(v / 1000).toFixed(0)}K`
                      : `$${v}`
                }
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(v: number | undefined) => [
                  `$${(v ?? 0).toLocaleString()}`,
                  'Revenue',
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#b8873a"
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Lead Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Weekly Lead Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leadVolumeTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item ? `${label} (${item.start})` : label;
                }}
                formatter={(v: number | undefined) => [
                  v ?? 0,
                  'New Leads',
                ]}
              />
              <Bar
                dataKey="count"
                fill="#4f9cf9"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pipeline AI Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Pipeline AI Insights
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePipelineInsights}
              disabled={loadingPipeline}>
              <RefreshCw
                className={cn(
                  'h-4 w-4 mr-2',
                  loadingPipeline && 'animate-spin',
                )}
              />
              {loadingPipeline ? 'Analyzing...' : 'Generate Insights'}
            </Button>
          </div>
        </CardHeader>
        {pipelineExpanded && pipelineInsights && (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {pipelineInsights.summary}
            </p>
            {pipelineInsights.bottlenecks.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">
                  Bottlenecks
                </p>
                <div className="flex flex-wrap gap-2">
                  {pipelineInsights.bottlenecks.map((b, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-amber-600 border-amber-600/30 bg-amber-50 dark:bg-amber-950/20">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {pipelineInsights.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">
                  Recommendations
                </p>
                <ol className="space-y-1">
                  {pipelineInsights.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-[#b8873a] font-medium">
                        {i + 1}.
                      </span>
                      {r}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {Object.keys(pipelineInsights.winProbabilityByStage)
              .length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">
                  Win Probability by Stage
                </p>
                <div className="space-y-2">
                  {Object.entries(
                    pipelineInsights.winProbabilityByStage,
                  ).map(([stage, prob]) => (
                    <div
                      key={stage}
                      className="flex items-center gap-3">
                      <span className="text-xs w-24 shrink-0">
                        {stage}
                      </span>
                      <Progress value={prob} className="h-2 flex-1" />
                      <span className="text-xs w-8 text-right">
                        {prob}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* My Tasks Widget */}
      <MyTasksWidget />

      {/* Revenue Forecast Panel */}
      <ForecastPanel />

      {/* Projects Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Project Status
            </CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.projectsByStatus
                .filter((s) => s.count > 0)
                .map((status, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            STATUS_COLOR_PALETTE[idx % STATUS_COLOR_PALETTE.length],
                        }}
                      />
                      <span className="text-sm font-medium">
                        {status.status}
                      </span>
                    </div>
                    <span className="text-sm font-display">
                      {status.count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Projects at Risk */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg font-semibold">
                Projects at Risk
              </CardTitle>
            </div>
            <CardDescription>Requires attention</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.projectsAtRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects at risk
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.projectsAtRisk
                  .slice(0, 5)
                  .map((project, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted rounded-lg border-l-2 border-l-amber-500">
                      <p className="text-sm font-medium">
                        {project.projectName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.reason}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stalled Leads & Revenue Concentration */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-lg font-semibold">
                Stalled Leads
              </CardTitle>
            </div>
            <CardDescription>No activity in 30+ days</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.stalledLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stalled leads
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.stalledLeads.slice(0, 5).map((lead, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-muted rounded-lg border-l-2 border-l-red-400">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {lead.company}
                      </p>
                      <span className="text-xs font-semibold text-red-500">
                        {lead.daysStalled}d
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lead.stage}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Concentration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Revenue Concentration
            </CardTitle>
            <CardDescription>
              Client diversification risk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    Top Client
                  </span>
                  <span className="text-sm font-display">
                    {metrics.revenueConcentration.topClientPercentage}
                    %
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${metrics.revenueConcentration.topClientPercentage}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    Top 5 Clients
                  </span>
                  <span className="text-sm font-display">
                    {
                      metrics.revenueConcentration
                        .top5ClientsPercentage
                    }
                    %
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${metrics.revenueConcentration.isHighRisk ? 'bg-red-500' : 'bg-emerald-600'}`}
                    style={{
                      width: `${metrics.revenueConcentration.top5ClientsPercentage}%`,
                    }}
                  />
                </div>
              </div>
              {metrics.revenueConcentration.isHighRisk && (
                <div className="p-3 bg-muted rounded-lg border-l-2 border-l-red-400">
                  <p className="text-xs font-semibold">
                    HIGH RISK: Over 50% revenue from top 5 clients
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Executive Brief */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-xl font-display">
                  AI Executive Brief
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Real-time insights powered by advanced analytics
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleGenerateInsight}
              disabled={loadingAI}>
              {loadingAI ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {aiSummary ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-semibold mb-2">
                  Executive Overview
                </h4>
                <p className="text-sm leading-relaxed">
                  {aiSummary.summary.overview}
                </p>
              </div>

              {aiSummary.summary.whatChanged.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-semibold mb-3">
                    What Changed
                  </h4>
                  <ul className="space-y-2">
                    {aiSummary.summary.whatChanged.map(
                      (item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {aiSummary.summary.whatIsAtRisk.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    What Is At Risk
                  </h4>
                  <ul className="space-y-2">
                    {aiSummary.summary.whatIsAtRisk.map(
                      (item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {aiSummary.summary.whatNeedsAttention.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    What Needs Attention
                  </h4>
                  <ul className="space-y-2">
                    {aiSummary.summary.whatNeedsAttention.map(
                      (item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm">
                          <span className="text-xs font-semibold text-muted-foreground mt-0.5 shrink-0 w-4">
                            {idx + 1}.
                          </span>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {aiSummary.summary.keyInsights.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-semibold mb-3">
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {aiSummary.summary.keyInsights.map(
                      (item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm">
                          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <BrainCircuit className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Click &quot;Generate Insights&quot; to receive
                AI-powered business intelligence
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
