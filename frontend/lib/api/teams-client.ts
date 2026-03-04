import { Team } from '@/lib/types';
import { apiFetch } from './client';

export async function getTeams(): Promise<Team[]> {
  return apiFetch<Team[]>('/teams');
}

export async function getTeam(id: string): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}`);
}

export async function createTeam(data: {
  name: string;
  description?: string;
  type?: string;
  managerId?: string;
}): Promise<Team> {
  return apiFetch<Team>('/teams', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTeam(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    type: string;
    managerId: string;
  }>
): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(id: string): Promise<void> {
  return apiFetch<void>(`/teams/${id}`, {
    method: 'DELETE',
  });
}

export async function addTeamMember(teamId: string, userId: string): Promise<void> {
  return apiFetch<void>(`/teams/${teamId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  return apiFetch<void>(`/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
  });
}
