'use client';

import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Mail,
  ChevronDown,
  Copy,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { leadsApi } from '@/lib/api/client';
import type { Lead } from '@/lib/types';
import { toast } from 'sonner';

interface Props {
  lead: Lead;
  hasAnalyzePermission: boolean;
  aiLoading: boolean;
  summaryLoading: boolean;
  onGenerateSummary: () => void;
  onAnalyzeRisk: () => void;
}

const EMAIL_TYPES = [
  'follow-up',
  'introduction',
  'proposal',
  'check-in',
  'closing',
] as const;

export function LeadAIAnalysisSection({
  lead,
  hasAnalyzePermission,
  aiLoading,
  summaryLoading,
  onGenerateSummary,
  onAnalyzeRisk,
}: Props) {
  const [draftEmailLoading, setDraftEmailLoading] = useState(false);
  const [draftEmail, setDraftEmail] = useState<{
    subject: string;
    body: string;
    tone: string;
  } | null>(null);
  const [draftEmailOpen, setDraftEmailOpen] = useState(false);

  const handleDraftEmail = async (emailType: string) => {
    setDraftEmailLoading(true);
    try {
      const draft = await leadsApi.draftEmail(lead.id, emailType);
      setDraftEmail(draft);
      setDraftEmailOpen(true);
    } catch {
      toast.error('Failed to draft email');
    } finally {
      setDraftEmailLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> AI Analysis
        </h3>
        {hasAnalyzePermission && (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateSummary}
              disabled={summaryLoading}
              className="h-7 text-xs px-2.5">
              {summaryLoading && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}{' '}
              Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onAnalyzeRisk}
              disabled={aiLoading}
              className="h-7 text-xs px-2.5">
              {aiLoading && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}{' '}
              Risk Analysis
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={draftEmailLoading}
                  className="h-7 text-xs px-2.5">
                  <Mail className="h-3 w-3 mr-1" />
                  {draftEmailLoading ? 'Drafting...' : 'Draft Email'}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {EMAIL_TYPES.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => handleDraftEmail(type)}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {lead.aiSummary && (
        <div className="rounded-xl bg-muted/30 border border-border/50 p-3.5 text-sm text-foreground leading-relaxed">
          {lead.aiSummary}
        </div>
      )}

      {lead.aiRecommendations && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.06em] font-semibold text-muted-foreground">
            Recommendations
          </p>
          <div className="space-y-1.5">
            {lead.aiRecommendations.split(';').map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted-foreground leading-snug">
                  {rec.trim()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {draftEmailOpen && draftEmail && (
        <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Drafted Email</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{draftEmail.tone}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Subject: ${draftEmail.subject}\n\n${draftEmail.body}`,
                  );
                  toast.success('Copied to clipboard');
                }}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Subject
            </p>
            <p className="text-sm font-medium">
              {draftEmail.subject}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Body</p>
            <p className="text-sm whitespace-pre-wrap">
              {draftEmail.body}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
