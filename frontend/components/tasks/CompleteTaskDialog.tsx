'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Task } from '@/lib/types';

interface CompleteTaskDialogProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onConfirm: (completionNote: string) => Promise<void>;
}

export function CompleteTaskDialog({
  task,
  open,
  onClose,
  onConfirm,
}: CompleteTaskDialogProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNote('');
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await onConfirm(note.trim());
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Task as Done</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground line-clamp-2">
            <span className="font-medium text-foreground">
              {task.title}
            </span>
          </p>

          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
              Result / Completion Note
              <span className="ml-1 text-destructive">*</span>
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the outcome or result..."
              className="resize-none min-h-24 text-sm"
              rows={4}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={saving || !note.trim()}>
            {saving && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Mark as Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
