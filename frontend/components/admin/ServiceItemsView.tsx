'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, Plus, Loader2, ChevronRight, ChevronDown, Pencil, X, Check } from 'lucide-react';
import { serviceItemsApi, settingsApi, API_URL, getTokenFromClientCookies } from '@/lib/api/client';
import { MultiSelect } from '@/components/ui/multi-select';
import type { ServiceItem, ServiceType } from '@/lib/types';
import { toast } from 'sonner';

interface SystemRole {
  key: string;
  label: string;
}

export function ServiceItemsView() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [newItem, setNewItem] = useState({ name: '', description: '', serviceTypeIds: [] as string[], unit: '', defaultPrice: '', isActive: true, isIndot: false });
  const [adding, setAdding] = useState(false);
  const [newSubtask, setNewSubtask] = useState<Record<string, string>>({});
  const [newRoleRow, setNewRoleRow] = useState<Record<string, { role: string; hours: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', serviceTypeIds: [] as string[], unit: '', defaultPrice: '', isActive: true, isIndot: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const token = getTokenFromClientCookies() ?? '';
      const [si, st, rolesRes] = await Promise.all([
        serviceItemsApi.getAll(),
        settingsApi.getServiceTypes(),
        fetch(`${API_URL}/admin/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
      ]);
      setItems(si);
      setServiceTypes(st.filter((s) => s.isActive));
      setRoles(Array.isArray(rolesRes) ? rolesRes : []);
    } catch {
      toast.error('Failed to load service items');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newItem.name.trim()) { toast.error('Name is required'); return; }
    setAdding(true);
    try {
      await serviceItemsApi.create({
        name: newItem.name.trim(),
        description: newItem.description.trim() || undefined,
        serviceTypeIds: newItem.serviceTypeIds.length > 0 ? newItem.serviceTypeIds : undefined,
        unit: newItem.unit.trim() || undefined,
        defaultPrice: newItem.defaultPrice ? parseFloat(newItem.defaultPrice) : undefined,
        isActive: newItem.isActive,
        isIndot: newItem.isIndot,
      });
      setNewItem({ name: '', description: '', serviceTypeIds: [], unit: '', defaultPrice: '', isActive: true, isIndot: false });
      toast.success('Service item created');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create service item');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await serviceItemsApi.delete(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete service item');
    }
  };

  const handleStartEdit = (item: ServiceItem) => {
    setEditForm({
      name: item.name,
      description: item.description ?? '',
      serviceTypeIds: item.serviceTypeIds ?? [],
      unit: item.unit ?? '',
      defaultPrice: item.defaultPrice != null ? String(item.defaultPrice) : '',
      isActive: item.isActive,
      isIndot: item.isIndot,
    });
    setEditingId(item.id);
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await serviceItemsApi.update(itemId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        serviceTypeIds: editForm.serviceTypeIds.length > 0 ? editForm.serviceTypeIds : [],
        unit: editForm.unit.trim() || undefined,
        defaultPrice: editForm.defaultPrice ? parseFloat(editForm.defaultPrice) : undefined,
        isActive: editForm.isActive,
        isIndot: editForm.isIndot,
      });
      toast.success('Service item updated');
      setEditingId(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update service item');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubtask = async (itemId: string) => {
    const name = newSubtask[itemId]?.trim();
    if (!name) return;
    try {
      await serviceItemsApi.createSubtask(itemId, { name });
      setNewSubtask((p) => ({ ...p, [itemId]: '' }));
      toast.success('Subtask added');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add subtask');
    }
  };

  const handleDeleteSubtask = async (itemId: string, subtaskId: string) => {
    try {
      await serviceItemsApi.deleteSubtask(itemId, subtaskId);
      toast.success('Subtask deleted');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete subtask');
    }
  };

  const handleUpsertRole = async (itemId: string, subtaskId: string, role: string, hours: string) => {
    const h = parseFloat(hours);
    if (isNaN(h) || h < 0) { toast.error('Enter valid hours'); return; }
    try {
      await serviceItemsApi.upsertRoleEstimate(itemId, subtaskId, role, h);
      toast.success('Role estimate saved');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save role estimate');
    }
  };

  const handleDeleteRole = async (itemId: string, subtaskId: string, role: string) => {
    try {
      await serviceItemsApi.deleteRoleEstimate(itemId, subtaskId, role);
      toast.success('Role estimate deleted');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete role estimate');
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
        <h2 className="text-3xl font-display tracking-tight">Service Items</h2>
        <p className="text-muted-foreground mt-1">Billable deliverables used in quotes and time entries. Define subtasks and per-role hour estimates for scope of work generation.</p>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">No service items yet. Add one below.</CardContent>
          </Card>
        ) : items.map((item) => (
          <Card key={item.id}>
            <Collapsible open={expandedId === item.id} onOpenChange={(o) => setExpandedId(o ? item.id : null)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg py-3">
                  <div className="flex items-center gap-3">
                    {expandedId === item.id
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{item.name}</span>
                        {serviceTypes.filter((st) => item.serviceTypeIds?.includes(st.id)).map((st) => (
                          <Badge key={st.id} variant="secondary" className="text-xs">{st.name}</Badge>
                        ))}
                        {item.unit && <Badge variant="outline" className="text-xs">{item.unit}</Badge>}
                        {item.defaultPrice != null && <span className="text-sm text-muted-foreground">${item.defaultPrice.toFixed(2)}</span>}
                        {item.qbItemId && <Badge variant="outline" className="text-xs text-green-700 border-green-300">QB Synced</Badge>}
                        {item.isIndot && <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">INDOT</Badge>}
                        {!item.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{item.description}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }}
                      className="shrink-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              {/* Inline edit form */}
              {editingId === item.id && (
                <CardContent className="border-t pt-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div className="space-y-1.5">
                      <Label>Name *</Label>
                      <Input value={editForm.name} onChange={(e) => setEditForm((d) => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Project Types</Label>
                      <MultiSelect
                        value={editForm.serviceTypeIds}
                        onValueChange={(v) => setEditForm((d) => ({ ...d, serviceTypeIds: v }))}
                        placeholder="Select project types…"
                        searchPlaceholder="Search project types…"
                        options={serviceTypes.map((st) => ({ value: st.id, label: st.name }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Unit</Label>
                      <Input value={editForm.unit} onChange={(e) => setEditForm((d) => ({ ...d, unit: e.target.value }))} placeholder="e.g., Acre, Lot, Hour" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Default Price ($)</Label>
                      <Input type="number" min="0" step="0.01" value={editForm.defaultPrice} onChange={(e) => setEditForm((d) => ({ ...d, defaultPrice: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Description</Label>
                      <Textarea value={editForm.description} onChange={(e) => setEditForm((d) => ({ ...d, description: e.target.value }))} rows={2} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={editForm.isActive} onCheckedChange={(v) => setEditForm((d) => ({ ...d, isActive: v }))} id={`edit-si-active-${item.id}`} />
                      <Label htmlFor={`edit-si-active-${item.id}`}>Active</Label>
                    </div>
                    <div className="space-y-1.5">
                      <Label>INDOT Project?</Label>
                      <RadioGroup
                        value={editForm.isIndot ? 'yes' : 'no'}
                        onValueChange={(v) => setEditForm((d) => ({ ...d, isIndot: v === 'yes' }))}
                        className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id={`edit-si-indot-yes-${item.id}`} />
                          <Label htmlFor={`edit-si-indot-yes-${item.id}`}>Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id={`edit-si-indot-no-${item.id}`} />
                          <Label htmlFor={`edit-si-indot-no-${item.id}`}>No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" onClick={() => handleSaveEdit(item.id)} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-1.5">
                      <X className="h-3.5 w-3.5" />Cancel
                    </Button>
                  </div>
                </CardContent>
              )}

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Subtasks &amp; Role Estimates</h4>
                    {item.subtasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground mb-3">No subtasks yet.</p>
                    ) : (
                      <div className="space-y-4 mb-4">
                        {item.subtasks.map((subtask) => (
                          <div key={subtask.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{subtask.name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSubtask(item.id, subtask.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <Table className="text-xs">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-7 py-1">Role</TableHead>
                                  <TableHead className="h-7 py-1 w-28">Est. Hours</TableHead>
                                  <TableHead className="h-7 py-1 w-16"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {subtask.roleEstimates.map((re) => (
                                  <TableRow key={re.id}>
                                    <TableCell className="py-1">
                                      {roles.find((r) => r.key === re.role)?.label ?? re.role}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      <Input
                                        className="h-6 text-xs w-20"
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        defaultValue={re.estimatedHours}
                                        onBlur={(e) => {
                                          if (e.target.value !== String(re.estimatedHours)) {
                                            handleUpsertRole(item.id, subtask.id, re.role, e.target.value);
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell className="py-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteRole(item.id, subtask.id, re.role)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {/* Add new role row */}
                                {(() => {
                                  const usedRoles = new Set(subtask.roleEstimates.map((re) => re.role));
                                  const availableRoles = roles.filter((r) => !usedRoles.has(r.key));
                                  if (availableRoles.length === 0) return null;
                                  return (
                                    <TableRow>
                                      <TableCell className="py-1">
                                        <Select
                                          value={newRoleRow[subtask.id]?.role ?? ''}
                                          onValueChange={(v) => setNewRoleRow((p) => ({
                                            ...p,
                                            [subtask.id]: { ...p[subtask.id], role: v, hours: p[subtask.id]?.hours ?? '' },
                                          }))}>
                                          <SelectTrigger className="h-6 text-xs w-40">
                                            <SelectValue placeholder="Select role…" />
                                          </SelectTrigger>
                                          <SelectContent position="popper">
                                            {availableRoles.map((r) => (
                                              <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <Input
                                          className="h-6 text-xs w-20"
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          placeholder="0"
                                          value={newRoleRow[subtask.id]?.hours ?? ''}
                                          onChange={(e) => setNewRoleRow((p) => ({
                                            ...p,
                                            [subtask.id]: { ...p[subtask.id], hours: e.target.value, role: p[subtask.id]?.role ?? '' },
                                          }))}
                                        />
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={() => {
                                            const row = newRoleRow[subtask.id];
                                            if (!row?.role || !row?.hours) return;
                                            handleUpsertRole(item.id, subtask.id, row.role, row.hours).then(() => {
                                              setNewRoleRow((p) => ({ ...p, [subtask.id]: { role: '', hours: '' } }));
                                            });
                                          }}>
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add subtask inline form */}
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-8 text-sm max-w-xs"
                        placeholder="New subtask name"
                        value={newSubtask[item.id] ?? ''}
                        onChange={(e) => setNewSubtask((p) => ({ ...p, [item.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(item.id); }}
                      />
                      <Button size="sm" variant="outline" onClick={() => handleAddSubtask(item.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />Add Subtask
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Add Service Item form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />Add Service Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g., Boundary Survey"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project Types</Label>
              <MultiSelect
                value={newItem.serviceTypeIds}
                onValueChange={(v) => setNewItem((d) => ({ ...d, serviceTypeIds: v }))}
                placeholder="Select project types…"
                searchPlaceholder="Search project types…"
                options={serviceTypes.map((st) => ({ value: st.id, label: st.name }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input
                value={newItem.unit}
                onChange={(e) => setNewItem((d) => ({ ...d, unit: e.target.value }))}
                placeholder="e.g., Acre, Lot, Hour"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newItem.defaultPrice}
                onChange={(e) => setNewItem((d) => ({ ...d, defaultPrice: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem((d) => ({ ...d, description: e.target.value }))}
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newItem.isActive}
                onCheckedChange={(v) => setNewItem((d) => ({ ...d, isActive: v }))}
                id="new-si-active"
              />
              <Label htmlFor="new-si-active">Active</Label>
            </div>
            <div className="space-y-1.5">
              <Label>INDOT Project?</Label>
              <RadioGroup
                value={newItem.isIndot ? 'yes' : 'no'}
                onValueChange={(v) => setNewItem((d) => ({ ...d, isIndot: v === 'yes' }))}
                className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="new-si-indot-yes" />
                  <Label htmlFor="new-si-indot-yes">Yes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="new-si-indot-no" />
                  <Label htmlFor="new-si-indot-no">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={adding} className="mt-4 gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add Service Item
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? All subtasks and role estimates will also be deleted. This cannot be undone.
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
