import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({
  title,
  value,
  change,
  trend = 'neutral',
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-display">{value}</div>
        {change && (
          <div className="flex items-center mt-2 space-x-2">
            {trend === 'up' && (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">
                  {change}
                </span>
              </>
            )}
            {trend === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-red-500">
                  {change}
                </span>
              </>
            )}
            {trend === 'neutral' && (
              <span className="text-xs font-medium text-muted-foreground">
                {change}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricsCardsProps {
  totalRevenue: number;
  pipelineValue: number;
  activeClients: number;
  activeLeads: number;
  conversionRate: string;
  avgDealSize: number;
}

export function MetricsCards({
  totalRevenue,
  pipelineValue,
  activeClients,
  conversionRate,
}: MetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Revenue"
        value={`$${(totalRevenue / 1000).toFixed(0)}k`}
        change="+12.5% from last month"
        trend="up"
      />
      <MetricCard
        title="Pipeline Value"
        value={`$${(pipelineValue / 1000).toFixed(0)}k`}
        change="8 active opportunities"
        trend="neutral"
      />
      <MetricCard
        title="Active Customers"
        value={activeClients}
        change="+2 this month"
        trend="up"
      />
      <MetricCard
        title="Conversion Rate"
        value={conversionRate}
        change="Pipeline to won"
        trend="up"
      />
    </div>
  );
}
