'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { proposalTemplatesApi, ProposalTemplate } from '@/lib/api/proposal-templates-client';
import { settingsApi } from '@/lib/api/client';
import UploadTemplateDialog from './UploadTemplateDialog';

export default function ProposalTemplatesSection() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['proposal-templates'],
    queryFn: () => proposalTemplatesApi.getAll(),
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => settingsApi.getServiceTypes(),
  });

  const handleDelete = async (template: ProposalTemplate) => {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    setDeletingId(template.id);
    try {
      await proposalTemplatesApi.delete(template.id);
      toast.success(`Template "${template.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploaded = (template: ProposalTemplate) => {
    queryClient.invalidateQueries({ queryKey: ['proposal-templates'] });
    void template;
  };

  return (
    <>
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-0.5">
              Proposal Templates
            </p>
            <p className="text-[13px] text-muted-foreground">
              Upload Word (.docx) templates to generate filled proposals from quotes.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Upload Template
          </Button>
        </div>

        {/* Template list */}
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-medium text-foreground">No templates yet</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Upload a .docx proposal template to get started.
              </p>
            </div>
          ) : (
            templates.map((template, i) => (
              <div
                key={template.id}
                className={`flex items-center gap-3 px-5 py-4 ${
                  i > 0 ? 'border-t border-border/40' : ''
                }`}>
                <div className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {template.name}
                    </p>
                    {template.serviceType && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {template.serviceType.name}
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {template.description}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {template.fileName} &middot; Uploaded{' '}
                    {new Date(template.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  disabled={deletingId === template.id}
                  onClick={() => handleDelete(template)}>
                  {deletingId === template.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <UploadTemplateDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        serviceTypes={serviceTypes}
        onUploaded={handleUploaded}
      />
    </>
  );
}
