'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Loader2,
  Save,
  GripVertical,
  Info,
} from 'lucide-react';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';
import { settingsApi } from '@/lib/api/client';
import type { Division } from '@/lib/types';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  { color: 'bg-gray-500', lightColor: 'bg-gray-50', border: 'border-gray-200', label: 'Gray' },
  { color: 'bg-blue-500', lightColor: 'bg-blue-50', border: 'border-blue-200', label: 'Blue' },
  { color: 'bg-purple-500', lightColor: 'bg-purple-50', border: 'border-purple-200', label: 'Purple' },
  { color: 'bg-orange-500', lightColor: 'bg-orange-50', border: 'border-orange-200', label: 'Orange' },
  { color: 'bg-green-500', lightColor: 'bg-green-50', border: 'border-green-200', label: 'Green' },
  { color: 'bg-red-500', lightColor: 'bg-red-50', border: 'border-red-200', label: 'Red' },
  { color: 'bg-yellow-500', lightColor: 'bg-yellow-50', border: 'border-yellow-200', label: 'Yellow' },
  { color: 'bg-teal-500', lightColor: 'bg-teal-50', border: 'border-teal-200', label: 'Teal' },
  { color: 'bg-pink-500', lightColor: 'bg-pink-50', border: 'border-pink-200', label: 'Pink' },
  { color: 'bg-indigo-500', lightColor: 'bg-indigo-50', border: 'border-indigo-200', label: 'Indigo' },
];

interface PipelineByTypeTableProps {
  jobTypeName: string;
}

