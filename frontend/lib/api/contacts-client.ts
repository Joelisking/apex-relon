import { apiFetch } from './client';
import type { Contact, CreateContactDto, UpdateContactDto } from '../types';

export const contactsApi = {
  getByClient: (clientId: string): Promise<Contact[]> =>
    apiFetch<Contact[]>(`/clients/${clientId}/contacts`),

  getByLead: (leadId: string): Promise<Contact[]> =>
    apiFetch<Contact[]>(`/leads/${leadId}/contacts`),

  getById: (id: string): Promise<Contact> =>
    apiFetch<Contact>(`/contacts/${id}`),

  create: (clientId: string, data: CreateContactDto): Promise<Contact> =>
    apiFetch<Contact>(`/clients/${clientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateContactDto): Promise<Contact> =>
    apiFetch<Contact>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    apiFetch<void>(`/contacts/${id}`, { method: 'DELETE' }),

  linkToLead: (leadId: string, contactId: string): Promise<void> =>
    apiFetch<void>(`/leads/${leadId}/contacts/${contactId}`, {
      method: 'POST',
    }),

  unlinkFromLead: (leadId: string, contactId: string): Promise<void> =>
    apiFetch<void>(`/leads/${leadId}/contacts/${contactId}`, {
      method: 'DELETE',
    }),
};
