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
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { DashboardMetrics } from '@/lib/api/dashboard';
import { dashboardApi } from '@/lib/api/dashboard';
import { useCurrency } from '@/lib/context/currency-context';

interface Props {
  widget: WidgetConfig;
  metrics?: DashboardMetrics;
  period?: 'week' | 'month' | 'quarter';
}

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
    chartData = revenueTrend.map((d) => ({
      name: d.month,
      value: d.revenue,
    }));
  } else {
    chartData =
      metrics?.revenueByProject?.slice(0, 8).map((p, i) => ({
        name: p.projectName?.substring(0, 10) || `Project ${i + 1}`,
        value: p.revenue,
      })) || [];
  }

  const tickStyle = {
    fill: 'hsl(var(--muted-foreground))',
    opacity: 0.5,
  };

  const tooltipStyle = {
    contentStyle: {
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      fontSize: '11px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
  };

  return (
    <div className="h-full flex flex-col p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 mb-3 shrink-0">
        {title}
      </p>

      {chartData.length === 0 ? (
        /* Skeleton empty state */
        <div className="flex-1 flex items-end gap-2 pb-2">
          {[40, 65, 50, 80, 55, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded bg-muted/40"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.4}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, ...tickStyle }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, ...tickStyle }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  `${symbol}${(v / 1000).toFixed(0)}k`
                }
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
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
