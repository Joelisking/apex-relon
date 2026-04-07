export default function CostBreakdownLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64" />
        </div>
        <div className="h-9 bg-muted rounded w-36" />
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="grid grid-cols-4 gap-px bg-border/60">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card px-5 py-4 space-y-2">
              <div className="h-3 bg-muted rounded w-20" />
              <div className="h-6 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-9 bg-muted rounded flex-1 max-w-xs" />
        <div className="h-9 bg-muted rounded w-28" />
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_160px_80px_80px_60px_40px] gap-4 px-4 py-3 bg-muted/40">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-3 bg-muted rounded" />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_160px_160px_80px_80px_60px_40px] gap-4 px-4 py-3.5 border-t border-border/40">
            <div className="space-y-1.5">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-12" />
            <div className="h-4 bg-muted rounded w-16" />
            <div className="h-5 bg-muted rounded-full w-14" />
            <div className="h-7 bg-muted rounded w-7 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
