'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Loader2,
  Save,
  Pencil,
  Layers,
  Tag,
  FolderOpen,
} from 'lucide-react';
import { settingsApi } from '@/lib/api/client';
import type { ServiceCategory, ServiceType } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DeleteTarget {
  type: 'category' | 'type';
  id: string;
  name: string;
}

export function ServiceTypesView() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Add category state
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  // Edit category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Add type state (per category)
  const [addingTypeFor, setAddingTypeFor] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);

  // Edit type state
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [savingType, setSavingType] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await settingsApi.getServiceCategories();
      setCategories(data);
      // Auto-expand all categories on first load
      setExpanded(new Set(data.map((c) => c.id)));
    } catch {
      toast.error('Failed to load service categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Category CRUD ---
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      await settingsApi.createServiceCategory({ name: newCatName.trim() });
      setNewCatName('');
      toast.success('Category created');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setAddingCat(false);
    }
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCatId || !editCatName.trim()) return;
    setSavingCat(true);
    try {
      await settingsApi.updateServiceCategory(editingCatId, { name: editCatName.trim() });
      setEditingCatId(null);
      toast.success('Category updated');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSavingCat(false);
    }
  };

  // --- Service Type CRUD ---
  const handleAddType = async (categoryId: string) => {
    if (!newTypeName.trim()) return;
    setAddingType(true);
    try {
      await settingsApi.createServiceType({ name: newTypeName.trim(), categoryId });
      setNewTypeName('');
      setAddingTypeFor(null);
      toast.success('Service type created');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create service type');
    } finally {
      setAddingType(false);
    }
  };

  const handleSaveTypeEdit = async () => {
    if (!editingTypeId || !editTypeName.trim()) return;
    setSavingType(true);
    try {
      await settingsApi.updateServiceType(editingTypeId, { name: editTypeName.trim() });
      setEditingTypeId(null);
      toast.success('Service type updated');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update service type');
    } finally {
      setSavingType(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'category') {
        await settingsApi.deleteServiceCategory(deleteTarget.id);
      } else {
        await settingsApi.deleteServiceType(deleteTarget.id);
      }
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display tracking-tight">Project Types &amp; Service Categories</h2>
        <p className="text-muted-foreground mt-1">
          Organize your work into Project Types (e.g. Surveying, Engineering) and Service Categories
          within each type (e.g. Boundary Survey, Topographic Survey).
        </p>
      </div>

      {/* Category list */}
      <div className="space-y-3">
        {categories.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No categories yet. Add one below.
            </p>
          </div>
        )}

        {categories.map((cat) => {
          const isOpen = expanded.has(cat.id);
          const types = cat.serviceTypes ?? [];

          return (
            <div
              key={cat.id}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              {/* Category header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                <button
                  onClick={() => toggleExpand(cat.id)}
                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Layers className="h-4 w-4 text-primary/70 shrink-0" />

                  {editingCatId === cat.id ? (
                    <Input
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="h-7 w-48 text-sm"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.stopPropagation(); handleSaveCategoryEdit(); }
                        if (e.key === 'Escape') setEditingCatId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="font-semibold text-sm">{cat.name}</span>
                  )}

                  <span className="text-xs text-muted-foreground ml-1">
                    {types.length} type{types.length !== 1 ? 's' : ''}
                  </span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {editingCatId === cat.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditingCatId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        onClick={handleSaveCategoryEdit}
                        disabled={savingCat}
                      >
                        {savingCat ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditCatName(cat.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Service types list */}
              {isOpen && (
                <div className="divide-y divide-border/50">
                  {types.length === 0 && addingTypeFor !== cat.id && (
                    <p className="text-xs text-muted-foreground px-10 py-3 italic">
                      No service types yet.
                    </p>
                  )}

                  {types.map((st) => (
                    <div key={st.id} className="flex items-center gap-3 px-10 py-2.5">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />

                      {editingTypeId === st.id ? (
                        <Input
                          value={editTypeName}
                          onChange={(e) => setEditTypeName(e.target.value)}
                          className="h-7 w-52 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTypeEdit();
                            if (e.key === 'Escape') setEditingTypeId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm flex-1">{st.name}</span>
                      )}

                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        {editingTypeId === st.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => setEditingTypeId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 px-2"
                              onClick={handleSaveTypeEdit}
                              disabled={savingType}
                            >
                              {savingType ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setEditingTypeId(st.id);
                                setEditTypeName(st.name);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() =>
                                setDeleteTarget({ type: 'type', id: st.id, name: st.name })
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Inline add type row */}
                  {addingTypeFor === cat.id ? (
                    <div className="flex items-center gap-2 px-10 py-2.5">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      <Input
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="Service category name"
                        className="h-7 w-52 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddType(cat.id);
                          if (e.key === 'Escape') {
                            setAddingTypeFor(null);
                            setNewTypeName('');
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-7 px-3"
                        onClick={() => handleAddType(cat.id)}
                        disabled={addingType || !newTypeName.trim()}
                      >
                        {addingType ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setAddingTypeFor(null);
                          setNewTypeName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="px-10 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setAddingTypeFor(cat.id);
                          setNewTypeName('');
                          if (!expanded.has(cat.id)) toggleExpand(cat.id);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add service category
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new category */}
      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
          Add Project Type
        </p>
        <div className="flex items-center gap-3">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g., Surveying, Engineering"
            className="max-w-xs h-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCategory();
            }}
          />
          <Button
            onClick={handleAddCategory}
            disabled={addingCat || !newCatName.trim()}
            className="gap-2"
          >
            {addingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Project Type
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === 'category' ? 'Project Type' : 'Service Category'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              {deleteTarget?.type === 'category' &&
                ' This will also delete all service categories within this project type.'}
              {' '}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
