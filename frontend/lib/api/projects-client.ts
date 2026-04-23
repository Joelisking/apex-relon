import type { ProjectServiceItem } from '@/lib/types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface ProjectCostSegment {
  id: string;
  projectId: string;
  name: string;
  amount: number;
  sortOrder: number;
  createdAt: string;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string };
}

export interface Project {
  id: string;
  name: string;
  jobNumber?: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
  };
  leadId?: string;
  lead?: {
    id: string;
    contactName: string;
    company: string;
  };
  contractedValue: number;
  invoicedValue?: number | null;
  status: string;
  statusNote?: string | null;
  endOfProjectValue?: number;
  startDate?: string;
  completedDate?: string;
  description?: string;
  estimatedDueDate?: string;
  closedDate?: string;
  riskStatus?: string;
  estimatedRevenue?: number;
  totalCost?: number;
  primaryCostBreakdownId?: string | null;
  jobTypeId?: string | null;
  jobType?: { id: string; name: string; division?: { id: string; name: string } | null } | null;
  categoryIds?: string[];
  jobTypeIds?: string[];
  county?: string[];
  address?: string | null;
  folderPath?: string | null;
  isIndot?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  activeOptionalStages?: string[];
  projectManagerId?: string;
  projectManager?: { id: string; name: string; email: string };
  assignments?: ProjectAssignment[];
  costSegments?: ProjectCostSegment[];
  costLogs?: CostLog[];
  statusHistory?: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note?: string | null;
    createdAt: string;
    user: { name: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectActivity {
  id: string;
  type: string;
  activityDate: string;
  activityTime: string;
  reason: string;
  notes?: string;
  meetingType?: string;
  userId: string;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

export interface CreateProjectActivityDto {
  type: string;
  activityDate?: string;
  activityTime?: string;
  reason?: string;
  notes?: string;
  meetingType?: string;
}

export interface ProjectFile {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  downloadUrl: string;
  uploadedBy: { id: string; name: string; email: string };
  createdAt: string;
}

export interface CostLog {
  id: string;
  projectId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
  user?: { id: string; name: string };
  createdAt: string;
}

export interface CreateProjectDto {
  name: string;
  clientId: string;
  leadId?: string;
  status: string;
  contractedValue: number;
  invoicedValue?: number | null;
  endOfProjectValue?: number;
  startDate?: string;
  completedDate?: string;
  description?: string;
  estimatedDueDate?: string;
  closedDate?: string;
  riskStatus?: string;
  estimatedRevenue?: number;
  projectManagerId?: string;
  teamMemberIds?: string[];
  categoryIds?: string[];
  jobTypeIds?: string[];
  county?: string[];
  address?: string;
  folderPath?: string;
  isIndot?: boolean;
  latitude?: number;
  longitude?: number;
  activeOptionalStages?: string[];
  statusNote?: string | null;
  costSegments?: { name: string; amount: number; sortOrder?: number }[];
  jobNumber?: string;
}

export interface SubtaskPerformance {
  subtaskId: string;
  subtaskName: string;
  proposedByRole: Record<string, number>;
  actualByRole: Record<string, number>;
}

export interface ServiceItemPerformance {
  serviceItemId: string;
  serviceItemName: string;
  proposedByRole: Record<string, number>;
  actualByRole: Record<string, number>;
  subtasks: SubtaskPerformance[];
}

export interface ProjectProfitability {
  projectId: string;
  revenue: number;
  laborCost: number;
  directCost: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  proposedHours: number;
  actualHours: number;
  hoursVariance: number;
  laborByUser: { userId: string; userName: string; hours: number; cost: number }[];
  serviceItemPerformance: ServiceItemPerformance[];
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

function authHeaders(): Record<string, string> {
  const token = getTokenFromClientCookies();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const projectsApi = {
  async getAll(): Promise<Project[]> {
    const response = await fetch(`${API_BASE}/projects`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    return response.json();
  },

  async getByClient(clientId: string): Promise<Project[]> {
    const response = await fetch(
      `${API_BASE}/projects/client/${clientId}`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    return response.json();
  },

  async getById(id: string): Promise<Project> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }

    return response.json();
  },

  async create(data: CreateProjectDto): Promise<Project> {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create project: ${error}`);
    }

    return response.json();
  },

  async update(
    id: string,
    data: Partial<CreateProjectDto>,
  ): Promise<Project> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update project: ${error}`);
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const token = getTokenFromClientCookies();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to delete project');
    }
  },

  async bulkUpdate(
    ids: string[],
    data: Record<string, unknown>,
  ): Promise<{ count: number }> {
    const response = await fetch(`${API_BASE}/projects/bulk-update`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ids, data }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to bulk update projects: ${error}`);
    }

    return response.json();
  },

  async bulkDelete(ids: string[]): Promise<{ count: number }> {
    const response = await fetch(`${API_BASE}/projects/bulk-delete`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to bulk delete projects: ${error}`);
    }

    return response.json();
  },

  // Cost logs
  async getCostLogs(projectId: string): Promise<CostLog[]> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/costs`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch cost logs');
    }

    return response.json();
  },

  async addCostLog(
    projectId: string,
    data: {
      date: string;
      category: string;
      description: string;
      amount: number;
    },
  ): Promise<CostLog> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/costs`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add cost log: ${error}`);
    }

    return response.json();
  },

  async removeCostLog(
    projectId: string,
    costId: string,
  ): Promise<void> {
    const token = getTokenFromClientCookies();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE}/projects/${projectId}/costs/${costId}`,
      {
        method: 'DELETE',
        headers,
      },
    );

    if (!response.ok) {
      throw new Error('Failed to delete cost log');
    }
  },

  // Activities
  async getActivities(projectId: string): Promise<ProjectActivity[]> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/activities`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }

    return response.json();
  },

  async createActivity(
    projectId: string,
    data: CreateProjectActivityDto,
  ): Promise<ProjectActivity> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/activities`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create activity: ${error}`);
    }

    return response.json();
  },

  async deleteActivity(
    projectId: string,
    activityId: string,
  ): Promise<void> {
    const token = getTokenFromClientCookies();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE}/projects/${projectId}/activities/${activityId}`,
      {
        method: 'DELETE',
        headers,
      },
    );

    if (!response.ok) {
      throw new Error('Failed to delete activity');
    }
  },

  // Files
  async getFiles(projectId: string): Promise<ProjectFile[]> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/files`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }

    return response.json();
  },

  async uploadFile(
    projectId: string,
    file: File,
    category: string = 'other',
  ): Promise<ProjectFile> {
    const token = getTokenFromClientCookies();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE}/projects/${projectId}/files`,
      {
        method: 'POST',
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    return response.json();
  },

  async deleteFile(projectId: string, fileId: string): Promise<void> {
    const token = getTokenFromClientCookies();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE}/projects/${projectId}/files/${fileId}`,
      {
        method: 'DELETE',
        headers,
      },
    );

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  },

  // ── Crew Assignments ──────────────────────────────────────────────────────

  async getAssignments(projectId: string): Promise<ProjectAssignment[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/assignments`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch assignments');
    return response.json();
  },

  async addAssignment(
    projectId: string,
    data: { userId: string; role: string },
  ): Promise<ProjectAssignment> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/assignments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add assignment');
    return response.json();
  },

  async removeAssignment(projectId: string, assignmentId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/assignments/${assignmentId}`,
      { method: 'DELETE', headers: authHeaders() },
    );
    if (!response.ok) throw new Error('Failed to remove assignment');
  },

  // ── Service Items ─────────────────────────────────────────────────────────

  async getServiceItems(projectId: string): Promise<ProjectServiceItem[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/service-items`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project service items');
    return response.json();
  },

  async addServiceItem(
    projectId: string,
    data: {
      serviceItemId: string;
      quantity?: number;
      unitPrice?: number;
      notes?: string;
      sortOrder?: number;
    },
  ): Promise<ProjectServiceItem> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/service-items`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add service item: ${error}`);
    }
    return response.json();
  },

  async updateServiceItem(
    projectId: string,
    linkId: string,
    data: {
      quantity?: number;
      unitPrice?: number | null;
      notes?: string | null;
      sortOrder?: number;
    },
  ): Promise<ProjectServiceItem> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/service-items/${linkId}`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update service item: ${error}`);
    }
    return response.json();
  },

  async removeServiceItem(projectId: string, linkId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/service-items/${linkId}`,
      { method: 'DELETE', headers: authHeaders() },
    );
    if (!response.ok) throw new Error('Failed to remove service item');
  },

  async getProfitability(projectId: string): Promise<ProjectProfitability> {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/profitability`,
      { headers: authHeaders() },
    );
    if (!response.ok) throw new Error('Failed to fetch profitability');
    return response.json();
  },
};
