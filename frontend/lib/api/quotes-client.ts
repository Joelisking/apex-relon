import { apiFetch, API_URL, getTokenFromClientCookies } from './client';
import type { Quote, Product, QuoteSettings } from '../types';

export interface CreateQuoteDto {
  leadId?: string;
  clientId?: string;
  validUntil?: string;
  notes?: string;
  termsAndConditions?: string;
  taxRate?: number;
  discount?: number;
  currency?: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    taxable?: boolean;
    sortOrder?: number;
  }>;
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {
  status?: string;
}

export const quotesApi = {
  getAll: (filters?: {
    leadId?: string;
    clientId?: string;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<Quote[]>(`/quotes${query}`);
  },

  getById: (id: string) => apiFetch<Quote>(`/quotes/${id}`),

  create: (data: CreateQuoteDto) =>
    apiFetch<Quote>('/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateQuoteDto) =>
    apiFetch<Quote>(`/quotes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/quotes/${id}`, { method: 'DELETE' }),

  send: (id: string) =>
    apiFetch<Quote>(`/quotes/${id}/send`, { method: 'POST' }),

  accept: (id: string) =>
    apiFetch<Quote>(`/quotes/${id}/accept`, { method: 'POST' }),

  reject: (id: string) =>
    apiFetch<Quote>(`/quotes/${id}/reject`, { method: 'POST' }),

  downloadPdf: async (id: string): Promise<Blob> => {
    const token = getTokenFromClientCookies();
    const response = await fetch(`${API_URL}/quotes/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    return response.blob();
  },
};

export const productsApi = {
  getAll: (includeInactive = false) => {
    const query = includeInactive ? '?includeInactive=true' : '';
    return apiFetch<Product[]>(`/products${query}`);
  },

  getById: (id: string) => apiFetch<Product>(`/products/${id}`),

  create: (data: {
    name: string;
    description?: string;
    defaultPrice?: number;
    unit?: string;
    category?: string;
  }) =>
    apiFetch<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Product>) =>
    apiFetch<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/products/${id}`, { method: 'DELETE' }),
};

export const quoteSettingsApi = {
  get: () => apiFetch<QuoteSettings>('/quotes/settings'),
  update: (data: Partial<QuoteSettings>) =>
    apiFetch<QuoteSettings>('/quotes/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
