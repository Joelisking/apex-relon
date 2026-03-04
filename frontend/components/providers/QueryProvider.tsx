'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // useState ensures each browser session gets its own QueryClient instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Show cached data immediately, refetch silently in background
            staleTime: 2 * 60 * 1000, // 2 min — data is "fresh" for 2min, no refetch needed
            gcTime: 10 * 60 * 1000, // 10 min — keep unused cache in memory for 10 min
            refetchOnWindowFocus: true, // Silently refresh when user switches back to tab
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
