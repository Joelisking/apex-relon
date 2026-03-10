import { apiFetch } from './client';

export interface PermissionDefinition {
  key: string;
  label: string;
  module: string;
}

export interface RoleMeta {
  key: string;
  label: string;
  color: string | null;
  isBuiltIn: boolean;
}

export interface PermissionMatrix {
  permissions: PermissionDefinition[];
  roles: RoleMeta[];
  matrix: Record<string, string[]>;
}

export const permissionsApi = {
  getMatrix: (serverToken?: string): Promise<PermissionMatrix> =>
    apiFetch<PermissionMatrix>('/permissions/matrix', {}, serverToken),

  updateRolePermissions: (
    role: string,
    permissions: string[],
    serverToken?: string,
  ): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`/permissions/role/${role}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }, serverToken),
};
