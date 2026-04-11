import type { RoleResponse } from '@/lib/api/roles-client';

export function getEffectiveRoleLabel(
  roleString: string,
  roles: RoleResponse[],
  overrides: Record<string, string> | null | undefined,
): string {
  const override = overrides?.[roleString]?.trim();
  if (override) return override;
  const match = roles.find((r) => r.key === roleString || r.label === roleString);
  return match?.label ?? roleString;
}

export function getCanonicalRoleLabel(
  roleString: string,
  roles: RoleResponse[],
): string {
  const match = roles.find((r) => r.key === roleString || r.label === roleString);
  return match?.label ?? roleString;
}
