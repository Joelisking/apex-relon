import { apiFetch } from './client';
import type { WorkflowRule, WorkflowExecution } from '../types';

export interface CreateWorkflowRuleDto {
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>[];
  isActive?: boolean;
}

export type UpdateWorkflowRuleDto = Partial<CreateWorkflowRuleDto>;

export const workflowsApi = {
  getAll: () => apiFetch<WorkflowRule[]>('/workflows'),

  getById: (id: string) => apiFetch<WorkflowRule>(`/workflows/${id}`),

  create: (data: CreateWorkflowRuleDto) =>
    apiFetch<WorkflowRule>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateWorkflowRuleDto) =>
    apiFetch<WorkflowRule>(`/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/workflows/${id}`, { method: 'DELETE' }),

  getExecutions: (ruleId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiFetch<WorkflowExecution[]>(
      `/workflows/${ruleId}/executions${query}`,
    );
  },

  testRule: (
    id: string,
    body: { entityType?: string; entityId?: string },
  ) =>
    apiFetch<{
      conditionsMet: boolean;
      actionCount: number;
      actions: string[];
      message: string;
    }>(`/workflows/${id}/test`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
