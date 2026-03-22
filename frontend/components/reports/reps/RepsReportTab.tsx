'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
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
} from 'recharts';
import { repsReportsApi, ReportFilters } from '@/lib/api/reports';
import { toast } from 'sonner';
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Download,
  Trophy,
  Medal,
} from 'lucide-react';
import { exportDataToCSV } from '@/lib/utils/export-csv';
import { ReportStatStrip } from '../ReportStatStrip';
import { useAuth } from '@/contexts/auth-context';

interface RepPerformance {
  repId: string;
  repName: string;
  role: string;
  leadsHandled: number;
  closedProjects: number;
  lostLeads: number;
  conversionRate: number;
  totalContractedValue: number;
  activitiesLogged: number;
  avgSalesCycle: number;
}

interface RepStageTime {
  repId: string;
  repName: string;
  stageData: { stage: string; avgDays: number }[];
}

interface RepsReportTabProps {
  filters: ReportFilters;
}

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)
    return `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}k`;
  return v.toLocaleString();
}

function avatarInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const RANK_STYLES = [
  { bg: 'bg-amber-400', text: 'text-white', icon: Trophy },
  { bg: 'bg-slate-400', text: 'text-white', icon: Medal },
  { bg: 'bg-orange-700', text: 'text-white', icon: Medal },
  { bg: 'bg-muted', text: 'text-muted-foreground', icon: null },
  { bg: 'bg-muted', text: 'text-muted-foreground', icon: null },
] as const;

// ── shared chart tooltip style ─────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: 'oklch(0.995 0.003 80)',
  border: '1px solid oklch(0.90 0.008 80)',
  borderRadius: '8px',
  fontSize: '12px',
};

