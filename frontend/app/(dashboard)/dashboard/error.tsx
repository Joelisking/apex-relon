'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="bg-card rounded-xl shadow-lg border p-8 max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-2xl font-display mb-2">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mb-6">
          Failed to load dashboard data. Please check if the backend server is running.
        </p>
        <Button onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
