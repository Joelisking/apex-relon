import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  sublabel?: string;
  value: string;
  icon: LucideIcon;
  highlight?: boolean;
  alert?: boolean;
}

const COLS_CLASS: Record<number, string> = {
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
};

export function ReportStatStrip({
  stats,
  cols,
}: {
  stats: StatItem[];
  cols?: number;
}) {
  const colsClass = COLS_CLASS[cols ?? stats.length] ?? COLS_CLASS[5];

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className={`grid ${colsClass} gap-px bg-border/60`}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`relative px-5 py-4 ${
                stat.alert ? 'bg-amber-50/60' : 'bg-card'
              }`}>
              {/* left accent for highlighted primary metric */}
              {stat.highlight && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
              )}

              <div className="flex items-center gap-1.5 mb-2">
                <Icon
                  className={`h-3 w-3 shrink-0 ${
                    stat.alert
                      ? 'text-amber-500'
                      : 'text-muted-foreground'
                  }`}
                />
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">
                  {stat.label}
                </p>
              </div>

              <p
                className={`text-[22px] font-bold tabular-nums leading-none mb-1 ${
                  stat.alert ? 'text-amber-700' : 'text-foreground'
                }`}>
                {stat.value}
              </p>

              {stat.sublabel && (
                <p className="text-[11px] text-muted-foreground">
                  {stat.sublabel}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
