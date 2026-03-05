'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  permissionsApi,
  type PermissionDefinition,
} from '@/lib/api/permissions-client';

interface PermissionsMatrixProps {
  canEdit: boolean;
}

export function PermissionsMatrix({
  canEdit,
}: PermissionsMatrixProps) {
  const [permissions, setPermissions] = useState<
    PermissionDefinition[]
  >([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [originalMatrix, setOriginalMatrix] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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

  const togglePermission = (role: string, permKey: string) => {
    if (role === 'CEO' || !canEdit) return;

    setMatrix((prev) => {
      const rolePerms = prev[role] || [];
      const has = rolePerms.includes(permKey);
      return {
        ...prev,
        [role]: has
          ? rolePerms.filter((p) => p !== permKey)
          : [...rolePerms, permKey],
      };
    });
  };

  const isDirty = (role: string) => {
    const current = [...(matrix[role] || [])].sort();
    const original = [...(originalMatrix[role] || [])].sort();
    return JSON.stringify(current) !== JSON.stringify(original);
  };

  const saveRole = async (role: string) => {
    try {
      setSaving(role);
      await permissionsApi.updateRolePermissions(
        role,
        matrix[role] || [],
      );
      setOriginalMatrix((prev) => ({
        ...prev,
        [role]: [...(matrix[role] || [])],
      }));
      toast.success(`${role} permissions saved`);
    } catch {
      toast.error(`Failed to save ${role} permissions`);
    } finally {
      setSaving(null);
    }
  };

  // Group permissions by module
  const modules = permissions.reduce<
    Record<string, PermissionDefinition[]>
  >((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CEO':
        return 'bg-violet-100/70 text-violet-900 border-transparent';
      case 'ADMIN':
        return 'bg-blue-100/70   text-blue-900   border-transparent';
      case 'BDM':
        return 'bg-orange-100/70  text-orange-900  border-transparent';
      case 'DESIGNER':
        return 'bg-rose-100/70   text-rose-900   border-transparent';
      case 'QS':
        return 'bg-cyan-100/70   text-cyan-900   border-transparent';
      case 'SALES':
        return 'bg-emerald-100/70 text-emerald-900 border-transparent';
      default:
        return 'bg-muted text-muted-foreground border-transparent';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="overflow-auto rounded-lg border"
      style={{ maxHeight: 'calc(100vh - 220px)' }}>
      <table className="text-sm border-collapse" style={{ minWidth: '100%', width: 'max-content' }}>
        <thead className="sticky top-0 z-20">
          <tr className="border-b bg-background">
            {/* Sticky top-left corner cell */}
            <th
              className="sticky left-0 z-30 bg-background text-left py-3 px-4 font-medium border-r"
              style={{ minWidth: 220, width: 220 }}>
              Permission
            </th>
            {roles.map((role) => (
              <th
                key={role}
                className="py-3 px-4 bg-background text-center"
                style={{ minWidth: 160 }}>
                <div className="flex flex-col items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={getRoleColor(role)}>
                    {role}
                  </Badge>
                  {role !== 'CEO' && canEdit && isDirty(role) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      disabled={saving === role}
                      onClick={() => saveRole(role)}>
                      {saving === role ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Save
                    </Button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(modules).map(([moduleName, modulePerms]) => (
            <Fragment key={moduleName}>
              {/* Module section header — label sticks to the left */}
              <tr className="bg-muted/50">
                <td
                  className="sticky left-0 z-10 bg-muted/50 py-2 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r"
                  style={{ minWidth: 220, width: 220 }}>
                  {moduleName}
                </td>
                {roles.map((role) => (
                  <td key={role} className="bg-muted/50" />
                ))}
              </tr>
              {modulePerms.map((perm) => (
                <tr
                  key={perm.key}
                  className="border-b border-muted/30 hover:bg-muted/20">
                  {/* Sticky permission label */}
                  <td
                    className="sticky left-0 z-10 bg-background py-2.5 px-4 text-sm border-r"
                    style={{ minWidth: 220, width: 220 }}>
                    {perm.label}
                  </td>
                  {roles.map((role) => {
                    const checked = (matrix[role] || []).includes(perm.key);
                    const isCeo = role === 'CEO';
                    return (
                      <td
                        key={`${role}-${perm.key}`}
                        className="py-2.5 px-4"
                        style={{ minWidth: 160 }}>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isCeo ? true : checked}
                            disabled={isCeo || !canEdit}
                            onCheckedChange={() =>
                              togglePermission(role, perm.key)
                            }
                            className={isCeo ? 'opacity-50' : ''}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
