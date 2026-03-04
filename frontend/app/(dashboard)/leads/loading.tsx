export default function LeadsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-10 bg-muted rounded w-32"></div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 bg-muted rounded w-2/3"></div>
            {[...Array(3)].map((_, j) => (
              <div key={j} className="bg-card rounded-lg border p-4 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
