'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
  type UpsertAddendumLineDto,
} from '@/lib/api/addenda-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { ServiceItem } from '@/lib/types';
import { AddendumLinesEditor, type LineState, blankLine } from './AddendumLinesEditor';

interface EditAddendumLinesDialogProps {
  addendum: Addendum;
  roles: RoleResponse[];
  serviceItems: ServiceItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditAddendumLinesDialog({
  addendum,
  roles,
  serviceItems,
  open,
  onOpenChange,
  onSaved,
}: EditAddendumLinesDialogProps) {
  const [lines, setLines] = useState<LineState[]>(() =>
    addendum.lines.map((l) => ({
      ...l,
      key: l.id,
      role: l.role ?? '',
      serviceItemId: l.serviceItemId ?? '',
      serviceItemSubtaskId: l.serviceItemSubtaskId ?? '',
    })),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addLine = useCallback(() => setLines((prev) => [...prev, blankLine()]), []);

  const updateLine = useCallback((key: string, field: keyof UpsertAddendumLineDto, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }, []);

  const updateServiceItem = useCallback((key: string, serviceItemId: string, subtaskId: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? { ...l, serviceItemId: serviceItemId || undefined, serviceItemSubtaskId: subtaskId || undefined }
          : l,
      ),
    );
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
        serviceItemId: l.serviceItemId || undefined,
        serviceItemSubtaskId: l.serviceItemSubtaskId || undefined,
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
        <AddendumLinesEditor
          lines={lines}
          roles={roles}
          serviceItems={serviceItems}
          onAdd={addLine}
          onChange={updateLine}
          onServiceItemChange={updateServiceItem}
          onDelete={removeLine}
        />
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
