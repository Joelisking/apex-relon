import React from 'react';
import { StatCardProps } from '@/lib/types';

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  trendUp,
}) => (
  <div className="bg-card p-6 rounded-xl border border-border">
    <p className="text-sm font-medium text-muted-foreground mb-1">
      {title}
    </p>
    <h3 className="text-2xl font-display">{value}</h3>
    {trend && (
      <p
        className={`text-xs font-medium mt-3 ${trendUp !== false ? 'text-emerald-600' : 'text-red-500'}`}>
        {trend}
      </p>
    )}
  </div>
);

export default StatCard;
