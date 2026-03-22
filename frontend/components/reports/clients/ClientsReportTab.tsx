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
  LineChart,
  Line,
} from 'recharts';
import { clientsReportsApi, ReportFilters } from '@/lib/api/reports';
import { toast } from 'sonner';
import {
  Users,
  DollarSign,
  Heart,
  TrendingUp,
  Download,
} from 'lucide-react';
import { exportDataToCSV } from '@/lib/utils/export-csv';
import { ReportStatStrip } from '../ReportStatStrip';
import { useAuth } from '@/contexts/auth-context';

interface ClientsReportTabProps {
  filters: ReportFilters;
}

export function ClientsReportTab({ filters }: ClientsReportTabProps) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('reports:export');
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['report-clients', filters],
    queryFn: async () => {
      const [
        overview,
        revenueAnalysis,
        healthTrends,
        retentionMetrics,
        engagementTrends,
        healthScoreTrends,
      ] = await Promise.all([
        clientsReportsApi.getOverview(filters),
        clientsReportsApi.getRevenueAnalysis(filters),
        clientsReportsApi.getHealthTrends(filters),
        clientsReportsApi.getRetentionMetrics(filters),
        clientsReportsApi.getEngagementTrends(filters),
        clientsReportsApi.getHealthScoreTrends(filters),
      ]);
      return {
        overview,
        revenueAnalysis,
        healthTrends,
        retentionMetrics,
        engagementTrends,
        healthScoreTrends,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load customers reports', {
        description: (error as Error).message,
      });
    }
  }, [error]);

  const overview = data?.overview ?? null;
  const revenueAnalysis = data?.revenueAnalysis ?? [];
  const healthTrends = data?.healthTrends ?? [];
  const retentionMetrics = data?.retentionMetrics ?? [];
  const engagementTrends = data?.engagementTrends ?? [];
  const healthScoreTrends = data?.healthScoreTrends ?? [];

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="text-sm">Failed to load customers report data.</p>
      </div>
    );
  }

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
              <Skeleton className="h-65 w-full rounded-lg" />
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

  interface ClientRevenueRow {
    clientName: string;
    segment: string;
    status: string;
    healthScore?: number;
    lifetimeRevenue: number;
    projectCount: number;
    activeProjectCount: number;
  }

  const revenueColumns: ColumnDef<ClientRevenueRow>[] = [
    {
      accessorKey: 'clientName',
      header: 'Customer',
    },
    {
      accessorKey: 'segment',
      header: 'Segment',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span
            className={
              status === 'Active'
                ? 'text-emerald-600'
                : status === 'At Risk'
                  ? 'text-red-600'
                  : 'text-amber-600'
            }>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'healthScore',
      header: 'Health Score',
      cell: ({ row }) => row.original.healthScore || 'N/A',
    },
    {
      accessorKey: 'lifetimeRevenue',
      header: 'Lifetime Revenue',
      cell: ({ row }) =>
        `$${row.original.lifetimeRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'projectCount',
      header: 'Projects',
    },
    {
      accessorKey: 'activeProjectCount',
      header: 'Active',
    },
  ];

  const STATUS_COLORS = {
    Active: 'oklch(0.55 0.08 155)',
    Dormant: 'oklch(0.70 0.12 40)',
    'At Risk': 'oklch(0.58 0.10 25)',
  };

  const handleExportKPIs = () => {
    const kpiData = [
      {
        Metric: 'Total Customers',
        Value: overview.totalClients,
      },
      {
        Metric: 'Active Customers',
        Value: overview.activeClients,
      },
      {
        Metric: 'Average Health Score',
        Value: overview.avgHealthScore,
      },
      {
        Metric: 'Total Revenue',
        Value: `$${overview.totalRevenue.toLocaleString()}`,
      },
    ];
    exportDataToCSV(
      kpiData,
      `clients-kpis-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
    );
    toast.success('KPIs exported successfully');
  };

  const handleExportTopClients = () => {
    exportDataToCSV(
      revenueAnalysis.slice(0, 10),
      `top-10-clients-revenue-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'clientName', label: 'Customer Name' },
        { key: 'lifetimeRevenue', label: 'Lifetime Revenue' },
      ],
    );
    toast.success('Top customers exported successfully');
  };

  const handleExportRetentionMetrics = () => {
    exportDataToCSV(
      retentionMetrics,
      `client-retention-metrics-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'status', label: 'Status' },
        { key: 'count', label: 'Customer Count' },
        { key: 'percentage', label: 'Percentage' },
      ],
    );
    toast.success('Retention metrics exported successfully');
  };

  const handleExportEngagementTrends = () => {
    if (engagementTrends.length === 0) {
      toast.error('No engagement trend data available');
      return;
    }
    exportDataToCSV(
      engagementTrends,
      `client-engagement-trends-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'period', label: 'Period' },
        {
          key: 'avgActivitiesPerClient',
          label: 'Avg Activities per Customer',
        },
      ],
    );
    toast.success('Engagement trends exported successfully');
  };

  const handleExportHealthScoreTrends = () => {
    if (healthScoreTrends.length === 0) {
      toast.error('No health score trend data available');
      return;
    }
    exportDataToCSV(
      healthScoreTrends,
      `client-health-score-trends-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'period', label: 'Period' },
        { key: 'avgHealthScore', label: 'Avg Health Score' },
      ],
    );
    toast.success('Health score trends exported successfully');
  };

  const handleExportHealthBySegment = () => {
    exportDataToCSV(
      healthTrends,
      `client-health-by-segment-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'segment', label: 'Segment' },
        { key: 'avgHealthScore', label: 'Avg Health Score' },
      ],
    );
    toast.success('Health by segment exported successfully');
  };

  const handleExportAll = () => {
    handleExportKPIs();
    setTimeout(() => handleExportTopClients(), 100);
    setTimeout(() => handleExportRetentionMetrics(), 200);
    if (engagementTrends.length > 0) {
      setTimeout(() => handleExportEngagementTrends(), 300);
    }
    if (healthScoreTrends.length > 0) {
      setTimeout(() => handleExportHealthScoreTrends(), 400);
    }
    setTimeout(() => handleExportHealthBySegment(), 500);
    setTimeout(() => {
      exportDataToCSV(
        revenueAnalysis,
        `clients-revenue-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      );
    }, 600);
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
            label: 'Total Customers',
            sublabel: 'All time',
            value: String(overview.totalClients),
            icon: Users,
            highlight: true,
          },
          {
            label: 'Active Customers',
            sublabel: 'Currently active',
            value: String(overview.activeClients),
            icon: TrendingUp,
          },
          {
            label: 'Avg Health Score',
            sublabel: 'Out of 100',
            value: String(overview.avgHealthScore),
            icon: Heart,
          },
          {
            label: 'Total Revenue',
            sublabel: 'Lifetime',
            value: `$${(overview.totalRevenue / 1000).toFixed(0)}k`,
            icon: DollarSign,
          },
        ]}
      />

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue by Top Clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Top 10 Customers by Revenue
                </CardTitle>
                <CardDescription>
                  Highest revenue contributors
                </CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportTopClients}
                  variant="ghost"
                  size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={revenueAnalysis.slice(0, 10)}
                layout="vertical">
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
                  dataKey="clientName"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={11}
                  width={120}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.995 0.003 80)',
                    border: '1px solid oklch(0.90 0.008 80)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined) =>
                    [
                      `$${(value ?? 0).toLocaleString()}`,
                      'Revenue',
                    ] as [string, string]
                  }
                />
                <Bar
                  dataKey="lifetimeRevenue"
                  fill="oklch(0.55 0.08 155)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Status Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Customer Status Distribution
                </CardTitle>
                <CardDescription>Retention metrics</CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportRetentionMetrics}
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
                  data={retentionMetrics}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => {
                    const { status, percentage } =
                      entry as unknown as {
                        status: string;
                        percentage: number;
                      };
                    return `${status}: ${percentage}%`;
                  }}>
                  {retentionMetrics.map(
                    (
                      entry: {
                        status: string;
                        count: number;
                        percentage: number;
                      },
                      index: number,
                    ) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          STATUS_COLORS[
                            entry.status as keyof typeof STATUS_COLORS
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
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Trends */}
      {engagementTrends.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Engagement Trends
                </CardTitle>
                <CardDescription>
                  Customer activity over time
                </CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportEngagementTrends}
                  variant="ghost"
                  size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={engagementTrends}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                />
                <XAxis
                  dataKey="period"
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
                <Line
                  type="monotone"
                  dataKey="avgActivitiesPerClient"
                  stroke="oklch(0.55 0.08 155)"
                  strokeWidth={2}
                  dot={{ fill: 'oklch(0.55 0.08 155)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Health Score Trends */}
      {healthScoreTrends.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Health Score Trends
                </CardTitle>
                <CardDescription>
                  Average health scores over time
                </CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportHealthScoreTrends}
                  variant="ghost"
                  size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={healthScoreTrends}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                />
                <XAxis
                  dataKey="period"
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
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.995 0.003 80)',
                    border: '1px solid oklch(0.90 0.008 80)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgHealthScore"
                  stroke="oklch(0.70 0.12 155)"
                  strokeWidth={2}
                  dot={{ fill: 'oklch(0.70 0.12 155)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Health by Segment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Health Score by Segment
              </CardTitle>
              <CardDescription>
                Average health scores across customer segments
              </CardDescription>
            </div>
            {canExport && (
              <Button
                onClick={handleExportHealthBySegment}
                variant="ghost"
                size="sm">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={healthTrends}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.90 0.008 80)"
                vertical={false}
              />
              <XAxis
                dataKey="segment"
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
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.995 0.003 80)',
                  border: '1px solid oklch(0.90 0.008 80)',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="avgHealthScore"
                fill="oklch(0.70 0.12 155)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Customer Revenue Analysis
          </CardTitle>
          <CardDescription>Detailed customer metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={revenueColumns}
            data={revenueAnalysis}
            exportFilename={`clients-revenue-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
