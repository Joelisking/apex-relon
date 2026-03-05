'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import { customFieldsApi } from '@/lib/api/custom-fields-client';
import type { CustomFieldDefinition } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const fieldTypes = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'BOOLEAN', label: 'Yes/No' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'MULTI_SELECT', label: 'Multi Select' },
  { value: 'TEXTAREA', label: 'Long Text' },
  { value: 'URL', label: 'URL' },
];

const entityTypes = [
  { value: 'LEAD', label: 'Leads' },
  { value: 'CLIENT', label: 'Clients' },
  { value: 'PROJECT', label: 'Projects' },
];

export default function CustomFieldsAdmin() {
  const [definitions, setDefinitions] = useState<
    CustomFieldDefinition[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('LEAD');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDef, setEditingDef] =
    useState<CustomFieldDefinition | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    label: '',
    fieldKey: '',
    fieldType: 'TEXT',
    entityType: 'LEAD',
    required: false,
    options: '',
    isActive: true,
  });

  const fetchDefinitions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customFieldsApi.getDefinitions(entityFilter);
      setDefinitions(data);
    } catch (err) {
      console.error('Failed to fetch custom field definitions', err);
    } finally {
      setLoading(false);
    }
  }, [entityFilter]);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  const openCreate = () => {
    setEditingDef(null);
    setForm({
      label: '',
      fieldKey: '',
      fieldType: 'TEXT',
      entityType: entityFilter,
      required: false,
      options: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (def: CustomFieldDefinition) => {
    setEditingDef(def);
    setForm({
      label: def.label,
      fieldKey: def.fieldKey,
      fieldType: def.fieldType,
      entityType: def.entityType,
      required: def.required,
      options: def.options?.join(', ') || '',
      isActive: def.isActive,
    });
    setDialogOpen(true);
  };

  const generateFieldKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleLabelChange = (value: string) => {
    const updates: { label: string; fieldKey?: string } = {
      label: value,
    };
    if (!editingDef) {
      updates.fieldKey = generateFieldKey(value);
    }
    setForm({ ...form, ...updates });
  };

  const handleSave = async () => {
    if (!form.label.trim() || !form.fieldKey.trim()) return;
    setSaving(true);
    try {
      const options =
        form.fieldType === 'SELECT' ||
        form.fieldType === 'MULTI_SELECT'
          ? form.options
              .split(',')
              .map((o: string) => o.trim())
              .filter(Boolean)
          : undefined;

      if (editingDef) {
        await customFieldsApi.updateDefinition(editingDef.id, {
          label: form.label,
          required: form.required,
          isActive: form.isActive,
          ...(options !== undefined && { options }),
        });
      } else {
        await customFieldsApi.createDefinition({
          label: form.label,
          fieldKey: form.fieldKey,
          fieldType: form.fieldType,
          entityType: form.entityType,
          required: form.required,
          ...(options !== undefined && { options }),
        });
      }
      setDialogOpen(false);
      fetchDefinitions();
      toast.success(editingDef ? 'Custom field updated' : 'Custom field created');
    } catch (err) {
      console.error('Failed to save custom field', err);
      toast.error('Failed to save custom field', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await customFieldsApi.deleteDefinition(deleteId);
      setDeleteId(null);
      fetchDefinitions();
      toast.success('Custom field deleted');
    } catch (err) {
      console.error('Failed to delete custom field', err);
      toast.error('Failed to delete custom field');
    }
  };

  const showOptions =
    form.fieldType === 'SELECT' || form.fieldType === 'MULTI_SELECT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Custom Fields
          </h1>
          <p className="text-sm text-muted-foreground">
            Define custom fields for leads, clients, and projects
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Field
        </Button>
      </div>

      {/* Entity type tabs */}
      <div className="flex gap-1 border-b">
        {entityTypes.map((et) => (
          <button
            key={et.value}
            onClick={() => setEntityFilter(et.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              entityFilter === et.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
            {et.label}
          </button>
        ))}
      </div>

      {/* Fields list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : definitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Settings2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            No custom fields defined for{' '}
            {entityTypes.find((e) => e.value === entityFilter)?.label}
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            size="sm"
            className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add first field
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2">
                  Label
                </th>
                <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2">
                  Key
                </th>
                <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2">
                  Type
                </th>
                <th className="text-center text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2">
                  Required
                </th>
                <th className="text-center text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2">
                  Active
                </th>
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {definitions.map((def) => (
                <tr
                  key={def.id}
                  className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="text-sm font-medium">
                      {def.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {def.fieldKey}
                    </code>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal">
                      {fieldTypes.find(
                        (ft) => ft.value === def.fieldType,
                      )?.label || def.fieldType}
                    </Badge>
                    {def.options && def.options.length > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({def.options.length} options)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {def.required ? (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                        Required
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {def.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(def)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(def.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingDef ? 'Edit Custom Field' : 'New Custom Field'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Entity Type
              </label>
              <Select
                value={form.entityType}
                onValueChange={(v) =>
                  setForm({ ...form, entityType: v })
                }
                disabled={!!editingDef}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entityTypes.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Label *
              </label>
              <Input
                value={form.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g. Budget Range"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Field Type
              </label>
              <Select
                value={form.fieldType}
                onValueChange={(v) =>
                  setForm({ ...form, fieldType: v })
                }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showOptions && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Options (comma-separated)
                </label>
                <Input
                  value={form.options}
                  onChange={(e) =>
                    setForm({ ...form, options: e.target.value })
                  }
                  placeholder="Option 1, Option 2, Option 3"
                  className="mt-1"
                />
              </div>
            )}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.required}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, required: !!checked })
                  }
                />
                <label className="text-sm">Required</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isActive: !!checked })
                  }
                />
                <label className="text-sm">Active</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.label.trim()}>
              {saving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingDef ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this field definition and
              all stored values. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
