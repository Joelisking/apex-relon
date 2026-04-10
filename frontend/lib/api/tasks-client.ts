import { apiFetch } from './client';
import type { Task, TaskSummary, TeamTaskSummary } from '../types';

export interface CreateTaskDto {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: string;
  entityType?: string;
  entityId?: string;
  assignedToId?: string;
  taskTypeId?: string;
  reminderAt?: string;
  estimatedHours?: number;
  serviceItemId?: string;
  serviceItemSubtaskId?: string;
  costBreakdownLineId?: string;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  status?: string;
  completionNote?: string;
  uncompleteReason?: string;
}

export const tasksApi = {
  getAll: (filters?: {
    status?: string;
    priority?: string;
    entityType?: string;
    entityId?: string;
    assignedToId?: string;
    dueBefore?: string;
    dueAfter?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<Task[]>(`/tasks${query}`);
  },

  getById: (id: string) => apiFetch<Task>(`/tasks/${id}`),

  getSummary: () => apiFetch<TaskSummary>('/tasks/summary'),

  getTeamSummary: () => apiFetch<TeamTaskSummary>('/tasks/team-summary'),

  getByEntity: (entityType: string, entityId: string) =>
    apiFetch<Task[]>(`/tasks/entity/${entityType}/${entityId}`),

  create: (data: CreateTaskDto) =>
    apiFetch<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateTaskDto) =>
    apiFetch<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  complete: (id: string, completionNote: string) =>
    apiFetch<Task>(`/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ completionNote }),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
