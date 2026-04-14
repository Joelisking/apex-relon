'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Download, Loader2, Trash2, CheckCircle2,
  FileStack, PenLine, ChevronDown, ChevronRight, Pencil, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { proposalTemplatesApi, type Proposal } from '@/lib/api/proposal-templates-client';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import { AcceptProposalDialog } from './AcceptProposalDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConvertLeadDialog } from '@/components/leads/ConvertLeadDialog';
import type { Lead } from '@/lib/types';

interface LinkedProposalsSectionProps {
  leadId?: string;
  projectId?: string;
  projectName?: string;
  lead?: Lead;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}


const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border/60',
  ACCEPTED: 'bg-green-500/15 text-green-700 border-green-500/20',
};

const CB_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200/80',
  RATED: 'bg-blue-50 text-blue-700 border-blue-200/80',
  APPROVED: 'bg-green-50 text-green-700 border-green-200/80',
  FINAL: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
};

export function LinkedProposalsSection({ leadId, projectId, projectName, lead }: LinkedProposalsSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [combinedPdfId, setCombinedPdfId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingCbId, setDeletingCbId] = useState<string | null>(null);
  const [confirmDeleteCbId, setConfirmDeleteCbId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [acceptProposal, setAcceptProposal] = useState<Proposal | null>(null);
  const [convertPromptOpen, setConvertPromptOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [acceptedContractedValue, setAcceptedContractedValue] = useState<number | undefined>(undefined);

  const proposalFilter = leadId ? { leadId } : { projectId };
  const cbFilter = leadId ? { leadId } : { projectId };

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals', { leadId, projectId }],
    queryFn: () => proposalTemplatesApi.getProposals(proposalFilter),
    enabled: !!(leadId || projectId),
  });

  const { data: costBreakdowns = [], isLoading: loadingBreakdowns } = useQuery({
    queryKey: ['cost-breakdowns', { leadId, projectId }],
    queryFn: () => costBreakdownApi.getAll(cbFilter),
    enabled: !!(leadId || projectId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['proposals', { leadId, projectId }] });
  const invalidateCbs = () => queryClient.invalidateQueries({ queryKey: ['cost-breakdowns', { leadId, projectId }] });

  const handleDeleteCb = async (cbId: string) => {
    setDeletingCbId(cbId);
    try {
      await costBreakdownApi.delete(cbId);
      invalidateCbs();
      toast.success('Cost breakdown deleted');
    } catch {
      toast.error('Failed to delete cost breakdown');
    } finally {
      setDeletingCbId(null);
    }
  };

  const handleDownload = async (proposal: Proposal) => {
    if (!proposal.fileId) return;
    setDownloadingId(proposal.id);
    try {
      const blob = await proposalTemplatesApi.downloadProposal(proposal.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = proposal.file?.originalName ?? `${proposal.title}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCombinedPdf = async (proposal: Proposal) => {
    setCombinedPdfId(proposal.id);
    try {
      const { blob, fileName } = await proposalTemplatesApi.downloadCombinedPdf(proposal.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Combined PDF failed — LibreOffice may not be available on the server');
    } finally {
      setCombinedPdfId(null);
    }
  };

  const handleAcceptConfirm = async (contractedValue: number | undefined, invoicedValue: number | undefined) => {
    if (!acceptProposal) return;
    setAcceptingId(acceptProposal.id);
    try {
      await proposalTemplatesApi.acceptProposal(acceptProposal.id, contractedValue, invoicedValue);
      invalidate();
      setAcceptProposal(null);
      if (lead) {
        setAcceptedContractedValue(contractedValue);
        setConvertPromptOpen(true);
      } else {
        toast.success('Proposal accepted');
      }
    } catch {
      toast.error('Failed to accept proposal');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDelete = async (proposal: Proposal) => {
    setDeletingId(proposal.id);
    try {
      await proposalTemplatesApi.deleteProposal(proposal.id);
      invalidate();
      toast.success('Proposal deleted');
    } catch {
      toast.error('Failed to delete proposal');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (proposal: Proposal) => {
    setEditingId(proposal.id);
    setEditingTitle(proposal.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveRename = async (proposal: Proposal) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) return;
    setSavingId(proposal.id);
    try {
      await proposalTemplatesApi.renameProposal(proposal.id, trimmed);
      invalidate();
      cancelEditing();
    } catch {
      toast.error('Failed to rename proposal');
    } finally {
      setSavingId(null);
    }
  };

  const handleOpenEditor = (proposal: Proposal) => {
    const params = new URLSearchParams();
    if (leadId) params.set('leadId', leadId);
    else if (projectId) params.set('projectId', projectId);
    params.set('proposalId', proposal.id);
    if (proposal.costBreakdownId) params.set('costBreakdownId', proposal.costBreakdownId);
    if (proposal.proposalTemplateId) params.set('templateId', proposal.proposalTemplateId);
    router.push(`/proposals/new?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Proposals{proposals.length > 0 ? ` (${proposals.length})` : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[12px] gap-1.5"
          onClick={() => router.push(`/proposals/new?${leadId ? `leadId=${leadId}` : `projectId=${projectId}`}`)}>
          <Plus className="h-3 w-3" />
          New Proposal
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
          <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center mb-2.5">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-[13px] font-medium text-foreground">No proposals yet</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 mb-3">
            Generate a proposal for this {leadId ? 'lead' : 'project'}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[12px] gap-1.5"
            onClick={() => router.push(`/proposals/new?${leadId ? `leadId=${leadId}` : `projectId=${projectId}`}`)}>
            <Plus className="h-3 w-3" />
            New Proposal
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          {proposals.map((proposal, i) => {
            const isExpanded = expandedId === proposal.id;
            const isEditing = editingId === proposal.id;
            const isAccepted = proposal.status === 'ACCEPTED';
            const hasCostBreakdown = !!proposal.costBreakdown;

            return (
              <div key={proposal.id} className={cn(i > 0 && 'border-t border-border/40')}>
                {/* Proposal row */}
                <div className="flex items-center gap-2.5 px-4 py-3">
                  {/* Expand toggle — only when there's a cost breakdown */}
                  {hasCostBreakdown ? (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  ) : (
                    <div className="h-3.5 w-3.5 shrink-0" />
                  )}

                  <div className={cn(
                    'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
                    isAccepted ? 'bg-green-500/10' : 'bg-muted/60',
                  )}>
                    <FileText className={cn('h-3.5 w-3.5', isAccepted ? 'text-green-600' : 'text-muted-foreground')} />
                  </div>

                  {/* Title / rename */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(proposal);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="h-6 text-sm py-0 w-full max-w-xs"
                          autoFocus
                        />
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-green-600 hover:text-green-700"
                          disabled={savingId === proposal.id} onClick={() => saveRename(proposal)}>
                          {savingId === proposal.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={cancelEditing}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-foreground truncate">{proposal.title}</span>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] shrink-0', STATUS_STYLES[proposal.status] ?? STATUS_STYLES.DRAFT)}>
                          {isAccepted ? 'Accepted' : 'Draft'}
                        </Badge>
                        {proposal.proposalTemplate && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {proposal.proposalTemplate.name}
                          </span>
                        )}
                      </div>
                    )}
                    {!isEditing && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(proposal.createdAt)}
                        {proposal.file ? ` · ${formatBytes(proposal.file.fileSize)}` : ''}
                        {hasCostBreakdown ? ` · cost breakdown attached` : ''}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {!isAccepted && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-green-600"
                          title="Accept proposal" disabled={acceptingId === proposal.id}
                          onClick={() => setAcceptProposal(proposal)}>
                          {acceptingId === proposal.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CheckCircle2 className="h-3 w-3" />}
                        </Button>
                      )}
                      {proposal.fileId && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="Download .docx" disabled={downloadingId === proposal.id}
                          onClick={() => handleDownload(proposal)}>
                          {downloadingId === proposal.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Download className="h-3 w-3" />}
                        </Button>
                      )}
                      {hasCostBreakdown && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="Download combined PDF (proposal + cost breakdown)"
                          disabled={combinedPdfId === proposal.id}
                          onClick={() => handleCombinedPdf(proposal)}>
                          {combinedPdfId === proposal.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <FileStack className="h-3 w-3" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Open in editor" onClick={() => handleOpenEditor(proposal)}>
                        <PenLine className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Rename" onClick={() => startEditing(proposal)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        title="Delete" disabled={deletingId === proposal.id}
                        onClick={() => handleDelete(proposal)}>
                        {deletingId === proposal.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Linked cost breakdown — expanded */}
                {isExpanded && proposal.costBreakdown && (
                  <div className="mx-4 mb-3 ml-12 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                          <FileStack className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate">
                            {proposal.costBreakdown.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Cost Breakdown</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            CB_STATUS_STYLES[proposal.costBreakdown.status] ?? CB_STATUS_STYLES.DRAFT,
                          )}>
                          {proposal.costBreakdown.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] gap-1"
                          onClick={() => router.push(`/cost-breakdown/${proposal.costBreakdown!.id}`)}>
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* Cost Breakdowns section */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Cost Breakdowns{costBreakdowns.length > 0 ? ` (${costBreakdowns.length})` : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[12px] gap-1.5"
          onClick={() => {
            const params = new URLSearchParams();
            if (leadId) {
              params.set('leadId', leadId);
              params.set('returnTo', `/leads/${leadId}?tab=proposals`);
            } else if (projectId) {
              params.set('projectId', projectId);
              if (projectName) params.set('projectName', projectName);
              params.set('returnTo', `/projects/${projectId}?tab=financials`);
            }
            router.push(`/cost-breakdown/new?${params.toString()}`);
          }}>
          <Plus className="h-3 w-3" />
          Create CB + Proposal
        </Button>
      </div>

      {loadingBreakdowns ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : costBreakdowns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
          <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center mb-2.5">
            <FileStack className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-[13px] font-medium text-foreground">No cost breakdowns</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            No cost breakdowns linked to this {leadId ? 'lead' : 'project'} yet
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          {costBreakdowns.map((cb, i) => (
            <div
              key={cb.id}
              className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border/40')}>
              <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileStack className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-foreground truncate">{cb.title}</span>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] shrink-0', CB_STATUS_STYLES[cb.status] ?? CB_STATUS_STYLES.DRAFT)}>
                    {cb.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDate(cb.createdAt)}
                  {cb.totalEstimatedCost > 0 ? ` · ${formatCurrency(cb.totalEstimatedCost)}` : ''}
                  {cb.jobType ? ` · ${cb.jobType.name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px]"
                  onClick={() => router.push(`/cost-breakdown/${cb.id}`)}>
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  title="Delete cost breakdown"
                  disabled={deletingCbId === cb.id}
                  onClick={() => setConfirmDeleteCbId(cb.id)}>
                  {deletingCbId === cb.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <AcceptProposalDialog
      proposal={acceptProposal}
      onClose={() => setAcceptProposal(null)}
      onConfirm={handleAcceptConfirm}
    />

    {/* Post-acceptance: offer to convert the lead to an active project */}
    <AlertDialog open={convertPromptOpen} onOpenChange={(open) => {
      if (!open) { setConvertPromptOpen(false); toast.success('Proposal accepted'); }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Proposal Accepted</AlertDialogTitle>
          <AlertDialogDescription>
            Would you like to convert this prospective project to an active project now?
            {acceptedContractedValue !== undefined && (
              <> The contracted value has been set to <span className="font-medium text-foreground">${acceptedContractedValue.toLocaleString()}</span>.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setConvertPromptOpen(false); toast.success('Proposal accepted'); }}>
            Not now
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => { setConvertPromptOpen(false); setConvertDialogOpen(true); }}>
            Convert to Project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {lead && (
      <ConvertLeadDialog
        lead={acceptedContractedValue !== undefined
          ? { ...lead, contractedValue: acceptedContractedValue }
          : lead}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
      />
    )}

    <AlertDialog open={!!confirmDeleteCbId} onOpenChange={(open) => { if (!open) setConfirmDeleteCbId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete cost breakdown?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the cost breakdown and all its line items. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { if (confirmDeleteCbId) { handleDeleteCb(confirmDeleteCbId); setConfirmDeleteCbId(null); } }}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
