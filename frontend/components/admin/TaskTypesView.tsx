'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Loader2, Save, Pencil } from 'lucide-react';
import { settingsApi } from '@/lib/api/client';
import type { TaskType, JobType } from '@/lib/types';
import { toast } from 'sonner';

export function TaskTypesView() {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; jobTypeId: string; isActive: boolean }>({ name: '', jobTypeId: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskType | null>(null);
  const [newData, setNewData] = useState({ name: '', description: '', jobTypeId: '', isActive: true });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [tt, st] = await Promise.all([settingsApi.getTaskTypes(), settingsApi.getJobTypes()]);
      setTaskTypes(tt);
      setJobTypes(st.filter((s) => s.isActive));
    } catch {
      toast.error('Failed to load task types');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newData.name.trim()) { toast.error('Name is required'); return; }
    setAdding(true);
    try {
      await settingsApi.createTaskType({
        name: newData.name.trim(),
        description: newData.description.trim() || undefined,
        jobTypeId: newData.jobTypeId || undefined,
        isActive: newData.isActive,
      });
      setNewData({ name: '', description: '', jobTypeId: '', isActive: true });
      toast.success('Task type created');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create task type');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (tt: TaskType) => {
    setEditingId(tt.id);
    setEditData({ name: tt.name, jobTypeId: tt.jobTypeId ?? '', isActive: tt.isActive });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData.name.trim()) return;
    setSaving(true);
    try {
      await settingsApi.updateTaskType(editingId, {
        name: editData.name.trim(),
        jobTypeId: editData.jobTypeId || undefined,
        isActive: editData.isActive,
      });
      setEditingId(null);
      toast.success('Task type updated');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update task type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await settingsApi.deleteTaskType(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete task type');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display tracking-tight">Task Types</h2>
        <p className="text-muted-foreground mt-1">Manage task types, optionally linked to a project type.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Task Types</CardTitle></CardHeader>
        <CardContent>
          {taskTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No task types yet. Add one below.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Project Type</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskTypes.map((tt) => (
                  <TableRow key={tt.id}>
                    <TableCell>
                      {editingId === tt.id ? (
                        <Input
                          value={editData.name}
                          onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                          className="h-8 w-48"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        <span className="cursor-pointer hover:underline" onClick={() => startEdit(tt)}>{tt.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === tt.id ? (
                        <Select
                          value={editData.jobTypeId}
                          onValueChange={(v) => setEditData((d) => ({ ...d, jobTypeId: v === '__none__' ? '' : v }))}>
                          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {jobTypes.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        tt.jobType
                          ? <Badge variant="secondary">{tt.jobType.name}</Badge>
                          : <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === tt.id ? (
                        <Switch
                          checked={editData.isActive}
                          onCheckedChange={(v) => setEditData((d) => ({ ...d, isActive: v }))}
                        />
                      ) : (
                        <Badge variant={tt.isActive ? 'default' : 'secondary'}>{tt.isActive ? 'Active' : 'Inactive'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === tt.id ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(tt)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(tt)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />Add Task Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={newData.name}
                onChange={(e) => setNewData((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g., Field Survey"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project Type</Label>
              <Select
                value={newData.jobTypeId}
                onValueChange={(v) => setNewData((d) => ({ ...d, jobTypeId: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {jobTypes.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={newData.description}
                onChange={(e) => setNewData((d) => ({ ...d, description: e.target.value }))}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newData.isActive}
                onCheckedChange={(v) => setNewData((d) => ({ ...d, isActive: v }))}
                id="new-active"
              />
              <Label htmlFor="new-active">Active</Label>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={adding} className="mt-4 gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              {(deleteTarget?._count?.tasks ?? 0) > 0 && ` It is assigned to ${deleteTarget!._count!.tasks} task(s) — they will be unlinked.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
