'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { DashboardMetrics } from '@/lib/api/dashboard';
import { dashboardApi } from '@/lib/api/dashboard';
import { useCurrency } from '@/lib/context/currency-context';

interface Props {
  widget: WidgetConfig;
  metrics?: DashboardMetrics;
  period?: 'week' | 'month' | 'quarter';
}

// Emerald for revenue — a deliberate choice, not just "primary"
const STROKE = '#10b981';
const FILL_START = '#10b981';

export function AreaChartWidget({ widget, metrics, period }: Props) {
  const { symbol } = useCurrency();
  const title = widget.config.title || 'Revenue Trend';
  const metricKey = (widget.config.metric as string) || 'monthlyRevenue';

  const { data: revenueTrend = [] } = useQuery({
    queryKey: ['dashboard-revenue-trend', period],
    queryFn: () => dashboardApi.getRevenueTrend(period),
    staleTime: 10 * 60 * 1000,
    enabled: metricKey === 'monthlyRevenue',
  });

  let chartData: { name: string; value: number }[] = [];
  if (metricKey === 'monthlyRevenue') {
    chartData = revenueTrend.map((d) => ({ name: d.month, value: d.revenue }));
  } else {
    chartData =
      metrics?.revenueByProject?.slice(0, 8).map((p, i) => ({
        name: p.projectName?.substring(0, 10) || `Project ${i + 1}`,
        value: p.revenue,
      })) || [];
  }

  const tickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 10 };

  const tooltipStyle = {
    contentStyle: {
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      fontSize: '11px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
      padding: '8px 12px',
    },
    labelStyle: { fontWeight: 600, marginBottom: 2 },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-1.5 shrink-0 border-b border-border/50">
        <TrendingUp className="h-3 w-3 text-muted-foreground shrink-0" />
        <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
          {title}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-end gap-1.5 px-5 pb-4 pt-3">
          {[35, 55, 42, 70, 48, 65, 58].map((h, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-sm bg-emerald-500/10"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 min-h-0 px-1 pb-2 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }} style={{ outline: 'none' }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={FILL_START} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={FILL_START} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.6}
                strokeDasharray="0"
              />
              <XAxis
                dataKey="name"
                tick={tickStyle}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={tickStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: unknown) => [
                  `${symbol}${(v as number).toLocaleString()}`,
                  'Revenue',
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={STROKE}
                strokeWidth={2}
                fill="url(#areaFill)"
                dot={false}
                activeDot={{ r: 4, fill: STROKE, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
