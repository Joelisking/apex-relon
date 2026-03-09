'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Trash2,
  Plus,
  Loader2,
  Save,
  Pencil,
  Eye,
  EyeOff,
  Lock,
  Info,
  ChevronRight,
} from 'lucide-react';
import { settingsApi } from '@/lib/api/client';
import type { DropdownOption } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  COLOR_PRESETS,
  COLOR_PRESET_NAMES,
  ACTIVITY_ICON_OPTIONS,
  getActivityIcon,
} from '@/lib/activity-icon-map';

const CATEGORIES: Array<{
  value: string;
  label: string;
  description: string;
  hasColor: boolean;
  hasIcon: boolean;
  hasMeetingType: boolean;
  isServiceType?: boolean;
}> = [
  {
    value: 'activity_type',
    label: 'Activity Types',
    description:
      'Types of activities logged in timelines (calls, meetings, etc.)',
    hasColor: true,
    hasIcon: true,
    hasMeetingType: true,
  },
  {
    value: 'meeting_type',
    label: 'Meeting Types',
    description:
      'Sub-types for meeting activities (virtual, in-person, etc.)',
    hasColor: false,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'urgency',
    label: 'Urgency Levels',
    description:
      'Urgency levels for prospective projects (Low, Medium, High)',
    hasColor: true,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'file_category',
    label: 'File Categories',
    description: 'Categories for uploaded files and documents',
    hasColor: false,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'cost_category',
    label: 'Cost Categories',
    description: 'Categories for project cost log entries',
    hasColor: false,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'client_segment',
    label: 'Client Segments',
    description: 'Business segments for client classification',
    hasColor: false,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'individual_type',
    label: 'Individual Types',
    description: 'Types of individual contacts at client companies',
    hasColor: false,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'project_status',
    label: 'Project Statuses',
    description: 'Status values for active projects',
    hasColor: true,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'project_risk_status',
    label: 'Project Risk Statuses',
    description: 'Risk status values for project health tracking',
    hasColor: true,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'executing_company',
    label: 'Executing Companies',
    description:
      'Companies that can be selected as the executing company for projects and prospective projects',
    hasColor: false,
    hasIcon: false,
    hasMeetingType: false,
  },
  {
    value: 'service_type',
    label: 'Project Types',
    description:
      'Service types that can be assigned to prospective projects.',
    hasColor: false,
    hasIcon: false,
    hasMeetingType: false,
    isServiceType: true,
  },
  {
    value: 'team_type',
    label: 'Team Types',
    description: 'Types of teams (Sales, Design, Operations, etc.)',
    hasColor: false,
    hasIcon: false,
    hasMeetingType: false,
  },
];

interface EditState {
  label: string;
  color: string;
  icon: string;
  hasMeetingType: boolean;
}

