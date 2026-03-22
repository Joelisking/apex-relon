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

interface UncompleteTaskDialogProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function UncompleteTaskDialog({
  task,
  open,
  onClose,
  onConfirm,
}: UncompleteTaskDialogProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setReason('');
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revert Completed Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {task.title}
            </span>
          </p>

          {task.completionNote && (
            <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                Previous Completion Note
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {task.completionNote}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
              Reason for Reverting
              <span className="ml-1 text-destructive">*</span>
            </p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this task not done?..."
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
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={saving || !reason.trim()}>
            {saving && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Revert to Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
