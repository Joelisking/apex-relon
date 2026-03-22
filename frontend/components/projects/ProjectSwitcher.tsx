'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Search } from 'lucide-react';
import { projectsApi, type Project } from '@/lib/api/projects-client';

interface ProjectSwitcherProps {
  currentProjectId: string;
  currentProjectName: string;
}

function avatarInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProjectSwitcher({
  currentProjectId,
  currentProjectName,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // null = not yet loaded; array = loaded (may be empty)
  const [projects, setProjects] = useState<Project[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setProjects(null);
  }, []);

  // Fetch only in the async callback — no synchronous setState in effect body
  useEffect(() => {
    if (!open) return;
    projectsApi.getAll().then(setProjects).catch(console.error);
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
    if (id !== currentProjectId) router.push(`/projects/${id}`);
  }

  const loading = projects === null;
  const filtered = (projects ?? []).filter((p) => {
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.jobNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm font-normal text-foreground hover:text-foreground transition-colors group">
        <span className="max-w-65 truncate">
          {currentProjectName}
        </span>
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
              placeholder="Find project..."
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
                No projects found
              </p>
            ) : (
              filtered.map((p) => {
                const isCurrent = p.id === currentProjectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(p.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors ${isCurrent ? 'bg-accent/50' : ''}`}>
                    <div
                      className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold"
                      style={{ fontSize: '9px' }}>
                      {avatarInitials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm truncate ${isCurrent ? 'font-semibold' : 'font-medium'}`}>
                        {p.name}
                      </p>
                      {p.jobNumber && (
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {p.jobNumber}
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
