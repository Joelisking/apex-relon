export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Section */}
      <div className="h-8 bg-muted rounded w-1/4"></div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-6 space-y-3">
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-6 space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        ))}
      </div>

      {/* AI Summary Section */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="h-6 bg-muted rounded w-1/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="h-4 bg-muted rounded w-4/6"></div>
        </div>
      </div>
    </div>
  );
}
