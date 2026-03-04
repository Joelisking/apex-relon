import { apiFetch } from './client';

export interface RoleResponse {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  isBuiltIn: boolean;
  color?: string | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  label: string;
  description?: string;
  color?: string;
  mimicRoleKey?: string;
}

export interface UpdateRoleRequest {
  label?: string;
  description?: string;
  color?: string;
}

export const rolesApi = {
  getAll(): Promise<RoleResponse[]> {
    return apiFetch('/admin/roles');
  },

  create(data: CreateRoleRequest): Promise<RoleResponse> {
    return apiFetch('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(key: string, data: UpdateRoleRequest): Promise<RoleResponse> {
    return apiFetch(`/admin/roles/${key}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete(key: string): Promise<{ message: string }> {
    return apiFetch(`/admin/roles/${key}`, { method: 'DELETE' });
  },
};