export function RepsReportTab({ filters }: RepsReportTabProps) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('reports:export');
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['report-reps', filters],
    queryFn: async () => {
      const [overview, performance, stageTime] = await Promise.all([
        repsReportsApi.getOverview(filters),
        repsReportsApi.getPerformance(filters),
        repsReportsApi.getStageTime(filters),
      ]);
      return { overview, performance, stageTime };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load sales rep reports', {
        description:
          error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [error]);

  const overview = data?.overview ?? null;
  const performance: RepPerformance[] = data?.performance ?? [];
  const stageTime: RepStageTime[] = data?.stageTime ?? [];

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

  const topPerformers = performance.slice(0, 10);

  // ── export handlers ──────────────────────────────────────────────────────
  const handleExportKPIs = () => {
    exportDataToCSV(
      [
        { Metric: 'Total Sales Reps', Value: overview.totalReps },
        {
          Metric: 'Average Conversion Rate',
          Value: `${overview.avgConversionRate}%`,
        },
        {
          Metric: 'Total Contracted Value',
          Value: `$${overview.totalContractedValue.toLocaleString()}`,
        },
        {
          Metric: 'Average Sales Cycle (days)',
          Value: overview.avgSalesCycle,
        },
      ],
      `sales-reps-kpis-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
    );
    toast.success('KPIs exported');
  };

  const handleExportTopRevenue = () => {
    exportDataToCSV(
      topPerformers,
      `top-10-reps-by-contracted-value-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'repName', label: 'Sales Rep' },
        { key: 'totalContractedValue', label: 'Contracted Value' },
      ],
    );
    toast.success('Top performers exported');
  };

  const handleExportSalesCycle = () => {
    exportDataToCSV(
      topPerformers,
      `sales-cycle-comparison-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'repName', label: 'Sales Rep' },
        { key: 'avgSalesCycle', label: 'Average Sales Cycle (days)' },
      ],
    );
    toast.success('Sales cycle data exported');
  };

  const handleExportLeaderboard = () => {
    exportDataToCSV(
      performance.slice(0, 5).map((rep, idx) => ({
        Rank: idx + 1,
        'Sales Rep': rep.repName,
        'Contracted Value': `$${rep.totalContractedValue.toLocaleString()}`,
        'Closed Deals': rep.leadsHandled,
        'Won Projects': rep.closedProjects,
        'Conversion Rate': `${rep.conversionRate}%`,
      })),
      `top-5-leaderboard-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
    );
    toast.success('Leaderboard exported');
  };

  const handleExportStageTime = () => {
    if (stageTime.length === 0) {
      toast.error('No stage time data');
      return;
    }
    const flat: {
      'Sales Rep': string;
      Stage: string;
      'Average Days': number;
    }[] = [];
    stageTime.forEach((rep) =>
      rep.stageData.forEach((s) =>
        flat.push({
          'Sales Rep': rep.repName,
          Stage: s.stage,
          'Average Days': s.avgDays,
        }),
      ),
    );
    exportDataToCSV(
      flat,
      `stage-time-by-rep-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
    );
    toast.success('Stage time data exported');
  };

  const handleExportAll = () => {
    handleExportKPIs();
    setTimeout(() => handleExportTopRevenue(), 100);
    setTimeout(() => handleExportSalesCycle(), 200);
    setTimeout(() => handleExportLeaderboard(), 300);
    if (stageTime.length > 0)
      setTimeout(() => handleExportStageTime(), 400);
    setTimeout(() => {
      exportDataToCSV(
        performance,
        `sales-reps-performance-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`,
      );
    }, 500);
    toast.success('All reports exported');
  };

  // ── column defs ──────────────────────────────────────────────────────────
  const performanceColumns: ColumnDef<RepPerformance>[] = [
    { accessorKey: 'repName', header: 'Sales Rep' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'leadsHandled', header: 'Closed Deals' },
    { accessorKey: 'closedProjects', header: 'Won' },
    {
      accessorKey: 'conversionRate',
      header: 'Conversion %',
      cell: ({ row }) => `${row.original.conversionRate}%`,
    },
    {
      accessorKey: 'totalContractedValue',
      header: 'Contracted Value',
      cell: ({ row }) =>
        `$${row.original.totalContractedValue.toLocaleString()}`,
    },
    { accessorKey: 'activitiesLogged', header: 'Activities' },
    { accessorKey: 'avgSalesCycle', header: 'Avg Cycle (days)' },
  ];

  return (
    <div className="space-y-6">
      {/* Export button */}
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

      {/* ── KPI Strip ─────────────────────────────────────────────────── */}
      <ReportStatStrip
        cols={4}
        stats={[
          {
            label: 'Total Reps',
            sublabel: 'Active sales team',
            value: String(overview.totalReps),
            icon: Users,
            highlight: true,
          },
          {
            label: 'Avg Conversion',
            sublabel: 'Leads to won',
            value: `${overview.avgConversionRate}%`,
            icon: TrendingUp,
          },
          {
            label: 'Contracted Value',
            sublabel: 'Closed in period',
            value: `$${fmtVal(overview.totalContractedValue)}`,
            icon: DollarSign,
          },
          {
            label: 'Avg Sales Cycle',
            sublabel: 'Days to close',
            value: `${overview.avgSalesCycle}d`,
            icon: Clock,
          },
        ]}
      />

      {/* ── Charts ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 10 by Contracted Value */}
        <Card className="rounded-xl border border-border/60 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <CardHeader className="pb-2 px-5 pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Top 10 by Contracted Value
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on deals closed in period
                </p>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportTopRevenue}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPerformers} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="repName"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={11}
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number | undefined) => [
                    `$${(v ?? 0).toLocaleString()}`,
                    'Contracted Value',
                  ]}
                />
                <Bar
                  dataKey="totalContractedValue"
                  fill="oklch(0.55 0.08 155)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Cycle Comparison */}
        <Card className="rounded-xl border border-border/60 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <CardHeader className="pb-2 px-5 pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Sales Cycle Comparison
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Average days from lead created to close
                </p>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportSalesCycle}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPerformers}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                  vertical={false}
                />
                <XAxis
                  dataKey="repName"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={11}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: 'Days',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11 },
                  }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number | undefined) => [
                    `${v ?? 0}d`,
                    'Avg Sales Cycle',
                  ]}
                />
                <Bar
                  dataKey="avgSalesCycle"
                  fill="oklch(0.70 0.12 40)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Leaderboard ───────────────────────────────────────────────── */}
      <Card className="rounded-xl border border-border/60 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <CardHeader className="pb-2 px-5 pt-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Top Performers
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Top 5 by contracted value closed in period
              </p>
            </div>
            {canExport && (
              <Button
                onClick={handleExportLeaderboard}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div>
            {performance.slice(0, 5).map((rep, idx) => {
              const rank = RANK_STYLES[idx] ?? RANK_STYLES[3];
              const initials = avatarInitials(rep.repName);
              const isLast =
                idx === Math.min(4, performance.length - 1);

              return (
                <div
                  key={rep.repId}
                  className={`flex items-center gap-3 py-3 ${!isLast ? 'border-b border-border/40' : ''}`}>
                  {/* rank badge */}
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${rank.bg} ${rank.text}`}>
                    {idx + 1}
                  </div>

                  {/* initials avatar */}
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-[11px] font-bold text-secondary-foreground shrink-0">
                    {initials}
                  </div>

                  {/* name + stats */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {rep.repName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {rep.closedProjects} won
                      {' · '}
                      {rep.conversionRate}% conv.
                      {' · '}
                      {rep.leadsHandled} deals
                    </p>
                  </div>

                  {/* contracted value */}
                  <div className="text-right shrink-0">
                    <p className="text-[16px] font-bold tabular-nums text-foreground">
                      ${fmtVal(rep.totalContractedValue)}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                      contracted
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Stage Time by Rep ─────────────────────────────────────────── */}
      {stageTime.length > 0 && (
        <Card className="rounded-xl border border-border/60 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <CardHeader className="pb-2 px-5 pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Time Spent Per Stage
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Average days in each stage, by rep
                </p>
              </div>
              {canExport && (
                <Button
                  onClick={handleExportStageTime}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-5">
              {stageTime.slice(0, 5).map((rep) => (
                <div key={rep.repId}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
                    {rep.repName}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px bg-border/40 rounded-lg overflow-hidden">
                    {rep.stageData.map((stage, idx) => (
                      <div
                        key={idx}
                        className="bg-card px-3 py-2.5 text-center">
                        <p className="text-[18px] font-bold tabular-nums leading-none text-foreground mb-1">
                          {stage.avgDays}d
                        </p>
                        <p className="text-[9px] uppercase tracking-[0.05em] text-muted-foreground truncate">
                          {stage.stage}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Full Performance Table ────────────────────────────────────── */}
      <Card className="rounded-xl border border-border/60 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <CardHeader className="pb-2 px-5 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Complete Performance Metrics
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            All rep statistics for selected period
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <DataTable
            columns={performanceColumns}
            data={performance}
            exportFilename={`sales-reps-performance-${filters.period ?? 'custom'}-${new Date().toISOString().split('T')[0]}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