export function DropdownOptionsView() {
  const [activeCategory, setActiveCategory] = useState(
    CATEGORIES[0].value,
  );
  const queryClient = useQueryClient();
  const { data: allOptions = [], isLoading: loading } = useQuery({
    queryKey: ['dropdown-options'],
    queryFn: () => settingsApi.getAllDropdownOptions(),
    staleTime: 2 * 60 * 1000,
  });
  const options = allOptions.filter(
    (o) => o.category === activeCategory,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    label: '',
    color: 'blue',
    icon: 'Phone',
    hasMeetingType: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<DropdownOption | null>(null);
  const [newOption, setNewOption] = useState({
    value: '',
    label: '',
    color: 'blue',
    icon: 'Phone',
    hasMeetingType: false,
  });
  const [adding, setAdding] = useState(false);

  const catConfig = CATEGORIES.find(
    (c) => c.value === activeCategory,
  )!;

  useEffect(() => {
    setEditingId(null);
  }, [activeCategory]);

  const startEdit = (opt: DropdownOption) => {
    setEditingId(opt.id);
    setEditState({
      label: opt.label,
      color: (opt.metadata?.color as string) ?? 'blue',
      icon: (opt.metadata?.icon as string) ?? 'Phone',
      hasMeetingType:
        (opt.metadata?.hasMeetingType as boolean) ?? false,
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const opt = options.find((o) => o.id === editingId)!;
      const metadata = buildMetadata(opt, editState);
      await settingsApi.updateDropdownOption(editingId, {
        label: editState.label,
        metadata,
      });
      toast.success('Option updated');
      setEditingId(null);
      queryClient.invalidateQueries({
        queryKey: ['dropdown-options'],
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to update',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (opt: DropdownOption) => {
    try {
      await settingsApi.updateDropdownOption(opt.id, {
        isActive: !opt.isActive,
      });
      toast.success(opt.isActive ? 'Option hidden' : 'Option shown');
      queryClient.invalidateQueries({
        queryKey: ['dropdown-options'],
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to update',
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await settingsApi.deleteDropdownOption(deleteTarget.id);
      toast.success(`"${deleteTarget.label}" deleted`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: ['dropdown-options'],
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to delete',
      );
    }
  };

  const handleAdd = async () => {
    if (!newOption.value.trim() || !newOption.label.trim()) {
      toast.error('Value and label are required');
      return;
    }
    setAdding(true);
    try {
      const fakeOpt: Partial<DropdownOption> = { metadata: {} };
      const metadata = buildMetadata(fakeOpt as DropdownOption, {
        label: newOption.label,
        color: newOption.color,
        icon: newOption.icon,
        hasMeetingType: newOption.hasMeetingType,
      });
      await settingsApi.createDropdownOption({
        category: activeCategory,
        value: newOption.value.trim(),
        label: newOption.label.trim(),
        metadata,
        sortOrder: options.length,
      });
      toast.success('Option added');
      setNewOption({
        value: '',
        label: '',
        color: 'blue',
        icon: 'Phone',
        hasMeetingType: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['dropdown-options'],
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display tracking-tight">
          Dropdown Options
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure the options available in all dropdown menus
          throughout the application.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Category sidebar */}
        <div className="w-56 shrink-0 space-y-1">
          {CATEGORIES.map((cat) => (
            <div key={cat.value}>
              {cat.isServiceType && (
                <div className="pt-2 pb-1">
                  <div className="border-t border-border" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium px-3 pt-2">
                    Other
                  </p>
                </div>
              )}
              <button
                onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                  activeCategory === cat.value
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}>
                {cat.label}
              </button>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              {catConfig.label}
            </h3>
            <p className="text-sm text-muted-foreground">
              {catConfig.description}
            </p>
          </div>

          {catConfig.isServiceType && <ServiceTypesPanel />}

          {catConfig.hasMeetingType && <SubtypeCallout />}

          {!catConfig.isServiceType && (
            <>
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="space-y-px p-1">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton
                          key={i}
                          className="h-12 w-full rounded-lg"
                        />
                      ))}
                    </div>
                  ) : options.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No options yet. Add one below.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Label</TableHead>
                          <TableHead>Value</TableHead>
                          {catConfig.hasColor && (
                            <TableHead>Color</TableHead>
                          )}
                          {catConfig.hasIcon && (
                            <TableHead>Icon</TableHead>
                          )}
                          {catConfig.hasMeetingType && (
                            <TableHead>Meeting Type Picker</TableHead>
                          )}
                          <TableHead className="w-8">
                            System
                          </TableHead>
                          <TableHead className="w-32 text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {options.map((opt) => (
                          <TableRow
                            key={opt.id}
                            className={cn(
                              !opt.isActive && 'opacity-50',
                            )}>
                            <TableCell>
                              {editingId === opt.id ? (
                                <Input
                                  value={editState.label}
                                  onChange={(e) =>
                                    setEditState((s) => ({
                                      ...s,
                                      label: e.target.value,
                                    }))
                                  }
                                  className="h-8 w-40"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape')
                                      cancelEdit();
                                  }}
                                />
                              ) : (
                                <span className="font-medium">
                                  {opt.label}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {opt.value}
                              </code>
                            </TableCell>

                            {catConfig.hasColor && (
                              <TableCell>
                                {editingId === opt.id ? (
                                  <ColorPicker
                                    value={editState.color}
                                    onChange={(c) =>
                                      setEditState((s) => ({
                                        ...s,
                                        color: c,
                                      }))
                                    }
                                  />
                                ) : (
                                  <ColorSwatch
                                    color={
                                      opt.metadata?.color as
                                        | string
                                        | undefined
                                    }
                                  />
                                )}
                              </TableCell>
                            )}

                            {catConfig.hasIcon && (
                              <TableCell>
                                {editingId === opt.id ? (
                                  <IconPicker
                                    value={editState.icon}
                                    onChange={(i) =>
                                      setEditState((s) => ({
                                        ...s,
                                        icon: i,
                                      }))
                                    }
                                  />
                                ) : (
                                  <IconPreview
                                    iconName={
                                      opt.metadata?.icon as
                                        | string
                                        | undefined
                                    }
                                  />
                                )}
                              </TableCell>
                            )}

                            {catConfig.hasMeetingType && (
                              <TableCell>
                                {editingId === opt.id ? (
                                  <SubtypeToggle
                                    value={editState.hasMeetingType}
                                    onChange={(v) =>
                                      setEditState((s) => ({
                                        ...s,
                                        hasMeetingType: v,
                                      }))
                                    }
                                  />
                                ) : (
                                  <SubtypeToggle
                                    value={
                                      (opt.metadata
                                        ?.hasMeetingType as
                                        | boolean
                                        | undefined) ?? false
                                    }
                                    readOnly
                                  />
                                )}
                              </TableCell>
                            )}

                            <TableCell>
                              {opt.isSystem && (
                                <span title="System option">
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {editingId === opt.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={cancelEdit}
                                      className="h-7 px-2 text-xs">
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={saveEdit}
                                      disabled={saving}
                                      className="h-7 px-2">
                                      {saving ? (
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
                                      onClick={() => startEdit(opt)}
                                      className="h-7 w-7 p-0">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        toggleActive(opt)
                                      }
                                      className="h-7 w-7 p-0 text-muted-foreground"
                                      title={
                                        opt.isActive
                                          ? 'Hide option'
                                          : 'Show option'
                                      }>
                                      {opt.isActive ? (
                                        <EyeOff className="h-3.5 w-3.5" />
                                      ) : (
                                        <Eye className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                    {!opt.isSystem && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setDeleteTarget(opt)
                                        }
                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
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
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Plus className="h-4 w-4" />
                    Add Option
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Row 1: inputs + add button */}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1 min-w-[140px]">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Label
                      </label>
                      <Input
                        value={newOption.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          setNewOption((s) => ({
                            ...s,
                            label,
                            value: toSlug(label),
                          }));
                        }}
                        placeholder="e.g. Site Visit"
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAdd();
                        }}
                      />
                    </div>
                    <div className="space-y-1 min-w-[140px]">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Value
                      </label>
                      <Input
                        value={newOption.value}
                        onChange={(e) =>
                          setNewOption((s) => ({
                            ...s,
                            value: e.target.value,
                          }))
                        }
                        placeholder="auto-generated"
                        className="h-8 text-sm font-mono text-muted-foreground"
                      />
                    </div>
                    {catConfig.hasColor && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Color
                        </label>
                        <ColorPicker
                          value={newOption.color}
                          onChange={(c) =>
                            setNewOption((s) => ({ ...s, color: c }))
                          }
                        />
                      </div>
                    )}
                    {catConfig.hasIcon && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Icon
                        </label>
                        <IconPicker
                          value={newOption.icon}
                          onChange={(i) =>
                            setNewOption((s) => ({ ...s, icon: i }))
                          }
                        />
                      </div>
                    )}
                    <Button
                      onClick={handleAdd}
                      disabled={adding}
                      size="sm"
                      className="h-8 gap-1.5">
                      {adding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add
                    </Button>
                  </div>

                  {/* Row 2: meeting type toggle on its own line */}
                  {catConfig.hasMeetingType && (
                    <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Meeting Type Picker
                      </span>
                      <SubtypeToggle
                        value={newOption.hasMeetingType}
                        onChange={(v) =>
                          setNewOption((s) => ({
                            ...s,
                            hasMeetingType: v,
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {newOption.hasMeetingType
                          ? 'Users will be prompted to select a meeting format when logging this activity.'
                          : 'No sub-type prompt will appear for this activity.'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {deleteTarget?.label}&quot;? This cannot be undone.
              Existing records using this value will not be affected,
              but the option will no longer appear in dropdown menus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function toSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s-]+/g, '_');
}

// ── Service Types Panel ────────────────────────────────────────────────────────

function ServiceTypesPanel() {
  const queryClient = useQueryClient();
  const { data: serviceTypes = [], isLoading: loading } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => settingsApi.getServiceTypes(),
    staleTime: 2 * 60 * 1000,
  });
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await settingsApi.createServiceType({ name: newName.trim() });
      setNewName('');
      toast.success('Service type created');
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to create',
      );
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      await settingsApi.updateServiceType(editingId, {
        name: editName.trim(),
      });
      setEditingId(null);
      toast.success('Service type updated');
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to update',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await settingsApi.deleteServiceType(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Failed to delete',
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {serviceTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No project types yet. Add one below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceTypes.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell>
                      {editingId === st.id ? (
                        <Input
                          value={editName}
                          onChange={(e) =>
                            setEditName(e.target.value)
                          }
                          className="h-8 w-56"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape')
                              setEditingId(null);
                          }}
                        />
                      ) : (
                        <span className="font-medium">{st.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === st.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              className="h-7 px-2 text-xs">
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="h-7 px-2">
                              {saving ? (
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
                              onClick={() => {
                                setEditingId(st.id);
                                setEditName(st.name);
                              }}
                              className="h-7 w-7 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(st)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
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
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Add Project Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Interior Design, Fitout"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={adding}
              size="sm"
              className="h-8 gap-1.5">
              {adding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {deleteTarget?.name}&quot;? This cannot be undone.
              Service types assigned to prospective projects cannot be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────────

function buildMetadata(
  opt: DropdownOption,
  edit: EditState,
): Record<string, unknown> {
  const base = { ...(opt.metadata ?? {}) };
  base.color = edit.color;
  const preset = COLOR_PRESETS[edit.color] ?? COLOR_PRESETS.blue;
  base.chipClasses = preset.chipClasses;
  base.nodeClass = preset.nodeClass;
  base.badgeClasses = preset.badgeClasses;
  if (edit.icon) base.icon = edit.icon;
  if (edit.hasMeetingType !== undefined)
    base.hasMeetingType = edit.hasMeetingType;
  return base;
}

function ColorSwatch({ color }: { color?: string }) {
  if (!color)
    return <span className="text-xs text-muted-foreground">—</span>;
  const preset = COLOR_PRESETS[color];
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          'h-3 w-3 rounded-full',
          preset?.dot ?? 'bg-gray-400',
        )}
      />
      <span className="text-xs capitalize">{color}</span>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {COLOR_PRESET_NAMES.map((name) => {
        const p = COLOR_PRESETS[name];
        return (
          <button
            key={name}
            title={name}
            onClick={() => onChange(name)}
            className={cn(
              'h-5 w-5 rounded-full transition-all',
              p.dot,
              value === name
                ? 'ring-2 ring-offset-1 ring-foreground scale-110'
                : 'opacity-70 hover:opacity-100',
            )}
          />
        );
      })}
    </div>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ACTIVITY_ICON_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function IconPreview({ iconName }: { iconName?: string }) {
  const IconComponent = getActivityIcon(iconName);
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {React.createElement(IconComponent, {
        className: 'h-3.5 w-3.5',
      })}
      {iconName ?? '—'}
    </span>
  );
}

function SubtypeToggle({
  value,
  onChange,
  readOnly,
}: {
  value: boolean;
  onChange?: (v: boolean) => void;
  readOnly?: boolean;
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors';
  const on = 'bg-violet-50 text-violet-700 border-violet-200';
  const off = 'bg-muted text-muted-foreground border-transparent';

  if (readOnly) {
    return (
      <span className={cn(base, value ? on : off)}>
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            value ? 'bg-violet-500' : 'bg-muted-foreground/40',
          )}
        />
        {value ? 'Enabled' : 'Disabled'}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onChange?.(!value)}
      className={cn(
        base,
        value ? on : off,
        'cursor-pointer hover:opacity-80',
      )}>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          value ? 'bg-violet-500' : 'bg-muted-foreground/40',
        )}
      />
      {value ? 'Enabled' : 'Disabled'}
    </button>
  );
}

function SubtypeCallout() {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-muted/20">
        <div className="h-6 w-6 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
          <Info className="h-3.5 w-3.5 text-violet-600" />
        </div>
        <p className="text-[13px] font-semibold text-foreground">
          What is the Meeting Type Picker?
        </p>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          When{' '}
          <span className="font-medium text-foreground">enabled</span>{' '}
          for an activity type, logging that activity will show a
          secondary dropdown asking for the specific meeting format —
          populated from your{' '}
          <span className="font-medium text-foreground">
            Meeting Types
          </span>{' '}
          options.
        </p>

        {/* Visual example */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Example flow
          </p>

          <div className="flex items-start gap-3 flex-wrap">
            {/* Step 1 */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.06em] font-medium text-muted-foreground">
                Activity Type
              </p>
              <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[12px] font-medium text-foreground shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                Meeting
              </div>
            </div>

            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-8 shrink-0" />

            {/* Step 2 */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.06em] font-medium text-muted-foreground">
                Meeting Type picker appears
              </p>
              <div className="rounded-lg border border-border/60 bg-muted/10 overflow-hidden divide-y divide-border/40">
                {['Virtual', 'In-Person', 'Phone Call'].map(
                  (t, i) => (
                    <div
                      key={t}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 text-xs',
                        i === 0
                          ? 'bg-secondary font-medium text-foreground'
                          : 'text-muted-foreground',
                      )}>
                      {i === 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
                      )}
                      {t}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-3">
          Meeting Types are configured separately in the{' '}
          <span className="font-medium text-foreground">
            Meeting Types
          </span>{' '}
          category in the sidebar.
        </p>
      </div>
    </div>
  );
}
