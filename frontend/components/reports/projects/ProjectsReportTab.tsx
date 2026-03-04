'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { projectsReportsApi, ReportFilters } from '@/lib/api/reports';
import { toast } from 'sonner';
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  Percent,
  Download,
} from 'lucide-react';
import { exportDataToCSV } from '@/lib/utils/export-csv';
import { ReportStatStrip } from '../ReportStatStrip';
import { useAuth } from '@/contexts/auth-context';

interface ProjectsReportTabProps {
  filters: ReportFilters;
}

export function ProjectsReportTab({
  filters,
}: ProjectsReportTabProps) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('reports:export');
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['report-projects', filters],
    queryFn: async () => {
      const [overview, profitability, riskDistribution] =
        await Promise.all([
          projectsReportsApi.getOverview(filters),
          projectsReportsApi.getProfitability(filters),
          projectsReportsApi.getRiskDistribution(filters),
        ]);
      return { overview, profitability, riskDistribution };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load projects reports', {
        description: (error as Error).message,
      });
    }
  }, [error]);

  const overview = data?.overview ?? null;
  const profitability = data?.profitability ?? [];
  const riskDistribution = data?.riskDistribution ?? [];

  if (loading || !overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const profitColumns: ColumnDef<{
    projectName: string;
    clientName: string;
    status: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>[] = [
    {
      accessorKey: 'projectName',
      header: 'Project',
    },
    {
      accessorKey: 'clientName',
      header: 'Client',
    },
    {
      accessorKey: 'status',
      header: 'Status',
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      cell: ({ row }) => `$${row.original.revenue.toLocaleString()}`,
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: ({ row }) => `$${row.original.cost.toLocaleString()}`,
    },
    {
      accessorKey: 'profit',
      header: 'Profit',
      cell: ({ row }) => {
        const profit = row.original.profit;
        return (
          <span
            className={
              profit >= 0 ? 'text-emerald-600' : 'text-red-600'
            }>
            ${profit.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: 'margin',
      header: 'Margin %',
      cell: ({ row }) => {
        const margin = row.original.margin;
        return (
          <span
            className={
              margin >= 0 ? 'text-emerald-600' : 'text-red-600'
            }>
            {margin}%
          </span>
        );
      },
    },
  ];

  const RISK_COLORS = {
    'On Track': 'oklch(0.55 0.08 155)',
    'At Risk': 'oklch(0.70 0.12 40)',
    Critical: 'oklch(0.58 0.10 25)',
  };

  const handleExportKPIs = () => {
    const kpiData = [
      {
        Metric: 'Total Projects',
        Value: overview.totalProjects,
      },
      {
        Metric: 'Total Revenue',
        Value: `$${overview.totalRevenue.toLocaleString()}`,
      },
      {
        Metric: 'Total Profit',
        Value: `$${overview.totalProfit.toLocaleString()}`,
      },
      {
        Metric: 'Average Margin',
        Value: `${overview.avgMargin}%`,
      },
    ];
    exportDataToCSV(
      kpiData,
      `projects-kpis-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
    );
    toast.success('KPIs exported successfully');
  };

  const handleExportStatusDistribution = () => {
    exportDataToCSV(
      overview.projectsByStatus,
      `projects-by-status-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'status', label: 'Status' },
        { key: 'count', label: 'Project Count' },
      ],
    );
    toast.success('Status distribution exported successfully');
  };

  const handleExportRiskDistribution = () => {
    exportDataToCSV(
      riskDistribution,
      `projects-risk-distribution-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'riskStatus', label: 'Risk Status' },
        { key: 'count', label: 'Project Count' },
      ],
    );
    toast.success('Risk distribution exported successfully');
  };

  const handleExportTimelinePerformance = () => {
    const timelineData = [
      {
        Category: 'On Time',
        Count: overview.onTimeProjects,
      },
      {
        Category: 'Overdue',
        Count: overview.overdueProjects,
      },
    ];
    exportDataToCSV(
      timelineData,
      `projects-timeline-performance-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
    );
    toast.success('Timeline performance exported successfully');
  };

  const handleExportAll = () => {
    handleExportKPIs();
    setTimeout(() => handleExportStatusDistribution(), 100);
    setTimeout(() => handleExportRiskDistribution(), 200);
    setTimeout(() => handleExportTimelinePerformance(), 300);
    setTimeout(() => {
      exportDataToCSV(
        profitability,
        `projects-profitability-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      );
    }, 400);
    toast.success('All reports exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Export All Button */}
      {canExport && (
        <div className="flex justify-end">
          <Button
            onClick={handleExportAll}
            variant="outline"
            size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
        </div>
      )}

      {/* KPI Strip */}
      <ReportStatStrip
        cols={4}
        stats={[
          {
            label: 'Total Projects',
            sublabel: 'In selected period',
            value: String(overview.totalProjects),
            icon: Briefcase,
            highlight: true,
          },
          {
            label: 'Total Revenue',
            sublabel: 'All projects',
            value: `$${(overview.totalRevenue / 1000).toFixed(0)}k`,
            icon: DollarSign,
          },
          {
            label: 'Total Profit',
            sublabel: 'Revenue minus cost',
            value: `$${(overview.totalProfit / 1000).toFixed(0)}k`,
            icon: TrendingUp,
          },
          {
            label: 'Avg Margin',
            sublabel: 'Across all projects',
            value: `${overview.avgMargin}%`,
            icon: Percent,
          },
        ]}
      />

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Projects by Status
                </CardTitle>
                <CardDescription>
                  Current status distribution
                </CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportStatusDistribution}
                  variant="ghost"
                  size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overview.projectsByStatus}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                  vertical={false}
                />
                <XAxis
                  dataKey="status"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
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
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Risk Distribution
                </CardTitle>
                <CardDescription>
                  Projects by risk status
                </CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportRiskDistribution}
                  variant="ghost"
                  size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="count"
                  nameKey="riskStatus"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label>
                  {riskDistribution.map(
                    (
                      entry: { riskStatus: string },
                      index: number,
                    ) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          RISK_COLORS[
                            entry.riskStatus as keyof typeof RISK_COLORS
                          ] || 'oklch(0.55 0.03 250)'
                        }
                      />
                    ),
                  )}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.995 0.003 80)',
                    border: '1px solid oklch(0.90 0.008 80)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* On-time vs Overdue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Timeline Performance
              </CardTitle>
              <CardDescription>
                On-time vs overdue projects
              </CardDescription>
            </div>
            {canExport && (
              <Button
                onClick={handleExportTimelinePerformance}
                variant="ghost"
                size="sm">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-emerald-500/10 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">
                On Time
              </p>
              <p className="text-3xl font-display mt-2">
                {overview.onTimeProjects}
              </p>
            </div>
            <div className="p-6 bg-red-500/10 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">
                Overdue
              </p>
              <p className="text-3xl font-display mt-2">
                {overview.overdueProjects}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profitability Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Project Profitability
          </CardTitle>
          <CardDescription>
            Revenue, cost, and profit breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={profitColumns}
            data={profitability}
            exportFilename={`projects-profitability-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
