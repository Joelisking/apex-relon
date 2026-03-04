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
  Cell,
} from 'recharts';
import { leadsReportsApi, ReportFilters } from '@/lib/api/reports';
import { toast } from 'sonner';
import {
  TrendingUp,
  Target,
  DollarSign,
  Clock,
  AlertCircle,
  Sparkles,
  Download,
} from 'lucide-react';
import { exportDataToCSV } from '@/lib/utils/export-csv';
import { ReportStatStrip } from '../ReportStatStrip';
import { useAuth } from '@/contexts/auth-context';

interface LeadsReportTabProps {
  filters: ReportFilters;
}

export function LeadsReportTab({ filters }: LeadsReportTabProps) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('reports:export');
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['report-leads', filters],
    queryFn: async () => {
      const [
        overview,
        stageAnalysis,
        conversionFunnel,
        revenueByRep,
        overdueLeads,
      ] = await Promise.all([
        leadsReportsApi.getOverview(filters),
        leadsReportsApi.getStageAnalysis(filters),
        leadsReportsApi.getConversionFunnel(filters),
        leadsReportsApi.getRevenueByRep(filters),
        leadsReportsApi.getOverdue(filters),
      ]);
      return {
        overview,
        stageAnalysis,
        conversionFunnel,
        revenueByRep,
        overdueLeads,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load leads reports', {
        description: (error as Error).message,
      });
    }
  }, [error]);

  const overview = data?.overview ?? null;
  const stageAnalysis = data?.stageAnalysis ?? [];
  const conversionFunnel = data?.conversionFunnel ?? [];
  const revenueByRep = data?.revenueByRep ?? [];
  const overdueLeads = data?.overdueLeads ?? [];

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

  interface RepRevenueRow {
    repName: string;
    leadsHandled: number;
    wonLeads: number;
    lostLeads: number;
    conversionRate: number;
    totalRevenue: number;
    avgDealSize: number;
  }

  const repColumns: ColumnDef<RepRevenueRow>[] = [
    {
      accessorKey: 'repName',
      header: 'Sales Rep',
    },
    {
      accessorKey: 'leadsHandled',
      header: 'Leads Handled',
    },
    {
      accessorKey: 'wonLeads',
      header: 'Won',
    },
    {
      accessorKey: 'lostLeads',
      header: 'Lost',
    },
    {
      accessorKey: 'conversionRate',
      header: 'Conversion Rate',
      cell: ({ row }) => `${row.original.conversionRate}%`,
    },
    {
      accessorKey: 'totalRevenue',
      header: 'Total Revenue',
      cell: ({ row }) =>
        `$${row.original.totalRevenue.toLocaleString()}`,
    },
    {
      accessorKey: 'avgDealSize',
      header: 'Avg Deal Size',
      cell: ({ row }) =>
        `$${row.original.avgDealSize.toLocaleString()}`,
    },
  ];

  const handleExportKPIs = () => {
    const kpiData = [
      {
        Metric: 'Total Leads',
        Value: overview.totalLeads,
      },
      {
        Metric: 'Conversion Rate',
        Value: `${overview.conversionRate}%`,
      },
      {
        Metric: 'Pipeline Value',
        Value: `$${overview.pipelineValue.toLocaleString()}`,
      },
      {
        Metric: 'Weighted Forecast',
        Value: `$${overview.weightedForecast.toLocaleString()}`,
      },
      {
        Metric: 'Average Close Time (days)',
        Value: overview.avgCloseTime,
      },
    ];
    exportDataToCSV(
      kpiData,
      `leads-kpis-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
    );
    toast.success('KPIs exported successfully');
  };

  const handleExportStageAnalysis = () => {
    exportDataToCSV(
      stageAnalysis,
      `leads-stage-analysis-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'stage', label: 'Stage' },
        { key: 'avgDaysInStage', label: 'Average Days in Stage' },
      ],
    );
    toast.success('Stage analysis exported successfully');
  };

  const handleExportConversionFunnel = () => {
    exportDataToCSV(
      conversionFunnel,
      `leads-conversion-funnel-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'stage', label: 'Stage' },
        { key: 'count', label: 'Lead Count' },
      ],
    );
    toast.success('Conversion funnel exported successfully');
  };

  const handleExportLeadsByStage = () => {
    exportDataToCSV(
      overview.leadsByStage,
      `leads-by-stage-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'stage', label: 'Stage' },
        { key: 'count', label: 'Lead Count' },
        { key: 'value', label: 'Total Value' },
      ],
    );
    toast.success('Leads by stage exported successfully');
  };

  const handleExportOverdueLeads = () => {
    exportDataToCSV(
      overdueLeads,
      `overdue-leads-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'company', label: 'Company' },
        { key: 'contactName', label: 'Contact Name' },
        { key: 'stage', label: 'Stage' },
        { key: 'value', label: 'Value' },
        { key: 'daysOverdue', label: 'Days Overdue' },
        { key: 'assignedToName', label: 'Assigned To' },
      ],
    );
    toast.success('Overdue leads exported successfully');
  };

  const handleExportAll = () => {
    // Export all data sections
    handleExportKPIs();
    setTimeout(() => handleExportStageAnalysis(), 100);
    setTimeout(() => handleExportConversionFunnel(), 200);
    setTimeout(() => handleExportLeadsByStage(), 300);
    if (overdueLeads.length > 0) {
      setTimeout(() => handleExportOverdueLeads(), 400);
    }
    setTimeout(() => {
      exportDataToCSV(
        revenueByRep,
        `leads-by-rep-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      );
    }, 500);
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
        stats={[
          {
            label: 'Total Leads',
            sublabel: 'In selected period',
            value: String(overview.totalLeads),
            icon: Target,
            highlight: true,
          },
          {
            label: 'Conversion Rate',
            sublabel: 'Leads to won',
            value: `${overview.conversionRate}%`,
            icon: TrendingUp,
          },
          {
            label: 'Pipeline Value',
            sublabel: 'Open deals',
            value: `$${(overview.pipelineValue / 1000).toFixed(0)}k`,
            icon: DollarSign,
          },
          {
            label: 'Weighted Forecast',
            sublabel: 'Probability-adjusted',
            value: `$${(overview.weightedForecast / 1000).toFixed(0)}k`,
            icon: Sparkles,
          },
          {
            label: 'Avg Close Time',
            sublabel: 'Days to close',
            value: `${overview.avgCloseTime}d`,
            icon: Clock,
          },
        ]}
      />

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Stage Duration Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Average Time per Stage
                </CardTitle>
                <CardDescription>
                  Days spent in each stage
                </CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportStageAnalysis}
                  variant="ghost"
                  size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageAnalysis}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                  vertical={false}
                />
                <XAxis
                  dataKey="stage"
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
                  label={{
                    value: 'Days',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.995 0.003 80)',
                    border: '1px solid oklch(0.90 0.008 80)',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="avgDaysInStage"
                  fill="oklch(0.55 0.08 155)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Conversion Funnel
                </CardTitle>
                <CardDescription>
                  Lead progression through stages
                </CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportConversionFunnel}
                  variant="ghost"
                  size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnel}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                  vertical={false}
                />
                <XAxis
                  dataKey="stage"
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
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {conversionFunnel.map(
                    (_entry: unknown, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? 'oklch(0.50 0.01 50)'
                            : index === 1
                              ? 'oklch(0.55 0.08 240)'
                              : index === 2
                                ? 'oklch(0.55 0.08 285)'
                                : index === 3
                                  ? 'oklch(0.70 0.12 40)'
                                  : 'oklch(0.55 0.08 155)'
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leads by Stage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Leads by Stage
              </CardTitle>
              <CardDescription>Current distribution</CardDescription>
            </div>
            {canExport && (
              <Button
                onClick={handleExportLeadsByStage}
                variant="ghost"
                size="sm">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {overview.leadsByStage.map(
              (
                stage: {
                  stage: string;
                  count: number;
                  value: number;
                },
                idx: number,
              ) => (
                <div key={idx} className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stage.stage}
                  </p>
                  <p className="text-2xl font-display mt-1">
                    {stage.count}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${(stage.value / 1000).toFixed(0)}k value
                  </p>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overdue Leads */}
      {overdueLeads.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-lg font-semibold">
                    Overdue Leads
                  </CardTitle>
                </div>
                <CardDescription>
                  {overdueLeads.length} leads past expected close date
                </CardDescription>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportOverdueLeads}
                  variant="ghost"
                  size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueLeads
                .slice(0, 10)
                .map(
                  (
                    lead: {
                      company: string;
                      contactName: string;
                      stage: string;
                      value: number;
                      daysOverdue: number;
                      assignedToName?: string;
                    },
                    idx: number,
                  ) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg border-l-2 border-l-red-400">
                      <div>
                        <p className="text-sm font-medium">
                          {lead.company}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.contactName} • {lead.stage} • $
                          {lead.value.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-red-600">
                          {lead.daysOverdue}d overdue
                        </span>
                        {lead.assignedToName && (
                          <p className="text-xs text-muted-foreground">
                            {lead.assignedToName}
                          </p>
                        )}
                      </div>
                    </div>
                  ),
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by Rep */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Performance by Sales Rep
          </CardTitle>
          <CardDescription>
            Revenue and conversion metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={repColumns}
            data={revenueByRep}
            exportFilename={`leads-by-rep-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
