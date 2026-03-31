'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Download, FileSignature, FolderKanban, PenLine,
  Search, FileText, Check, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { quotesApi } from '@/lib/api/quotes-client';
import { projectsApi } from '@/lib/api/projects-client';
import { proposalTemplatesApi } from '@/lib/api/proposal-templates-client';
import { formatCurrency, STATUS_COLORS } from '@/components/quotes/quote-utils';
import ProposalPreview from './ProposalPreview';
import type { Quote, Project } from '@/lib/types';

type Source = 'quote' | 'project' | 'manual';

const SOURCE_OPTIONS: { id: Source; label: string; icon: React.ElementType }[] = [
  { id: 'quote', label: 'From Quote', icon: FileSignature },
  { id: 'project', label: 'From Project', icon: FolderKanban },
  { id: 'manual', label: 'Manual', icon: PenLine },
];

const SALUTATIONS = ['Mr.', 'Mrs.', 'Ms.', 'Dr.'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function splitName(name?: string | null): { first: string; last: string } {
  if (!name?.trim()) return { first: '', last: '' };
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

export default function ProposalEditor() {
  const router = useRouter();

  // Source selection
  const [source, setSource] = useState<Source>('quote');
  const [search, setSearch] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Form fields
  const [salutation, setSalutation] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [zip, setZip] = useState('');
  const [timeline, setTimeline] = useState('');
  const [proposalDate, setProposalDate] = useState(todayIso);
  const [projectName, setProjectName] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);

  const [generating, setGenerating] = useState(false);

  // Data queries
  const { data: quotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quotesApi.getAll(),
    enabled: source === 'quote',
  });
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    enabled: source === 'project',
  });
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['proposal-templates'],
    queryFn: () => proposalTemplatesApi.getAll(),
  });
  const { data: templateContent, isLoading: loadingContent } = useQuery({
    queryKey: ['proposal-template-content', selectedTemplateId],
    queryFn: () => proposalTemplatesApi.getContent(selectedTemplateId),
    enabled: !!selectedTemplateId,
  });

  // Pre-fill from quote
  useEffect(() => {
    if (!selectedQuote) return;
    const { first, last } = splitName(selectedQuote.lead?.contactName);
    setFirstName(first);
    setLastName(last);
    setProjectName(selectedQuote.project?.name ?? '');
  }, [selectedQuote]);

  // Pre-fill from project
  useEffect(() => {
    if (!selectedProject) return;
    setProjectName(selectedProject.name ?? '');
  }, [selectedProject]);

  const handleSourceChange = (s: Source) => {
    setSource(s);
    setSearch('');
    setSelectedQuote(null);
    setSelectedProject(null);
  };

  const clientName =
    selectedQuote?.lead?.company ||
    selectedQuote?.client?.name ||
    selectedProject?.client?.name ||
    selectedProject?.lead?.company ||
    null;

  const addressFilled = !!(address || city || stateVal || zip);

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;
    setGenerating(true);
    try {
      const res = await proposalTemplatesApi.generate(selectedTemplateId, {
        quoteId: selectedQuote?.id,
        projectId: selectedProject?.id,
        salutation: salutation || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        address: address || undefined,
        city: city || undefined,
        state: stateVal || undefined,
        zip: zip || undefined,
        timeline: timeline || undefined,
        proposalDate: proposalDate || undefined,
        projectName: projectName || undefined,
        projectAddress: projectAddress || undefined,
        totalAmount: !selectedQuote && totalAmount ? totalAmount : undefined,
        saveAddressToClient: saveAddress && addressFilled ? true : undefined,
      });
      // Auto-download
      try {
        const fileId = res.downloadUrl.match(/\/generated\/([^/]+)\/download/)?.[1];
        if (fileId) {
          const blob = await proposalTemplatesApi.downloadGenerated(fileId);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch { /* silent — user can download from Proposals list */ }
      toast.success(clientName ? `Proposal saved to ${clientName}'s files` : 'Proposal generated');
      router.push('/proposals');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate proposal');
    } finally {
      setGenerating(false);
    }
  };

  // Filtered lists
  const filteredQuotes = quotes.filter((q) => {
    const s = search.toLowerCase();
    if (!s) return true;
    const num = String(q.quoteNumber).padStart(4, '0');
    const entity = q.lead?.company ?? q.lead?.contactName ?? q.client?.name ?? '';
    return `q-${num}`.includes(s) || entity.toLowerCase().includes(s);
  });
  const filteredProjects = projects.filter((p) => {
    const s = search.toLowerCase();
    if (!s) return true;
    return p.name.toLowerCase().includes(s) || (p.client?.name ?? '').toLowerCase().includes(s);
  });

  const previewData = {
    salutation, firstName, lastName,
    companyName: clientName ?? '',
    address, city, state: stateVal, zip,
    totalAmount, timeline, proposalDate,
    projectName, projectAddress,
  };

  return (
    <div className="flex flex-col bg-background" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/proposals')}
            className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Proposals
          </Button>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm font-semibold">New Proposal</span>
        </div>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generating || !selectedTemplateId}
          className="gap-1.5">
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {generating ? 'Generating…' : 'Generate & Download'}
        </Button>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left: form */}
        <div className="w-[45%] overflow-y-auto border-r border-border/60">
          {/* Source */}
          <div className="px-6 py-4 border-b border-border/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
              Source
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SOURCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const sel = source === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSourceChange(opt.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-center transition-colors',
                      sel ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/40',
                    )}>
                    <Icon className={cn('h-4 w-4', sel ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-[12px] font-medium', sel ? 'text-primary' : 'text-foreground')}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quote / Project picker */}
          {source !== 'manual' && (
            <div className="px-6 py-4 border-b border-border/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
                {source === 'quote' ? 'Select Quote' : 'Select Project'}
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={source === 'quote' ? 'Search quotes…' : 'Search projects…'}
                  className="pl-8 text-sm h-8"
                />
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5">
                {source === 'quote' && (
                  loadingQuotes ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredQuotes.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground text-center py-4">No quotes found</p>
                  ) : filteredQuotes.map((q) => {
                    const num = String(q.quoteNumber).padStart(4, '0');
                    const entity = q.lead?.company ?? q.lead?.contactName ?? q.client?.name ?? null;
                    const sel = selectedQuote?.id === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQuote(sel ? null : q)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors',
                          sel ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50 hover:border-border/60',
                        )}>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className="text-[12px] font-medium shrink-0">Q-{num}</span>
                          {entity && <span className="text-[12px] text-muted-foreground truncate">{entity}</span>}
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {formatCurrency(q.total, q.currency)}
                        </span>
                        <Badge className={cn('text-[10px] shrink-0', STATUS_COLORS[q.status] ?? '')}>
                          {q.status}
                        </Badge>
                      </button>
                    );
                  })
                )}
                {source === 'project' && (
                  loadingProjects ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground text-center py-4">No projects found</p>
                  ) : filteredProjects.map((p) => {
                    const sel = selectedProject?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProject(sel ? null : p)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors',
                          sel ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50 hover:border-border/60',
                        )}>
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] font-medium truncate">{p.name}</span>
                          {p.client?.name && (
                            <span className="text-[11px] text-muted-foreground ml-1.5">{p.client.name}</span>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{p.status}</Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Template picker */}
          <div className="px-6 py-4 border-b border-border/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
              Template
            </p>
            {loadingTemplates ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-4">
                No templates. Go to Admin → Quote Settings → Proposal Templates.
              </p>
            ) : (
              <div className="space-y-1.5">
                {templates.map((t) => {
                  const sel = selectedTemplateId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                        sel ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/40',
                      )}>
                      <FileText className={cn('h-4 w-4 shrink-0', sel ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-foreground">{t.name}</span>
                        {t.serviceType && (
                          <Badge variant="secondary" className="text-[10px]">{t.serviceType.name}</Badge>
                        )}
                      </div>
                      {sel && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details form */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Proposal Details
            </p>

            {/* Contact */}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-2">Contact</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground block mb-1">Salutation</Label>
                  <Select value={salutation || 'none'} onValueChange={(v) => setSalutation(v === 'none' ? '' : v)}>
                    <SelectTrigger className="text-sm h-8"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {SALUTATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground block mb-1">First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="text-sm h-8" placeholder="First" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground block mb-1">Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="text-sm h-8" placeholder="Last" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-2">Client Address</p>
              <div className="space-y-2">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} className="text-sm h-8" placeholder="Street address" />
                <div className="grid grid-cols-3 gap-2">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} className="text-sm h-8" placeholder="City" />
                  <Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="text-sm h-8" placeholder="State" />
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} className="text-sm h-8" placeholder="ZIP" />
                </div>
                {addressFilled && clientName && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <Checkbox id="save-addr" checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                    <label htmlFor="save-addr" className="text-[12px] text-muted-foreground cursor-pointer">
                      Save this address to {clientName}&apos;s record
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Project */}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-2">Project</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground block mb-1">Project Name</Label>
                  <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="text-sm h-8" placeholder="Project name" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground block mb-1">Project Address</Label>
                  <Input value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} className="text-sm h-8" placeholder="Site address" />
                </div>
              </div>
            </div>

            {/* Timeline, Date, Fee */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground block mb-1">Timeline</Label>
                <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} className="text-sm h-8" placeholder="3-4 weeks" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground block mb-1">Proposal Date</Label>
                <Input type="date" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} className="text-sm h-8" />
              </div>
              {!selectedQuote && (
                <div>
                  <Label className="text-[10px] text-muted-foreground block mb-1">Fee</Label>
                  <Input value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="text-sm h-8" placeholder="$5,000.00" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: preview */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedTemplateId ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-8 bg-muted/20">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Select a template</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a template on the left to see a live preview
                </p>
              </div>
            </div>
          ) : loadingContent ? (
            <div className="flex items-center justify-center flex-1 bg-muted/20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ProposalPreview
              paragraphs={templateContent?.paragraphs ?? []}
              data={previewData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
