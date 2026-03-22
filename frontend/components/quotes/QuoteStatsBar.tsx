import { formatCurrency } from './quote-utils';

interface QuoteStatsBarProps {
  draftCount: number;
  sentCount: number;
  acceptedTotal: number;
  totalValue: number;
}

export default function QuoteStatsBar({
  draftCount,
  sentCount,
  acceptedTotal,
  totalValue,
}: QuoteStatsBarProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="grid grid-cols-4 gap-px bg-border/60">
        <div className="bg-card px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Drafts
          </p>
          <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">
            {draftCount}
          </p>
        </div>
        <div className="bg-card px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Sent
          </p>
          <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">
            {sentCount}
          </p>
        </div>
        <div className="relative bg-card px-5 py-4">
          <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Accepted Value
          </p>
          <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">
            {formatCurrency(acceptedTotal)}
          </p>
        </div>
        <div className="bg-card px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Total Pipeline
          </p>
          <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>
    </div>
  );
}
