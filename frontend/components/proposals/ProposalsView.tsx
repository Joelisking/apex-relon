'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Loader2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { proposalTemplatesApi, GeneratedProposal } from '@/lib/api/proposal-templates-client';
import GenerateProposalDialog from '@/components/quotes/GenerateProposalDialog';
import ProposalSourceDialog from './ProposalSourceDialog';
import type { Quote, Project } from '@/lib/types';

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

function stripDocx(name: string): string {
  return name.replace(/\.docx$/i, '');
}

export default function ProposalsView() {
  const queryClient = useQueryClient();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | undefined>();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals-generated'],
    queryFn: () => proposalTemplatesApi.getGenerated(),
  });

  const handleSourceContinue = ({ quote, project }: { quote?: Quote; project?: Project }) => {
    setSelectedQuote(quote);
    setSelectedProject(project);
    setGenerateOpen(true);
  };

  const handleGenerateOpenChange = (open: boolean) => {
    setGenerateOpen(open);
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ['proposals-generated'] });
    }
  };

  const handleDownload = async (proposal: GeneratedProposal) => {
    setDownloadingId(proposal.id);
    try {
      const blob = await proposalTemplatesApi.downloadGenerated(proposal.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = proposal.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (proposal: GeneratedProposal) => {
    setDeletingId(proposal.id);
    try {
      await proposalTemplatesApi.deleteGenerated(proposal.id);
      queryClient.invalidateQueries({ queryKey: ['proposals-generated'] });
      toast.success('Proposal deleted');
    } catch {
      toast.error('Failed to delete proposal');
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (proposal: GeneratedProposal) => {
    setEditingId(proposal.id);
    setEditingName(stripDocx(proposal.originalName));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveRename = async (proposal: GeneratedProposal) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSavingId(proposal.id);
    try {
      await proposalTemplatesApi.renameGenerated(proposal.id, trimmed);
      queryClient.invalidateQueries({ queryKey: ['proposals-generated'] });
      cancelEditing();
    } catch {
      toast.error('Failed to rename proposal');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Proposals</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Generate and manage proposals from quote data
              </p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setSourceOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Generate Proposal
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
                  Click &quot;Generate Proposal&quot; to create one.
                </p>
              </div>
            ) : (
              proposals.map((proposal, i) => {
                const isEditing = editingId === proposal.id;
                return (
                  <div
                    key={proposal.id}
                    className={`flex items-center gap-3 px-5 py-3.5 ${
                      i > 0 ? 'border-t border-border/40' : ''
                    }`}>
                    <div className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename(proposal);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="h-7 text-sm py-0 w-full max-w-sm"
                            autoFocus
                          />
                          <span className="text-[11px] text-muted-foreground shrink-0">.docx</span>
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
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {stripDocx(proposal.originalName)}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {proposal.client?.name ? `${proposal.client.name} · ` : ''}
                        {formatDate(proposal.createdAt)}
                        {' · '}
                        {formatBytes(proposal.fileSize)}
                      </p>
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Download"
                          disabled={downloadingId === proposal.id}
                          onClick={() => handleDownload(proposal)}>
                          {downloadingId === proposal.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
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

      <ProposalSourceDialog
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        onContinue={handleSourceContinue}
      />

      <GenerateProposalDialog
        open={generateOpen}
        onOpenChange={handleGenerateOpenChange}
        quote={selectedQuote}
        project={selectedProject}
      />
    </>
  );
}
