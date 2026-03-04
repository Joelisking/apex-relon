'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ScoringInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScoringInfoDialog({ open, onOpenChange }: ScoringInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How Client Scores Work</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Health Score */}
          <section className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              Health Score
              <Badge variant="secondary" className="text-xs font-normal">
                0-100
              </Badge>
            </h3>
            <p className="text-muted-foreground">
              AI-generated score (Claude/GPT/Gemini) that considers all
              engagement data including activities, projects, revenue history,
              and contact frequency.
            </p>
            <p className="text-muted-foreground">
              Triggered by clicking the <strong>&quot;Generate Health Report&quot;</strong> button
              on a client&apos;s detail page. The AI analyzes all available data and
              provides a comprehensive health assessment.
            </p>
          </section>

          <Separator />

          {/* Engagement Score */}
          <section className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              Engagement Score
              <Badge variant="secondary" className="text-xs font-normal">
                0-100
              </Badge>
            </h3>
            <p className="text-muted-foreground">
              Deterministic score calculated from 5 weighted factors. Updates
              automatically when relevant data changes.
            </p>

            {/* Factor 1 */}
            <div className="rounded-lg border p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-medium text-xs">1. Recent Contact</span>
                <Badge variant="outline" className="text-xs">25 pts</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>&le; 7 days</span><span className="text-right">25 pts</span>
                <span>&le; 14 days</span><span className="text-right">20 pts</span>
                <span>&le; 30 days</span><span className="text-right">15 pts</span>
                <span>&le; 60 days</span><span className="text-right">10 pts</span>
                <span>&le; 90 days</span><span className="text-right">5 pts</span>
              </div>
            </div>

            {/* Factor 2 */}
            <div className="rounded-lg border p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-medium text-xs">2. Activity Level (30d)</span>
                <Badge variant="outline" className="text-xs">25 pts</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>&ge; 10 activities</span><span className="text-right">25 pts</span>
                <span>&ge; 7 activities</span><span className="text-right">20 pts</span>
                <span>&ge; 5 activities</span><span className="text-right">15 pts</span>
                <span>&ge; 3 activities</span><span className="text-right">10 pts</span>
                <span>&ge; 1 activity</span><span className="text-right">5 pts</span>
              </div>
            </div>

            {/* Factor 3 */}
            <div className="rounded-lg border p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-medium text-xs">3. Active Projects</span>
                <Badge variant="outline" className="text-xs">20 pts</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>&ge; 3 projects</span><span className="text-right">20 pts</span>
                <span>2 projects</span><span className="text-right">15 pts</span>
                <span>1 project</span><span className="text-right">10 pts</span>
              </div>
            </div>

            {/* Factor 4 */}
            <div className="rounded-lg border p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-medium text-xs">4. Repeat Business</span>
                <Badge variant="outline" className="text-xs">10 pts</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>&ge; 5 completed</span><span className="text-right">10 pts</span>
                <span>&ge; 3 completed</span><span className="text-right">8 pts</span>
                <span>&ge; 2 completed</span><span className="text-right">5 pts</span>
                <span>&ge; 1 completed</span><span className="text-right">3 pts</span>
              </div>
            </div>

            {/* Factor 5 */}
            <div className="rounded-lg border p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-medium text-xs">5. Project History (Total)</span>
                <Badge variant="outline" className="text-xs">20 pts</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>&ge; 10 projects</span><span className="text-right">20 pts</span>
                <span>&ge; 7 projects</span><span className="text-right">15 pts</span>
                <span>&ge; 5 projects</span><span className="text-right">10 pts</span>
                <span>&ge; 3 projects</span><span className="text-right">5 pts</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Triggers */}
          <section className="space-y-2">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              When Scores Update
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#8226;</span>
                New activity logged (call, note, email, meeting)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#8226;</span>
                Project status changes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#8226;</span>
                New project created
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#8226;</span>
                Manual health report generation
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
