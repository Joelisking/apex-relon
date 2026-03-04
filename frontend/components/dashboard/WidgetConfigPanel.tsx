'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import { AVAILABLE_METRICS } from '@/lib/types/dashboard-layout';

interface Props {
  widget: WidgetConfig | null;
  onClose: () => void;
  onUpdate: (
    widgetId: string,
    config: Partial<WidgetConfig['config']>,
  ) => void;
  onRemove: (widgetId: string) => void;
}

export function WidgetConfigPanel({
  widget,
  onClose,
  onUpdate,
  onRemove,
}: Props) {
  const [title, setTitle] = useState(() => widget?.config.title || '');
  const [metric, setMetric] = useState(() => (widget?.config.metric as string) || '');
  const [dateRange, setDateRange] = useState(() => (widget?.config.dateRange as string) || 'month');

  const handleSave = () => {
    if (widget) {
      onUpdate(widget.id, { title, metric, dateRange });
      onClose();
    }
  };

  const showMetricSelect =
    widget?.type &&
    ['MetricCard', 'AreaChart', 'BarChart'].includes(widget.type);

  return (
    <Sheet
      key={widget?.id}
      open={!!widget}
      onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-80">
        <SheetHeader>
          <SheetTitle>Configure Widget</SheetTitle>
          <SheetDescription>
            {widget?.type} — adjust settings below
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Widget title"
              className="h-8 text-sm"
            />
          </div>
          {showMetricSelect && (
            <div className="space-y-1.5">
              <Label className="text-xs">Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_METRICS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              className="flex-1 h-8 text-sm">
              Save
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-8 text-sm">
              Cancel
            </Button>
          </div>
          <div className="border-t border-border/40 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive h-8 text-sm"
              onClick={() => {
                if (widget) {
                  onRemove(widget.id);
                  onClose();
                }
              }}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Remove Widget
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
