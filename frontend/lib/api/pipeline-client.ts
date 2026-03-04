import { apiFetch } from './client';

export interface PipelineStage {
  id: string;
  name: string;
  pipelineType: string; // 'prospective_project' | 'project'
  color: string;
  lightColor: string;
  border: string;
  probability: number;
  sortOrder: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStageDto {
  name: string;
  pipelineType?: string;
  color?: string;
  lightColor?: string;
  border?: string;
  probability: number;
  sortOrder?: number;
}

export interface UpdateStageDto {
  name?: string;
  color?: string;
  lightColor?: string;
  border?: string;
  probability?: number;
}

export interface ReorderStagesDto {
  stages: { id: string; sortOrder: number }[];
}

export const pipelineApi = {
  getStages: (type?: string, serverToken?: string) => {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return apiFetch<PipelineStage[]>(`/pipeline/stages${query}`, {}, serverToken);
  },

  createStage: (data: CreateStageDto, serverToken?: string) =>
    apiFetch<PipelineStage>('/pipeline/stages', {
      method: 'POST',
      body: JSON.stringify(data),
    }, serverToken),

  updateStage: (id: string, data: UpdateStageDto, serverToken?: string) =>
    apiFetch<PipelineStage>(`/pipeline/stages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, serverToken),

  deleteStage: (id: string, serverToken?: string) =>
    apiFetch<void>(`/pipeline/stages/${id}`, {
      method: 'DELETE',
    }, serverToken),

  reorderStages: (data: ReorderStagesDto, serverToken?: string) =>
    apiFetch<PipelineStage[]>('/pipeline/stages/reorder', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, serverToken),
};
