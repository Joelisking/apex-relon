'use client';

import {
  useState,
  useEffect,
  useCallback,
  Fragment,
  useRef,
} from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  Save,
  Search,
  RotateCcw,
  CheckSquare,
  Square,
  Minus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  permissionsApi,
  type PermissionDefinition,
  type RoleMeta,
} from '@/lib/api/permissions-client';
import { getRoleBadgeClasses } from './RolesView';
import { cn } from '@/lib/utils';

interface PermissionsMatrixProps {
  canEdit: boolean;
}

export function PermissionsMatrix({ canEdit }: PermissionsMatrixProps) {
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [roles, setRoles] = useState<RoleMeta[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [originalMatrix, setOriginalMatrix] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const loadMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const data = await permissionsApi.getMatrix();
      setPermissions(data.permissions);
      setRoles(data.roles);
      setMatrix(data.matrix);
      setOriginalMatrix(JSON.parse(JSON.stringify(data.matrix)));
    } catch {
      toast.error('Failed to load permissions matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Active module tracking via IntersectionObserver
  useEffect(() => {
    if (loading) return;
    const container = tableRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible.length > 0) {
          const id = visible[0].target.id;
          setActiveModule(
            id.replace('module-', '').replace(/-/g, ' '),
          );
        }
      },
      { root: container, rootMargin: '-5% 0px -80% 0px' },
    );

    const rows = container.querySelectorAll('[id^="module-"]');
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [loading]);

  const togglePermission = (roleKey: string, permKey: string) => {
    if (roleKey === 'CEO' || !canEdit) return;
    setMatrix((prev) => {
      const rolePerms = prev[roleKey] || [];
      const has = rolePerms.includes(permKey);
      return {
        ...prev,
        [roleKey]: has
          ? rolePerms.filter((p) => p !== permKey)
          : [...rolePerms, permKey],
      };
    });
  };

  const toggleModuleForRole = (
    roleKey: string,
    modulePerms: PermissionDefinition[],
  ) => {
    if (roleKey === 'CEO' || !canEdit) return;
    const permKeys = modulePerms.map((p) => p.key);
    setMatrix((prev) => {
      const rolePerms = prev[roleKey] || [];
      const allGranted = permKeys.every((k) => rolePerms.includes(k));
      return {
        ...prev,
        [roleKey]: allGranted
          ? rolePerms.filter((k) => !permKeys.includes(k))
          : [...new Set([...rolePerms, ...permKeys])],
      };
    });
  };

  const isDirty = (roleKey: string) => {
    const current = [...(matrix[roleKey] || [])].sort();
    const original = [...(originalMatrix[roleKey] || [])].sort();
    return JSON.stringify(current) !== JSON.stringify(original);
  };

  const dirtyRoles = roles.filter(
    (r) => r.key !== 'CEO' && isDirty(r.key),
  );

  const resetRole = (roleKey: string) => {
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: [...(originalMatrix[roleKey] || [])],
    }));
  };

  const saveRole = async (roleKey: string) => {
    try {
      setSaving(roleKey);
      await permissionsApi.updateRolePermissions(
        roleKey,
        matrix[roleKey] || [],
      );
      setOriginalMatrix((prev) => ({
        ...prev,
        [roleKey]: [...(matrix[roleKey] || [])],
      }));
      toast.success(`${roleKey} permissions saved`);
    } catch {
      toast.error(`Failed to save ${roleKey} permissions`);
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    for (const role of dirtyRoles) {
      await saveRole(role.key);
    }
  };

  const allModules = permissions.reduce<
    Record<string, PermissionDefinition[]>
  >((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const visibleModules = Object.fromEntries(
    Object.entries(allModules)
      .map(([mod, perms]) => [
        mod,
        search.trim()
          ? perms.filter(
              (p) =>
                p.label.toLowerCase().includes(search.toLowerCase()) ||
                p.key.toLowerCase().includes(search.toLowerCase()),
            )
          : perms,
      ])
      .filter(([, perms]) => (perms as PermissionDefinition[]).length > 0),
  ) as Record<string, PermissionDefinition[]>;

  const scrollToModule = (moduleName: string) => {
    const container = tableRef.current;
    if (!container) return;
    const el = container.querySelector(
      `#module-${moduleName.replace(/\s+/g, '-')}`,
    ) as HTMLElement | null;
    if (!el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + elRect.top - containerRect.top - 48,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-in fade-in duration-300">
        {/* Skeleton toolbar */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-56 rounded-md bg-muted animate-pulse" />
          <div className="h-8 w-24 rounded-md bg-muted animate-pulse [animation-delay:60ms]" />
        </div>
        {/* Skeleton pills */}
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-6 rounded-full bg-muted animate-pulse"
              style={{
                width: `${48 + (i % 3) * 16}px`,
                animationDelay: `${i * 40}ms`,
              }}
            />
          ))}
        </div>
        {/* Skeleton table */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="h-12 bg-muted/40 border-b border-border/60 animate-pulse" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 border-b border-border/30 bg-background animate-pulse"
              style={{ animationDelay: `${i * 50 + 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const moduleNames = Object.keys(allModules);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-top-1 duration-300"
        style={{ animationFillMode: 'backwards' }}>
        <div className="relative flex-1 min-w-[200px] max-w-xs group">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground transition-colors duration-200 group-focus-within:text-muted-foreground" />
          <Input
            placeholder="Search permissions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm transition-shadow duration-200"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 text-muted-foreground hover:text-muted-foreground transition-colors duration-150 animate-in fade-in zoom-in-75 duration-150">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Save All — opacity/translate transition, always mounted to avoid layout pop */}
        <div
          className={cn(
            'flex items-center gap-2 transition-all duration-200',
            dirtyRoles.length > 0
              ? 'opacity-100 translate-x-0 pointer-events-auto'
              : 'opacity-0 translate-x-2 pointer-events-none',
          )}>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            <span className="font-medium tabular-nums">
              {dirtyRoles.length}
            </span>{' '}
            unsaved role{dirtyRoles.length !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            onClick={saveAll}
            disabled={!!saving}
            className="gap-1.5 h-8 transition-all duration-150">
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save All
          </Button>
        </div>
      </div>

      {/* Module jump pills with active tracking */}
      {!search && (
        <div
          className="flex gap-1.5 flex-wrap animate-in fade-in duration-300"
          style={{
            animationDelay: '60ms',
            animationFillMode: 'backwards',
          }}>
          {moduleNames.map((mod, i) => {
            const isActive = activeModule === mod;
            return (
              <button
                key={mod}
                onClick={() => scrollToModule(mod)}
                style={{
                  animationDelay: `${i * 18 + 80}ms`,
                  animationFillMode: 'backwards',
                }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 animate-in fade-in zoom-in-90',
                  isActive
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}>
                {mod}
                <span
                  className={cn(
                    'ml-1 tabular-nums transition-opacity duration-200',
                    isActive ? 'opacity-60' : 'opacity-40',
                  )}>
                  {allModules[mod].length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Matrix table */}
      <div
        ref={tableRef}
        className="overflow-auto rounded-xl border border-border/60 shadow-[0_1px_4px_rgba(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{
          animationDelay: '100ms',
          animationFillMode: 'backwards',
          maxHeight: 'calc(100vh - 300px)',
        }}>
        <table
          className="text-sm border-collapse"
          style={{ minWidth: '100%', width: 'max-content' }}>
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-border/60 bg-background">
              {/* Sticky top-left corner */}
              <th
                className="sticky left-0 z-30 bg-background text-left py-3 px-4 font-medium border-r border-border/60"
                style={{ minWidth: 240, width: 240 }}>
                Permission
              </th>
              {roles.map((role) => {
                const dirty = role.key !== 'CEO' && isDirty(role.key);
                return (
                  <th
                    key={role.key}
                    className={cn(
                      'py-3 px-4 text-center relative transition-colors duration-300',
                      dirty ? 'bg-amber-50/50' : 'bg-background',
                    )}
                    style={{ minWidth: 150 }}>
                    {/* Dirty top-border accent */}
                    <div
                      className={cn(
                        'absolute top-0 left-0 right-0 h-[2px] transition-all duration-300 rounded-b-full',
                        dirty
                          ? 'opacity-100 bg-amber-400'
                          : 'opacity-0 bg-transparent',
                      )}
                    />

                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] text-muted-foreground font-normal truncate max-w-[130px]">
                        {role.label}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent font-mono text-xs',
                          getRoleBadgeClasses(role.color),
                        )}>
                        {role.key}
                      </Badge>

                      {/* Always-present slot — no layout shift */}
                      <div className="h-7 flex gap-1 items-center justify-center mt-0.5">
                        {role.key !== 'CEO' && canEdit && (
                          <>
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                      'h-6 w-6 p-0 transition-all duration-200',
                                      dirty
                                        ? 'opacity-100 scale-100 text-muted-foreground hover:text-foreground'
                                        : 'opacity-0 scale-90 pointer-events-none',
                                    )}
                                    disabled={!!saving}
                                    onClick={() => resetRole(role.key)}>
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Discard changes
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                'h-6 text-[10px] gap-0.5 px-2 transition-all duration-200',
                                dirty
                                  ? 'opacity-100 scale-100'
                                  : 'opacity-0 scale-90 pointer-events-none',
                              )}
                              disabled={saving === role.key}
                              onClick={() => saveRole(role.key)}>
                              {saving === role.key ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Save className="h-2.5 w-2.5" />
                              )}
                              Save
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {Object.entries(visibleModules).map(
              ([moduleName, modulePerms]) => (
                <Fragment key={moduleName}>
                  {/* Module section header */}
                  <tr
                    id={`module-${moduleName.replace(/\s+/g, '-')}`}
                    className="bg-muted/40">
                    <td
                      className="sticky left-0 z-10 bg-muted/40 py-2 px-4 border-r border-border/50"
                      style={{ minWidth: 240, width: 240 }}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                          {moduleName}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {modulePerms.length}
                        </span>
                      </div>
                    </td>
                    {roles.map((role) => {
                      const permKeys = modulePerms.map((p) => p.key);
                      const rolePerms = matrix[role.key] || [];
                      const grantedCount =
                        role.key === 'CEO'
                          ? permKeys.length
                          : permKeys.filter((k) =>
                              rolePerms.includes(k),
                            ).length;
                      const allGranted =
                        grantedCount === permKeys.length;
                      const someGranted =
                        grantedCount > 0 && !allGranted;
                      const isCeo = role.key === 'CEO';

                      return (
                        <td
                          key={role.key}
                          className={cn(
                            'bg-muted/40 py-2 px-4 transition-colors duration-300',
                            !isCeo && isDirty(role.key)
                              ? 'bg-amber-50/30'
                              : '',
                          )}
                          style={{ minWidth: 150 }}>
                          <div className="flex justify-center items-center gap-1.5">
                            {!isCeo && canEdit ? (
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() =>
                                        toggleModuleForRole(
                                          role.key,
                                          modulePerms,
                                        )
                                      }
                                      className="text-muted-foreground hover:text-foreground transition-colors duration-150">
                                      {allGranted ? (
                                        <CheckSquare className="h-3.5 w-3.5" />
                                      ) : someGranted ? (
                                        <Minus className="h-3.5 w-3.5" />
                                      ) : (
                                        <Square className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {allGranted ? 'Remove all' : 'Grant all'}{' '}
                                    {moduleName}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {grantedCount}/{permKeys.length}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Permission rows */}
                  {modulePerms.map((perm) => (
                    <tr
                      key={perm.key}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-150 group">
                      {/* Sticky label — matches row hover via group */}
                      <td
                        className="sticky left-0 z-10 bg-background group-hover:bg-muted/20 transition-colors duration-150 py-2.5 px-4 border-r border-border/40"
                        style={{ minWidth: 240, width: 240 }}>
                        <div>
                          <div className="text-sm leading-snug">
                            {perm.label}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground leading-none mt-0.5">
                            {perm.key}
                          </div>
                        </div>
                      </td>

                      {roles.map((role) => {
                        const checked = (
                          matrix[role.key] || []
                        ).includes(perm.key);
                        const isCeo = role.key === 'CEO';
                        const dirty = !isCeo && isDirty(role.key);
                        return (
                          <td
                            key={`${role.key}-${perm.key}`}
                            className={cn(
                              'py-2.5 px-4 transition-colors duration-200',
                              dirty ? 'bg-amber-50/20' : '',
                            )}
                            style={{ minWidth: 150 }}>
                            <div className="flex justify-center">
                              <Checkbox
                                checked={isCeo ? true : checked}
                                disabled={isCeo || !canEdit}
                                onCheckedChange={() =>
                                  togglePermission(role.key, perm.key)
                                }
                                className={cn(
                                  'transition-all duration-150',
                                  isCeo ? 'opacity-40' : '',
                                )}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ),
            )}

            {Object.keys(visibleModules).length === 0 && (
              <tr>
                <td
                  colSpan={roles.length + 1}
                  className="py-16 text-center animate-in fade-in duration-200">
                  <p className="text-sm text-muted-foreground">
                    No permissions match &ldquo;{search}&rdquo;
                  </p>
                  <button
                    onClick={() => setSearch('')}
                    className="mt-2 text-xs text-muted-foreground hover:text-muted-foreground underline-offset-2 hover:underline transition-colors duration-150">
                    Clear search
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
