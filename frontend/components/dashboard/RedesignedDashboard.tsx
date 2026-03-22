'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pipelineApi } from '@/lib/api/pipeline-client';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit,
  Wand2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { Lead, Client, DashboardMetrics } from '@/lib/types';
import { REVENUE_DATA } from '@/lib/constants';
import { useCurrency } from '@/lib/context/currency-context';

const BG_TO_HEX: Record<string, string> = {
  'bg-gray-400': '#9ca3af',
  'bg-gray-500': '#6b7280',
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-orange-500': '#f97316',
  'bg-green-500': '#22c55e',
  'bg-red-500': '#ef4444',
  'bg-yellow-500': '#eab308',
  'bg-teal-500': '#14b8a6',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
};

const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
];

interface DashboardClientProps {
  leads: Lead[];
  clients: Client[];
}

export default function RedesignedDashboard({
  leads,
  clients,
}: DashboardClientProps) {
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiData, setAiData] = useState<{
    summary: string;
    flags: string[];
  } | null>(null);

  const { fmtFull, symbol } = useCurrency();

  const { data: stageData = [] } = useQuery({
    queryKey: ['pipeline-stages', 'prospective_project'],
    queryFn: () => pipelineApi.getStages('prospective_project'),
    staleTime: 5 * 60 * 1000,
  });

  const { metrics } = useMemo(() => {
    const totalRevenue = clients.reduce(
      (acc, c) => acc + (c.totalRevenue || c.lifetimeRevenue || 0),
      0,
    );
    const pipelineValue = leads.reduce(
      (acc, l) => acc + (l.expectedValue || 0),
      0,
    );

    const wonLeads = leads.filter((l) => l.stage === 'Closed Won' || l.stage === 'Won');
    const won = wonLeads.length;

    const conversionRateNum =
      leads.length > 0 ? Math.round((won / leads.length) * 100) : 0;

    const metrics: DashboardMetrics = {
      totalRevenue,
      pipelineValue,
      activeClients: clients.length,
      activeLeads: leads.length,
      conversionRate: `${conversionRateNum}%`,
      avgDealSize:
        leads.length > 0
          ? Math.round(pipelineValue / leads.length)
          : 0,
    };

    return { metrics, conversionRateNum };
  }, [leads, clients]);

  const pipelineData = useMemo(() => {
    if (stageData.length === 0) return [];
    const counts: Record<string, number> = {};
    stageData.forEach((s) => (counts[s.name] = 0));

    // Normalize aliases: "Won"→"Closed Won", "Lost"→"Closed Lost"
    const normalize = (stage: string) => {
      if (stage === 'Won' && counts['Closed Won'] !== undefined) return 'Closed Won';
      if (stage === 'Lost' && counts['Closed Lost'] !== undefined) return 'Closed Lost';
      if (stage === 'Closed Won' && counts['Won'] !== undefined && counts['Closed Won'] === undefined) return 'Won';
      if (stage === 'Closed Lost' && counts['Lost'] !== undefined && counts['Closed Lost'] === undefined) return 'Lost';
      return stage;
    };

    leads.forEach((l) => {
      const key = normalize(l.stage);
      if (counts[key] !== undefined) counts[key]++;
    });
    return stageData
      .map((stage, idx) => ({
        name: stage.name,
        value: counts[stage.name] ?? 0,
        color: BG_TO_HEX[stage.color] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      }))
      .filter((d) => d.value > 0);
  }, [leads, stageData]);

  const handleGenerateInsight = async () => {
    setLoadingAI(true);
    setTimeout(() => {
      setAiData({
        summary:
          'Revenue is tracking 12% above Q1 projections with strong pipeline health. Two enterprise deals in negotiation require executive attention to close by month-end. Client retention remains excellent at 94%.',
        flags: [
          'High-value deal at risk - TechCorp renewal',
          'Pipeline weighted toward early stages',
          'Strong month-over-month growth trajectory',
        ],
      });
      setLoadingAI(false);
    }, 1500);
  };

  const metricsData = [
    {
      label: 'Total Revenue',
      value: fmtFull(metrics.totalRevenue),
      change: '+12.5%',
      trend: 'up' as const,
    },
    {
      label: 'Active Clients',
      value: metrics.activeClients.toString(),
      change: '+8.2%',
      trend: 'up' as const,
    },
    {
      label: 'Conversion Rate',
      value: metrics.conversionRate,
      change: '+5.3%',
      trend: 'up' as const,
    },
    {
      label: 'Pipeline Value',
      value: fmtFull(metrics.pipelineValue),
      change: '+15.7%',
      trend: 'up' as const,
    },
  ];

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last refreshed {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Today
          </Button>
          <Button variant="outline" size="sm">
            This Week
          </Button>
          <Button size="sm">This Month</Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsData.map((metric, idx) => {
          const TrendIcon =
            metric.trend === 'up' ? ArrowUpRight : ArrowDownRight;

          return (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      metric.trend === 'up'
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    }`}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    {metric.change}
                  </div>
                </div>
                <p className="text-2xl font-display">
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Revenue Trajectory
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  6-month performance overview
                </CardDescription>
              </div>
              <span className="text-xs font-medium text-emerald-600">
                +12% Growth
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4 pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={REVENUE_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.90 0.008 80)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.50 0.01 50)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    `${symbol}${value / 1000}k`
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.995 0.003 80)',
                    border: '1px solid oklch(0.90 0.008 80)',
                    borderRadius: '8px',
                  }}
                  cursor={{ fill: 'oklch(0.94 0.008 80)' }}
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

        <Card className="col-span-full lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Pipeline Stages
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Lead distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value">
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
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
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pipelineData.map((stage, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}></div>
                  <span className="text-xs text-muted-foreground">
                    {stage.name} ({stage.value})
                  </span>
                </div>
              ))}
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
                  Powered by advanced analytics engine
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
          {aiData ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm leading-relaxed font-medium">
                  {aiData.summary}
                </p>
              </div>

              {aiData.flags.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <h4 className="text-sm font-semibold">
                      Key Alerts & Action Items
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {aiData.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-muted rounded-lg border-l-2 border-l-amber-500">
                        <span className="text-xs font-semibold text-muted-foreground mt-0.5 w-4 shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="text-sm flex-1">{flag}</span>
                      </div>
                    ))}
                  </div>
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

      {/* Top Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Top Clients
            </CardTitle>
            <CardDescription className="text-sm">
              Highest revenue contributors
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-2">
              {clients
                .sort(
                  (a, b) =>
                    (b.lifetimeRevenue || 0) -
                    (a.lifetimeRevenue || 0),
                )
                .slice(0, 5)
                .map((client, idx) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.industry}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-display">
                        $
                        {(
                          (client.lifetimeRevenue || 0) / 1000
                        ).toFixed(0)}
                        k
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        #{idx + 1}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              High-Value Leads
            </CardTitle>
            <CardDescription className="text-sm">
              Top opportunities in pipeline
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-2">
              {leads
                .filter((l) => l.expectedValue && l.expectedValue > 0)
                .sort(
                  (a, b) =>
                    (b.expectedValue || 0) - (a.expectedValue || 0),
                )
                .slice(0, 5)
                .map((lead, idx) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {lead.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.company}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-display">
                        ${symbol}
                        {((lead.expectedValue || 0) / 1000).toFixed(
                          0,
                        )}
                        k
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lead.stage}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
