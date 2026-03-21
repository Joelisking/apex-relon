'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';
import type { Client } from '@/lib/types';
import { api } from '@/lib/api/client';

const CLIENT_STATUSES = ['Active', 'Inactive', 'At Risk'];

interface Manager {
  id: string;
  name: string;
}

interface Props {
  selectedClients: Client[];
  managers: Manager[];
  onClearSelection: () => void;
  onExport: () => void;
}

export function CustomerBulkActions({ selectedClients, managers, onClearSelection, onExport }: Props) {
  const queryClient = useQueryClient();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false);
  const [bulkManagerOpen, setBulkManagerOpen] = useState(false);
  const [bulkManagerId, setBulkManagerId] = useState('');
  const [isBulkAssigningManager, setIsBulkAssigningManager] = useState(false);

  const count = selectedClients.length;
  const plural = count !== 1 ? 's' : '';
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clients'] });

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      await api.clients.bulkDelete(selectedClients.map((c) => c.id));
      onClearSelection();
      setBulkDeleteOpen(false);
      toast.success(`${count} customer${plural} deleted`);
      invalidate();
    } catch {
      toast.error('Failed to delete some customers');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus) return;
    setIsBulkUpdatingStatus(true);
    try {
      await api.clients.bulkUpdate(selectedClients.map((c) => c.id), { status: bulkStatus });
      onClearSelection();
      setBulkStatusOpen(false);
      setBulkStatus('');
      toast.success(`Status updated for ${count} customer${plural}`);
      invalidate();
    } catch {
      toast.error('Failed to update status for some customers');
    } finally {
      setIsBulkUpdatingStatus(false);
    }
  };

  const handleBulkAssignManager = async () => {
    if (!bulkManagerId) return;
    setIsBulkAssigningManager(true);
    try {
      await api.clients.bulkUpdate(selectedClients.map((c) => c.id), { accountManager: bulkManagerId });
      onClearSelection();
      setBulkManagerOpen(false);
      setBulkManagerId('');
      toast.success(`Account manager assigned for ${count} customer${plural}`);
      invalidate();
    } catch {
      toast.error('Failed to assign account manager for some customers');
    } finally {
      setIsBulkAssigningManager(false);
    }
  };

  if (count === 0) return null;

  return (
    <>
      {/* Bulk action bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border border-border/60 rounded-lg">
        <span className="text-sm text-muted-foreground">{count} selected</span>
        <div className="flex items-center gap-1.5 ml-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            onClick={() => setBulkStatusOpen(true)}>
            <ChevronDown className="h-3 w-3" />
            Change Status
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            onClick={() => setBulkManagerOpen(true)}>
            Assign Manager
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            onClick={onExport}>
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3 w-3" />
            Delete selected
          </Button>
        </div>
      </div>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Customers</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>
                {count} customer{plural}
              </strong>
              . All associated data will also be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${count} customer${plural}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Dialog */}
      <AlertDialog
        open={bulkStatusOpen}
        onOpenChange={(open) => {
          setBulkStatusOpen(open);
          if (!open) setBulkStatus('');
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select a status to apply to{' '}
              <strong>
                {count} selected customer{plural}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a status..." />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkStatusChange}
              disabled={isBulkUpdatingStatus || !bulkStatus}>
              {isBulkUpdatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Apply Status'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assign Manager Dialog */}
      <AlertDialog
        open={bulkManagerOpen}
        onOpenChange={(open) => {
          setBulkManagerOpen(open);
          if (!open) setBulkManagerId('');
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Account Manager</AlertDialogTitle>
            <AlertDialogDescription>
              Select an account manager to assign to{' '}
              <strong>
                {count} selected customer{plural}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select value={bulkManagerId} onValueChange={setBulkManagerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a manager..." />
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAssignManager}
              disabled={isBulkAssigningManager || !bulkManagerId}>
              {isBulkAssigningManager ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Manager'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
