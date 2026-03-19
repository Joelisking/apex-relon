import { apiFetch } from './client';
import type {
  CustomFieldDefinition,
  CustomFieldValue,
} from '../types';

export interface CreateCustomFieldDefinitionDto {
  entityType: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  options?: string[];
  required?: boolean;
  sortOrder?: number;
}

export interface UpdateCustomFieldDefinitionDto {
  label?: string;
  options?: string[];
  required?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export const customFieldsApi = {
  // Definitions
  getDefinitions: (entityType?: string) => {
    const query = entityType ? `?entityType=${entityType}` : '';
    return apiFetch<CustomFieldDefinition[]>(
      `/custom-fields/definitions${query}`,
    );
  },

  createDefinition: (data: CreateCustomFieldDefinitionDto) =>
    apiFetch<CustomFieldDefinition>('/custom-fields/definitions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDefinition: (
    id: string,
    data: UpdateCustomFieldDefinitionDto,
  ) =>
    apiFetch<CustomFieldDefinition>(
      `/custom-fields/definitions/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    ),

  deleteDefinition: (id: string) =>
    apiFetch<void>(`/custom-fields/definitions/${id}`, {
      method: 'DELETE',
    }),

  reorderDefinitions: (entityType: string, orderedIds: string[]) =>
    apiFetch<CustomFieldDefinition[]>(
      '/custom-fields/definitions/reorder',
      {
        method: 'POST',
        body: JSON.stringify({ entityType, orderedIds }),
      },
    ),

  // Values
  getValues: (entityType: string, entityId: string) =>
    apiFetch<Record<string, CustomFieldValue>>(
      `/custom-fields/values/${entityType}/${entityId}`,
    ),

  setValues: (
    entityType: string,
    entityId: string,
    fields: Array<{ definitionId: string; value: string | number | boolean | string[] | null }>,
  ) =>
    apiFetch<{ saved: number }>(`/custom-fields/values/${entityType}/${entityId}`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    }),
};
