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

export interface DashboardMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  revenueByClient: {
    clientId: string;
    clientName: string;
    revenue: number;
  }[];
  revenueByProject: {
    projectId: string;
    projectName: string;
    revenue: number;
  }[];
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  winRate: number;
  avgDealSize: number;
  funnelDropOff: {
    stage: string;
    count: number;
    dropOffRate: number;
  }[];
  avgTimeToQuote: number;
  avgTimeToClose: number;
  totalProjects: number;
  activeProjects: number;
  projectsByStatus: { status: string; count: number }[];
  projectsAtRisk: {
    projectId: string;
    projectName: string;
    reason: string;
  }[];
  pipelineValue: number;
  highValueDeals: {
    leadId: string;
    company: string;
    value: number;
    stage: string;
  }[];
  stalledLeads: {
    leadId: string;
    company: string;
    daysStalled: number;
    stage: string;
  }[];
  activeClients: number;
  topClients: {
    clientId: string;
    clientName: string;
    revenue: number;
  }[];
  revenueConcentration: {
    topClientPercentage: number;
    top5ClientsPercentage: number;
    isHighRisk: boolean;
  };
}

export interface ExecutiveSummaryResponse {
  period: string;
  generatedAt: string;
  summary: {
    overview: string;
    whatChanged: string[];
    whatIsAtRisk: string[];
    whatNeedsAttention: string[];
    keyInsights: string[];
  };
  metrics: {
    totalRevenue: number;
    pipelineValue: number;
    winRate: number;
    activeClients: number;
    activeProjects: number;
  };
}

export interface RevenueBreakdown {
  totalRevenue: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  byClient: {
    clientId: string;
    clientName: string;
    revenue: number;
  }[];
  byProject: {
    projectId: string;
    projectName: string;
    revenue: number;
  }[];
  concentration: {
    topClientPercentage: number;
    top5ClientsPercentage: number;
    isHighRisk: boolean;
  };
}

export interface ProjectAnalytics {
  totalProjects: number;
  activeProjects: number;
  byStatus: { status: string; count: number }[];
  atRisk: {
    projectId: string;
    projectName: string;
    reason: string;
  }[];
}

export interface PipelineInsights {
  summary: string;
  bottlenecks: string[];
  winProbabilityByStage: Record<string, number>;
  recommendations: string[];
  urgentLeads: string[];
}

export const dashboardApi = {
  async getMetrics(
    period: 'week' | 'month' | 'quarter' = 'month',
    token?: string,
  ): Promise<DashboardMetrics> {
    const authToken = token || getTokenFromCookies();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const params = new URLSearchParams({ period });

    const response = await fetch(
      `${API_URL}/dashboard/metrics?${params.toString()}`,
      {
        headers,
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard metrics');
    }

    return response.json();
  },

  async getExecutiveSummary(
    period: 'week' | 'month' | 'quarter' = 'month',
    token?: string,
  ): Promise<ExecutiveSummaryResponse> {
    const authToken = token || getTokenFromCookies();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${API_URL}/dashboard/executive-summary?period=${period}`,
      {
        headers,
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch executive summary');
    }

    return response.json();
  },

  async getRevenueBreakdown(
    period: 'week' | 'month' | 'quarter' = 'month',
    token?: string,
  ): Promise<RevenueBreakdown> {
    const authToken = token || getTokenFromCookies();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${API_URL}/dashboard/revenue-breakdown?period=${period}`,
      {
        headers,
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch revenue breakdown');
    }

    return response.json();
  },

  async getProjectAnalytics(
    period: 'week' | 'month' | 'quarter' = 'month',
    token?: string,
  ): Promise<ProjectAnalytics> {
    const authToken = token || getTokenFromCookies();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${API_URL}/dashboard/project-analytics?period=${period}`,
      {
        headers,
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch project analytics');
    }

    return response.json();
  },

  async getRevenueTrend(
    period: 'week' | 'month' | 'quarter' = 'month',
    token?: string,
  ): Promise<{ month: string; revenue: number }[]> {
    const authToken = token || getTokenFromCookies();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(
      `${API_URL}/dashboard/revenue-trend?period=${period}`,
      { headers, credentials: 'include' },
    );
    if (!response.ok) throw new Error('Failed to fetch revenue trend');
    return response.json();
  },

  async getLeadVolumeTrend(token?: string): Promise<{ week: string; count: number; start: string }[]> {
    const authToken = token || getTokenFromCookies();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(`${API_URL}/dashboard/lead-volume-trend`, { headers, credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch lead volume trend');
    return response.json();
  },

  async getPipelineInsights(token?: string): Promise<PipelineInsights> {
    const authToken = token || getTokenFromCookies();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(`${API_URL}/dashboard/pipeline-insights`, { headers, credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch pipeline insights');
    return response.json();
  },
};
