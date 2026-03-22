'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Search } from 'lucide-react';
import { clientsApi } from '@/lib/api/client';
import type { Client } from '@/lib/types';

interface ClientSwitcherProps {
  currentClientId: string;
  currentClientName: string;
}

export function ClientSwitcher({
  currentClientId,
  currentClientName,
}: ClientSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // null = not yet loaded; array = loaded (may be empty)
  const [clients, setClients] = useState<Client[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setClients(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    clientsApi.getAll().then(setClients).catch(console.error);
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () =>
      document.removeEventListener('mousedown', handleClick);
  }, [close]);

  function navigate(id: string) {
    close();
    if (id !== currentClientId) router.push(`/clients/${id}`);
  }

  const loading = clients === null;
  const filtered = (clients ?? []).filter((c) => {
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.individualName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm font-normal text-foreground hover:text-foreground transition-colors group">
        <span className="max-w-65 truncate">{currentClientName}</span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-80 rounded-lg border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find client..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === 'Escape' && close()}
            />
            <kbd className="text-[10px] text-muted-foreground font-mono border border-border/50 rounded px-1">
              Esc
            </kbd>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Loading…
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No clients found
              </p>
            ) : (
              filtered.map((c) => {
                const isCurrent = c.id === currentClientId;
                const display = c.individualName
                  ? `${c.individualName} (${c.name})`
                  : c.name;
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(c.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors ${isCurrent ? 'bg-accent/50' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm truncate ${isCurrent ? 'font-semibold' : 'font-medium'}`}>
                        {display}
                      </p>
                      {c.industry && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.industry}
                        </p>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
