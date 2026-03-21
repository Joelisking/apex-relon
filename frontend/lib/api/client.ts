import type {
  Lead,
  LeadRep,
  ServiceCategory,
  ServiceType,
  TaskType,
  ServiceItem,
  ServiceItemSubtask,
  ServiceItemRoleEstimate,
  DropdownOption,
  Client,
  User,
  AISettings,
  DashboardMetrics,
  LeadRiskAnalysis,
  ClientHealthReport,
  UpsellStrategy,
  ExecutiveSummaryResponse,
} from '../types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const API_BASE = API_URL;

export type AIProvider = 'anthropic' | 'openai' | 'gemini';

// DTO types for API requests
export interface CreateLeadDto {
  contactName: string;
  company: string;
  email?: string;
  phone?: string;
  expectedValue: number;
  contractedValue?: number;
  projectName?: string;
  stage: string;
  serviceTypeId?: string;
  categoryIds?: string[];
  serviceTypeIds?: string[];
  county?: string;
  urgency: string;
  source?: string;
  likelyStartDate?: Date | string;
  notes?: string;
  assignedToId?: string;
  clientId?: string;
  teamMemberIds?: string[];
}

export interface UpdateLeadDto {
  contactName?: string;
  company?: string;
  email?: string;
  phone?: string;
  expectedValue?: number;
  contractedValue?: number;
  projectName?: string;
  stage?: string;
  serviceTypeId?: string;
  categoryIds?: string[];
  serviceTypeIds?: string[];
  county?: string;
  urgency?: string;
  source?: string;
  likelyStartDate?: Date | string;
  notes?: string;
  aiRiskLevel?: string;
  aiSummary?: string;
  aiRecommendations?: string;
  clientId?: string;
  assignedToId?: string;
  dealClosedAt?: string;
}

export interface CreateLeadRepDto {
  name: string;
  phone?: string;
  email?: string;
}

export interface CreateClientDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  individualName?: string;
  individualType?: string;
  segment: string;
  industry: string;
  county?: string;
  accountManagerId?: string;
  // These fields have defaults and should be calculated, not entered during creation
  lifetimeRevenue?: number;
  status?: string;
}

export interface UpdateClientDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  individualName?: string;
  individualType?: string;
  segment?: string;
  industry?: string;
  county?: string;
  lifetimeRevenue?: number;
  accountManager?: string;
  status?: string;
  healthScore?: number;
  aiHealthSummary?: string;
  aiUpsellStrategy?: string;
  statusOverride?: boolean;
  statusOverrideReason?: string;
}

export interface CreateUserDto {
  email: string;
  name: string;
  role: string;
  status: string;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: string;
  status?: string;
}

export interface ChatContext {
  leadsCount: number;
  clientsCount: number;
  leadsSummary: {
    company: string;
    contactName: string;
    stage: string;
    expectedValue: number;
    urgency?: string;
    aiRiskLevel?: string | null;
  }[];
  clientsSummary: {
    name: string;
    status: string;
    segment: string;
    industry: string;
    lifetimeRevenue: number;
    healthScore?: number | null;
  }[];
}

// Client-side only - synchronous cookie reading
export function getTokenFromClientCookies(): string | null {
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

// Server-side - async cookie reading (Next.js 16+)
async function getTokenFromServerCookies(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return cookieStore.get('token')?.value || null;
  } catch {
    return null;
  }
}

// Export for server components to get token
export async function getServerToken(): Promise<string | null> {
  return getTokenFromServerCookies();
}

