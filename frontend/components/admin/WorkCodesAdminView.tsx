'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  workCodesApi,
  groupWorkCodes,
  getDivisionLabel,
  type WorkCode,
  type WorkCodeGroup,
} from '@/lib/api/work-codes-client';

const DIVISIONS = [5000, 6000, 7000];

export function WorkCodesAdminView() {
  const queryClient = useQueryClient();
  const [expandedDivisions, setExpandedDivisions] = useState<Set<number>>(new Set(DIVISIONS));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: codes = [], isLoading } = useQuery<WorkCode[]>({
    queryKey: ['work-codes-admin'],
    queryFn: () => workCodesApi.getAllForAdmin(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean }; successMessage?: string }) =>
      workCodesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-codes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['work-codes'] });
      setEditingId(null);
      if (variables.successMessage) toast.success(variables.successMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveName = (id: string) => {
    if (!editName.trim()) return;
    updateMutation.mutate({ id, data: { name: editName.trim() } });
  };

  const handleToggleActive = (wc: WorkCode) => {
    updateMutation.mutate({
      id: wc.id,
      data: { isActive: !wc.isActive },
      successMessage: `${wc.code} – ${wc.name} ${wc.isActive ? 'deactivated' : 'activated'}`,
    });
  };

  const toggleDivision = (div: number) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(div)) {
        next.delete(div);
      } else {
        next.add(div);
      }
      return next;
    });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading work codes…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Work Codes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Engineering time tracking codes used on engineering projects. Deactivate codes to hide them from time entry.
        </p>
      </div>

      {DIVISIONS.map((div) => {
        const divCodes = codes.filter((c) => c.division === div);
        const groups = groupWorkCodes(divCodes);
        const expanded = expandedDivisions.has(div);
        const activeCount = divCodes.filter((c) => c.isActive).length;

        return (
          <div key={div} className="border rounded-lg overflow-hidden">
            {/* Division header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              onClick={() => toggleDivision(div)}
            >
              <div className="flex items-center gap-3">
                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="font-semibold text-sm">{div} – {getDivisionLabel(div)}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {activeCount} / {divCodes.length} active
              </Badge>
            </button>

            {expanded && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map(({ mainTask, subtasks }: WorkCodeGroup) => (
                    <React.Fragment key={mainTask.id}>
                      {/* Main task row */}
                      <WorkCodeRow
                        wc={mainTask}
                        isEditing={editingId === mainTask.id}
                        editName={editName}
                        onEditStart={() => { setEditingId(mainTask.id); setEditName(mainTask.name); }}
                        onEditSave={() => handleSaveName(mainTask.id)}
                        onEditCancel={() => setEditingId(null)}
                        onEditNameChange={setEditName}
                        onToggleActive={() => handleToggleActive(mainTask)}
                        isMainTask
                      />
                      {/* Subtask rows */}
                      {subtasks.map((st) => (
                        <WorkCodeRow
                          key={st.id}
                          wc={st}
                          isEditing={editingId === st.id}
                          editName={editName}
                          onEditStart={() => { setEditingId(st.id); setEditName(st.name); }}
                          onEditSave={() => handleSaveName(st.id)}
                          onEditCancel={() => setEditingId(null)}
                          onEditNameChange={setEditName}
                          onToggleActive={() => handleToggleActive(st)}
                          isMainTask={false}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── WorkCodeRow sub-component ────────────────────────────────────────────────

interface WorkCodeRowProps {
  wc: WorkCode;
  isEditing: boolean;
  editName: string;
  isMainTask: boolean;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditNameChange: (v: string) => void;
  onToggleActive: () => void;
}

function WorkCodeRow({
  wc,
  isEditing,
  editName,
  isMainTask,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditNameChange,
  onToggleActive,
}: WorkCodeRowProps) {
  return (
    <TableRow className={!wc.isActive ? 'opacity-50' : undefined}>
      <TableCell className="font-mono text-sm text-muted-foreground">{wc.code}</TableCell>
      <TableCell className={isMainTask ? 'font-medium' : 'pl-8'}>
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') onEditSave(); if (e.key === 'Escape') onEditCancel(); }}
          />
        ) : (
          <span className="text-sm">{wc.name}</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={wc.isActive ? 'default' : 'secondary'} className="text-xs">
          {wc.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-end">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEditSave}>
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEditCancel}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEditStart}>
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={onToggleActive}
              >
                {wc.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
