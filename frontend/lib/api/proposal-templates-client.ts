import { apiFetch } from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getTokenFromClientCookies(): string | null {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token') return decodeURIComponent(value);
  }
  return null;
}

export interface ProposalTemplate {
  id: string;
  name: string;
  description?: string | null;
  serviceTypeId?: string | null;
  serviceType?: { id: string; name: string } | null;
  gcpPath: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateProposalInput {
  quoteId?: string;
  projectId?: string;
  totalAmount?: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  suite?: string;
  timeline?: string;
  proposalDate?: string;
  projectName?: string;
  projectAddress?: string;
  saveAddressToClient?: boolean;
}

export interface GenerateProposalResult {
  fileId: string;
  fileName: string;
  downloadUrl: string;
}

export interface GeneratedProposal {
  id: string;
  clientId: string | null;
  originalName: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  client: { id: string; name: string } | null;
  uploadedBy: { id: string; name: string };
}

export const proposalTemplatesApi = {
  getAll(serviceTypeId?: string): Promise<ProposalTemplate[]> {
    const q = serviceTypeId ? `?serviceTypeId=${encodeURIComponent(serviceTypeId)}` : '';
    return apiFetch<ProposalTemplate[]>(`/proposal-templates${q}`);
  },

  async upload(
    file: File,
    name: string,
    description?: string,
    serviceTypeId?: string,
  ): Promise<ProposalTemplate> {
    const token = getTokenFromClientCookies();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) formData.append('description', description);
    if (serviceTypeId) formData.append('serviceTypeId', serviceTypeId);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/proposal-templates`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload failed: ${err}`);
    }
    return res.json();
  },

  delete(id: string): Promise<void> {
    return apiFetch(`/proposal-templates/${id}`, { method: 'DELETE' });
  },

  generate(templateId: string, dto: GenerateProposalInput): Promise<GenerateProposalResult> {
    return apiFetch<GenerateProposalResult>(`/proposal-templates/${templateId}/generate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  getGenerated(): Promise<GeneratedProposal[]> {
    return apiFetch<GeneratedProposal[]>('/proposal-templates/generated');
  },

  async downloadGenerated(fileId: string): Promise<Blob> {
    const token = getTokenFromClientCookies();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${API_BASE}/proposal-templates/generated/${fileId}/download`,
      { headers },
    );
    if (!res.ok) throw new Error('Failed to download proposal');
    return res.blob();
  },
};
