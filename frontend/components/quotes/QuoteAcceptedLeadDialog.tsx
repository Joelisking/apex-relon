'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { leadsApi } from '@/lib/api/client';
import { ConvertLeadDialog } from '@/components/leads/ConvertLeadDialog';
import type { Quote, Lead } from '@/lib/types';
import { toast } from 'sonner';

interface QuoteAcceptedLeadDialogProps {
  quote: Quote | null;
  open: boolean;
  onClose: () => void;
}

export function QuoteAcceptedLeadDialog({
  quote,
  open,
  onClose,
}: QuoteAcceptedLeadDialogProps) {
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [fullLead, setFullLead] = useState<Lead | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Fetch the full lead when the dialog opens so we can pass it to ConvertLeadDialog.
  useEffect(() => {
    if (open && quote?.leadId) {
      setFullLead(null);
      leadsApi
        .getById(quote.leadId)
        .then((data) => setFullLead(data))
        .catch(console.error);
    }
  }, [open, quote?.leadId]);

  const company = quote?.lead?.company ?? '';

  const handleConvertToProject = async () => {
    if (!fullLead || !quote) return;
    setIsConverting(true);
    try {
      let leadToConvert = fullLead;
      if (fullLead.stage !== 'Won') {
        const updated = await leadsApi.update(fullLead.id, {
          stage: 'Won',
          contractedValue: quote.total,
          dealClosedAt: new Date().toISOString(),
        });
        leadToConvert = updated;
        setFullLead(updated);
      }
      setFullLead({ ...leadToConvert, contractedValue: quote.total });
      setShowConvertDialog(true);
    } catch (err) {
      console.error('Failed to prepare lead for conversion', err);
      toast.error('Failed to prepare lead for conversion');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={open && !!quote?.leadId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quote Accepted</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Quote <span className="font-medium text-foreground">{quote?.quoteNumber}</span> for{' '}
            <span className="font-medium text-foreground">{company}</span> has been accepted. Would
            you like to convert this lead into an active project?
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isConverting}>
            Not Now
          </Button>
          <Button onClick={handleConvertToProject} disabled={isConverting || !fullLead}>
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Processing…
              </>
            ) : (
              'Convert to Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {showConvertDialog && fullLead && (
        <ConvertLeadDialog
          lead={fullLead}
          open={showConvertDialog}
          onOpenChange={(o) => {
            setShowConvertDialog(o);
            if (!o) onClose();
          }}
          managers={[]}
        />
      )}
    </Dialog>
  );
}
