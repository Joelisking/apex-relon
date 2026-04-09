import type { ProjectCostSegment } from '@/lib/api/projects-client';

interface ProjectCostSegmentsSectionProps {
  segments: ProjectCostSegment[];
  contractedValue: number;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function ProjectCostSegmentsSection({
  segments,
  contractedValue,
}: ProjectCostSegmentsSectionProps) {
  if (segments.length === 0) return null;

  const segmentTotal = segments.reduce((sum, s) => sum + s.amount, 0);
  const hasDiscrepancy = Math.abs(segmentTotal - contractedValue) > 0.005;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Budget Breakdown
      </h3>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                Segment
              </th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-36">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {segments
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((segment) => (
                <tr key={segment.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-sm">{segment.name}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium">
                    {fmt(segment.amount)}
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20">
              <td className="px-3 py-2 text-sm font-semibold">Total</td>
              <td className="px-3 py-2 text-sm font-semibold text-right">
                {fmt(segmentTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {hasDiscrepancy && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Segment total ({fmt(segmentTotal)}) differs from contracted value ({fmt(contractedValue)}).
        </p>
      )}
    </div>
  );
}
