// Permissions that unlock access to at least one admin panel section.
// Must be kept in sync with ADMIN_PANEL_PERMISSIONS in backend/src/permissions/permissions.constants.ts
export const ADMIN_PANEL_PERMISSIONS = [
  'users:view',
  'settings:view',
  'settings:manage',
  'permissions:view',
  'audit_logs:view',
  'ai_settings:view',
] as const;
