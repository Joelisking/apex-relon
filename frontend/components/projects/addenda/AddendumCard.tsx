'use client';

import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addendaApi, type Addendum, type AddendumLine } from '@/lib/api/addenda-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { ServiceItem } from '@/lib/types';
import { getEffectiveRoleLabel } from '@/components/cost-breakdown/role-label.util';
import { EditAddendumLinesDialog } from './EditAddendumLinesDialog';

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  DRAFT:    { label: 'Draft',    classes: 'bg-gray-100 text-gray-700 border-gray-200' },
  APPROVED: { label: 'Approved', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  INVOICED: { label: 'Invoiced', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const STATUS_NEXT: Record<string, string> = {
  DRAFT: 'APPROVED',
  APPROVED: 'INVOICED',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Line display row ─────────────────────────────────────────────────────────

function LineDisplayRow({
  line,
  roles,
  roleDisplayNames,
}: {
  line: AddendumLine;
  roles: RoleResponse[];
  roleDisplayNames?: Record<string, string> | null;
}) {
  const roleLabel = line.role
    ? getEffectiveRoleLabel(line.role, roles, roleDisplayNames)
    : null;

  const serviceLabel = line.subtask
    ? `${line.serviceItem?.name ?? ''} · ${line.subtask.name}`
    : line.serviceItem?.name ?? null;

  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex-1 min-w-0">
        {serviceLabel && (
          <span className="text-foreground font-medium">{serviceLabel}</span>
        )}
        {serviceLabel && line.description && <span className="text-muted-foreground mx-1.5">—</span>}
        {line.description && (
          <span className="text-foreground">{line.description}</span>
        )}
        {!serviceLabel && !line.description && (
          <span className="text-muted-foreground italic">No description</span>
        )}
        {roleLabel && <span className="ml-2 text-xs text-muted-foreground">({roleLabel})</span>}
      </div>
      <div className="flex items-center gap-6 shrink-0 tabular-nums">
        <span className="text-muted-foreground text-xs">{line.estimatedHours}h × {fmt(line.billableRate)}</span>
        <span className="font-medium w-20 text-right">{fmt(line.lineTotal)}</span>
      </div>
    </div>
  );
}

// ─── AddendumCard ──��────────────────────────���─────────────────────────────────

interface AddendumCardProps {
  addendum: Addendum;
  roles: RoleResponse[];
  serviceItems: ServiceItem[];
  onRefresh: () => void;
}

export function AddendumCard({ addendum, roles, serviceItems, onRefresh }: AddendumCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const badge = STATUS_BADGE[addendum.status] ?? STATUS_BADGE.DRAFT;
  const nextStatus = STATUS_NEXT[addendum.status];
  const nextBadge = nextStatus ? STATUS_BADGE[nextStatus] : null;

  const handleStatusAdvance = async () => {
    if (!nextStatus) return;
    setIsUpdating(true);
    try {
      await addendaApi.update(addendum.id, { status: nextStatus });
      toast.success(`Marked as ${nextBadge?.label ?? nextStatus}`);
      onRefresh();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await addendaApi.delete(addendum.id);
      toast.success('Addendum deleted');
      onRefresh();
    } catch {
      toast.error('Failed to delete addendum');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{addendum.title}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.classes}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {addendum.lines.length} {addendum.lines.length === 1 ? 'line' : 'lines'}
              {' · '}Created by {addendum.createdBy.name}
              {' · '}{format(new Date(addendum.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold tabular-nums">{fmt(addendum.total)}</span>

          {addendum.status === 'DRAFT' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsEditOpen(true)}
            >
              Edit Lines
            </Button>
          )}

          {nextBadge && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleStatusAdvance}
              disabled={isUpdating}
            >
              Mark {nextBadge.label}
            </Button>
          )}

          {addendum.status === 'DRAFT' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded lines */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3">
          {addendum.description && (
            <p className="text-sm text-muted-foreground italic mb-3">{addendum.description}</p>
          )}
          {addendum.lines.length > 0 ? (
            <>
              <div className="divide-y divide-border/30">
                {addendum.lines.map((line) => (
                  <LineDisplayRow
                    key={line.id}
                    line={line}
                    roles={roles}
                    roleDisplayNames={addendum.roleDisplayNames}
                  />
                ))}
              </div>
              <div className="flex justify-end pt-2 mt-2 border-t border-border/30">
                <span className="text-sm font-semibold tabular-nums">Total: {fmt(addendum.total)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No line items added yet.</p>
          )}
        </div>
      )}

      {isEditOpen && (
        <EditAddendumLinesDialog
          addendum={addendum}
          roles={roles}
          serviceItems={serviceItems}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}
