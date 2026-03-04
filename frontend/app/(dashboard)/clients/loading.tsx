export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="flex space-x-2">
          <div className="h-10 bg-muted rounded w-32"></div>
          <div className="h-10 bg-muted rounded w-24"></div>
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-muted rounded w-2/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-8 w-8 bg-muted rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
            <div className="flex space-x-2">
              <div className="h-8 bg-muted rounded flex-1"></div>
              <div className="h-8 bg-muted rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
