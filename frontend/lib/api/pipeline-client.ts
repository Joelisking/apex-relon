import { apiFetch } from './client';

export interface PipelineStage {
  id: string;
  name: string;
  pipelineType: string; // 'prospective_project' | 'project'
  jobType: string;      // '__all__' for general, or a JobType.name for type-specific
  color: string;
  lightColor: string;
  border: string;
  probability: number;
  sortOrder: number;
  isSystem: boolean;
  isOptional: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStageDto {
  name: string;
  pipelineType?: string;
  jobType?: string;
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
  getStages: (type?: string, jobType?: string, serverToken?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (jobType) params.set('jobType', jobType);
    const query = params.size > 0 ? `?${params.toString()}` : '';
    return apiFetch<PipelineStage[]>(`/pipeline/stages${query}`, {}, serverToken);
  },

  getStagesByJobType: (jobTypeName: string, serverToken?: string) =>
    apiFetch<PipelineStage[]>(
      `/pipeline/stages/by-job-type?jobType=${encodeURIComponent(jobTypeName)}`,
      {},
      serverToken,
    ),

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
