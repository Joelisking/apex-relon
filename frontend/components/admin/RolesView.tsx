'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rolesApi, type RoleResponse } from '@/lib/api/roles-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  Loader2,
  ShieldCheck,
  Users,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Color palette ────────────────────────────────────────────────────────────
const COLORS = [
  {
    value: 'violet',
    label: 'Violet',
    classes: 'bg-violet-100/70 text-violet-900',
  },
  {
    value: 'blue',
    label: 'Blue',
    classes: 'bg-blue-100/70 text-blue-900',
  },
  {
    value: 'orange',
    label: 'Orange',
    classes: 'bg-orange-100/70 text-orange-900',
  },
  {
    value: 'emerald',
    label: 'Emerald',
    classes: 'bg-emerald-100/70 text-emerald-900',
  },
  {
    value: 'rose',
    label: 'Rose',
    classes: 'bg-rose-100/70 text-rose-900',
  },
  {
    value: 'cyan',
    label: 'Cyan',
    classes: 'bg-cyan-100/70 text-cyan-900',
  },
  {
    value: 'amber',
    label: 'Amber',
    classes: 'bg-amber-100/70 text-amber-900',
  },
  {
    value: 'purple',
    label: 'Purple',
    classes: 'bg-purple-100/70 text-purple-900',
  },
  {
    value: 'indigo',
    label: 'Indigo',
    classes: 'bg-indigo-100/70 text-indigo-900',
  },
  {
    value: 'teal',
    label: 'Teal',
    classes: 'bg-teal-100/70 text-teal-900',
  },
];

