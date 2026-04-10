'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, FileText, Loader2, Plus, Pencil, Trash2, Check, X, CheckCircle2, FileStack, PenLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { proposalTemplatesApi, type Proposal } from '@/lib/api/proposal-templates-client';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProposalsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [combinedPdfId, setCombinedPdfId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => proposalTemplatesApi.getProposals(),
  });

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
      toast.error('Failed to generate combined PDF — is LibreOffice installed on the server?');
    } finally {
      setCombinedPdfId(null);
    }
  };

  const handleOpenEditor = (proposal: Proposal) => {
    const params = new URLSearchParams();
    params.set('proposalId', proposal.id);
    if (proposal.leadId) params.set('leadId', proposal.leadId);
    if (proposal.costBreakdownId) params.set('costBreakdownId', proposal.costBreakdownId);
    if (proposal.proposalTemplateId) params.set('templateId', proposal.proposalTemplateId);
    router.push(`/proposals/new?${params.toString()}`);
  };

  const handleAccept = async (proposal: Proposal) => {
    setAcceptingId(proposal.id);
    try {
      await proposalTemplatesApi.acceptProposal(proposal.id);
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal marked as accepted');
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
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
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
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      cancelEditing();
    } catch {
      toast.error('Failed to rename proposal');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Proposals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate and manage client proposals
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/proposals/new')}>
            <Plus className="h-3.5 w-3.5" />
            New Proposal
          </Button>
        </div>

        {/* List */}
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-medium text-foreground">No proposals yet</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Click &quot;New Proposal&quot; to create one.
              </p>
            </div>
          ) : (
            proposals.map((proposal, i) => {
              const isEditing = editingId === proposal.id;
              const isAccepted = proposal.status === 'ACCEPTED';
              return (
                <div
                  key={proposal.id}
                  className={cn(
                    'flex items-center gap-3 px-5 py-3.5',
                    i > 0 && 'border-t border-border/40',
                  )}>
                  <div className={cn(
                    'h-8 w-8 rounded-md flex items-center justify-center shrink-0',
                    isAccepted ? 'bg-green-500/10' : 'bg-muted/60',
                  )}>
                    <FileText className={cn('h-4 w-4', isAccepted ? 'text-green-600' : 'text-muted-foreground')} />
                  </div>

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
                          className="h-7 text-sm py-0 w-full max-w-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-green-600 hover:text-green-700 shrink-0"
                          disabled={savingId === proposal.id}
                          onClick={() => saveRename(proposal)}>
                          {savingId === proposal.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={cancelEditing}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-foreground truncate">{proposal.title}</p>
                        <Badge
                          className={cn(
                            'text-[10px] shrink-0',
                            isAccepted
                              ? 'bg-green-500/15 text-green-700 border-green-500/20'
                              : 'bg-muted text-muted-foreground border-border/60',
                          )}
                          variant="outline">
                          {isAccepted ? 'Accepted' : 'Draft'}
                        </Badge>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {proposal.lead?.company ? `${proposal.lead.company} · ` : ''}
                      {formatDate(proposal.createdAt)}
                      {proposal.file ? ` · ${formatBytes(proposal.file.fileSize)}` : ''}
                      {proposal.costBreakdown ? ` · ${proposal.costBreakdown.title}` : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {!isAccepted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-green-600"
                          title="Mark as accepted"
                          disabled={acceptingId === proposal.id}
                          onClick={() => handleAccept(proposal)}>
                          {acceptingId === proposal.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {proposal.fileId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Download .docx"
                          disabled={downloadingId === proposal.id}
                          onClick={() => handleDownload(proposal)}>
                          {downloadingId === proposal.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {proposal.costBreakdownId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Download combined PDF (proposal + cost breakdown)"
                          disabled={combinedPdfId === proposal.id}
                          onClick={() => handleCombinedPdf(proposal)}>
                          {combinedPdfId === proposal.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileStack className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Open in editor"
                        onClick={() => handleOpenEditor(proposal)}>
                        <PenLine className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Rename"
                        onClick={() => startEditing(proposal)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete"
                        disabled={deletingId === proposal.id}
                        onClick={() => handleDelete(proposal)}>
                        {deletingId === proposal.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