function PipelineByTypeTable({ jobTypeName }: PipelineByTypeTableProps) {
  const queryClient = useQueryClient();
  const { data: stages = [], isLoading } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages-by-type', jobTypeName],
    queryFn: () => pipelineApi.getStagesByJobType(jobTypeName),
    staleTime: 2 * 60 * 1000,
  });

  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PipelineStage | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageProbability, setNewStageProbability] = useState(50);
  const [newStageSortOrder, setNewStageSortOrder] = useState(0);
  const [newStageColorIdx, setNewStageColorIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editProbability, setEditProbability] = useState(0);
  const [editColorIdx, setEditColorIdx] = useState(0);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['pipeline-stages-by-type', jobTypeName] });

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      toast.error('Stage name is required');
      return;
    }
    setAdding(true);
    try {
      const preset = COLOR_PRESETS[newStageColorIdx];
      await pipelineApi.createStage({
        name: newStageName.trim(),
        pipelineType: 'project',
        jobType: jobTypeName,
        probability: newStageProbability,
        sortOrder: newStageSortOrder,
        color: preset.color,
        lightColor: preset.lightColor,
        border: preset.border,
      });
      setNewStageName('');
      setNewStageProbability(50);
      toast.success('Stage created');
      invalidate();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create stage');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteStage = async () => {
    if (!deleteTarget) return;
    try {
      await pipelineApi.deleteStage(deleteTarget.id);
      toast.success(`Stage "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      invalidate();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete stage');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;
    const newStages = [...stages];
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    const reordered = newStages.map((s, i) => ({ ...s, sortOrder: s.sortOrder + (i - index) }));
    try {
      await pipelineApi.reorderStages({ stages: reordered.map((s) => ({ id: s.id, sortOrder: s.sortOrder })) });
      invalidate();
    } catch {
      toast.error('Failed to reorder stages');
    }
  };

  const startEdit = (stage: PipelineStage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditProbability(stage.probability);
    const colorIdx = COLOR_PRESETS.findIndex((p) => p.color === stage.color);
    setEditColorIdx(colorIdx >= 0 ? colorIdx : 0);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const preset = COLOR_PRESETS[editColorIdx];
      await pipelineApi.updateStage(editingId, {
        name: editName,
        probability: editProbability,
        color: preset.color,
        lightColor: preset.lightColor,
        border: preset.border,
      });
      setEditingId(null);
      toast.success('Stage updated');
      invalidate();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-px">
        <Skeleton className="h-10 w-full rounded-t-lg rounded-b-none" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-none" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Stages for <span className="text-primary">{jobTypeName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No type-specific stages yet. Add one below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Order</TableHead>
                  <TableHead className="w-10">Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32">Probability %</TableHead>
                  <TableHead className="w-24">Sort Order</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((stage, index) => (
                  <TableRow key={stage.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-0.5 hover:bg-muted rounded disabled:opacity-30">
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleMove(index, 'down')} disabled={index === stages.length - 1} className="p-0.5 hover:bg-muted rounded disabled:opacity-30">
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === stage.id ? (
                        <div className="flex gap-1">
                          {COLOR_PRESETS.map((preset, i) => (
                            <button key={preset.label} onClick={() => setEditColorIdx(i)} className={`w-5 h-5 rounded-full ${preset.color} ${editColorIdx === i ? 'ring-2 ring-offset-1 ring-primary' : ''}`} title={preset.label} />
                          ))}
                        </div>
                      ) : (
                        <div className={`w-5 h-5 rounded-full ${stage.color}`} />
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === stage.id ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 w-40" />
                      ) : (
                        <span className="cursor-pointer hover:underline" onClick={() => startEdit(stage)}>{stage.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === stage.id ? (
                        <Input type="number" value={editProbability} onChange={(e) => setEditProbability(parseInt(e.target.value) || 0)} className="h-8 w-20" min={0} max={100} />
                      ) : (
                        <span className="cursor-pointer hover:underline" onClick={() => startEdit(stage)}>{stage.probability}%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="tabular-nums">{stage.sortOrder}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === stage.id ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button size="sm" onClick={saveEdit} disabled={saving}>
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(stage)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Add New Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Add Stage for {jobTypeName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Type-specific stages are merged with general stages by <strong>sort order</strong>. Set a sort order that positions this stage between the appropriate general stages — e.g., use <strong>2</strong> to appear after Field Work (sortOrder 2) and before Drafting (sortOrder 3).
            </span>
          </div>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-40">
              <label className="text-sm font-medium">Name</label>
              <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="e.g., Title Research" />
            </div>
            <div className="space-y-1.5 w-28">
              <label className="text-sm font-medium">Probability %</label>
              <Input type="number" value={newStageProbability} onChange={(e) => setNewStageProbability(parseInt(e.target.value) || 0)} min={0} max={100} />
            </div>
            <div className="space-y-1.5 w-28">
              <label className="text-sm font-medium">Sort Order</label>
              <Input type="number" value={newStageSortOrder} onChange={(e) => setNewStageSortOrder(parseInt(e.target.value) || 0)} min={0} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-1">
                {COLOR_PRESETS.map((preset, i) => (
                  <button key={preset.label} onClick={() => setNewStageColorIdx(i)} className={`w-6 h-6 rounded-full ${preset.color} ${newStageColorIdx === i ? 'ring-2 ring-offset-2 ring-primary' : ''}`} title={preset.label} />
                ))}
              </div>
            </div>
            <Button onClick={handleAddStage} disabled={adding} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? Projects currently in this stage cannot have this stage deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStage} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PipelineByTypeView() {
  const [selectedJobTypeName, setSelectedJobTypeName] = useState<string>('');

  const { data: divisions = [], isLoading } = useQuery<Division[]>({
    queryKey: ['divisions'],
    queryFn: () => settingsApi.getDivisions(),
    staleTime: 10 * 60 * 1000,
  });

  const allJobTypes = divisions.flatMap((cat) => cat.jobTypes ?? []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Project Type</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : allJobTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No job types configured. Add job types in Settings → Services first.
            </p>
          ) : (
            <Select value={selectedJobTypeName} onValueChange={setSelectedJobTypeName}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose a project type…" />
              </SelectTrigger>
              <SelectContent>
                {allJobTypes.map((st) => (
                  <SelectItem key={st.id} value={st.name}>{st.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedJobTypeName && (
        <PipelineByTypeTable jobTypeName={selectedJobTypeName} />
      )}
    </div>
  );
}
