'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Pencil,
  Trash2,
  Link2,
  Code2,
  BarChart2,
  Loader2,
  FormInput,
  Activity,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { formsApi } from '@/lib/api/forms-client';
import { apiFetch } from '@/lib/api/client';
import { usersApi } from '@/lib/api/users-client';
import type { LeadForm } from '@/lib/types';
import type { UserResponse } from '@/lib/api/users-client';
import { CreateFormDialog } from './forms/CreateFormDialog';
import { EditFormDialog } from './forms/EditFormDialog';
import { FormEmbedDialog } from './forms/FormEmbedDialog';
import { FormAnalyticsDialog } from './forms/FormAnalyticsDialog';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  name: string;
  type: string;
}

export default function LeadFormsView() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editForm, setEditForm] = useState<LeadForm | null>(null);
  const [embedForm, setEmbedForm] = useState<LeadForm | null>(null);
  const [analyticsForm, setAnalyticsForm] = useState<LeadForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: forms = [], isLoading } = useQuery<LeadForm[]>({
    queryKey: ['lead-forms'],
    queryFn: () => formsApi.getAll(),
    staleTime: 30 * 1000,
  });

  const { data: stagesData = [] } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages', 'prospective_project'],
    queryFn: () =>
      apiFetch<PipelineStage[]>('/pipeline?type=prospective_project'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getUsers(),
    staleTime: 2 * 60 * 1000,
  });
  const users: UserResponse[] = usersData?.users ?? [];

  const canManage = hasPermission('settings:manage');

  // Stats
  const totalForms = forms.length;
  const activeForms = forms.filter((f) => f.isActive).length;
  const totalSubmissions = forms.reduce(
    (sum, f) => sum + (f._count?.submissions ?? f.submissionsCount ?? 0),
    0,
  );
  // We don't have per-form monthly data without analytics, so show totalSubmissions as placeholder
  const thisMonthSubmissions = totalSubmissions; // best effort

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await formsApi.delete(deleteId);
      toast.success('Form deleted');
      queryClient.invalidateQueries({ queryKey: ['lead-forms'] });
      setDeleteId(null);
    } catch (err) {
      toast.error('Failed to delete form', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (form: LeadForm) => {
    const url = `${window.location.origin}/forms/${form.apiKey}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Failed to copy'));
  };

  const deleteTarget = forms.find((f) => f.id === deleteId);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Lead Forms
            </h2>
            <p className="text-sm text-muted-foreground">
              Capture inbound leads from your website
            </p>
          </div>
          {canManage && (
            <Button
              className="gap-2"
              onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Form
            </Button>
          )}
        </div>

        {/* Stats bar */}
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="grid grid-cols-4 gap-px bg-border/60">
            {[
              {
                label: 'Total Forms',
                sublabel: 'Created in system',
                value: String(totalForms),
                icon: FormInput,
                highlight: true,
              },
              {
                label: 'Active Forms',
                sublabel: 'Currently accepting',
                value: String(activeForms),
                icon: CheckCircle2,
                highlight: false,
              },
              {
                label: 'Total Submissions',
                sublabel: 'Across all forms',
                value: String(totalSubmissions),
                icon: Send,
                highlight: false,
              },
              {
                label: 'This Month',
                sublabel: 'Submissions received',
                value: String(thisMonthSubmissions),
                icon: Activity,
                highlight: false,
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="relative bg-card px-5 py-4">
                  {stat.highlight && (
                    <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
                  )}
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium truncate">
                      {stat.label}
                    </p>
                  </div>
                  <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mb-1">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground/50">
                    {stat.sublabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
              All Forms
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border/60 bg-muted/20">
              <FormInput className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No forms yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Create your first web-to-lead form to get started
              </p>
              {canManage && (
                <Button
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  New Form
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="py-2.5 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
                      Form Name
                    </th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 w-[90px]">
                      Fields
                    </th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 hidden md:table-cell">
                      Target Stage
                    </th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 hidden lg:table-cell">
                      Assigned To
                    </th>
                    <th className="py-2.5 px-4 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 w-[100px] text-center">
                      Submissions
                    </th>
                    <th className="py-2.5 px-4 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 w-[90px] text-center">
                      Status
                    </th>
                    <th className="py-2.5 px-4 w-[140px]" />
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form, i) => {
                    const submissionsCount =
                      form._count?.submissions ?? form.submissionsCount ?? 0;
                    return (
                      <tr
                        key={form.id}
                        className={cn(
                          'hover:bg-muted/30 transition-colors',
                          i < forms.length - 1 && 'border-b border-border/40',
                        )}>
                        <td className="py-3 px-4">
                          <p className="font-medium leading-none">
                            {form.name}
                          </p>
                          {form.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {form.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="text-xs">
                            {form.fields.length} field
                            {form.fields.length !== 1 ? 's' : ''}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                            <span className="text-sm">
                              {form.targetStage}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                          {form.assignTo?.name ?? (
                            <span className="text-[11px] italic text-muted-foreground/40">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="tabular-nums font-medium">
                            {submissionsCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs border-transparent',
                              form.isActive
                                ? 'bg-emerald-100/70 text-emerald-800'
                                : 'bg-muted text-muted-foreground',
                            )}>
                            {form.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleCopyLink(form)}>
                                  <Link2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy link</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setEmbedForm(form)}>
                                  <Code2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Embed code</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setAnalyticsForm(form)}>
                                  <BarChart2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Analytics</TooltipContent>
                            </Tooltip>

                            {canManage && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setEditForm(form)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            )}

                            {canManage && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteId(form.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        stages={stagesData}
        users={users}
      />

      <EditFormDialog
        form={editForm}
        onOpenChange={(open) => !open && setEditForm(null)}
        stages={stagesData}
        users={users}
      />

      <FormEmbedDialog
        form={embedForm}
        onOpenChange={(open) => !open && setEmbedForm(null)}
      />

      <FormAnalyticsDialog
        form={analyticsForm}
        onOpenChange={(open) => !open && setAnalyticsForm(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the form and all its submission
              records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
