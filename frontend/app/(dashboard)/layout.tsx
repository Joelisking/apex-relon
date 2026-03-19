'use client';

import {
  AppSidebar,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/layout/AppSidebar';
import { Separator } from '@/components/ui/separator';
import { useRequireAuth } from '@/hooks/use-require-auth';
import NotificationBell from '@/components/notifications/NotificationBell';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { CompleteProfileModal } from '@/components/auth/CompleteProfileModal';
import { Search } from 'lucide-react';

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
              alt="Apex"
              className="h-5 w-auto"
            />
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(event);
              }}
              className="ml-4 flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors hidden sm:flex">
              <Search className="h-3.5 w-3.5" />
              <span>Search...</span>
              <kbd className="ml-2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </header>
          <CommandPalette />
          <CompleteProfileModal />
          <main className="flex-1 overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
