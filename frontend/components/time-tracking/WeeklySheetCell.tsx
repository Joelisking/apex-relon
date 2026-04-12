'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';
import { TimeEntryDialog, type TimeEntry } from './TimeEntryDialog';

export interface CellEntry {
  id: string;
  hours: number;
  description: string | null;
  billable: boolean;
  workCodeId: string | null;
  serviceItemId: string | null;
  serviceItemSubtaskId: string | null;
  hourlyRate: number | null;
}

interface WeeklySheetCellProps {
  hours: number;
  entries: CellEntry[];
  projectId: string;
  date: string;
  targetUser: { id: string; name: string; role: string } | null;
  canEdit: boolean;
  onUpdated: () => void;
}

function formatCellHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}:${String(mins).padStart(2, '0')}`;
}

async function deleteEntry(id: string) {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(`${API_URL}/time-tracking/entries/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 204 && !res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Delete failed');
  }
}

export function WeeklySheetCell({
  hours,
  entries,
  projectId,
  date,
  targetUser,
  canEdit,
  onUpdated,
}: WeeklySheetCellProps) {
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CellEntry | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-by-project'] });
      onUpdated();
      toast.success('Entry deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCellClick = () => {
    if (!canEdit) return;
    if (entries.length === 0) {
      setEditingEntry(null);
      setDialogOpen(true);
    } else {
      setPopoverOpen(true);
    }
  };

  const handleAddNew = () => {
    setPopoverOpen(false);
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const handleEditEntry = (entry: CellEntry) => {
    setPopoverOpen(false);
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleDialogSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['timesheet-by-project'] });
    onUpdated();
    setDialogOpen(false);
  };

  // Construct a full TimeEntry object for the edit dialog from the partial CellEntry
  const dialogEntry: TimeEntry | null = editingEntry
    ? {
        id: editingEntry.id,
        userId: targetUser?.id ?? '',
        projectId,
        date,
        hours: editingEntry.hours,
        description: editingEntry.description ?? undefined,
        billable: editingEntry.billable,
        workCodeId: editingEntry.workCodeId ?? undefined,
        serviceItemId: editingEntry.serviceItemId ?? undefined,
        serviceItemSubtaskId: editingEntry.serviceItemSubtaskId ?? undefined,
        hourlyRate: editingEntry.hourlyRate ?? undefined,
      }
    : null;

  const isEmpty = hours === 0;

  const cellInner = (
    <div
      className={`group flex items-center justify-center min-h-[36px] w-full rounded ${canEdit ? 'cursor-pointer hover:bg-accent/50' : ''}`}
      onClick={entries.length === 0 ? handleCellClick : undefined}
    >
      {isEmpty ? (
        <span className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors text-sm">
          —
        </span>
      ) : (
        <span className={`font-mono text-sm ${hours >= 8 ? 'text-green-700 font-semibold' : ''}`}>
          {formatCellHours(hours)}
        </span>
      )}
    </div>
  );

  return (
    <>
      {entries.length > 0 && canEdit ? (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="group flex items-center justify-center min-h-[36px] w-full rounded cursor-pointer hover:bg-accent/50">
              <span className={`font-mono text-sm ${hours >= 8 ? 'text-green-700 font-semibold' : ''}`}>
                {formatCellHours(hours)}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="center">
            <div className="space-y-0.5">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 py-1.5 px-1.5 rounded hover:bg-accent/50 group/row"
                >
                  <span className="font-mono text-sm font-medium w-10 shrink-0">
                    {formatCellHours(entry.hours)}
                  </span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">
                    {entry.description ?? '—'}
                  </span>
                  {entry.billable ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-1 shrink-0">B</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs px-1 shrink-0">NB</Badge>
                  )}
                  <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleEditEntry(entry)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-1.5 border-t mt-1">
                <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={handleAddNew}>
                  <Plus className="h-3 w-3 mr-1" /> Add entry
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        cellInner
      )}

      <TimeEntryDialog
        open={dialogOpen}
        entry={dialogEntry}
        initialProjectId={editingEntry ? undefined : projectId}
        initialDate={editingEntry ? undefined : date}
        targetUser={targetUser}
        onOpenChange={setDialogOpen}
        onSaved={handleDialogSaved}
      />
    </>
  );
}
