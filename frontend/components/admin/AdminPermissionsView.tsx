'use client';

import { PermissionsMatrix } from './PermissionsMatrix';
import { useAuth } from '@/contexts/auth-context';
import { Lock, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminPermissionsView() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('permissions:edit');

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
      style={{ animationFillMode: 'backwards' }}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div
          className="animate-in fade-in slide-in-from-left-2 duration-400"
          style={{
            animationDelay: '60ms',
            animationFillMode: 'backwards',
          }}>
          <h2 className="text-3xl font-display tracking-tight">
            Permissions
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage role-based permissions across the system
          </p>
        </div>

        {/* Edit mode badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 mt-1 transition-colors duration-300 animate-in fade-in zoom-in-90 duration-300',
            canEdit
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
              : 'bg-muted/60 text-muted-foreground border-border/60',
          )}
          style={{
            animationDelay: '120ms',
            animationFillMode: 'backwards',
          }}>
          {canEdit ? (
            <Pencil className="h-3 w-3" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          {canEdit ? 'Edit mode' : 'View only'}
        </div>
      </div>

      <PermissionsMatrix canEdit={canEdit} />
    </div>
  );
}
