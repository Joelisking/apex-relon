import { apiFetch } from './client';

export interface ProjectComment {
  id: string;
  projectId: string;
  authorId: string;
  content: string;
  mentionedIds: string[];
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; role: string };
}

export interface CreateCommentDto {
  content: string;
  mentionedIds?: string[];
}

export const commentsApi = {
  getAll: (projectId: string) =>
    apiFetch<ProjectComment[]>(`/projects/${projectId}/comments`),

  create: (projectId: string, dto: CreateCommentDto) =>
    apiFetch<ProjectComment>(`/projects/${projectId}/comments`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: string, content: string) =>
    apiFetch<ProjectComment>(`/comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/comments/${id}`, { method: 'DELETE' }),
};