// Generic fetch wrapper with error handling and JWT injection
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
  serverToken?: string, // Optional token from server components
): Promise<T> {
  // Priority: serverToken > client cookies
  let token = serverToken;

  if (!token) {
    // Client-side: use sync cookie reading
    token = getTokenFromClientCookies() || undefined;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Inject Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Leads API
export const leadsApi = {
  getAll: (year?: string, serverToken?: string) => {
    const query = year ? `?year=${encodeURIComponent(year)}` : '';
    return apiFetch<Lead[]>(`/leads${query}`, {}, serverToken);
  },

  getById: (id: string, serverToken?: string) =>
    apiFetch<Lead>(`/leads/${id}`, {}, serverToken),

  create: (data: CreateLeadDto, serverToken?: string) =>
    apiFetch<Lead>(
      '/leads',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  update: (id: string, data: UpdateLeadDto, serverToken?: string) =>
    apiFetch<Lead>(
      `/leads/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  delete: (id: string, serverToken?: string) =>
    apiFetch<void>(
      `/leads/${id}`,
      {
        method: 'DELETE',
      },
      serverToken,
    ),

  analyzeRisk: (
    id: string,
    provider?: AIProvider,
    serverToken?: string,
  ) =>
    apiFetch<LeadRiskAnalysis>(
      `/leads/${id}/analyze`,
      {
        method: 'POST',
        body: JSON.stringify({ provider }),
      },
      serverToken,
    ),

  draftEmail: (id: string, emailType: string, serverToken?: string) =>
    apiFetch<{ subject: string; body: string; tone: string }>(
      `/leads/${id}/draft-email`,
      { method: 'POST', body: JSON.stringify({ emailType }) },
      serverToken,
    ),

  // Rep management
  createRep: (
    leadId: string,
    data: CreateLeadRepDto,
    serverToken?: string,
  ) =>
    apiFetch<LeadRep>(
      `/leads/${leadId}/reps`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  updateRep: (
    leadId: string,
    repId: string,
    data: Partial<CreateLeadRepDto>,
    serverToken?: string,
  ) =>
    apiFetch<LeadRep>(
      `/leads/${leadId}/reps/${repId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  deleteRep: (leadId: string, repId: string, serverToken?: string) =>
    apiFetch<void>(
      `/leads/${leadId}/reps/${repId}`,
      {
        method: 'DELETE',
      },
      serverToken,
    ),

  // Team member management
  addTeamMember: (leadId: string, userId: string, serverToken?: string) =>
    apiFetch<{ id: string; userId: string; user: { id: string; name: string; role: string } }>(
      `/leads/${leadId}/team-members`,
      { method: 'POST', body: JSON.stringify({ userId }) },
      serverToken,
    ),

  removeTeamMember: (leadId: string, userId: string, serverToken?: string) =>
    apiFetch<void>(
      `/leads/${leadId}/team-members/${userId}`,
      { method: 'DELETE' },
      serverToken,
    ),

  bulkUpdate: (
    ids: string[],
    data: UpdateLeadDto,
    serverToken?: string,
  ) =>
    apiFetch<{ count: number }>(
      '/leads/bulk-update',
      {
        method: 'POST',
        body: JSON.stringify({ ids, data }),
      },
      serverToken,
    ),

  bulkDelete: (ids: string[], serverToken?: string) =>
    apiFetch<{ count: number }>(
      '/leads/bulk-delete',
      {
        method: 'POST',
        body: JSON.stringify({ ids }),
      },
      serverToken,
    ),
};

// Clients API
export const clientsApi = {
  getAll: (serverToken?: string) =>
    apiFetch<Client[]>('/clients', {}, serverToken),

  getById: (id: string, serverToken?: string) =>
    apiFetch<Client>(`/clients/${id}`, {}, serverToken),

  create: (data: CreateClientDto, serverToken?: string) =>
    apiFetch<Client>(
      '/clients',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  update: (id: string, data: UpdateClientDto, serverToken?: string) =>
    apiFetch<Client>(
      `/clients/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  delete: (id: string, serverToken?: string) =>
    apiFetch<void>(
      `/clients/${id}`,
      {
        method: 'DELETE',
      },
      serverToken,
    ),

  generateHealthReport: (
    id: string,
    provider?: AIProvider,
    serverToken?: string,
  ) =>
    apiFetch<ClientHealthReport>(
      `/clients/${id}/health`,
      {
        method: 'POST',
        body: JSON.stringify({ provider }),
      },
      serverToken,
    ),

  generateUpsellStrategy: (
    id: string,
    provider?: AIProvider,
    serverToken?: string,
  ) =>
    apiFetch<UpsellStrategy>(
      `/clients/${id}/upsell`,
      {
        method: 'POST',
        body: JSON.stringify({ provider }),
      },
      serverToken,
    ),

  updateHealthStatus: (
    id: string,
    provider?: AIProvider,
    serverToken?: string,
  ) =>
    apiFetch<{
      message: string;
      status?: string;
      healthScore?: number;
      report?: ClientHealthReport;
      currentStatus?: string;
      overrideReason?: string;
    }>(
      `/clients/${id}/health/auto-update`,
      {
        method: 'POST',
        body: JSON.stringify({ provider }),
      },
      serverToken,
    ),

  overrideHealthStatus: (
    id: string,
    status: string,
    reason: string,
    serverToken?: string,
  ) =>
    apiFetch<{
      message: string;
      status: string;
      reason: string;
    }>(
      `/clients/${id}/health/override`,
      {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      },
      serverToken,
    ),

  bulkUpdate: (
    ids: string[],
    data: UpdateClientDto,
    serverToken?: string,
  ) =>
    apiFetch<{ count: number }>(
      '/clients/bulk-update',
      {
        method: 'POST',
        body: JSON.stringify({ ids, data }),
      },
      serverToken,
    ),

  bulkDelete: (ids: string[], serverToken?: string) =>
    apiFetch<{ count: number }>(
      '/clients/bulk-delete',
      {
        method: 'POST',
        body: JSON.stringify({ ids }),
      },
      serverToken,
    ),

  convertLead: (
    leadId: string,
    projectManagerId?: string,
    projectData?: {
      projectName?: string;
      contractedValue?: number;
      endOfProjectValue?: number;
      startDate?: string;
      estimatedDueDate?: string;
      closedDate?: string;
      description?: string;
      status?: string;
    },
    serverToken?: string,
  ) =>
    apiFetch<{
      customer: Client;
      project: Record<string, unknown>;
      message: string;
    }>(
      `/clients/convert-lead/${leadId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          projectManagerId,
          ...projectData,
        }),
      },
      serverToken,
    ),
};

// AI API
export const aiApi = {
  generateExecutiveSummary: (
    metrics: DashboardMetrics,
    provider?: AIProvider,
    serverToken?: string,
  ) =>
    apiFetch<ExecutiveSummaryResponse>(
      '/ai/executive-summary',
      {
        method: 'POST',
        body: JSON.stringify({ metrics, provider }),
      },
      serverToken,
    ),

  chat: (
    message: string,
    context: ChatContext | Record<string, unknown>,
    provider?: AIProvider,
    serverToken?: string,
  ) =>
    apiFetch<{ message: string; suggestions?: string[] }>(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({ message, context, provider }),
      },
      serverToken,
    ),

  getProviders: (serverToken?: string) =>
    apiFetch<{ available: string[]; default: string }>(
      '/ai/providers',
      {},
      serverToken,
    ),
};

// Admin API
export const adminApi = {
  getUsers: (serverToken?: string) =>
    apiFetch<{ users: User[] }>('/admin/users', {}, serverToken).then(
      (res) => res.users,
    ),

  createUser: (data: CreateUserDto, serverToken?: string) =>
    apiFetch<User>(
      '/admin/users',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  updateUser: (
    id: string,
    data: UpdateUserDto,
    serverToken?: string,
  ) =>
    apiFetch<User>(
      `/admin/users/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  getAISettings: (serverToken?: string) =>
    apiFetch<AISettings>('/admin/ai-settings', {}, serverToken),

  updateAISettings: (
    settings: Partial<AISettings>,
    serverToken?: string,
  ) =>
    apiFetch<AISettings>(
      '/admin/ai-settings',
      {
        method: 'PATCH',
        body: JSON.stringify(settings),
      },
      serverToken,
    ),

  checkAPIKeys: (serverToken?: string) =>
    apiFetch<{
      anthropic: boolean;
      openai: boolean;
      gemini: boolean;
    }>('/admin/api-keys/status', {}, serverToken),

  getTenantSettings: (serverToken?: string) =>
    apiFetch<{ id: string; clientDisplayMode: string }>(
      '/admin/tenant-settings',
      {},
      serverToken,
    ),

  updateTenantSettings: (
    data: { clientDisplayMode?: string },
    serverToken?: string,
  ) =>
    apiFetch<{ id: string; clientDisplayMode: string }>(
      '/admin/tenant-settings',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      serverToken,
    ),
};

// Settings API (Service Categories + Service Types + Dropdown Options)
export const settingsApi = {
  getServiceCategories: (serverToken?: string) =>
    apiFetch<ServiceCategory[]>('/settings/service-categories', {}, serverToken),

  createServiceCategory: (
    data: { name: string; description?: string; isActive?: boolean; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<ServiceCategory>(
      '/settings/service-categories',
      { method: 'POST', body: JSON.stringify(data) },
      serverToken,
    ),

  updateServiceCategory: (
    id: string,
    data: { name: string; description?: string; isActive?: boolean; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<ServiceCategory>(
      `/settings/service-categories/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      serverToken,
    ),

  deleteServiceCategory: (id: string, serverToken?: string) =>
    apiFetch<void>(`/settings/service-categories/${id}`, { method: 'DELETE' }, serverToken),

  getServiceTypes: (serverToken?: string) =>
    apiFetch<ServiceType[]>(
      '/settings/service-types',
      {},
      serverToken,
    ),

  createServiceType: (
    data: { name: string; categoryId?: string; description?: string; isActive?: boolean; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<ServiceType>(
      '/settings/service-types',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  updateServiceType: (
    id: string,
    data: { name: string; description?: string; isActive?: boolean; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<ServiceType>(
      `/settings/service-types/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  deleteServiceType: (id: string, serverToken?: string) =>
    apiFetch<void>(
      `/settings/service-types/${id}`,
      {
        method: 'DELETE',
      },
      serverToken,
    ),

  // Task Types
  getTaskTypes: (serviceTypeId?: string, serverToken?: string) => {
    const query = serviceTypeId ? `?serviceTypeId=${encodeURIComponent(serviceTypeId)}` : '';
    return apiFetch<TaskType[]>(`/settings/task-types${query}`, {}, serverToken);
  },

  createTaskType: (
    data: { name: string; description?: string; serviceTypeId?: string; isActive?: boolean; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<TaskType>('/settings/task-types', { method: 'POST', body: JSON.stringify(data) }, serverToken),

  updateTaskType: (
    id: string,
    data: { name?: string; description?: string; serviceTypeId?: string; isActive?: boolean; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<TaskType>(`/settings/task-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, serverToken),

  deleteTaskType: (id: string, serverToken?: string) =>
    apiFetch<void>(`/settings/task-types/${id}`, { method: 'DELETE' }, serverToken),

  // Dropdown Options
  getDropdownOptions: (category?: string, serverToken?: string) => {
    const query = category
      ? `?category=${encodeURIComponent(category)}`
      : '';
    return apiFetch<DropdownOption[]>(
      `/settings/dropdown-options${query}`,
      {},
      serverToken,
    );
  },

  getAllDropdownOptions: (serverToken?: string) =>
    apiFetch<DropdownOption[]>(
      '/settings/dropdown-options/all',
      {},
      serverToken,
    ),

  createDropdownOption: (
    data: {
      category: string;
      value: string;
      label: string;
      metadata?: Record<string, unknown>;
      sortOrder?: number;
    },
    serverToken?: string,
  ) =>
    apiFetch<DropdownOption>(
      '/settings/dropdown-options',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  updateDropdownOption: (
    id: string,
    data: {
      label?: string;
      metadata?: Record<string, unknown>;
      sortOrder?: number;
      isActive?: boolean;
    },
    serverToken?: string,
  ) =>
    apiFetch<DropdownOption>(
      `/settings/dropdown-options/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      serverToken,
    ),

  deleteDropdownOption: (id: string, serverToken?: string) =>
    apiFetch<void>(
      `/settings/dropdown-options/${id}`,
      {
        method: 'DELETE',
      },
      serverToken,
    ),

  reorderDropdownOptions: (
    category: string,
    orderedIds: string[],
    serverToken?: string,
  ) =>
    apiFetch<DropdownOption[]>(
      '/settings/dropdown-options/reorder',
      {
        method: 'POST',
        body: JSON.stringify({ category, orderedIds }),
      },
      serverToken,
    ),
};

// Service Items API
export const serviceItemsApi = {
  getAll: (serviceTypeId?: string, serverToken?: string) => {
    const query = serviceTypeId ? `?serviceTypeId=${encodeURIComponent(serviceTypeId)}` : '';
    return apiFetch<ServiceItem[]>(`/service-items${query}`, {}, serverToken);
  },

  getOne: (id: string, serverToken?: string) =>
    apiFetch<ServiceItem>(`/service-items/${id}`, {}, serverToken),

  create: (
    data: { name: string; description?: string; serviceTypeId?: string; unit?: string; defaultPrice?: number; isActive?: boolean; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<ServiceItem>('/service-items', { method: 'POST', body: JSON.stringify(data) }, serverToken),

  update: (
    id: string,
    data: { name?: string; description?: string; serviceTypeId?: string; unit?: string; defaultPrice?: number; isActive?: boolean; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<ServiceItem>(`/service-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, serverToken),

  delete: (id: string, serverToken?: string) =>
    apiFetch<void>(`/service-items/${id}`, { method: 'DELETE' }, serverToken),

  createSubtask: (
    serviceItemId: string,
    data: { name: string; description?: string; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<ServiceItemSubtask>(`/service-items/${serviceItemId}/subtasks`, { method: 'POST', body: JSON.stringify(data) }, serverToken),

  updateSubtask: (
    serviceItemId: string,
    subtaskId: string,
    data: { name?: string; description?: string; sortOrder?: number },
    serverToken?: string,
  ) =>
    apiFetch<ServiceItemSubtask>(`/service-items/${serviceItemId}/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(data) }, serverToken),

  deleteSubtask: (serviceItemId: string, subtaskId: string, serverToken?: string) =>
    apiFetch<void>(`/service-items/${serviceItemId}/subtasks/${subtaskId}`, { method: 'DELETE' }, serverToken),

  reorderSubtasks: (serviceItemId: string, orderedIds: string[], serverToken?: string) =>
    apiFetch<void>(`/service-items/${serviceItemId}/subtasks/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds }) }, serverToken),

  upsertRoleEstimate: (
    serviceItemId: string,
    subtaskId: string,
    role: string,
    estimatedHours: number,
    serverToken?: string,
  ) =>
    apiFetch<ServiceItemRoleEstimate>(
      `/service-items/${serviceItemId}/subtasks/${subtaskId}/roles/${encodeURIComponent(role)}`,
      { method: 'PUT', body: JSON.stringify({ estimatedHours }) },
      serverToken,
    ),

  deleteRoleEstimate: (serviceItemId: string, subtaskId: string, role: string, serverToken?: string) =>
    apiFetch<void>(
      `/service-items/${serviceItemId}/subtasks/${subtaskId}/roles/${encodeURIComponent(role)}`,
      { method: 'DELETE' },
      serverToken,
    ),
};

// Convenience export
export const api = {
  leads: leadsApi,
  clients: clientsApi,
  ai: aiApi,
  admin: adminApi,
  settings: settingsApi,
  serviceItems: serviceItemsApi,
};
