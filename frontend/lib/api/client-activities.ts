const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Activity {
  id: string;
  clientId?: string;
  leadId?: string;
  projectId?: string;
  type: string;
  activityDate: string;
  activityTime: string;
  reason: string;
  notes?: string;
  meetingType?: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface CreateActivityDto {
  type: string;
  activityDate: string; // ISO date string
  activityTime: string; // HH:MM format
  reason: string;
  notes?: string;
  meetingType?: string;
}

// Client-side only - synchronous cookie reading
function getTokenFromClientCookies(): string | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export const clientActivitiesApi = {
  async getActivities(clientId: string): Promise<Activity[]> {
    const token = getTokenFromClientCookies();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/clients/${clientId}/activities`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }

    return response.json();
  },

  async createActivity(
    clientId: string,
    data: CreateActivityDto
  ): Promise<Activity> {
    const token = getTokenFromClientCookies();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/clients/${clientId}/activities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create activity: ${error}`);
    }

    return response.json();
  },

  async deleteActivity(clientId: string, activityId: string): Promise<void> {
    const token = getTokenFromClientCookies();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/clients/${clientId}/activities/${activityId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to delete activity');
    }
  },
};
