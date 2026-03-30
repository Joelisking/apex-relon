'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileSignature, FolderKanban, PenLine, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { quotesApi } from '@/lib/api/quotes-client';
import { projectsApi } from '@/lib/api/projects-client';
import { STATUS_COLORS, formatCurrency } from '@/components/quotes/quote-utils';
import type { Quote, Project } from '@/lib/types';

type Source = 'quote' | 'project' | 'manual';

interface ProposalSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (args: { quote?: Quote; project?: Project }) => void;
}

const SOURCE_OPTIONS: { id: Source; label: string; description: string; icon: React.ElementType }[] = [
  {
    id: 'quote',
    label: 'From a Quote',
    description: 'Pre-fill from quote data including fee and client info',
    icon: FileSignature,
  },
  {
    id: 'project',
    label: 'From a Project',
    description: 'Pre-fill from project and client info',
    icon: FolderKanban,
  },
  {
    id: 'manual',
    label: 'Fill manually',
    description: 'Start with a blank form and enter all details yourself',
    icon: PenLine,
  },
];

export default function ProposalSourceDialog({
  open,
  onOpenChange,
  onContinue,
}: ProposalSourceDialogProps) {
  const [source, setSource] = useState<Source>('quote');
  const [search, setSearch] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: quotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quotesApi.getAll(),
    enabled: open && source === 'quote',
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    enabled: open && source === 'project',
  });

  const handleSourceChange = (s: Source) => {
    setSource(s);
    setSearch('');
    setSelectedQuote(null);
    setSelectedProject(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSource('quote');
      setSearch('');
      setSelectedQuote(null);
      setSelectedProject(null);
    }, 200);
  };

  const handleContinue = () => {
    handleClose();
    if (source === 'quote') onContinue({ quote: selectedQuote ?? undefined });
    else if (source === 'project') onContinue({ project: selectedProject ?? undefined });
    else onContinue({});
  };

  const canContinue =
    source === 'manual' ||
    (source === 'quote' && selectedQuote !== null) ||
    (source === 'project' && selectedProject !== null);

  const filteredQuotes = quotes.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const num = String(q.quoteNumber).padStart(4, '0');
    const client = q.lead?.company ?? q.lead?.contactName ?? q.client?.name ?? '';
    return `q-${num}`.includes(s) || client.toLowerCase().includes(s) || (q.project?.name ?? '').toLowerCase().includes(s);
  });

  const filteredProjects = projects.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      (p.client?.name ?? '').toLowerCase().includes(s) ||
      (p.jobNumber ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Generate Proposal</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden px-6 pb-0 gap-4">
          {/* Source selector */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {SOURCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = source === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSourceChange(opt.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-center transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                  )}>
                  <Icon className="h-4 w-4" />
                  <span className={cn('text-[12px] font-medium', selected ? 'text-primary' : 'text-foreground')}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Source description */}
          <p className="text-[12px] text-muted-foreground shrink-0 -mt-1">
            {SOURCE_OPTIONS.find((o) => o.id === source)?.description}
          </p>

          {/* Quote picker */}
          {source === 'quote' && (
            <div className="flex flex-col flex-1 overflow-hidden gap-2 min-h-0">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by quote number, client, or project…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-sm h-8"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {loadingQuotes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredQuotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {search ? 'No quotes match your search.' : 'No quotes found.'}
                  </p>
                ) : (
                  filteredQuotes.map((quote) => {
                    const num = String(quote.quoteNumber).padStart(4, '0');
                    const entity = quote.lead?.company ?? quote.lead?.contactName ?? quote.client?.name ?? null;
                    const isSelected = selectedQuote?.id === quote.id;
                    return (
                      <button
                        key={quote.id}
                        onClick={() => setSelectedQuote(isSelected ? null : quote)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:bg-muted/50 hover:border-border/60',
                        )}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium text-foreground">Q-{num}</span>
                            {entity && (
                              <span className="text-[12px] text-muted-foreground truncate">{entity}</span>
                            )}
                            {quote.project?.name && (
                              <span className="text-[11px] text-muted-foreground/70 truncate">
                                · {quote.project.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[12px] text-muted-foreground tabular-nums">
                            {formatCurrency(quote.total, quote.currency)}
                          </span>
                          <Badge className={cn('text-[10px]', STATUS_COLORS[quote.status])}>
                            {quote.status}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Project picker */}
          {source === 'project' && (
            <div className="flex flex-col flex-1 overflow-hidden gap-2 min-h-0">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by project name or client…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-sm h-8"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {loadingProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {search ? 'No projects match your search.' : 'No projects found.'}
                  </p>
                ) : (
                  filteredProjects.map((proj) => {
                    const isSelected = selectedProject?.id === proj.id;
                    return (
                      <button
                        key={proj.id}
                        onClick={() => setSelectedProject(isSelected ? null : proj)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:bg-muted/50 hover:border-border/60',
                        )}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{proj.name}</p>
                          {proj.client?.name && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{proj.client.name}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{proj.status}</Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Manual mode — spacer to keep footer visible */}
          {source === 'manual' && <div className="flex-1" />}
        </div>

        <DialogFooter className="px-6 py-4 mt-2 border-t border-border/40 shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleContinue} disabled={!canContinue} className="gap-1.5">
            Continue
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
