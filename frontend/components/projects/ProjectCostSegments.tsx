'use client';

import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface CostSegmentInput {
  name: string;
  amount: number;
  sortOrder: number;
}

interface ProjectCostSegmentsProps {
  value: CostSegmentInput[];
  onChange: (segments: CostSegmentInput[]) => void;
  contractedValue: number;
  onUseSegmentTotal: (total: number) => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function ProjectCostSegments({
  value,
  onChange,
  contractedValue,
  onUseSegmentTotal,
}: ProjectCostSegmentsProps) {
  const segmentTotal = value.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const hasDiscrepancy =
    value.length > 0 && Math.abs(segmentTotal - contractedValue) > 0.005;

  function addSegment() {
    onChange([...value, { name: '', amount: 0, sortOrder: value.length }]);
  }

  function removeSegment(index: number) {
    onChange(
      value
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, sortOrder: i })),
    );
  }

  function updateName(index: number, name: string) {
    onChange(value.map((s, i) => (i === index ? { ...s, name } : s)));
  }

  function updateAmount(index: number, raw: string) {
    const amount = raw === '' ? 0 : Number(raw);
    onChange(value.map((s, i) => (i === index ? { ...s, amount } : s)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Cost Breakdown</span>
        <Button type="button" variant="outline" size="sm" onClick={addSegment}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Segment
        </Button>
      </div>

      {value.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  Service / Segment
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-36">
                  Amount
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {value.map((segment, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5">
                    <Input
                      value={segment.name}
                      onChange={(e) => updateName(i, e.target.value)}
                      placeholder="e.g. Boundary Surveying"
                      className="h-8 border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={segment.amount === 0 ? '' : segment.amount}
                      onChange={(e) => updateAmount(i, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.00"
                      className="h-8 text-right border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent"
                    />
                  </td>
                  <td className="px-2">
                    <button
                      type="button"
                      onClick={() => removeSegment(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td className="px-3 py-2 text-sm font-medium">Segment Total</td>
                <td className="px-3 py-2 text-sm font-medium text-right">
                  {fmt(segmentTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {hasDiscrepancy && (
        <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-3 py-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Segment total ({fmt(segmentTotal)}) doesn&apos;t match contracted value (
              {fmt(contractedValue)})
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-3 shrink-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            onClick={() => onUseSegmentTotal(segmentTotal)}>
            Use segment total
          </Button>
        </div>
      )}
    </div>
  );
}
