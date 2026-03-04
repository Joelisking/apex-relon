'use client';

import { PermissionsMatrix } from './PermissionsMatrix';
import { useAuth } from '@/contexts/auth-context';

export default function AdminPermissionsView() {
  const { hasPermission } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display tracking-tight">Permissions</h2>
        <p className="text-muted-foreground mt-1">
          Manage role-based permissions across the system
        </p>
      </div>
      <PermissionsMatrix canEdit={hasPermission('permissions:edit')} />
    </div>
  );
}
