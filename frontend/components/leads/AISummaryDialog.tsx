'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Lightbulb, TrendingUp } from 'lucide-react';

interface AISummary {
  summary: string;
  insights: string[];
  nextActions: string[];
  metrics: {
    daysInPipeline: number;
    daysSinceLastContact: number;
    activityCount: number;
    fileCount: number;
  };
}

interface AISummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: AISummary | null;
}

export function AISummaryDialog({
  open,
  onOpenChange,
  summary,
}: AISummaryDialogProps) {
  if (!summary) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* <Sparkles className="w-5 h-5 text-primary" /> */}
            AI Lead Analysis
          </DialogTitle>
          <DialogDescription>
            AI-powered insights and recommendations for this lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {summary.summary}
              </p>
            </CardContent>
          </Card>

          {/* Key Insights */}
          {summary.insights && summary.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.insights.map((insight, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommended Actions */}
          {summary.nextActions && summary.nextActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="w-4 h-4" />
                  Recommended Next Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.nextActions.map((action, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {summary.metrics.daysInPipeline}
              </div>
              <div className="text-xs text-muted-foreground">
                Days in Pipeline
              </div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {summary.metrics.daysSinceLastContact}
              </div>
              <div className="text-xs text-muted-foreground">
                Days Since Contact
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
