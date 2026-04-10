'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Proposal } from '@/lib/api/proposal-templates-client';

interface AcceptProposalDialogProps {
  proposal: Proposal | null;
  onClose: () => void;
  onConfirm: (contractedValue: number | undefined) => Promise<void>;
}

function parseAmount(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? undefined : n;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function AcceptProposalDialog({
  proposal,
  onClose,
  onConfirm,
}: AcceptProposalDialogProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const proposalTotal = parseAmount(proposal?.formSnapshot?.totalAmount);

  useEffect(() => {
    if (!proposal) return;
    setValue(proposalTotal !== undefined ? String(proposalTotal) : '');
  }, [proposal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const numeric = parseFloat(value.replace(/[^0-9.]/g, ''));
      await onConfirm(isNaN(numeric) ? undefined : numeric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!proposal} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Accept Proposal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            Mark <span className="font-medium text-foreground">{proposal?.title}</span> as accepted
            and set the contracted value on the linked project.
          </p>

          {proposalTotal !== undefined && (
            <p className="text-xs text-muted-foreground">
              Proposal total: <span className="font-medium text-foreground">{formatCurrency(proposalTotal)}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Contracted Value</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={proposalTotal !== undefined ? String(proposalTotal) : '0'}
                className="pl-7"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sets the project&apos;s contracted value. Leave blank to skip.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Accept Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
