export default function TasksLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-24" />
          <div className="h-4 bg-muted rounded w-52" />
        </div>
        <div className="h-8 bg-muted rounded w-28" />
      </div>

      {/* Stats bar — 4 cells */}
      <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="grid grid-cols-4 gap-px bg-border/60">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card px-5 py-4 space-y-2">
              <div className="h-2.5 bg-muted rounded w-16" />
              <div className="h-6 bg-muted rounded w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Filter row + view toggle */}
      <div className="flex items-center gap-2">
        <div className="h-8 bg-muted rounded flex-1" />
        <div className="h-8 bg-muted rounded flex-1" />
        <div className="h-8 bg-muted rounded w-16 shrink-0" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        {/* Header row */}
        <div className="bg-muted/40 px-4 py-2.5 grid grid-cols-[2rem_1fr_6rem_7rem_8rem_5rem_2rem] gap-4 border-b border-border/40">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-2.5 bg-muted rounded" />
          ))}
        </div>
        {/* Data rows */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 grid grid-cols-[2rem_1fr_6rem_7rem_8rem_5rem_2rem] gap-4 border-b border-border/40 last:border-0">
            <div className="h-4 bg-muted rounded-full w-4 self-center" />
            <div className="space-y-1.5">
              <div className="h-3.5 bg-muted rounded w-3/4" />
              <div className="h-2.5 bg-muted rounded w-1/2" />
            </div>
            <div className="h-5 bg-muted rounded-full w-14 self-center" />
            <div className="h-3.5 bg-muted rounded w-20 self-center" />
            <div className="h-3.5 bg-muted rounded w-24 self-center" />
            <div className="h-5 bg-muted rounded-full w-16 self-center" />
            <div className="h-4 bg-muted rounded w-4 self-center" />
          </div>
        ))}
      </div>
    </div>
  );
}
