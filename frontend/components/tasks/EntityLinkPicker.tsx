'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Search,
  X,
  Briefcase,
  Users,
  FolderKanban,
  Link2,
  CheckCircle2,
  Unlink,
} from 'lucide-react';
import { leadsApi, clientsApi } from '@/lib/api/client';
import { projectsApi } from '@/lib/api/projects-client';
import type { Lead, Client, Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type EntityType = 'LEAD' | 'CLIENT' | 'PROJECT';
type FilterValue = 'ALL' | EntityType;

interface EntityOption {
  id: string;
  type: EntityType;
  label: string;
  sublabel?: string;
  serviceTypeId?: string;
}

interface EntityLinkPickerProps {
  entityType: string;
  entityId: string;
  onChange: (entityType: string, entityId: string, serviceTypeId?: string) => void;
}

const TYPE_META = {
  LEAD: {
    label: 'Lead',
    plural: 'Leads',
    icon: Users,
    dot: 'bg-violet-500',
    pill: 'bg-violet-100 text-violet-700 border-violet-200',
    pillActive: 'bg-violet-600 text-white border-violet-600',
    check: 'text-violet-600',
    badge: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
  CLIENT: {
    label: 'Customer',
    plural: 'Customers',
    icon: Briefcase,
    dot: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-700 border-blue-200',
    pillActive: 'bg-blue-600 text-white border-blue-600',
    check: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  PROJECT: {
    label: 'Project',
    plural: 'Projects',
    icon: FolderKanban,
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pillActive: 'bg-emerald-600 text-white border-emerald-600',
    check: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
} as const;

const ENTITY_TYPES: EntityType[] = ['LEAD', 'CLIENT', 'PROJECT'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EntityLinkPicker({
  entityType,
  entityId,
  onChange,
}: EntityLinkPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('ALL');
  const [allOptions, setAllOptions] = useState<EntityOption[]>([]);
  const [asyncLabel, setAsyncLabel] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open || allOptions.length > 0) return;
    Promise.all([
      leadsApi.getAll().catch((): Lead[] => []),
      clientsApi.getAll().catch((): Client[] => []),
      projectsApi.getAll().catch((): Project[] => []),
    ]).then(([leads, clients, projects]) => {
      setAllOptions([
        ...leads.map((l) => ({
          id: l.id,
          type: 'LEAD' as EntityType,
          label: l.contactName,
          sublabel: l.company,
          serviceTypeId: l.serviceTypeId ?? undefined,
        })),
        ...clients.map((c) => ({
          id: c.id,
          type: 'CLIENT' as EntityType,
          label: c.name,
          sublabel:
            [c.segment, c.industry].filter(Boolean).join(' · ') ||
            undefined,
        })),
        ...projects.map((p) => ({
          id: p.id,
          type: 'PROJECT' as EntityType,
          label: p.name,
          sublabel: p.client?.name,
          serviceTypeId: p.serviceTypeId ?? undefined,
        })),
      ]);
    });
  }, [open, allOptions.length]);

  // Focus search when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  const loading = open && allOptions.length === 0;

  // ------------------------------------------------------------------
  // Resolve display label
  // ------------------------------------------------------------------
  const resolvedLabel = useMemo(() => {
    if (!entityType || !entityId) return '';
    return (
      allOptions.find(
        (o) => o.type === entityType && o.id === entityId,
      )?.label ?? ''
    );
  }, [entityType, entityId, allOptions]);

  useEffect(() => {
    if (!entityType || !entityId || resolvedLabel) return;
    let cancelled = false;
    if (entityType === 'LEAD') {
      leadsApi
        .getById(entityId)
        .then((l) => {
          if (!cancelled) setAsyncLabel(l.contactName);
        })
        .catch(() => {});
    } else if (entityType === 'CLIENT') {
      clientsApi
        .getById(entityId)
        .then((c) => {
          if (!cancelled) setAsyncLabel(c.name);
        })
        .catch(() => {});
    } else if (entityType === 'PROJECT') {
      projectsApi
        .getById(entityId)
        .then((p) => {
          if (!cancelled) setAsyncLabel(p.name);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId, resolvedLabel]);

  const selectedLabel = resolvedLabel || asyncLabel;
  const hasSelection = !!entityType && !!entityId;
  const selectedMeta = hasSelection
    ? TYPE_META[entityType as EntityType]
    : null;

  // ------------------------------------------------------------------
  // Filtering & grouping
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOptions.filter((o) => {
      const matchesFilter = filter === 'ALL' || o.type === filter;
      const matchesQuery =
        !q ||
        o.label.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [allOptions, query, filter]);

  const grouped = useMemo(
    () =>
      ENTITY_TYPES.map((type) => ({
        type,
        items: filtered.filter((o) => o.type === type),
      })).filter((g) => g.items.length > 0),
    [filtered],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        ENTITY_TYPES.map((t) => [
          t,
          allOptions.filter((o) => o.type === t).length,
        ]),
      ) as Record<EntityType, number>,
    [allOptions],
  );

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleSelect = useCallback(
    (option: EntityOption) => {
      onChange(option.type, option.id, option.serviceTypeId);
      setAsyncLabel(option.label);
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = () => {
    onChange('', '', undefined);
    setAsyncLabel('');
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <>
      {/* ── Trigger ── */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
          Link to Record
        </p>

        {hasSelection ? (
          <div className="flex items-center gap-2 pl-3 pr-1.5 h-9 rounded-md border border-input bg-background text-sm">
            <span
              className={cn(
                'shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded',
                selectedMeta?.badge,
              )}>
              {selectedMeta?.label}
            </span>
            <span className="flex-1 min-w-0 truncate font-medium">
              {selectedLabel}
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1">
              Change
            </button>
            <div className="w-px h-4 bg-border/60 shrink-0" />
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-2 px-3 h-9 rounded-md border border-dashed border-border/70 bg-background text-sm text-muted-foreground hover:bg-muted/30 hover:border-border transition-colors">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span>Link to a lead, client or project…</span>
          </button>
        )}
      </div>

      {/* ── Picker Dialog ── */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setQuery('');
            setFilter('ALL');
          }
        }}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/60 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              Link to Record
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 h-10 border-b border-border/60 shrink-0">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, company…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/40 bg-muted/20 shrink-0">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={cn(
                'h-6 px-2.5 rounded-full text-[11px] font-medium border transition-all',
                filter === 'ALL'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border/60 hover:bg-muted/50',
              )}>
              All
              {allOptions.length > 0 && (
                <span className="ml-1 opacity-60">
                  {allOptions.length}
                </span>
              )}
            </button>
            {ENTITY_TYPES.map((t) => {
              const m = TYPE_META[t];
              const count = counts[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  className={cn(
                    'h-6 px-2.5 rounded-full text-[11px] font-medium border transition-all',
                    filter === t ? m.pillActive : m.pill,
                    filter !== t && 'hover:opacity-80',
                  )}>
                  {m.plural}
                  {count > 0 && (
                    <span className="ml-1 opacity-60">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Results — scrollable */}
          <div
            className="overflow-y-auto flex-1 min-h-0"
            style={{ maxHeight: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Search className="h-4 w-4 opacity-30" />
                <p className="text-xs">No records found</p>
              </div>
            ) : (
              grouped.map(({ type, items }) => {
                const meta = TYPE_META[type];
                return (
                  <div key={type}>
                    {/* Group header (All view only) */}
                    {filter === 'ALL' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/25 border-b border-t border-border/30 first:border-t-0">
                        <div
                          className={cn(
                            'h-1.5 w-1.5 rounded-full shrink-0',
                            meta.dot,
                          )}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {meta.plural}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {items.length}
                        </span>
                      </div>
                    )}

                    {items.map((option) => {
                      const isSelected =
                        entityId === option.id &&
                        entityType === option.type;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelect(option)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/20 last:border-0',
                            isSelected
                              ? 'bg-muted/50'
                              : 'hover:bg-muted/30',
                          )}>
                          <div
                            className={cn(
                              'h-1.5 w-1.5 rounded-full shrink-0 mt-0.75',
                              meta.dot,
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate leading-tight">
                              {option.label}
                            </p>
                            {option.sublabel && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {option.sublabel}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle2
                              className={cn(
                                'h-4 w-4 shrink-0',
                                meta.check,
                              )}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-border/50 bg-muted/10 shrink-0">
            {hasSelection ? (
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  setOpen(false);
                }}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
                <Unlink className="h-3.5 w-3.5" />
                Remove link
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50">
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
