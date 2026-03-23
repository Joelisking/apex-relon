'use client';

import { Loader2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Lead } from '@/lib/types';
import type { PipelineStage } from '@/lib/api/pipeline-client';

interface Manager {
  id: string;
  name: string;
  role?: string;
}

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function BulkDeleteDialog({
  open, onOpenChange, selectedCount, isDeleting, onConfirm,
}: BulkDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Selected Prospective Projects</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{' '}
            <strong>{selectedCount} prospective project{selectedCount !== 1 ? 's' : ''}</strong>.
            All associated activities and files will also be removed. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700">
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
            ) : (
              `Delete ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface BulkStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  bulkStage: string;
  onStageChange: (stage: string) => void;
  isAssigning: boolean;
  onConfirm: () => void;
  pipelineStages: PipelineStage[];
}

export function BulkStageDialog({
  open, onOpenChange, selectedCount, bulkStage, onStageChange, isAssigning, onConfirm, pipelineStages,
}: BulkStageDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Assign Stage</AlertDialogTitle>
          <AlertDialogDescription>
            Select a pipeline stage to assign to{' '}
            <strong>{selectedCount} selected item{selectedCount !== 1 ? 's' : ''}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-1 py-2">
          <Select value={bulkStage} onValueChange={onStageChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a stage..." />
            </SelectTrigger>
            <SelectContent>
              {pipelineStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isAssigning || !bulkStage}>
            {isAssigning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</>
            ) : (
              'Assign Stage'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface BulkRepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  managers: Manager[];
  bulkRepId: string;
  onRepSelect: (id: string) => void;
  bulkRepSearch: string;
  onSearchChange: (q: string) => void;
  isAssigning: boolean;
  onConfirm: () => void;
}

export function BulkRepDialog({
  open, onOpenChange, selectedCount, managers, bulkRepId, onRepSelect,
  bulkRepSearch, onSearchChange, isAssigning, onConfirm,
}: BulkRepDialogProps) {
  const filtered = managers.filter((m) =>
    m.name.toLowerCase().includes(bulkRepSearch.toLowerCase()),
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Assign Rep</AlertDialogTitle>
          <AlertDialogDescription>
            Select a sales rep to assign to{' '}
            <strong>{selectedCount} selected item{selectedCount !== 1 ? 's' : ''}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-1 py-2 space-y-2">
          <input
            type="text"
            placeholder="Search users..."
            value={bulkRepSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="max-h-48 overflow-y-auto rounded-md border border-input">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onRepSelect(m.id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${bulkRepId === m.id ? 'bg-accent font-medium' : ''}`}>
                {m.name}
                {m.role && <span className="ml-2 text-xs text-muted-foreground">{m.role}</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No users found.</p>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isAssigning || !bulkRepId}>
            {isAssigning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</>
            ) : (
              'Assign Rep'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface LeadDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function LeadDeleteDialog({
  open, onOpenChange, lead, isDeleting, onConfirm,
}: LeadDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Prospective Project</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{' '}
            <strong>{lead?.contactName || lead?.projectName}</strong>{' '}
            ({lead?.company}). All associated activities and files will also be removed.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700">
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
