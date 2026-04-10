'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertCircle, Ban, CalendarDays, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ptoApi, type PtoRequest, type PtoPolicy } from '@/lib/api/pto-client';

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Pending',   classes: 'text-amber-700 bg-amber-50 border-amber-200',       icon: AlertCircle },
  APPROVED:  { label: 'Approved',  classes: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  DENIED:    { label: 'Denied',    classes: 'text-red-700 bg-red-50 border-red-200',             icon: XCircle },
  CANCELLED: { label: 'Cancelled', classes: 'text-gray-600 bg-gray-100 border-gray-200',         icon: Ban },
};

function formatDateRange(start: string, end: string) {
  const s = format(new Date(start), 'MMM d');
  const e = format(new Date(end), 'MMM d, yyyy');
  return s === e.split(',')[0] ? format(new Date(start), 'MMM d, yyyy') : `${s} – ${e}`;
}

// ─── DenyDialog ───────────────────────────────────────────────────────────────

interface DenyDialogProps {
  requestId: string | null;
  onClose: () => void;
  onDenied: () => void;
}

function DenyDialog({ requestId, onClose, onDenied }: DenyDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeny = async () => {
    if (!requestId) return;
    setIsSubmitting(true);
    try {
      await ptoApi.reviewRequest(requestId, { action: 'DENY', deniedReason: reason.trim() || undefined });
      toast.success('Request denied');
      onDenied();
      onClose();
    } catch {
      toast.error('Failed to deny request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!requestId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deny PTO Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the request is being denied…"
            onKeyDown={(e) => { if (e.key === 'Enter') handleDeny(); }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeny} disabled={isSubmitting}>
            {isSubmitting ? 'Denying…' : 'Deny Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PendingRequestCard ───────────────────────────────────────────────────────

interface PendingRequestCardProps {
  request: PtoRequest;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isApproving: boolean;
}

function PendingRequestCard({ request, onApprove, onDeny, isApproving }: PendingRequestCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{request.user?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{request.user?.role}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border text-amber-700 bg-amber-50 border-amber-200 shrink-0">
          <AlertCircle className="h-3 w-3" />
          Pending
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">{request.type.charAt(0) + request.type.slice(1).toLowerCase()}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDateRange(request.startDate, request.endDate)}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {request.hours}h
        </span>
      </div>

      {request.notes && (
        <p className="text-sm text-muted-foreground italic">&ldquo;{request.notes}&rdquo;</p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => onApprove(request.id)}
          disabled={isApproving}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => onDeny(request.id)}
          disabled={isApproving}
        >
          <XCircle className="h-3.5 w-3.5" />
          Deny
        </Button>
      </div>
    </div>
  );
}

// ─── PolicyManagement ─────────────────────────────────────────────────────────

function PolicyManagement() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [maxDays, setMaxDays] = useState<number>(10);
  const [accrualType, setAccrualType] = useState('ANNUAL');
  const [carryoverMax, setCarryoverMax] = useState('');

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['pto-policies'],
    queryFn: () => ptoApi.getPolicies(),
  });

  const createMutation = useMutation({
    mutationFn: () => ptoApi.createPolicy({
      name: name.trim(),
      maxDaysPerYear: maxDays,
      accrualType,
      carryoverMax: carryoverMax ? parseFloat(carryoverMax) : null,
      requiresApproval: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pto-policies'] });
      setIsCreating(false);
      setName('');
      setMaxDays(10);
      setCarryoverMax('');
      toast.success('Policy created');
    },
    onError: () => toast.error('Failed to create policy'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ptoApi.deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pto-policies'] });
      toast.success('Policy deleted');
    },
    onError: () => toast.error('Failed to delete policy'),
  });

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : policies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No policies yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {policies.map((policy: PtoPolicy) => (
            <div key={policy.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{policy.name}</p>
                <p className="text-xs text-muted-foreground">
                  {policy.maxDaysPerYear} days/yr · {policy.accrualType}
                  {policy.carryoverMax != null && ` · Carryover up to ${policy.carryoverMax}d`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(policy.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}

      {isCreating ? (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Policy Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard PTO" />
            </div>
            <div className="space-y-1.5">
              <Label>Days Per Year</Label>
              <Input type="number" value={maxDays} onChange={(e) => setMaxDays(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Carryover Max (days)</Label>
              <Input type="number" value={carryoverMax} onChange={(e) => setCarryoverMax(e.target.value)} placeholder="Unlimited" />
            </div>
            <div className="space-y-1.5">
              <Label>Accrual Type</Label>
              <Select value={accrualType} onValueChange={setAccrualType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Policy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setIsCreating(true)} className="gap-1.5">
          + Add Policy
        </Button>
      )}
    </div>
  );
}

// ─── PtoAdminView (exported) ──────────────────────────────────────────────────

export function PtoAdminView() {
  const queryClient = useQueryClient();
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pto-requests-pending'],
    queryFn: () => ptoApi.getPendingRequests(),
  });

  const { data: allRequests = [], isLoading: allLoading } = useQuery({
    queryKey: ['pto-requests-all'],
    queryFn: () => ptoApi.getAllRequests(),
  });

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await ptoApi.reviewRequest(id, { action: 'APPROVE' });
      toast.success('Request approved');
      queryClient.invalidateQueries({ queryKey: ['pto-requests-pending'] });
      queryClient.invalidateQueries({ queryKey: ['pto-requests-all'] });
    } catch {
      toast.error('Failed to approve request');
    } finally {
      setApprovingId(null);
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pto-requests-pending'] });
    queryClient.invalidateQueries({ queryKey: ['pto-requests-all'] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display tracking-tight">PTO Management</h2>
        <p className="text-muted-foreground mt-1">Review time-off requests and manage policies</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="h-9">
          <TabsTrigger value="pending" className="text-sm">
            Pending {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="all" className="text-sm">All Requests</TabsTrigger>
          <TabsTrigger value="policies" className="text-sm">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}</div>
          ) : pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 p-8 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pending.map((request) => (
                <PendingRequestCard
                  key={request.id}
                  request={request}
                  onApprove={handleApprove}
                  onDeny={setDenyingId}
                  isApproving={approvingId === request.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {allLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : allRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border/40">
              {allRequests.map((request) => {
                const config = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.PENDING;
                const StatusIcon = config.icon;
                return (
                  <div key={request.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{request.user?.name ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {request.type.charAt(0) + request.type.slice(1).toLowerCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateRange(request.startDate, request.endDate)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {request.hours}h
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.classes} shrink-0`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="policies" className="mt-4">
          <PolicyManagement />
        </TabsContent>
      </Tabs>

      <DenyDialog
        requestId={denyingId}
        onClose={() => setDenyingId(null)}
        onDenied={invalidate}
      />
    </div>
  );
}
