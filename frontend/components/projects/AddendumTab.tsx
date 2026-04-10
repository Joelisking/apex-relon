'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  addendaApi,
  type Addendum,
  type AddendumLine,
  type CreateAddendumDto,
  type UpsertAddendumLineDto,
} from '@/lib/api/addenda-client';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  DRAFT:    { label: 'Draft',    classes: 'bg-gray-100 text-gray-700 border-gray-200' },
  APPROVED: { label: 'Approved', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  INVOICED: { label: 'Invoiced', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const STATUS_NEXT: Record<string, string> = {
  DRAFT: 'APPROVED',
  APPROVED: 'INVOICED',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

type LineState = UpsertAddendumLineDto & { key: string };

function blankLine(): LineState {
  return { key: crypto.randomUUID(), description: '', role: '', estimatedHours: 0, billableRate: 0 };
}

// ─── EditableLineRow ───────────────────────────────────────────────────────────

interface EditableLineRowProps {
  line: LineState;
  onChange: (key: string, field: keyof UpsertAddendumLineDto, value: string | number) => void;
  onDelete: (key: string) => void;
}

function EditableLineRow({ line, onChange, onDelete }: EditableLineRowProps) {
  const lineTotal = line.estimatedHours * line.billableRate;
  return (
    <div className="grid grid-cols-[1fr_100px_80px_90px_80px_32px] gap-2 items-center">
      <Input
        placeholder="Description"
        value={line.description}
        onChange={(e) => onChange(line.key, 'description', e.target.value)}
        className="h-8 text-sm"
      />
      <Input
        placeholder="Role"
        value={line.role ?? ''}
        onChange={(e) => onChange(line.key, 'role', e.target.value)}
        className="h-8 text-sm"
      />
      <Input
        type="number"
        placeholder="Hrs"
        value={line.estimatedHours || ''}
        onChange={(e) => onChange(line.key, 'estimatedHours', parseFloat(e.target.value) || 0)}
        className="h-8 text-sm"
      />
      <Input
        type="number"
        placeholder="Rate"
        value={line.billableRate || ''}
        onChange={(e) => onChange(line.key, 'billableRate', parseFloat(e.target.value) || 0)}
        className="h-8 text-sm"
      />
      <span className="text-sm text-right tabular-nums">{fmt(lineTotal)}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(line.key)}
        type="button"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── LinesEditor (shared between create + edit dialogs) ──────────────────────

interface LinesEditorProps {
  lines: LineState[];
  onAdd: () => void;
  onChange: (key: string, field: keyof UpsertAddendumLineDto, value: string | number) => void;
  onDelete: (key: string) => void;
}

function LinesEditor({ lines, onAdd, onChange, onDelete }: LinesEditorProps) {
  const total = lines.reduce((s, l) => s + l.estimatedHours * l.billableRate, 0);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Line Items</Label>
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-7 gap-1 text-xs" type="button">
          <Plus className="h-3 w-3" /> Add Line
        </Button>
      </div>
      {lines.length > 0 ? (
        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <div className="grid grid-cols-[1fr_100px_80px_90px_80px_32px] gap-2 text-xs text-muted-foreground uppercase tracking-wide px-0">
            <span>Description</span>
            <span>Role</span>
            <span>Hours</span>
            <span>Rate</span>
            <span className="text-right">Total</span>
            <span />
          </div>
          {lines.map((line) => (
            <EditableLineRow key={line.key} line={line} onChange={onChange} onDelete={onDelete} />
          ))}
          <div className="flex justify-end pt-2 border-t border-border/30">
            <span className="text-sm font-semibold tabular-nums">{fmt(total)}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/50 p-4 text-center text-sm text-muted-foreground">
          No line items — click &ldquo;Add Line&rdquo; to start
        </div>
      )}
    </div>
  );
}

// ─── CreateAddendumDialog ─────────────────────────────────────────────────────

interface CreateAddendumDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateAddendumDialog({ projectId, open, onOpenChange, onCreated }: CreateAddendumDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setTitle('');
    setDescription('');
    setLines([]);
    onOpenChange(false);
  }, [onOpenChange]);

  const addLine = useCallback(() => setLines((prev) => [...prev, blankLine()]), []);

  const updateLine = useCallback((key: string, field: keyof UpsertAddendumLineDto, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setIsSubmitting(true);
    try {
      const dto: CreateAddendumDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        lines: lines.map((l, i) => ({
          description: l.description,
          role: l.role || undefined,
          estimatedHours: l.estimatedHours,
          billableRate: l.billableRate,
          sortOrder: i,
        })),
      };
      await addendaApi.create(projectId, dto);
      toast.success('Addendum created');
      onCreated();
      handleClose();
    } catch {
      toast.error('Failed to create addendum');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Addendum</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Additional Survey Work"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional scope details…"
              className="resize-none"
              rows={2}
            />
          </div>
          <LinesEditor lines={lines} onAdd={addLine} onChange={updateLine} onDelete={removeLine} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Creating…' : 'Create Addendum'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditLinesDialog ──────────────────────────────────────────────────────────

interface EditLinesDialogProps {
  addendum: Addendum;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function EditLinesDialog({ addendum, open, onOpenChange, onSaved }: EditLinesDialogProps) {
  const [lines, setLines] = useState<LineState[]>(() =>
    addendum.lines.map((l) => ({ ...l, key: l.id, role: l.role ?? '' }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addLine = useCallback(() => setLines((prev) => [...prev, blankLine()]), []);

  const updateLine = useCallback((key: string, field: keyof UpsertAddendumLineDto, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const existingIds = new Set(addendum.lines.map((l) => l.id));
      const payload: UpsertAddendumLineDto[] = lines.map((l, i) => ({
        id: existingIds.has(l.key) ? l.key : undefined,
        description: l.description,
        role: l.role || undefined,
        estimatedHours: l.estimatedHours,
        billableRate: l.billableRate,
        sortOrder: i,
      }));
      await addendaApi.upsertLines(addendum.id, payload);
      toast.success('Lines saved');
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Failed to save lines');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lines — {addendum.title}</DialogTitle>
        </DialogHeader>
        <LinesEditor lines={lines} onAdd={addLine} onChange={updateLine} onDelete={removeLine} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Lines'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Line display row ─────────────────────────────────────────────────────────

function LineDisplayRow({ line }: { line: AddendumLine }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex-1 min-w-0">
        <span className="text-foreground">{line.description}</span>
        {line.role && <span className="ml-2 text-xs text-muted-foreground">({line.role})</span>}
      </div>
      <div className="flex items-center gap-6 shrink-0 tabular-nums">
        <span className="text-muted-foreground text-xs">{line.estimatedHours}h × {fmt(line.billableRate)}</span>
        <span className="font-medium w-20 text-right">{fmt(line.lineTotal)}</span>
      </div>
    </div>
  );
}

// ─── AddendumCard ─────────────────────────────────────────────────────────────

interface AddendumCardProps {
  addendum: Addendum;
  onRefresh: () => void;
}

function AddendumCard({ addendum, onRefresh }: AddendumCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const badge = STATUS_BADGE[addendum.status] ?? STATUS_BADGE.DRAFT;
  const nextStatus = STATUS_NEXT[addendum.status];
  const nextBadge = nextStatus ? STATUS_BADGE[nextStatus] : null;

  const handleStatusAdvance = async () => {
    if (!nextStatus) return;
    setIsUpdating(true);
    try {
      await addendaApi.update(addendum.id, { status: nextStatus });
      toast.success(`Marked as ${nextBadge?.label ?? nextStatus}`);
      onRefresh();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await addendaApi.delete(addendum.id);
      toast.success('Addendum deleted');
      onRefresh();
    } catch {
      toast.error('Failed to delete addendum');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{addendum.title}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.classes}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {addendum.lines.length} {addendum.lines.length === 1 ? 'line' : 'lines'}
              {' · '}Created by {addendum.createdBy.name}
              {' · '}{format(new Date(addendum.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold tabular-nums">{fmt(addendum.total)}</span>

          {addendum.status === 'DRAFT' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsEditOpen(true)}
            >
              Edit Lines
            </Button>
          )}

          {nextBadge && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleStatusAdvance}
              disabled={isUpdating}
            >
              Mark {nextBadge.label}
            </Button>
          )}

          {addendum.status === 'DRAFT' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded lines */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3">
          {addendum.description && (
            <p className="text-sm text-muted-foreground italic mb-3">{addendum.description}</p>
          )}
          {addendum.lines.length > 0 ? (
            <>
              <div className="divide-y divide-border/30">
                {addendum.lines.map((line) => (
                  <LineDisplayRow key={line.id} line={line} />
                ))}
              </div>
              <div className="flex justify-end pt-2 mt-2 border-t border-border/30">
                <span className="text-sm font-semibold tabular-nums">Total: {fmt(addendum.total)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No line items added yet.</p>
          )}
        </div>
      )}

      {isEditOpen && (
        <EditLinesDialog
          addendum={addendum}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ─── AddendumTab (exported) ───────────────────────────────────────────────────

interface AddendumTabProps {
  projectId: string;
}

export function AddendumTab({ projectId }: AddendumTabProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: addenda = [], isLoading } = useQuery({
    queryKey: ['addenda', projectId],
    queryFn: () => addendaApi.getAll(projectId),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['addenda', projectId] });
  }, [queryClient, projectId]);

  const approvedTotal = addenda
    .filter((a) => a.status === 'APPROVED' || a.status === 'INVOICED')
    .reduce((s, a) => s + a.total, 0);

  const draftTotal = addenda
    .filter((a) => a.status === 'DRAFT')
    .reduce((s, a) => s + a.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Addenda
          </h3>
          {addenda.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {approvedTotal > 0 && (
                <span className="text-emerald-600">{fmt(approvedTotal)} approved/invoiced</span>
              )}
              {approvedTotal > 0 && draftTotal > 0 && <span className="mx-1">·</span>}
              {draftTotal > 0 && <span>{fmt(draftTotal)} draft pending</span>}
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Addendum
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : addenda.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 p-10 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No addenda yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Create an addendum to track scope changes and additional work
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {addenda.map((addendum) => (
            <AddendumCard key={addendum.id} addendum={addendum} onRefresh={invalidate} />
          ))}
        </div>
      )}

      <CreateAddendumDialog
        projectId={projectId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={invalidate}
      />
    </div>
  );
}
