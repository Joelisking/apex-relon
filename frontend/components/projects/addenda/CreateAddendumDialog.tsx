'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  type CreateAddendumDto,
  type UpsertAddendumLineDto,
} from '@/lib/api/addenda-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { ServiceItem } from '@/lib/types';
import { AddendumLinesEditor, type LineState, blankLine } from './AddendumLinesEditor';

interface CreateAddendumDialogProps {
  projectId: string;
  roles: RoleResponse[];
  serviceItems: ServiceItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateAddendumDialog({
  projectId,
  roles,
  serviceItems,
  open,
  onOpenChange,
  onCreated,
}: CreateAddendumDialogProps) {
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
          serviceItemId: l.serviceItemId || undefined,
          serviceItemSubtaskId: l.serviceItemSubtaskId || undefined,
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
          <AddendumLinesEditor
            lines={lines}
            roles={roles}
            serviceItems={serviceItems}
            onAdd={addLine}
            onChange={updateLine}
            onServiceItemChange={updateServiceItem}
            onDelete={removeLine}
          />
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
