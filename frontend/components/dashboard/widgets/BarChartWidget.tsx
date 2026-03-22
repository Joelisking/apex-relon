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

// Intentional palette — not random, not just "primary with opacity"
const BAR_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#7c3aed', // violet-700
  '#5b21b6', // violet-800
  '#4f46e5', // indigo-600
  '#7e22ce', // purple-800
  '#6d28d9', // violet-700
];


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
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
      padding: '8px 12px',
    },
    labelStyle: { fontWeight: 600, marginBottom: 2 },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-1.5 shrink-0 border-b border-border/50">
        <BarChart2 className="h-3 w-3 text-muted-foreground shrink-0" />
        <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
          {title}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <BarChart2 className="h-6 w-6 text-muted-foreground" />
          {metric && !['revenueByClient', 'projectsByStatus'].includes(metric) ? (
            <p className="text-[11px] text-muted-foreground text-center px-6 leading-relaxed">
              Set metric to{' '}
              <span className="font-semibold text-foreground">Revenue by Client</span>
              {' '}or{' '}
              <span className="font-semibold text-foreground">Projects by Status</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">No data yet</p>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 px-1 pb-2 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.6}
                strokeDasharray="0"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                angle={-20}
                textAnchor="end"
                height={38}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) =>
                  isCurrency ? `${symbol}${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: unknown) => [
                  isCurrency ? `${symbol}${(v as number).toLocaleString()}` : (v as number),
                  'Value',
                ]}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
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
