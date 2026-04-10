/**
 * Returns the best display name for a client record.
 * For INDIVIDUAL clients the meaningful name may be in `individualName`;
 * fall back through `name` → `individualName` → "Unknown".
 */
export function getClientDisplayName(client: {
  name?: string | null;
  individualName?: string | null;
}): string {
  return client.name?.trim() || client.individualName?.trim() || 'Unknown';
}
