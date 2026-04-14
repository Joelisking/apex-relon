'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle2, FileText, Download, FilePlus, Save, Plus, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import { settingsApi, leadsApi, serviceItemsApi } from '@/lib/api/client';
import { rolesApi } from '@/lib/api/roles-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { CostBreakdown, CostBreakdownLine, JobType, Lead, ServiceItem } from '@/lib/types';
import CostBreakdownLineCard from './CostBreakdownLineCard';
import CostBreakdownConfigureStep, { type CbConfig } from './CostBreakdownConfigureStep';
import { toast } from 'sonner';

interface Props {
  breakdownId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  FINAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CostBreakdownEditor({ breakdownId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prefilledLeadId = searchParams.get('leadId') ?? '';
  const prefilledProjectId = searchParams.get('projectId') ?? '';
  const prefilledProjectName = searchParams.get('projectName') ?? '';
  const returnTo = searchParams.get('returnTo') ?? '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);

  // Create-mode form
  const [title, setTitle] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

  // Direct expenses (edit mode)
  const [mileageQty, setMileageQty] = useState('');
  const [mileageRate, setMileageRate] = useState('');
  const [lodgingQty, setLodgingQty] = useState('');
  const [lodgingRate, setLodgingRate] = useState('');
  const [perDiemQty, setPerDiemQty] = useState('');
  const [perDiemRate, setPerDiemRate] = useState('');
  const [roundedFee, setRoundedFee] = useState('');
  const [savingExpenses, setSavingExpenses] = useState(false);
  const expenseSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Configure step (create mode)
  const [step, setStep] = useState<'form' | 'configure'>('form');
  const [allServiceItems, setAllServiceItems] = useState<ServiceItem[]>([]);
  const [prePopulated, setPrePopulated] = useState<ServiceItem[]>([]);
  const [fetchingItems, setFetchingItems] = useState(false);

  // Add Line (edit mode)
  const [showAddLine, setShowAddLine] = useState(false);
  const [addLineServiceItemId, setAddLineServiceItemId] = useState('');
  const [addLineLoading, setAddLineLoading] = useState(false);
  const [addLineServiceItems, setAddLineServiceItems] = useState<ServiceItem[]>([]);

  // Auto-populate title + job type from the selected lead
  useEffect(() => {
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (!titleManuallyEdited) {
      setTitle(lead.projectName || lead.company || lead.contactName);
    }
    const inferredJobTypeId = lead.jobTypeId ?? lead.jobType?.id;
    if (inferredJobTypeId) setJobTypeId(inferredJobTypeId);
  }, [leadId, leads, titleManuallyEdited]);

  // Auto-populate title from project name when creating from a project page
  useEffect(() => {
    if (!prefilledProjectName || titleManuallyEdited) return;
    setTitle(prefilledProjectName);
  }, [prefilledProjectName, titleManuallyEdited]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fetchedTypes, fetchedLeads, fetchedRoles] = await Promise.all([
          settingsApi.getJobTypes(),
          leadsApi.getAll(),
          rolesApi.getAll(),
        ]);
        setJobTypes(fetchedTypes);
        setLeads(fetchedLeads);
        setRoles(fetchedRoles);

        // Pre-fill lead + job type from URL param when creating a new breakdown
        if (!breakdownId && prefilledLeadId) {
          setLeadId(prefilledLeadId);
          const lead = fetchedLeads.find((l) => l.id === prefilledLeadId);
          const inferredJobTypeId = lead?.jobTypeId ?? lead?.jobType?.id;
          if (inferredJobTypeId) setJobTypeId(inferredJobTypeId);
        }

        if (breakdownId) {
          const bd = await costBreakdownApi.getOne(breakdownId);
          setBreakdown(bd);
        }
      } catch (err) {
        console.error('Failed to load cost breakdown editor', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [breakdownId]);

  // Seed direct expense fields when breakdown is loaded
  useEffect(() => {
    if (!breakdown) return;
    setMileageQty(breakdown.mileageQty != null ? String(breakdown.mileageQty) : '');
    setMileageRate(breakdown.mileageRate != null ? String(breakdown.mileageRate) : '');
    setLodgingQty(breakdown.lodgingQty != null ? String(breakdown.lodgingQty) : '');
    setLodgingRate(breakdown.lodgingRate != null ? String(breakdown.lodgingRate) : '');
    setPerDiemQty(breakdown.perDiemQty != null ? String(breakdown.perDiemQty) : '');
    setPerDiemRate(breakdown.perDiemRate != null ? String(breakdown.perDiemRate) : '');
    setRoundedFee(breakdown.roundedFee != null ? String(breakdown.roundedFee) : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdown?.id]);

  // Fetch service items filtered by job type for the "Add Line" picker
  useEffect(() => {
    if (!breakdown) return;
    serviceItemsApi.getAll(breakdown.jobTypeId ?? undefined)
      .then(setAddLineServiceItems)
      .catch(() => setAddLineServiceItems([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdown?.id, breakdown?.jobTypeId]);

  const saveExpenses = useCallback(async (fields: {
    mileageQty: string; mileageRate: string;
    lodgingQty: string; lodgingRate: string;
    perDiemQty: string; perDiemRate: string;
    roundedFee: string;
  }) => {
    if (!breakdown) return;
    setSavingExpenses(true);
    try {
      const toNum = (v: string) => v.trim() === '' ? null : Number(v);
      const updated = await costBreakdownApi.update(breakdown.id, {
        mileageQty: toNum(fields.mileageQty),
        mileageRate: toNum(fields.mileageRate),
        lodgingQty: toNum(fields.lodgingQty),
        lodgingRate: toNum(fields.lodgingRate),
        perDiemQty: toNum(fields.perDiemQty),
        perDiemRate: toNum(fields.perDiemRate),
        roundedFee: toNum(fields.roundedFee),
      });
      setBreakdown((prev) => prev ? { ...prev, ...updated } : null);
    } catch {
      toast.error('Failed to save direct expenses');
    } finally {
      setSavingExpenses(false);
    }
  }, [breakdown]);

  const scheduleExpenseSave = useCallback(() => {
    if (expenseSaveTimer.current) clearTimeout(expenseSaveTimer.current);
    expenseSaveTimer.current = setTimeout(() => {
      saveExpenses({ mileageQty, mileageRate, lodgingQty, lodgingRate, perDiemQty, perDiemRate, roundedFee });
    }, 800);
  }, [saveExpenses, mileageQty, mileageRate, lodgingQty, lodgingRate, perDiemQty, perDiemRate, roundedFee]);

  const handleAddLine = useCallback(async () => {
    if (!breakdown || !addLineServiceItemId) return;
    setAddLineLoading(true);
    try {
      const line = await costBreakdownApi.addLine(breakdown.id, addLineServiceItemId);
      setBreakdown((prev) => prev ? { ...prev, lines: [...prev.lines, line] } : null);
      setAddLineServiceItemId('');
      setShowAddLine(false);
    } catch {
      toast.error('Failed to add line');
    } finally {
      setAddLineLoading(false);
    }
  }, [breakdown, addLineServiceItemId]);

  const handleNextConfigure = useCallback(async () => {
    if (!title.trim()) return;
    setFetchingItems(true);
    try {
      const [all, filtered] = await Promise.all([
        serviceItemsApi.getAll(),
        jobTypeId ? serviceItemsApi.getAll(jobTypeId) : Promise.resolve([] as ServiceItem[]),
      ]);
      setAllServiceItems(all);
      setPrePopulated(filtered);
      setStep('configure');
    } catch {
      toast.error('Failed to load service items');
    } finally {
      setFetchingItems(false);
    }
  }, [title, jobTypeId]);

  const handleConfirm = useCallback(async (config: CbConfig) => {
    setSaving(true);
    try {
      const created = await costBreakdownApi.create({
        title: title.trim(),
        jobTypeId: jobTypeId || undefined,
        leadId: leadId || undefined,
        projectId: prefilledProjectId || undefined,
      });

      const lineByServiceItemId = new Map(created.lines.map((l) => [l.serviceItemId, l]));
      const configByServiceItemId = new Map(config.items.map((ci) => [ci.serviceItem.id, ci]));

      // Process auto-populated lines: delete removed items, exclude unchecked subtasks
      const lineOps = created.lines.map(async (line) => {
        const ci = configByServiceItemId.get(line.serviceItemId);
        if (!ci) return costBreakdownApi.deleteLine(line.id);
        const excluded = line.serviceItem.subtasks
          .map((s) => s.id)
          .filter((id) => !ci.includedSubtaskIds.includes(id));
        if (excluded.length) return costBreakdownApi.updateLine(line.id, { excludedSubtaskIds: excluded });
      });

      // Add extra service items that weren't in the auto-populate set
      const addOps = config.items
        .filter((ci) => !lineByServiceItemId.has(ci.serviceItem.id))
        .map(async (ci) => {
          const newLine = await costBreakdownApi.addLine(created.id, ci.serviceItem.id);
          const excluded = ci.serviceItem.subtasks
            .map((s) => s.id)
            .filter((id) => !ci.includedSubtaskIds.includes(id));
          if (excluded.length) return costBreakdownApi.updateLine(newLine.id, { excludedSubtaskIds: excluded });
        });

      // Persist custom subtasks permanently to their service items
      const customOps = config.items.flatMap((ci) =>
        ci.customSubtasks.map((name) =>
          serviceItemsApi.createSubtask(ci.serviceItem.id, { name }),
        ),
      );

      await Promise.all([...lineOps, ...addOps, ...customOps]);

      if (customOps.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['service-items-active'] });
      }

      const dest = returnTo
        ? `/cost-breakdown/${created.id}?returnTo=${encodeURIComponent(returnTo)}`
        : `/cost-breakdown/${created.id}`;
      router.push(dest);
    } catch (err) {
      console.error('Failed to create cost breakdown', err);
      toast.error('Failed to create cost breakdown');
      setSaving(false);
    }
  }, [title, jobTypeId, leadId, router, returnTo, queryClient]);

  const handleStatusToggle = useCallback(async () => {
    if (!breakdown) return;
    const newStatus = breakdown.status === 'DRAFT' ? 'FINAL' : 'DRAFT';
    try {
      const updated = await costBreakdownApi.update(breakdown.id, { status: newStatus });
      setBreakdown((prev) => (prev ? { ...prev, status: updated.status } : null));
    } catch {
      toast.error('Failed to update status');
    }
  }, [breakdown]);

  const handleDownloadPdf = useCallback(async () => {
    if (!breakdown) return;
    setDownloading(true);
    try {
      const blob = await costBreakdownApi.downloadPdf(breakdown.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cost-breakdown-${breakdown.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  }, [breakdown]);

  const handleLineChange = useCallback((updatedLine: CostBreakdownLine) => {
    setBreakdown((prev) => {
      if (!prev) return null;
      const lines = prev.lines.map((l) => (l.id === updatedLine.id ? updatedLine : l));
      const totalEstimatedHours = lines.reduce(
        (s, l) => s + l.roleEstimates.reduce((a, r) => a + r.estimatedHours, 0),
        0,
      );
      const totalEstimatedCost = lines.reduce(
        (s, l) =>
          s + l.roleEstimates.reduce((a, r) => (r.hourlyRate != null ? a + r.estimatedHours * r.hourlyRate : a), 0),
        0,
      );
      const hasUnratedLines = lines.some((l) => l.roleEstimates.some((r) => r.hourlyRate == null));
      return { ...prev, lines, totalEstimatedHours, totalEstimatedCost, hasUnratedLines };
    });
  }, []);

  const handleSaveDisplayName = useCallback(async (roleString: string, newName: string) => {
    if (!breakdown) return;
    const trimmed = newName.trim();
    const current = breakdown.roleDisplayNames ?? {};
    const next: Record<string, string> = { ...current };
    if (trimmed) {
      if (next[roleString] === trimmed) return;
      next[roleString] = trimmed;
    } else {
      if (!(roleString in next)) return;
      delete next[roleString];
    }
    try {
      const updated = await costBreakdownApi.update(breakdown.id, { roleDisplayNames: next });
      setBreakdown((prev) => (prev ? { ...prev, ...updated, roleDisplayNames: next } : null));
    } catch {
      toast.error('Failed to save display name');
    }
  }, [breakdown]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded w-64" />
        <div className="h-6 bg-muted rounded w-48" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  // ── Create mode ──────────────────────────────────────────────────────────────
  if (!breakdownId) {
    if (step === 'configure') {
      return (
        <CostBreakdownConfigureStep
          allServiceItems={allServiceItems}
          prePopulated={prePopulated}
          onBack={() => setStep('form')}
          onConfirm={handleConfirm}
          creating={saving}
        />
      );
    }

    const leadOptions = leads.map((l) => ({
      value: l.id,
      label: l.company ? `${l.company} — ${l.contactName}` : l.contactName,
    }));

    return (
      <div className="max-w-lg mx-auto space-y-6 pt-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(returnTo || '/cost-breakdown')}
            className="gap-1.5 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            {returnTo ? 'Back' : 'Cost Breakdown'}
          </Button>
          <h1 className="text-2xl font-display tracking-tight">New Cost Breakdown</h1>
          <p className="text-sm text-muted-foreground">
            {prefilledProjectId
              ? 'Set up an estimating document for this project'
              : 'Set up an estimating document for a prospective project'}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-5">
          {prefilledProjectId ? (
            <div className="space-y-1.5">
              <Label>Linked Project</Label>
              <div className="h-9 px-3 flex items-center rounded-md border border-input bg-muted/40 text-sm text-foreground">
                {prefilledProjectName || 'Selected project'}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Prospective Project</Label>
              <SearchableSelect
                value={leadId}
                onValueChange={(val) => { setLeadId(val); setTitleManuallyEdited(false); }}
                options={leadOptions}
                placeholder="Select prospective project..."
                searchPlaceholder="Search..."
                emptyMessage="No prospective projects found."
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cb-title">Title</Label>
            <Input
              id="cb-title"
              placeholder="e.g. Boundary Survey — Smith Property"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleManuallyEdited(true); }}
              onKeyDown={(e) => e.key === 'Enter' && handleNextConfigure()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Job Type</Label>
            <Select value={jobTypeId} onValueChange={setJobTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select job type..." />
              </SelectTrigger>
              <SelectContent>
                {jobTypes.map((st) => (
                  <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Phases and tasks will be auto-populated from the job type template.
            </p>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleNextConfigure}
          disabled={fetchingItems || !title.trim()}>
          {fetchingItems
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : null}
          {fetchingItems ? 'Loading items…' : 'Next: Configure Items'}
        </Button>
      </div>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  if (!breakdown) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Cost breakdown not found</p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => router.push('/cost-breakdown')}>
          Back to list
        </Button>
      </div>
    );
  }

  const linkedLabel = breakdown.project?.name ?? breakdown.lead?.company ?? null;
  const hasRatedCost = breakdown.totalEstimatedCost > 0;
  const isFinal = breakdown.status === 'FINAL';
  const cbRoles = roles.filter((r) => r.showInCostBreakdown !== false);

  const toN = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const mileageTotal = toN(mileageQty) * toN(mileageRate);
  const lodgingTotal = toN(lodgingQty) * toN(lodgingRate);
  const perDiemTotal = toN(perDiemQty) * toN(perDiemRate);
  const directExpenseTotal = mileageTotal + lodgingTotal + perDiemTotal;
  const totalFee = breakdown.totalEstimatedCost + directExpenseTotal;
  const displayedFee = toN(roundedFee) > 0 ? toN(roundedFee) : totalFee;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(returnTo || '/cost-breakdown')}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 mb-1">
            <ArrowLeft className="h-4 w-4" />
            {returnTo ? 'Back' : 'Cost Breakdown'}
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-display tracking-tight">{breakdown.title}</h1>
            <Badge variant="outline" className={STATUS_COLORS[breakdown.status] ?? ''}>
              {breakdown.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            {linkedLabel && <span>{linkedLabel}</span>}
            {linkedLabel && breakdown.jobType && <span className="text-border">·</span>}
            {breakdown.jobType && <span>{breakdown.jobType.name}</span>}
            {(linkedLabel || breakdown.jobType) && <span className="text-border">·</span>}
            <span>{formatDate(breakdown.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStatusToggle}>
            {breakdown.status === 'DRAFT' ? (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Mark Final
              </>
            ) : (
              'Revert to Draft'
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Download PDF
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const params = new URLSearchParams({ costBreakdownId: breakdown.id });
              if (breakdown.leadId) params.set('leadId', breakdown.leadId);
              router.push(`/proposals/new?${params.toString()}`);
            }}>
            <FilePlus className="mr-1.5 h-3.5 w-3.5" />
            Create Proposal
          </Button>
        </div>
      </div>

      {/* Finalized banner */}
      {isFinal && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          This cost breakdown is finalized. Revert to Draft to make changes.
        </div>
      )}

      {/* Phase cards */}
      <div className="space-y-4">
        {breakdown.lines.length === 0 && !showAddLine && (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/60">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No service items yet. Add the first line below.</p>
          </div>
        )}

        {breakdown.lines
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((line) => (
            <CostBreakdownLineCard
              key={line.id}
              line={line}
              roles={cbRoles}
              onChange={handleLineChange}
              roleDisplayNames={breakdown.roleDisplayNames ?? null}
              onDisplayNameChange={handleSaveDisplayName}
            />
          ))}

        {/* Add Line inline picker */}
        {showAddLine ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <Select value={addLineServiceItemId} onValueChange={setAddLineServiceItemId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select service item to add…" />
                </SelectTrigger>
                <SelectContent>
                  {addLineServiceItems
                    .filter((si) => !breakdown.lines.some((l) => l.serviceItemId === si.id))
                    .map((si) => (
                      <SelectItem key={si.id} value={si.id}>{si.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleAddLine}
              disabled={!addLineServiceItemId || addLineLoading}>
              {addLineLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowAddLine(false); setAddLineServiceItemId(''); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowAddLine(true)}
            disabled={isFinal}>
            <Plus className="h-3.5 w-3.5" />
            Add Service Item Line
          </Button>
        )}
      </div>

      {/* Direct Expenses */}
      <div className="rounded-xl border border-border/60 bg-card px-5 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Direct Expenses</h2>
            <Switch
              checked={breakdown.showDirectExpenses !== false}
              disabled={isFinal}
              onCheckedChange={async (checked) => {
                setBreakdown((prev) => prev ? { ...prev, showDirectExpenses: checked } : null);
                try {
                  await costBreakdownApi.update(breakdown.id, { showDirectExpenses: checked });
                } catch {
                  toast.error('Failed to save');
                  setBreakdown((prev) => prev ? { ...prev, showDirectExpenses: !checked } : null);
                }
              }}
            />
            <span className="text-[11px] text-muted-foreground">
              {breakdown.showDirectExpenses !== false ? 'Shown on PDF' : 'Hidden from PDF'}
            </span>
          </div>
          {savingExpenses && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Save className="h-3 w-3 animate-pulse" />
              Saving…
            </span>
          )}
        </div>

        {breakdown.showDirectExpenses === false && (
          <p className="text-xs text-muted-foreground italic">
            Direct expenses are hidden from the PDF output. Toggle on to include them.
          </p>
        )}

        {/* Expense inputs — only shown when section is enabled */}
        {breakdown.showDirectExpenses !== false && <>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_120px_120px_100px] gap-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-1">
          <span>Expense</span>
          <span>Qty / Units</span>
          <span>Rate</span>
          <span className="text-right">Total</span>
        </div>

        {/* Mileage */}
        <div className="grid grid-cols-[1fr_120px_120px_100px] gap-3 items-center">
          <span className="text-sm">Mileage</span>
          <Input
            type="number"
            min="0"
            placeholder="miles"
            value={mileageQty}
            onChange={(e) => setMileageQty(e.target.value)}
            onBlur={scheduleExpenseSave}
            disabled={isFinal}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="$/mile"
            value={mileageRate}
            onChange={(e) => setMileageRate(e.target.value)}
            onBlur={scheduleExpenseSave}
            disabled={isFinal}
            className="h-8 text-sm"
          />
          <p className="text-sm tabular-nums text-right">
            {mileageTotal > 0 ? formatCurrency(mileageTotal) : '—'}
          </p>
        </div>

        {/* Lodging */}
        <div className="grid grid-cols-[1fr_120px_120px_100px] gap-3 items-center">
          <span className="text-sm">Lodging</span>
          <Input
            type="number"
            min="0"
            placeholder="nights"
            value={lodgingQty}
            onChange={(e) => setLodgingQty(e.target.value)}
            onBlur={scheduleExpenseSave}
            disabled={isFinal}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="$/night"
            value={lodgingRate}
            onChange={(e) => setLodgingRate(e.target.value)}
            onBlur={scheduleExpenseSave}
            disabled={isFinal}
            className="h-8 text-sm"
          />
          <p className="text-sm tabular-nums text-right">
            {lodgingTotal > 0 ? formatCurrency(lodgingTotal) : '—'}
          </p>
        </div>

        {/* Per Diem */}
        <div className="grid grid-cols-[1fr_120px_120px_100px] gap-3 items-center">
          <span className="text-sm">Per Diem</span>
          <Input
            type="number"
            min="0"
            placeholder="days"
            value={perDiemQty}
            onChange={(e) => setPerDiemQty(e.target.value)}
            onBlur={scheduleExpenseSave}
            disabled={isFinal}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="$/day"
            value={perDiemRate}
            onChange={(e) => setPerDiemRate(e.target.value)}
            onBlur={scheduleExpenseSave}
            disabled={isFinal}
            className="h-8 text-sm"
          />
          <p className="text-sm tabular-nums text-right">
            {perDiemTotal > 0 ? formatCurrency(perDiemTotal) : '—'}
          </p>
        </div>

        {/* Direct expense subtotal */}
        {directExpenseTotal > 0 && (
          <div className="flex justify-end pt-1 border-t border-border/40">
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Direct Expense Subtotal
              </p>
              <p className="text-base font-semibold tabular-nums mt-0.5">
                {formatCurrency(directExpenseTotal)}
              </p>
            </div>
          </div>
        )}

        {/* Rounded fee override */}
        <div className="flex items-end gap-3 pt-3 border-t border-border/40">
          <div className="space-y-1.5 w-48">
            <Label className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Rounded Fee (override)
            </Label>
            <Input
              type="number"
              min="0"
              step="100"
              placeholder={totalFee > 0 ? `Calc: ${formatCurrency(totalFee)}` : 'e.g. 12500'}
              value={roundedFee}
              onChange={(e) => setRoundedFee(e.target.value)}
              onBlur={scheduleExpenseSave}
              disabled={isFinal}
              className="h-8 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground pb-2">
            Leave blank to use computed total fee
          </p>
        </div>

        </>}
      </div>

      {/* Grand total footer */}
      <div className="rounded-xl border border-border/60 bg-card px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Total Hours
            </p>
            <p className="text-xl font-semibold tabular-nums mt-0.5">
              {breakdown.totalEstimatedHours.toFixed(1)} hrs
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Labor Cost
            </p>
            <p className="text-xl font-semibold tabular-nums mt-0.5">
              {hasRatedCost ? formatCurrency(breakdown.totalEstimatedCost) : '—'}
            </p>
          </div>
          {directExpenseTotal > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Direct Expenses
              </p>
              <p className="text-xl font-semibold tabular-nums mt-0.5">
                {formatCurrency(directExpenseTotal)}
              </p>
            </div>
          )}
          <div className="pl-4 border-l border-border/60">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {toN(roundedFee) > 0 ? 'Rounded Fee' : 'Total Fee'}
            </p>
            <p className="text-xl font-semibold tabular-nums mt-0.5 text-primary">
              {hasRatedCost || directExpenseTotal > 0 ? formatCurrency(displayedFee) : '—'}
            </p>
          </div>
          {breakdown.hasUnratedLines && (
            <p className="text-xs text-amber-600 self-end pb-0.5">
              Partial — some roles missing rates
            </p>
          )}
        </div>

        {/* Bottom action buttons (mirrors top bar) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStatusToggle}>
            {breakdown.status === 'DRAFT' ? (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Mark Final
              </>
            ) : (
              'Revert to Draft'
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Download PDF
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const params = new URLSearchParams({ costBreakdownId: breakdown.id });
              if (breakdown.leadId) params.set('leadId', breakdown.leadId);
              router.push(`/proposals/new?${params.toString()}`);
            }}>
            <FilePlus className="mr-1.5 h-3.5 w-3.5" />
            Create Proposal
          </Button>
        </div>
      </div>
    </div>
  );
}
