'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, FileText, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  proposalTemplatesApi,
  ProposalTemplate,
  GenerateProposalResult,
} from '@/lib/api/proposal-templates-client';
import type { Quote } from '@/lib/types';

interface GenerateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: Quote | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function splitContactName(contactName?: string | null): { first: string; last: string } {
  if (!contactName?.trim()) return { first: '', last: '' };
  const parts = contactName.trim().split(/\s+/);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

const SALUTATIONS = ['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.'];

export default function GenerateProposalDialog({
  open,
  onOpenChange,
  quote,
}: GenerateProposalDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateProposalResult | null>(null);

  // Form fields
  const [salutation, setSalutation] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [zip, setZip] = useState('');
  const [timeline, setTimeline] = useState('');
  const [proposalDate, setProposalDate] = useState(todayIso());
  const [projectName, setProjectName] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (!open) return;
    setResult(null);
    setSelectedTemplateId('');
    setSaveAddress(false);
    setAddress('');
    setCity('');
    setStateField('');
    setZip('');
    setTimeline('');
    setProjectAddress('');
    setSalutation('');
    setProposalDate(todayIso());

    if (quote) {
      const { first, last } = splitContactName(quote.lead?.contactName);
      setFirstName(first);
      setLastName(last);
      setProjectName(quote.project?.name ?? '');
    } else {
      setFirstName('');
      setLastName('');
      setProjectName('');
    }
    setTotalAmount('');
  }, [open, quote]);

  const { data: allTemplates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['proposal-templates'],
    queryFn: () => proposalTemplatesApi.getAll(),
    enabled: open,
  });

  const clientName = quote?.lead?.company ?? quote?.client?.name ?? null;

  const addressFilled = !!(address || city || stateField || zip);

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;
    setGenerating(true);
    try {
      const res = await proposalTemplatesApi.generate(selectedTemplateId, {
        salutation: salutation || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        address: address || undefined,
        city: city || undefined,
        state: stateField || undefined,
        zip: zip || undefined,
        timeline: timeline || undefined,
        proposalDate: proposalDate || undefined,
        projectName: projectName || undefined,
        projectAddress: projectAddress || undefined,
        totalAmount: totalAmount || undefined,
        saveAddressToClient: saveAddress && addressFilled ? true : undefined,
      });
      setResult(res);

      // Auto-download
      try {
        const blob = await proposalTemplatesApi.downloadProposal(res.proposalId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        // Download failed — user can still use the manual download button
      }

      toast.success(
        clientName
          ? `Proposal saved to ${clientName}'s files`
          : 'Proposal generated successfully',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate proposal');
    } finally {
      setGenerating(false);
    }
  };

  const handleManualDownload = async () => {
    if (!result) return;
    try {
      const blob = await proposalTemplatesApi.downloadProposal(result.proposalId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleClose = () => {
    if (generating) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Proposal</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-5 py-1">
            {/* Template picker */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
                Select Template
              </p>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : allTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No templates uploaded yet. Ask an admin to upload templates in Quote Settings.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {allTemplates.map((t: ProposalTemplate) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                        selectedTemplateId === t.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border/60 hover:bg-muted/40',
                      )}>
                      <FileText
                        className={cn(
                          'h-4 w-4 shrink-0',
                          selectedTemplateId === t.id
                            ? 'text-primary'
                            : 'text-muted-foreground',
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-foreground truncate">
                            {t.name}
                          </span>
                          {t.serviceType && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {t.serviceType.name}
                            </Badge>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {t.description}
                          </p>
                        )}
                      </div>
                      {selectedTemplateId === t.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Override fields */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">
                Proposal Details
              </p>
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden space-y-0">
                {/* Contact */}
                <div className="px-4 py-3 border-b border-border/40">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium">Contact</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Salutation
                      </Label>
                      <Select value={salutation || 'none'} onValueChange={(v) => setSalutation(v === 'none' ? '' : v)}>
                        <SelectTrigger className="text-sm h-8">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {SALUTATIONS.filter(Boolean).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        First Name
                      </Label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="text-sm h-8"
                        placeholder="First"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Last Name
                      </Label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="text-sm h-8"
                        placeholder="Last"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="px-4 py-3 border-b border-border/40">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium">
                    Client Address
                  </p>
                  <div className="space-y-2">
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="text-sm h-8"
                      placeholder="Street address"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="text-sm h-8"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Input
                          value={stateField}
                          onChange={(e) => setStateField(e.target.value)}
                          className="text-sm h-8"
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <Input
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                          className="text-sm h-8"
                          placeholder="ZIP"
                        />
                      </div>
                    </div>
                    {addressFilled && clientName && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <Checkbox
                          id="save-address"
                          checked={saveAddress}
                          onCheckedChange={(v) => setSaveAddress(!!v)}
                        />
                        <label
                          htmlFor="save-address"
                          className="text-[12px] text-muted-foreground cursor-pointer">
                          Save this address to {clientName}&apos;s record
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project */}
                <div className="px-4 py-3 border-b border-border/40">
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium">Project</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Project Name
                      </Label>
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="text-sm h-8"
                        placeholder="Project name"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Project Address
                      </Label>
                      <Input
                        value={projectAddress}
                        onChange={(e) => setProjectAddress(e.target.value)}
                        className="text-sm h-8"
                        placeholder="Project site address"
                      />
                    </div>
                  </div>
                </div>

                {/* Timeline, Date & Fee */}
                <div className="px-4 py-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Timeline
                      </Label>
                      <Input
                        value={timeline}
                        onChange={(e) => setTimeline(e.target.value)}
                        className="text-sm h-8"
                        placeholder="e.g. 3-4 weeks"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Proposal Date
                      </Label>
                      <Input
                        type="date"
                        value={proposalDate}
                        onChange={(e) => setProposalDate(e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground block mb-1">
                        Fee
                      </Label>
                      <Input
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        className="text-sm h-8"
                        placeholder="e.g. $5,000.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Success state */
          <div className="flex flex-col items-center py-8 text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Proposal generated</p>
              {clientName && (
                <p className="text-[12px] text-muted-foreground mt-1">
                  Saved to {clientName}&apos;s files
                </p>
              )}
            </div>
            {result.downloadUrl && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 mt-1"
                onClick={handleManualDownload}>
                <Download className="h-3.5 w-3.5" />
                Download Again
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" size="sm" onClick={handleClose} disabled={generating}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating || !selectedTemplateId}
                className="gap-1.5">
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    Generate & Download
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

