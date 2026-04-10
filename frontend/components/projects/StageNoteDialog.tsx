'use client';

import { useState } from 'react';
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

  const handleCancel = () => {
    setNote('');
    onCancel();
  };

  const handleConfirm = () => {
    onConfirm(note.trim() || undefined);
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
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
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