export function getRoleBadgeClasses(color?: string | null) {
  const found = COLORS.find((c) => c.value === color);
  return found ? found.classes : 'bg-muted text-muted-foreground';
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const createRoleSchema = z.object({
  label: z.string().min(2, 'Label is required').max(100),
  description: z.string().max(255).optional(),
  color: z.string().optional(),
  mimicRoleKey: z.string().optional(),
});

const editRoleSchema = z.object({
  label: z.string().min(2, 'Label is required').max(100),
  description: z.string().max(255).optional(),
  color: z.string().optional(),
});

type CreateRoleForm = z.infer<typeof createRoleSchema>;
type EditRoleForm = z.infer<typeof editRoleSchema>;

// ── Color picker sub-component ────────────────────────────────────────────────
function ColorPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <TooltipProvider key={c.value} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(c.value)}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-all',
                  c.classes,
                  value === c.value
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:border-muted-foreground',
                )}
              />
            </TooltipTrigger>
            <TooltipContent>{c.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RolesView() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = hasPermission('permissions:edit');

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleResponse | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleResponse | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: roles = [], isLoading } = useQuery<RoleResponse[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    staleTime: 30 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['roles'] });

  // ── Create form ─────────────────────────────────────────────────────────────
  const createForm = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      label: '',
      description: '',
      color: 'blue',
      mimicRoleKey: '',
    },
  });

  const handleCreate = async (data: CreateRoleForm) => {
    setIsSubmitting(true);
    try {
      await rolesApi.create({
        ...data,
        mimicRoleKey:
          data.mimicRoleKey && data.mimicRoleKey !== 'none'
            ? data.mimicRoleKey
            : undefined,
      });
      toast.success('Role created', {
        description: `"${data.label}" has been added.`,
      });
      createForm.reset({
        label: '',
        description: '',
        color: 'blue',
        mimicRoleKey: '',
      });
      setCreateOpen(false);
      invalidate();
    } catch (err) {
      toast.error('Failed to create role', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit form ────────────────────────────────────────────────────────────────
  const editForm = useForm<EditRoleForm>({
    resolver: zodResolver(editRoleSchema),
  });

  const openEdit = (role: RoleResponse) => {
    setEditRole(role);
    editForm.reset({
      label: role.label,
      description: role.description ?? '',
      color: role.color ?? 'blue',
    });
  };

  const handleEdit = async (data: EditRoleForm) => {
    if (!editRole) return;
    setIsSubmitting(true);
    try {
      await rolesApi.update(editRole.key, data);
      toast.success('Role updated');
      setEditRole(null);
      invalidate();
    } catch (err) {
      toast.error('Failed to update role', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteRole) return;
    setIsDeleting(true);
    try {
      await rolesApi.delete(deleteRole.key);
      toast.success('Role deleted', {
        description: `"${deleteRole.label}" has been removed.`,
      });
      setDeleteRole(null);
      invalidate();
    } catch (err) {
      toast.error('Cannot delete role', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0);
  const customRoles = roles.filter((r) => !r.isBuiltIn);

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
      style={{ animationFillMode: 'backwards' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div
          className="animate-in fade-in slide-in-from-left-2 duration-400"
          style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}>
          <h2 className="text-2xl font-semibold tracking-tight">
            Roles
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage system roles. Permissions for each role are
            configured in the Permissions section.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 animate-in fade-in zoom-in-90 duration-300"
            style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        )}
      </div>

      {/* Stats */}
      <div
        className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-400"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
        <div className="grid grid-cols-3 gap-px bg-border/60">
          {[
            {
              label: 'Total Roles',
              sublabel: 'Built-in and custom',
              value: String(roles.length),
              icon: ShieldCheck,
              highlight: true,
            },
            {
              label: 'Custom Roles',
              sublabel: 'Added by admins',
              value: String(customRoles.length),
              icon: Sparkles,
              highlight: false,
            },
            {
              label: 'Total Users',
              sublabel: 'Across all roles',
              value: String(totalUsers),
              icon: Users,
              highlight: false,
            },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="relative bg-card px-5 py-4 animate-in fade-in duration-300"
                style={{
                  animationDelay: `${i * 60 + 150}ms`,
                  animationFillMode: 'backwards',
                }}>
                {stat.highlight && (
                  <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
                )}
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium truncate">
                    {stat.label}
                  </p>
                </div>
                <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground/50">
                  {stat.sublabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roles table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
            All Roles
          </p>
          <p className="text-xs text-muted-foreground/50">
            Built-in roles cannot be deleted — configure their
            permissions in the Permissions section.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border/60 overflow-hidden animate-in fade-in duration-300">
            <div className="h-10 bg-muted/40 border-b border-border/60 animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 border-b border-border/30 bg-background animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl border border-border/60 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-400"
            style={{ animationDelay: '180ms', animationFillMode: 'backwards' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="py-2.5 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 w-[160px]">
                    Key
                  </th>
                  <th className="py-2.5 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
                    Label
                  </th>
                  <th className="py-2.5 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 hidden md:table-cell">
                    Description
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 w-[80px] text-center">
                    Users
                  </th>
                  <th className="py-2.5 px-4 w-[80px]" />
                </tr>
              </thead>
              <tbody>
                {roles.map((role, i) => (
                  <tr
                    key={role.key}
                    className={cn(
                      'hover:bg-muted/30 transition-colors duration-150 animate-in fade-in duration-300',
                      i < roles.length - 1 &&
                        'border-b border-border/40',
                    )}
                    style={{
                      animationDelay: `${i * 40 + 220}ms`,
                      animationFillMode: 'backwards',
                    }}>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent font-mono text-xs',
                          getRoleBadgeClasses(role.color),
                        )}>
                        {role.key}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        {role.label}
                        {role.isBuiltIn && (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Built-in role
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                      {role.description ?? (
                        <span className="text-[11px] italic text-muted-foreground/40">
                          No description
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Layers className="h-3 w-3" />
                        <span className="tabular-nums">
                          {role.userCount}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(role)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canEdit && !role.isBuiltIn && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteRole(role)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create dialog ─────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>
              Add a new custom role. You can assign permissions to it
              in the Permissions section.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(handleCreate)}
              className="space-y-4">
              <FormField
                control={createForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Field Manager" {...field} />
                    </FormControl>
                    <FormDescription>
                      A unique key will be generated automatically
                      from this name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="mimicRoleKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Copy Permissions From</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Start with no permissions" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          No permissions (blank slate)
                        </SelectItem>
                        {roles.map((r) => (
                          <SelectItem key={r.key} value={r.key}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optionally copy all permissions from an existing
                      role.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What does this role do?"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Badge Color</FormLabel>
                    <FormControl>
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Role
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ───────────────────────────────────────────────────── */}
      <Dialog
        open={!!editRole}
        onOpenChange={() => setEditRole(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the label, description, or badge colour for{' '}
              <span className="font-mono font-medium">
                {editRole?.key}
              </span>
              .
              {editRole?.isBuiltIn && (
                <span className="block mt-1 text-muted-foreground">
                  This is a built-in role — the key cannot be changed.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEdit)}
              className="space-y-4">
              <FormField
                control={editForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Label</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Badge Color</FormLabel>
                    <FormControl>
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditRole(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteRole}
        onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete role &quot;{deleteRole?.label}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the{' '}
              <span className="font-mono font-medium">
                {deleteRole?.key}
              </span>{' '}
              role and all its permission assignments. This cannot be
              undone.
              <br />
              <br />
              Roles with assigned users cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
