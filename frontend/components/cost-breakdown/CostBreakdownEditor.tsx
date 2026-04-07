'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle2, FileText, Download } from 'lucide-react';
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
import { settingsApi, leadsApi } from '@/lib/api/client';
import { rolesApi } from '@/lib/api/roles-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { CostBreakdown, CostBreakdownLine, ServiceType, Lead } from '@/lib/types';
import CostBreakdownLineCard from './CostBreakdownLineCard';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);

  // Create-mode form
  const [title, setTitle] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);

  // Auto-populate title from the selected lead's project/company name
  useEffect(() => {
    if (!leadId || titleManuallyEdited) return;
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setTitle(lead.projectName || lead.company || lead.contactName);
    }
  }, [leadId, leads, titleManuallyEdited]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fetchedTypes, fetchedLeads, fetchedRoles] = await Promise.all([
          settingsApi.getServiceTypes(),
          leadsApi.getAll(),
          rolesApi.getAll(),
        ]);
        setServiceTypes(fetchedTypes);
        setLeads(fetchedLeads);
        setRoles(fetchedRoles);

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

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const created = await costBreakdownApi.create({
        title: title.trim(),
        serviceTypeId: serviceTypeId || undefined,
        leadId: leadId || undefined,
      });
      router.push(`/cost-breakdown/${created.id}`);
    } catch (err) {
      console.error('Failed to create cost breakdown', err);
      toast.error('Failed to create cost breakdown');
    } finally {
      setSaving(false);
    }
  }, [title, serviceTypeId, leadId, router]);

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
            onClick={() => router.push('/cost-breakdown')}
            className="gap-1.5 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Cost Breakdown
          </Button>
          <h1 className="text-2xl font-display tracking-tight">New Cost Breakdown</h1>
          <p className="text-sm text-muted-foreground">Set up an estimating document for a prospective project</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-5">
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

          <div className="space-y-1.5">
            <Label htmlFor="cb-title">Title</Label>
            <Input
              id="cb-title"
              placeholder="e.g. Boundary Survey — Smith Property"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleManuallyEdited(true); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Job Type</Label>
            <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select job type..." />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((st) => (
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
          onClick={handleCreate}
          disabled={saving || !title.trim()}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Cost Breakdown
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

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/cost-breakdown')}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 mb-1">
            <ArrowLeft className="h-4 w-4" />
            Cost Breakdown
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-display tracking-tight">{breakdown.title}</h1>
            <Badge variant="outline" className={STATUS_COLORS[breakdown.status] ?? ''}>
              {breakdown.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            {linkedLabel && <span>{linkedLabel}</span>}
            {linkedLabel && breakdown.serviceType && <span className="text-border">·</span>}
            {breakdown.serviceType && <span>{breakdown.serviceType.name}</span>}
            {(linkedLabel || breakdown.serviceType) && <span className="text-border">·</span>}
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
        </div>
      </div>

      {/* Phase cards */}
      {breakdown.lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/60">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No phases found for this breakdown.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ensure a job type with phases is configured in settings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {breakdown.lines
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((line) => (
              <CostBreakdownLineCard
                key={line.id}
                line={line}
                roles={roles}
                onChange={handleLineChange}
              />
            ))}
        </div>
      )}

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
              Est. Cost
            </p>
            <p className="text-xl font-semibold tabular-nums mt-0.5">
              {hasRatedCost ? formatCurrency(breakdown.totalEstimatedCost) : '—'}
            </p>
          </div>
        </div>
        {breakdown.hasUnratedLines && (
          <p className="text-xs text-amber-600">
            Some phases are missing hourly rates — cost estimate is partial.
          </p>
        )}
      </div>
    </div>
  );
}
