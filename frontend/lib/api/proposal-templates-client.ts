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

export interface EditableParagraph {
  index: number;
  text: string;
}

export interface EditableTableCell {
  rowIndex: number;
  cellIndex: number;
  text: string;
  key: string;
}

export interface EditableTableRow {
  rowIndex: number;
  cells: EditableTableCell[];
}

export interface EditableTable {
  tableIndex: number;
  rows: EditableTableRow[];
}

export interface TemplateContent {
  paragraphs: string[];
  dynamicFields: string[];
  tables: EditableTable[];
  editableParagraphs: EditableParagraph[];
}

export interface GenerateProposalInput {
  leadId?: string;
  costBreakdownId?: string;
  title?: string;
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
  dynamicValues?: Record<string, string>;
  tableCellValues?: Record<string, string>;
  paragraphOverrides?: Record<string, string>;
}

export interface GenerateProposalResult {
  proposalId: string;
  fileId: string;
  fileName: string;
  downloadUrl: string;
}

export interface ProposalFormSnapshot {
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  timeline?: string | null;
  proposalDate?: string | null;
  projectName?: string | null;
  projectAddress?: string | null;
  totalAmount?: string | null;
  dynamicValues?: Record<string, string> | null;
  tableCellValues?: Record<string, string> | null;
  paragraphOverrides?: Record<string, string> | null;
}

export interface Proposal {
  id: string;
  tenantId: string;
  title: string;
  status: string;
  leadId: string | null;
  costBreakdownId: string | null;
  fileId: string | null;
  proposalTemplateId: string | null;
  proposalDate: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  formSnapshot?: ProposalFormSnapshot | null;
  lead: { id: string; company: string; contactName: string; projectName: string | null } | null;
  costBreakdown: { id: string; title: string; status: string } | null;
  file: { id: string; originalName: string; fileSize: number } | null;
  proposalTemplate: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

export const proposalTemplatesApi = {
  // ── Templates ──────────────────────────────────────────────────────────────

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

  getContent(templateId: string): Promise<TemplateContent> {
    return apiFetch<TemplateContent>(`/proposal-templates/${templateId}/content`);
  },

  generate(templateId: string, dto: GenerateProposalInput): Promise<GenerateProposalResult> {
    return apiFetch<GenerateProposalResult>(`/proposal-templates/${templateId}/generate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // ── Proposals ──────────────────────────────────────────────────────────────

  getProposals(filters?: { leadId?: string }): Promise<Proposal[]> {
    const q = filters?.leadId ? `?leadId=${encodeURIComponent(filters.leadId)}` : '';
    return apiFetch<Proposal[]>(`/proposal-templates/proposals${q}`);
  },

  getProposalById(id: string): Promise<Proposal> {
    return apiFetch<Proposal>(`/proposal-templates/proposals/${id}`);
  },

  renameProposal(id: string, title: string): Promise<Proposal> {
    return apiFetch<Proposal>(`/proposal-templates/proposals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  acceptProposal(id: string): Promise<Proposal> {
    return apiFetch<Proposal>(`/proposal-templates/proposals/${id}/accept`, {
      method: 'PATCH',
    });
  },

  deleteProposal(id: string): Promise<void> {
    return apiFetch(`/proposal-templates/proposals/${id}`, { method: 'DELETE' });
  },

  async downloadProposal(proposalId: string): Promise<Blob> {
    const token = getTokenFromClientCookies();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${API_BASE}/proposal-templates/proposals/${proposalId}/download`,
      { headers },
    );
    if (!res.ok) throw new Error('Failed to download proposal');
    return res.blob();
  },

  async downloadCombinedPdf(proposalId: string): Promise<{ blob: Blob; fileName: string }> {
    const token = getTokenFromClientCookies();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(
      `${API_BASE}/proposal-templates/proposals/${proposalId}/combined-pdf`,
      { headers },
    );
    if (!res.ok) throw new Error('Failed to generate combined PDF');
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="([^"]+)"/);
    const fileName = match ? decodeURIComponent(match[1]) : 'proposal-combined.pdf';
    return { blob: await res.blob(), fileName };
  },
};
