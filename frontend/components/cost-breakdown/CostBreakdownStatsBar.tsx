interface Props {
  total: number;
  draftCount: number;
  finalCount: number;
  totalHours: number;
}

export default function CostBreakdownStatsBar({ total, draftCount, finalCount, totalHours }: Props) {
  const stats = [
    { label: 'Total', value: total.toString() },
    { label: 'Draft', value: draftCount.toString() },
    { label: 'Final', value: finalCount.toString() },
    { label: 'Total Est. Hours', value: `${totalHours.toFixed(1)} hrs` },
  ];

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="grid grid-cols-4 gap-px bg-border/60">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
