import { apiFetch } from './client';

export interface CreateUserRequest {
  email: string;
  name: string;
  role: string;
  teamName?: string; // Deprecated
  teamId?: string;
  managerId?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  teamName?: string; // Deprecated
  teamId?: string;
  managerId?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  teamName?: string; // Deprecated
  teamId?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    name: string;
  };
  manager?: {
    name: string;
    email: string;
  };
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export interface CreateUserResponse {
  user: UserResponse;
  tempPassword: string;
}

export const usersApi = {
  async getUsers(
    serverToken?: string,
    hasPermission?: string,
  ): Promise<{ users: UserResponse[] }> {
    const params = hasPermission
      ? `?hasPermission=${encodeURIComponent(hasPermission)}`
      : '';
    return apiFetch(`/admin/users${params}`, {}, serverToken);
  },

  async createUser(
    data: CreateUserRequest,
    serverToken?: string,
  ): Promise<CreateUserResponse> {
    return apiFetch(
      '/admin/users',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      serverToken,
    );
  },

  async updateUser(
    userId: string,
    data: UpdateUserRequest,
    serverToken?: string,
  ): Promise<{ user: UserResponse }> {
    return apiFetch(
      `/admin/users/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      serverToken,
    );
  },

  async deleteUser(
    userId: string,
    serverToken?: string,
  ): Promise<{ message: string }> {
    return apiFetch(
      `/admin/users/${userId}`,
      {
        method: 'DELETE',
      },
      serverToken,
    );
  },
};
