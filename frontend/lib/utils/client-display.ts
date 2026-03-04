import type { Client } from '@/lib/types';

export function getClientDisplayName(
  client: Pick<Client, 'name' | 'individualName'>,
  mode: 'COMPANY' | 'CONTACT',
): string {
  if (mode === 'CONTACT') {
    return client.individualName || client.name;
  }
  return client.name;
}

export function getClientSubtitle(
  client: Pick<Client, 'name' | 'individualName' | 'email'>,
  mode: 'COMPANY' | 'CONTACT',
): string | null {
  if (mode === 'CONTACT' && client.individualName) {
    // Contact mode: primary is the person, subtitle is the company
    return client.name;
  }
  if (mode === 'COMPANY' && client.individualName) {
    // Company mode: primary is company, subtitle is the person
    return client.individualName;
  }
  return client.email ?? null;
}
