import { apiFetch } from './client';

export interface Activity {
  id: string;
  leadId?: string;
  clientId?: string;
  projectId?: string;
  type: 'call' | 'meeting';
  activityDate: string;
  activityTime: string;
  reason: string;
  notes?: string;
  meetingType?: 'in-person' | 'virtual';
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface CreateActivityDto {
  type: 'call' | 'meeting';
  activityDate: string; // ISO date string
  activityTime: string; // HH:MM format
  reason: string;
  notes?: string;
  meetingType?: 'in-person' | 'virtual'; // Required for meetings
}

export const activitiesApi = {
  async getActivities(leadId: string, serverToken?: string): Promise<Activity[]> {
    return apiFetch(`/leads/${leadId}/activities`, {}, serverToken);
  },

  async createActivity(
    leadId: string,
    data: CreateActivityDto,
    serverToken?: string
  ): Promise<Activity> {
    return apiFetch(`/leads/${leadId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, serverToken);
  },

  async deleteActivity(
    leadId: string,
    activityId: string,
    serverToken?: string
  ): Promise<void> {
    return apiFetch(`/leads/${leadId}/activities/${activityId}`, {
      method: 'DELETE',
    }, serverToken);
  },
};
