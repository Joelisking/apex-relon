'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { DashboardMetrics } from '@/lib/api/dashboard';
import { useCurrency } from '@/lib/context/currency-context';

interface Props {
  widget: WidgetConfig;
  metrics?: DashboardMetrics;
}

export function BarChartWidget({ widget, metrics }: Props) {
  const { symbol } = useCurrency();
  const title = widget.config.title || 'Chart';
  const metric = widget.config.metric as string;

  let chartData: { name: string; value: number }[] = [];

  if (metrics) {
    if (metric === 'revenueByClient') {
      chartData =
        metrics.revenueByClient?.slice(0, 8).map((c) => ({
          name: c.clientName?.substring(0, 12) || 'Client',
          value: c.revenue,
        })) || [];
    } else if (metric === 'projectsByStatus') {
      chartData =
        metrics.projectsByStatus?.map((p) => ({
          name: p.status,
          value: p.count,
        })) || [];
    }
  }

  const isCurrency = metric === 'revenueByClient';

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
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <BarChart2 className="h-6 w-6 text-muted-foreground/25" />
          {metric && !['revenueByClient', 'projectsByStatus'].includes(metric) ? (
            <p className="text-[11px] text-muted-foreground/40 text-center px-4">
              Use gear icon to set metric to
              <br />
              <span className="font-medium">Revenue by Client</span> or{' '}
              <span className="font-medium">Projects by Status</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground/40">No data</p>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.4}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))',
                  opacity: 0.5,
                }}
                tickLine={false}
                axisLine={false}
                angle={-20}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))',
                  opacity: 0.5,
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  isCurrency ? `${symbol}${(v / 1000).toFixed(0)}k` : v
                }
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: unknown) => [
                  isCurrency
                    ? `${symbol}${(v as number).toLocaleString()}`
                    : (v as number),
                  'Value',
                ]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index % 2 === 0
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--primary) / 0.72)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
