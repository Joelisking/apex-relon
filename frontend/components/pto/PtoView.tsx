'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarDays, Clock, CheckCircle, XCircle, AlertCircle, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ptoApi, type PtoRequest, type CreatePtoRequestDto } from '@/lib/api/pto-client';

const PTO_TYPES = ['VACATION', 'SICK', 'PERSONAL', 'OTHER'];

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Pending',   classes: 'text-amber-700 bg-amber-50 border-amber-200',   icon: AlertCircle },
  APPROVED:  { label: 'Approved',  classes: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  DENIED:    { label: 'Denied',    classes: 'text-red-700 bg-red-50 border-red-200',         icon: XCircle },
  CANCELLED: { label: 'Cancelled', classes: 'text-gray-600 bg-gray-100 border-gray-200',     icon: Ban },
};

function formatDateRange(start: string, end: string) {
  const s = format(new Date(start), 'MMM d');
  const e = format(new Date(end), 'MMM d, yyyy');
  return s === e.split(',')[0] ? format(new Date(start), 'MMM d, yyyy') : `${s} – ${e}`;
}

// ─── PtoRequestDialog ─────────────────────────────────────────────────────────

interface PtoRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function PtoRequestDialog({ open, onOpenChange, onCreated }: PtoRequestDialogProps) {
  const [type, setType] = useState('VACATION');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState<number>(8);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: policies = [] } = useQuery({
    queryKey: ['pto-policies'],
    queryFn: () => ptoApi.getPolicies(),
  });

  const [policyId, setPolicyId] = useState<string>('');

  const handleClose = useCallback(() => {
    setType('VACATION');
    setStartDate('');
    setEndDate('');
    setHours(8);
    setNotes('');
    setPolicyId('');
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = async () => {
    if (!startDate || !endDate) { toast.error('Start and end dates are required'); return; }
    if (hours <= 0) { toast.error('Hours must be positive'); return; }
    setIsSubmitting(true);
    try {
      const dto: CreatePtoRequestDto = {
        type,
        startDate,
        endDate,
        hours,
        notes: notes.trim() || undefined,
        policyId: policyId || undefined,
      };
      await ptoApi.createRequest(dto);
      toast.success('PTO request submitted');
      onCreated();
      handleClose();
    } catch {
      toast.error('Failed to submit PTO request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request PTO</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PTO_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Total Hours</Label>
            <Input
              type="number"
              value={hours}
              onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              min={0.5}
              step={0.5}
              className="h-9"
            />
          </div>

          {policies.length > 0 && (
            <div className="space-y-1.5">
              <Label>Policy (optional)</Label>
              <Select value={policyId} onValueChange={setPolicyId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select policy…" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context…"
              className="resize-none"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !startDate || !endDate}>
            {isSubmitting ? 'Submitting…' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PtoRequestRow ─────────────────────────────────────────────────────────────

interface PtoRequestRowProps {
  request: PtoRequest;
  onCancel: (id: string) => void;
}

function PtoRequestRow({ request, onCancel }: PtoRequestRowProps) {
  const config = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {request.type.charAt(0) + request.type.slice(1).toLowerCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateRange(request.startDate, request.endDate)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {request.hours}h
            </span>
          </div>
          {request.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{request.notes}</p>
          )}
          {request.status === 'DENIED' && request.deniedReason && (
            <p className="text-xs text-red-600 mt-0.5">Reason: {request.deniedReason}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </span>
        {(request.status === 'PENDING' || request.status === 'APPROVED') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onCancel(request.id)}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── PtoView (exported) ───────────────────────────────────────────────────────

export function PtoView() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['pto-requests-me'],
    queryFn: () => ptoApi.getMyRequests(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ptoApi.cancelRequest(id),
    onSuccess: () => {
      toast.success('Request cancelled');
      queryClient.invalidateQueries({ queryKey: ['pto-requests-me'] });
    },
    onError: () => toast.error('Failed to cancel request'),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pto-requests-me'] });
  }, [queryClient]);

  const approvedHours = requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((s, r) => s + r.hours, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display tracking-tight">My PTO</h2>
          <p className="text-muted-foreground mt-1">
            {approvedHours > 0
              ? `${approvedHours}h approved this year`
              : 'Track your time-off requests'}
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Request PTO
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No PTO requests yet</p>
          </div>
        ) : (
          <div className="px-4">
            {requests.map((request) => (
              <PtoRequestRow
                key={request.id}
                request={request}
                onCancel={(id) => cancelMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      <PtoRequestDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onCreated={invalidate}
      />
    </div>
  );
}
