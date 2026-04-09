'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Download, UserRound, PenLine,
  Search, FileText, Check, Loader2, ChevronDown, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { leadsApi } from '@/lib/api/client';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import { proposalTemplatesApi } from '@/lib/api/proposal-templates-client';
import ProposalPreview from './ProposalPreview';
import DynamicFieldsSection from './DynamicFieldsSection';
import TableEditorSection from './TableEditorSection';
import AdvancedEditSection from './AdvancedEditSection';
import type { Lead, CostBreakdown } from '@/lib/types';
import type { ProposalFormSnapshot } from '@/lib/api/proposal-templates-client';

type Source = 'lead' | 'manual';
type ViewMode = 'preview' | 'advanced';

const SOURCE_OPTIONS: { id: Source; label: string; icon: React.ElementType }[] = [
  { id: 'lead', label: 'From Lead', icon: UserRound },
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

function formatCurrencyDisplay(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ProposalEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledLeadId = searchParams.get('leadId');
  const prefilledBreakdownId = searchParams.get('costBreakdownId');
  const prefilledTemplateId = searchParams.get('templateId');
  const prefilledProposalId = searchParams.get('proposalId');

  const [source, setSource] = useState<Source>(prefilledLeadId ? 'lead' : 'manual');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<CostBreakdown | null>(null);
  const [showBreakdownPicker, setShowBreakdownPicker] = useState(true);

  const [selectedTemplateId, setSelectedTemplateId] = useState(prefilledTemplateId ?? '');

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

  const [sameAddress, setSameAddress] = useState(false);

  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const [tableCellValues, setTableCellValues] = useState<Record<string, string>>({});
  const [paragraphOverrides, setParagraphOverrides] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  // Stores the saved form inputs from an existing proposal (for re-editing)
  const [formSnapshot, setFormSnapshot] = useState<ProposalFormSnapshot | null>(null);

  const breakdownAmountMismatch = useMemo(() => {
    if (!selectedBreakdown || !totalAmount) return false;
    const entered = parseFloat(totalAmount.replace(/[^0-9.]/g, ''));
    return !isNaN(entered) && Math.abs(entered - selectedBreakdown.totalEstimatedCost) > 0.01;
  }, [selectedBreakdown, totalAmount]);

  // Formatted client address for the "same as client address" checkbox
  const clientAddressFormatted = useMemo(() => {
    const cityStateZip = [
      city,
      stateVal && zip ? `${stateVal} ${zip}` : stateVal || zip,
    ].filter(Boolean).join(', ');
    return [address, cityStateZip].filter(Boolean).join(', ');
  }, [address, city, stateVal, zip]);

  const [generating, setGenerating] = useState(false);

  // Data queries
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll(),
    enabled: source === 'lead',
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
  const { data: leadBreakdowns = [], isLoading: loadingBreakdowns } = useQuery({
    queryKey: ['cost-breakdowns', selectedLead?.id],
    queryFn: () => costBreakdownApi.getAll({ leadId: selectedLead!.id }),
    enabled: !!selectedLead,
  });

  // Pre-fill from URL param lead
  const { data: prefilledLead } = useQuery({
    queryKey: ['lead', prefilledLeadId],
    queryFn: () => leadsApi.getById(prefilledLeadId!),
    enabled: !!prefilledLeadId,
  });
  const { data: prefilledBreakdown } = useQuery({
    queryKey: ['cost-breakdown', prefilledBreakdownId],
    queryFn: () => costBreakdownApi.getOne(prefilledBreakdownId!),
    enabled: !!prefilledBreakdownId,
  });

  const { data: prefilledProposal } = useQuery({
    queryKey: ['proposal', prefilledProposalId],
    queryFn: () => proposalTemplatesApi.getProposalById(prefilledProposalId!),
    enabled: !!prefilledProposalId,
  });

  // Reset dynamic state when template changes; seed from snapshot if re-editing
  useEffect(() => {
    if (!templateContent) return;
    const snap = formSnapshot;
    const initial: Record<string, string> = {};
    for (const field of templateContent.dynamicFields) {
      initial[field] = snap?.dynamicValues?.[field] ?? '';
    }
    setDynamicValues(initial);
    setTableCellValues(snap?.tableCellValues ?? {});
    setParagraphOverrides(snap?.paragraphOverrides ?? {});
  }, [templateContent, formSnapshot]);

  // Apply URL param pre-fills
  useEffect(() => {
    if (!prefilledLead) return;
    setSelectedLead(prefilledLead as unknown as Lead);
  }, [prefilledLead]);

  useEffect(() => {
    if (!prefilledBreakdown) return;
    setSelectedBreakdown(prefilledBreakdown);
  }, [prefilledBreakdown]);

  // Pre-fill form from saved snapshot when re-editing an existing proposal
  useEffect(() => {
    if (!prefilledProposal?.formSnapshot) return;
    const snap = prefilledProposal.formSnapshot as ProposalFormSnapshot;
    setFormSnapshot(snap);
    setSalutation(snap.salutation ?? '');
    setFirstName(snap.firstName ?? '');
    setLastName(snap.lastName ?? '');
    setAddress(snap.address ?? '');
    setCity(snap.city ?? '');
    setStateVal(snap.state ?? '');
    setZip(snap.zip ?? '');
    setTimeline(snap.timeline ?? '');
    if (snap.proposalDate) setProposalDate(snap.proposalDate);
    setProjectName(snap.projectName ?? '');
    setProjectAddress(snap.projectAddress ?? '');
    if (snap.totalAmount) setTotalAmount(snap.totalAmount);
    setSameAddress(false); // project address is explicitly set from snapshot
  }, [prefilledProposal]);

  // Pre-fill form when lead is selected (skipped when re-editing with a saved snapshot)
  useEffect(() => {
    if (!selectedLead) return;
    if (formSnapshot) return; // snapshot takes priority
    const { first, last } = splitName(selectedLead.contactName);
    setFirstName(first);
    setLastName(last);
    if (selectedLead.projectName) setProjectName(selectedLead.projectName);
    if (selectedLead.address) setAddress(selectedLead.address);
    if (selectedLead.city) setCity(selectedLead.city);
    if (selectedLead.state) setStateVal(selectedLead.state);
    if (selectedLead.zip) setZip(selectedLead.zip);
    // When the lead has an address (project/site location), auto-check sameAddress so the
    // Project/Site Address field also reflects it. The user can uncheck to enter a different
    // project address if the site differs from the client's billing address.
    if (selectedLead.address || selectedLead.city || selectedLead.state || selectedLead.zip) {
      setSameAddress(true);
    }
  }, [selectedLead, formSnapshot]);

  // Pre-fill fee from selected breakdown
  useEffect(() => {
    if (!selectedBreakdown) return;
    if (selectedBreakdown.totalEstimatedCost > 0) {
      setTotalAmount(formatCurrencyDisplay(selectedBreakdown.totalEstimatedCost));
    }
  }, [selectedBreakdown]);

  const handleSourceChange = (s: Source) => {
    setSource(s);
    setSearch('');
    setSelectedLead(null);
    setSelectedBreakdown(null);
    setShowBreakdownPicker(false);
    setFirstName('');
    setLastName('');
    setAddress('');
    setCity('');
    setStateVal('');
    setZip('');
    setProjectName('');
    setProjectAddress('');
    setTotalAmount('');
    setSameAddress(false);
  };

  const handleSelectLead = (lead: Lead) => {
    const isDeselecting = selectedLead?.id === lead.id;
    setSelectedLead(isDeselecting ? null : lead);
    if (isDeselecting) {
      setSelectedBreakdown(null);
      setShowBreakdownPicker(false);
      setFirstName('');
      setLastName('');
      setAddress('');
      setCity('');
      setStateVal('');
      setZip('');
      setProjectName('');
      setProjectAddress('');
      setTotalAmount('');
      setSameAddress(false);
    }
  };

  const companyName = selectedLead?.company ?? null;
  const addressFilled = !!(address || city || stateVal || zip);

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;
    setGenerating(true);
    try {
      const res = await proposalTemplatesApi.generate(selectedTemplateId, {
        leadId: selectedLead?.id,
        costBreakdownId: selectedBreakdown?.id,
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
        projectAddress: (sameAddress ? clientAddressFormatted : projectAddress) || undefined,
        totalAmount: totalAmount || undefined,
        saveAddressToClient: saveAddress && addressFilled ? true : undefined,
        dynamicValues: Object.keys(dynamicValues).length > 0 ? dynamicValues : undefined,
        tableCellValues: Object.keys(tableCellValues).length > 0 ? tableCellValues : undefined,
        paragraphOverrides: Object.keys(paragraphOverrides).length > 0 ? paragraphOverrides : undefined,
      });

      // Auto-download
      try {
        const blob = await proposalTemplatesApi.downloadProposal(res.proposalId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName;
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* silent — user can download from Proposals list */ }

      toast.success(companyName ? `Proposal saved to ${companyName}'s files` : 'Proposal generated');
      router.push('/proposals');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate proposal');
    } finally {
      setGenerating(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const s = search.toLowerCase();
    if (!s) return true;
    return (
      l.company.toLowerCase().includes(s) ||
      l.contactName.toLowerCase().includes(s) ||
      (l.projectName ?? '').toLowerCase().includes(s)
    );
  });

  const effectiveProjectAddress = sameAddress ? clientAddressFormatted : projectAddress;

  const previewData = {
    salutation, firstName, lastName,
    companyName: companyName ?? '',
    address, city, state: stateVal, zip,
    totalAmount, timeline, proposalDate,
    projectName, projectAddress: effectiveProjectAddress,
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
          <div className="px-6 py-5 border-b border-border/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
              Source
            </p>
            <div className="grid grid-cols-2 gap-2">
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

          {/* Lead picker */}
          {source === 'lead' && (
            <div className="px-6 py-5 border-b border-border/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                Select Lead
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search leads…"
                  className="pl-8 text-sm h-8"
                />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {loadingLeads ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground text-center py-4">No leads found</p>
                ) : filteredLeads.map((l) => {
                  const sel = selectedLead?.id === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => handleSelectLead(l)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors',
                        sel ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50 hover:border-border/60',
                      )}>
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium block truncate">{l.company}</span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {l.contactName}
                          {l.projectName ? ` · ${l.projectName}` : ''}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{l.stage}</Badge>
                      {sel && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Cost breakdown picker (shown when lead selected) */}
              {selectedLead && (
                <div className="mt-4 pt-3 border-t border-border/30">
                  <button
                    onClick={() => setShowBreakdownPicker((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors w-full mb-2">
                    Cost Breakdown
                    <span className="text-[10px] font-normal normal-case tracking-normal ml-0.5">(optional)</span>
                    <ChevronDown className={cn('h-3 w-3 ml-auto transition-transform', showBreakdownPicker && 'rotate-180')} />
                  </button>
                  {showBreakdownPicker && (
                    <div className="space-y-1">
                      {loadingBreakdowns ? (
                        <div className="flex justify-center py-3">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        </div>
                      ) : leadBreakdowns.length === 0 ? (
                        <p className="text-[12px] text-muted-foreground py-2">
                          No cost breakdowns for this lead.
                        </p>
                      ) : leadBreakdowns.map((cb) => {
                        const sel = selectedBreakdown?.id === cb.id;
                        return (
                          <button
                            key={cb.id}
                            onClick={() => setSelectedBreakdown(sel ? null : cb)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors',
                              sel ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50 hover:border-border/60',
                            )}>
                            <div className="flex-1 min-w-0">
                              <span className="text-[12px] font-medium truncate block">{cb.title}</span>
                              {cb.totalEstimatedCost > 0 && (
                                <span className="text-[11px] text-muted-foreground">
                                  {formatCurrencyDisplay(cb.totalEstimatedCost)}
                                </span>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{cb.status}</Badge>
                            {sel && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Template picker */}
          <div className="px-6 py-5 border-b border-border/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
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
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-foreground block truncate">{t.name}</span>
                        {t.serviceType && (
                          <Badge variant="secondary" className="text-[10px] mt-0.5">{t.serviceType.name}</Badge>
                        )}
                      </div>
                      {sel && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic custom fields (template-specific brackets) */}
          <DynamicFieldsSection
            fields={templateContent?.dynamicFields ?? []}
            values={dynamicValues}
            onChange={(name, value) =>
              setDynamicValues((prev) => ({ ...prev, [name]: value }))
            }
          />

          {/* Editable table data */}
          <TableEditorSection
            tables={templateContent?.tables ?? []}
            values={tableCellValues}
            onChange={(key, value) =>
              setTableCellValues((prev) => ({ ...prev, [key]: value }))
            }
          />

          {/* Details form */}
          <div className="px-6 py-5 space-y-5">
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
                {addressFilled && companyName && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <Checkbox id="save-addr" checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                    <label htmlFor="save-addr" className="text-[12px] text-muted-foreground cursor-pointer">
                      Save this address to {companyName}&apos;s record
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Project */}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-2">Project</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground block mb-1">Project Name</Label>
                  <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="text-sm h-8" placeholder="Project name" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground block mb-1">Project / Site Address</Label>
                  <Input
                    value={sameAddress ? clientAddressFormatted : projectAddress}
                    onChange={(e) => setProjectAddress(e.target.value)}
                    className="text-sm h-8"
                    placeholder="Site address"
                    readOnly={sameAddress}
                  />
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <Checkbox
                    id="same-address"
                    checked={sameAddress}
                    onCheckedChange={(v) => {
                      setSameAddress(!!v);
                      if (!v) setProjectAddress('');
                    }}
                  />
                  <label htmlFor="same-address" className="text-[12px] text-muted-foreground cursor-pointer">
                    Same as client address
                  </label>
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
              <div>
                <Label className="text-[10px] text-muted-foreground block mb-1">
                  Fee{selectedBreakdown ? ' (from breakdown)' : ''}
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">$</span>
                  <Input
                    value={totalAmount.replace(/^\$/, '')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                      setTotalAmount(raw ? `$${raw}` : '');
                    }}
                    onBlur={() => {
                      const num = parseFloat(totalAmount.replace(/[^0-9.]/g, ''));
                      if (!isNaN(num)) setTotalAmount(formatCurrencyDisplay(num));
                      else setTotalAmount('');
                    }}
                    className={cn('text-sm h-8 pl-6', breakdownAmountMismatch && 'border-amber-400 focus-visible:ring-amber-400/30')}
                    placeholder="5,000.00"
                  />
                </div>
                {breakdownAmountMismatch && (
                  <p className="text-[10px] text-amber-600 mt-1 leading-snug">
                    Differs from breakdown ({formatCurrencyDisplay(selectedBreakdown!.totalEstimatedCost)})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: preview / advanced edit */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Right pane header — only shown when a template is selected */}
          {selectedTemplateId && !loadingContent && (
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/60 bg-background shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {viewMode === 'preview' ? 'Live Preview' : 'Advanced Edit'}
              </span>
              <div className="flex items-center gap-2">
                {viewMode === 'advanced' && Object.keys(paragraphOverrides).length > 0 && (
                  <button
                    onClick={() => setParagraphOverrides({})}
                    title="Discard all advanced edits"
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3 w-3" />
                    Discard all
                  </button>
                )}
                <div className="flex gap-0.5">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded transition-colors',
                      viewMode === 'preview'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}>
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode('advanced')}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded transition-colors',
                      viewMode === 'advanced'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}>
                    Advanced Edit
                    {Object.keys(paragraphOverrides).length > 0 && (
                      <span className="ml-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1 py-0.5 rounded-full">
                        {Object.keys(paragraphOverrides).length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

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
          ) : viewMode === 'advanced' ? (
            <AdvancedEditSection
              paragraphs={templateContent?.editableParagraphs ?? []}
              overrides={paragraphOverrides}
              onChange={(idx, val) =>
                setParagraphOverrides((prev) => ({ ...prev, [String(idx)]: val }))
              }
              onReset={(idx) =>
                setParagraphOverrides((prev) => {
                  const next = { ...prev };
                  delete next[String(idx)];
                  return next;
                })
              }
            />
          ) : (
            <ProposalPreview
              paragraphs={templateContent?.paragraphs ?? []}
              data={previewData}
              dynamicValues={dynamicValues}
            />
          )}
        </div>
      </div>
    </div>
  );
}
