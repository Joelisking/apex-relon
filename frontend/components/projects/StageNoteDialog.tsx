'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface StageNoteDialogProps {
  open: boolean;
  targetStatus: string;
  projectName: string;
  onConfirm: (note: string | undefined) => void;
  onCancel: () => void;
}

export function StageNoteDialog({
  open,
  targetStatus,
  projectName,
  onConfirm,
  onCancel,
}: StageNoteDialogProps) {
  const [note, setNote] = useState('');

  // Reset note each time the dialog opens
  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to {targetStatus}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{projectName}</span>
            {' '}— optionally add a note explaining why.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder={`Why is this project going ${targetStatus === 'On Hold' ? 'on hold' : 'to be cancelled'}?`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="resize-none"
          autoFocus
        />

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(note.trim() || undefined)}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
