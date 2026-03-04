export default function ProjectsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-32"></div>
          <div className="h-4 bg-muted rounded w-48"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 bg-muted rounded w-24"></div>
          <div className="h-9 bg-muted rounded w-36"></div>
          <div className="h-9 bg-muted rounded w-20"></div>
        </div>
      </div>

      {/* Date filter bar */}
      <div className="h-9 bg-muted rounded w-64"></div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-card border rounded-lg p-4 space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-7 bg-muted rounded w-1/3"></div>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 bg-muted rounded w-2/3"></div>
            {[...Array(3)].map((_, j) => (
              <div
                key={j}
                className="bg-card rounded-lg border p-4 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
