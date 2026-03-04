'use client';

import {
  AppSidebar,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/layout/AppSidebar';
import { Separator } from '@/components/ui/separator';
import { useRequireAuth } from '@/hooks/use-require-auth';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <div className="print:hidden">
          <AppSidebar />
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <header className="print:hidden flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <img
              src="/logo-black-transparent.svg"
              alt="Relon"
              className="h-5 w-auto"
            />
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
