import { API_URL } from './client';

// Helper to get token from cookies
function getTokenFromCookies(): string | null {
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

export interface ReportFilters {
  period?: 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  assignedToId?: string;
  clientId?: string;
  stage?: string;
  status?: string;
}

function buildParams(filters: ReportFilters): URLSearchParams {
  const clean = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
  return new URLSearchParams(clean as Record<string, string>);
}

// Helper function for API calls
async function apiFetch(endpoint: string) {
  const authToken = getTokenFromCookies();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined;
  }

  return response.json();
}

// Leads Reports
export const leadsReportsApi = {
  async getOverview(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/leads/overview?${params}`);
  },

  async getStageAnalysis(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/leads/stage-analysis?${params}`);
  },

  async getConversionFunnel(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/leads/conversion-funnel?${params}`);
  },

  async getRevenueByRep(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/leads/revenue-by-rep?${params}`);
  },

  async getOverdue(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/leads/overdue?${params}`);
  },
};

// Projects Reports
export const projectsReportsApi = {
  async getOverview(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/projects/overview?${params}`);
  },

  async getProfitability(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/projects/profitability?${params}`);
  },

  async getRiskDistribution(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/projects/risk-distribution?${params}`);
  },

  async getCostBreakdown(filters?: ReportFilters): Promise<{ category: string; total: number; count: number }[]> {
    const params = filters ? buildParams(filters) : new URLSearchParams();
    return apiFetch(`/reports/projects/cost-breakdown?${params}`);
  },
};

// Clients Reports
export const clientsReportsApi = {
  async getOverview(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/clients/overview?${params}`);
  },

  async getRevenueAnalysis(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/clients/revenue-analysis?${params}`);
  },

  async getHealthTrends(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/clients/health-trends?${params}`);
  },

  async getRetentionMetrics(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/clients/retention-metrics?${params}`);
  },

  async getEngagementTrends(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/clients/engagement-trends?${params}`);
  },

  async getHealthScoreTrends(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/clients/health-score-trends?${params}`);
  },
};

// Sales Reps Reports
export const repsReportsApi = {
  async getOverview(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/reps/overview?${params}`);
  },

  async getPerformance(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/reps/performance?${params}`);
  },

  async getStageTime(filters: ReportFilters) {
    const params = buildParams(filters);
    return apiFetch(`/reports/reps/stage-time?${params}`);
  },
};
