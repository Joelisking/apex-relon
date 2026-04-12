'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { payGradesApi, type PayGrade } from '@/lib/api/user-rates-client';

interface FormState {
  name: string;
  code: string;
  description: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  description: '',
  sortOrder: 0,
  isDefault: false,
  isActive: true,
};

function formFromGrade(grade: PayGrade | null): FormState {
  if (!grade) return EMPTY_FORM;
  return {
    name: grade.name,
    code: grade.code,
    description: grade.description ?? '',
    sortOrder: grade.sortOrder,
    isDefault: grade.isDefault,
    isActive: grade.isActive,
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editing: PayGrade | null;
}

export function PayGradeDialog({ open, onClose, editing }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;
  const [form, setForm] = useState<FormState>(() => formFromGrade(editing));

  // Sync form to the currently-edited grade. This is the recommended pattern
  // for resetting state when a key prop changes — see "You Might Not Need an Effect".
  const lastEditingId = useRef<string | null>(editing?.id ?? null);
  if (lastEditingId.current !== (editing?.id ?? null)) {
    lastEditingId.current = editing?.id ?? null;
    setForm(formFromGrade(editing));
  }

  const createMutation = useMutation({
    mutationFn: () =>
      payGradesApi.create({
        name: form.name.trim(),
        code: form.code.trim().toLowerCase().replace(/\s+/g, '_'),
        description: form.description.trim() || undefined,
        sortOrder: form.sortOrder,
        isDefault: form.isDefault,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-grades'] });
      toast.success('Pay grade created');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create pay grade'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      payGradesApi.update(editing!.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sortOrder: form.sortOrder,
        isDefault: form.isDefault,
        isActive: form.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-grades'] });
      toast.success('Pay grade updated');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update pay grade'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!isEdit && !form.code.trim()) {
      toast.error('Code is required');
      return;
    }
    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pay Grade' : 'New Pay Grade'}</DialogTitle>
          <DialogDescription>
            Pay grades define rate categories. Each user can have one rate per grade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pg-name">Name</Label>
            <Input
              id="pg-name"
              placeholder="e.g. INDOT Pay 4"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pg-code">Code</Label>
            <Input
              id="pg-code"
              placeholder="e.g. indot_4"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              disabled={isEdit}
            />
            <p className="text-xs text-muted-foreground">
              Internal identifier. Lowercase, underscore-separated. Cannot be changed after creation.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pg-desc">Description</Label>
            <Textarea
              id="pg-desc"
              placeholder="Optional description shown to admins"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pg-sort">Sort Order</Label>
            <Input
              id="pg-sort"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value || '0', 10) }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
            <div className="space-y-0.5">
              <Label className="text-sm">Default grade</Label>
              <p className="text-xs text-muted-foreground">
                Used when no INDOT zone applies. Only one grade can be default.
              </p>
            </div>
            <Switch
              checked={form.isDefault}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, isDefault: checked }))}
              disabled={isEdit && editing?.isDefault}
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-sm">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive grades are hidden from rate pickers.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
                disabled={editing?.isDefault}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? 'Save Changes' : 'Create Pay Grade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
