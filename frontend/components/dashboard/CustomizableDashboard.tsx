'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  LayoutDashboard,
  Settings2,
  X,
  Plus,
  GripVertical,
  GripHorizontal,
  RotateCcw,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useDashboardLayout } from '@/lib/hooks/use-dashboard-layout';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import type { DashboardMetrics } from '@/lib/api/dashboard';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import { WIDGET_PERMISSION_MAP, METRIC_PERMISSION_MAP } from '@/lib/types/dashboard-layout';
import {
  MetricCardWidget,
  AreaChartWidget,
  BarChartWidget,
  FunnelChartWidget,
  TaskListWidget,
  LeadsListWidget,
  AIPanelWidget,
} from './widgets';
import { WidgetConfigPanel } from './WidgetConfigPanel';
import { AddWidgetDialog } from './AddWidgetDialog';
import EnhancedDashboard from './EnhancedDashboard';


const PERIOD_LABELS = { week: 'Week', month: 'Month', quarter: 'Quarter' } as const;

// ---------------------------------------------------------------------------
// Permission-gating helper
// ---------------------------------------------------------------------------
function canShowWidget(
  widget: WidgetConfig,
  hasPermission: (p: string) => boolean,
): boolean {
  const basePerms = WIDGET_PERMISSION_MAP[widget.type] ?? [];
  if (!basePerms.every((p) => hasPermission(p))) return false;

  // For metric-driven widgets, also check the per-metric permission
  const metric = widget.config?.metric as string | undefined;
  if (metric) {
    const metricPerms = METRIC_PERMISSION_MAP[metric] ?? [];
    if (!metricPerms.every((p) => hasPermission(p))) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Row-fill helper
// Expands the last widget in each 12-column row to fill remaining space,
// so permission-filtered layouts never leave awkward empty gaps.
// ---------------------------------------------------------------------------
function computeEffectiveWidths(widgets: WidgetConfig[]): Map<string, number> {
  const result = new Map<string, number>();
  let col = 0;

  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i];
    const ww = Math.min(w.size.w, 12);

    // Wrap to next row if this widget overflows
    if (col > 0 && col + ww > 12) col = 0;

    const next = widgets[i + 1];
    const nextWw = next ? Math.min(next.size.w, 12) : 0;
    const remaining = 12 - col - ww;
    const nextFits = next != null && col + ww + nextWw <= 12;

    if (!nextFits && remaining > 0) {
      // Last widget in this row — expand to fill
      result.set(w.id, ww + remaining);
      col = 0;
    } else {
      result.set(w.id, ww);
      col += ww;
      if (col >= 12) col = 0;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Resize handle
// ---------------------------------------------------------------------------
function ResizeHandle({
  widgetId,
  currentW,
  onResize,
}: {
  widgetId: string;
  currentW: number;
  onResize: (id: string, w: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const startW = useRef<number>(currentW);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    startW.current = currentW;

    const onMove = (ev: PointerEvent) => {
      const grid = document.querySelector('[data-widget-grid]') as HTMLElement;
      if (!grid) return;
      const colWidth = grid.offsetWidth / 12;
      const colDelta = Math.round((ev.clientX - startX.current) / colWidth);
      onResize(widgetId, Math.max(3, Math.min(12, startW.current + colDelta)));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize z-10 flex items-center justify-center group"
      title="Drag to resize">
      <div className="w-0.5 h-10 rounded-full bg-border/30 group-hover:bg-primary/50 group-hover:w-1 transition-all" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable widget wrapper
// ---------------------------------------------------------------------------
function SortableWidget({
  widget,
  metrics,
  isEditMode,
  inMetricBar,
  onConfigure,
  onResize,
  period,
  index = 0,
  effectiveW,
}: {
  widget: WidgetConfig;
  metrics: DashboardMetrics | undefined;
  isEditMode: boolean;
  inMetricBar?: boolean;
  onConfigure: (widget: WidgetConfig) => void;
  onResize?: (id: string, w: number) => void;
  period: 'week' | 'month' | 'quarter';
  index?: number;
  effectiveW?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditMode });

  const colSpan = effectiveW ?? Math.min(widget.size.w, 12);
  const dynamicStyle = inMetricBar
    ? { transform: CSS.Transform.toString(transform), transition }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${widget.size.h}`,
      };

  const renderContent = () => {
    switch (widget.type) {
      case 'MetricCard':
        return <MetricCardWidget widget={widget} metrics={metrics} isEditMode={isEditMode} />;
      case 'AreaChart':
        return <AreaChartWidget widget={widget} metrics={metrics} period={period} />;
      case 'BarChart':
        return <BarChartWidget widget={widget} metrics={metrics} />;
      case 'FunnelChart':
        return <FunnelChartWidget widget={widget} metrics={metrics} />;
      case 'TaskList':
        return <TaskListWidget widget={widget} />;
      case 'LeadsList':
        return <LeadsListWidget widget={widget} />;
      case 'AIPanel':
        return <AIPanelWidget widget={widget} period={period} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...dynamicStyle,
        animationDelay: `${index * 35}ms`,
      }}
      className={cn(
        'dash-widget-enter relative rounded-xl border border-border bg-card overflow-hidden',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]',
        'transition-[box-shadow,transform] duration-200 ease-out',
        !isDragging && !isEditMode && 'hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_8px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5',
        !inMetricBar && 'min-h-20',
        isDragging && 'opacity-40 scale-[1.02] shadow-2xl ring-2 ring-primary/40 z-50',
        isEditMode && !isDragging && 'ring-1 ring-inset ring-primary/15',
      )}>

      {/* Edit mode chrome */}
      {isEditMode && (
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex items-center text-muted-foreground hover:text-muted-foreground transition-colors select-none">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <span className="flex-1 text-center text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium pointer-events-none">
            {widget.type.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <button
            onClick={() => onConfigure(widget)}
            className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <Settings2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {renderContent()}

      {isEditMode && !inMetricBar && onResize && (
        <ResizeHandle
          widgetId={widget.id}
          currentW={widget.size.w}
          onResize={onResize}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget grid
// ---------------------------------------------------------------------------
function CustomWidgetGrid({
  widgets,
  metrics,
  isEditMode,
  onConfigure,
  onResize,
  period,
  sensors,
  onDragEnd,
}: {
  widgets: WidgetConfig[];
  metrics: DashboardMetrics | undefined;
  isEditMode: boolean;
  onConfigure: (w: WidgetConfig) => void;
  onResize?: (id: string, w: number) => void;
  period: 'week' | 'month' | 'quarter';
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
}) {
  const metricCards = widgets.filter((w) => w.type === 'MetricCard');
  const otherWidgets = widgets.filter((w) => w.type !== 'MetricCard');
  const effectiveWidths = computeEffectiveWidths(otherWidgets);

  const metricGridCols =
    metricCards.length === 1
      ? 'grid-cols-1'
      : metricCards.length === 2
        ? 'grid-cols-2'
        : metricCards.length === 3
          ? 'grid-cols-2 sm:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-4';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}>
      <div className="space-y-4">
        {/* Metric cards — individual cards row */}
        {metricCards.length > 0 && (
          <SortableContext
            items={metricCards.map((w) => w.id)}
            strategy={rectSortingStrategy}>
            <div className={cn('grid gap-4 auto-rows-[116px]', metricGridCols)}>
              {metricCards.map((widget, i) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  metrics={metrics}
                  isEditMode={isEditMode}
                  inMetricBar={true}
                  onConfigure={onConfigure}
                  period={period}
                  index={i}
                />
              ))}
            </div>
          </SortableContext>
        )}

        {/* Other widgets — 12-column grid */}
        {otherWidgets.length > 0 && (
          <SortableContext
            items={otherWidgets.map((w) => w.id)}
            strategy={rectSortingStrategy}>
            <div data-widget-grid className="grid grid-cols-12 gap-3 sm:gap-4 auto-rows-[160px] sm:auto-rows-[180px]">
              {otherWidgets.map((widget, i) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  metrics={metrics}
                  isEditMode={isEditMode}
                  onConfigure={onConfigure}
                  onResize={onResize}
                  period={period}
                  index={metricCards.length + i}
                  effectiveW={isEditMode ? undefined : effectiveWidths.get(widget.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
  initialPeriod?: 'week' | 'month' | 'quarter';
}

export default function CustomizableDashboard({ initialPeriod = 'month' }: Props) {
  const { user, hasPermission } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [configuringWidget, setConfiguringWidget] = useState<WidgetConfig | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>(initialPeriod);

  // Draggable toolbar
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ left: number; top: number } | null>(null);
  const toolbarDrag = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  // Reset toolbar position when exiting edit mode
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isEditMode) setToolbarPos(null);
  }, [isEditMode]);

  const handleToolbarDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = toolbarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    toolbarDrag.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };

    const onMove = (ev: PointerEvent) => {
      if (!toolbarDrag.current || !toolbarRef.current) return;
      const { width, height } = toolbarRef.current.getBoundingClientRect();
      const dx = ev.clientX - toolbarDrag.current.startX;
      const dy = ev.clientY - toolbarDrag.current.startY;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, toolbarDrag.current.startLeft + dx));
      const top = Math.max(8, Math.min(window.innerHeight - height - 8, toolbarDrag.current.startTop + dy));
      setToolbarPos({ left, top });
    };

    const onUp = () => {
      toolbarDrag.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const {
    widgets: allWidgets,
    isLoading,
    hasUnsavedChanges,
    isSaving,
    saveLayout,
    updateWidgets,
    addWidget,
    removeWidget,
    updateWidgetConfig,
    resetToDefaults,
  } = useDashboardLayout();

  // Filter out widgets the current user doesn't have permission to see
  const widgets = allWidgets.filter((w) => canShowWidget(w, hasPermission));

  // Use the same key format as EnhancedDashboard (['dashboard-metrics', period, ''])
  // so the already-fetched metrics are served from cache when the widget grid mounts.
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics', period, ''],
    queryFn: () => dashboardApi.getMetrics(period),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = widgets.findIndex((w) => w.id === active.id);
        const newIndex = widgets.findIndex((w) => w.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          updateWidgets(arrayMove(widgets, oldIndex, newIndex));
        }
      }
    },
    [widgets, updateWidgets],
  );

  const handleConfigure = useCallback((widget: WidgetConfig) => {
    setConfiguringWidget(widget);
  }, []);

  const handleResize = useCallback(
    (widgetId: string, newW: number) => {
      updateWidgets(
        widgets.map((w) =>
          w.id === widgetId ? { ...w, size: { ...w.size, w: newW } } : w,
        ),
      );
    },
    [widgets, updateWidgets],
  );

  const handleDiscard = () => {
    localStorage.removeItem('dashboard-layout-draft');
    setIsEditMode(false);
    window.location.reload();
  };

  const handleSaveAndExit = () => {
    saveLayout();
    setIsEditMode(false);
  };

  const WIDGET_ANIMATIONS = `
    @keyframes dashWidgetIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0);   }
    }
    .dash-widget-enter {
      animation: dashWidgetIn 0.32s ease both;
    }
    @keyframes editToolbarIn {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to   { opacity: 1; transform: translate(-50%, 0);    }
    }
    .edit-toolbar-enter {
      animation: editToolbarIn 0.22s ease both;
    }
    @media (max-width: 639px) {
      [data-widget-grid] {
        grid-template-columns: 1fr !important;
        auto-rows: auto !important;
      }
      [data-widget-grid] > * {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
      }
    }
  `;

  // ------------------------------------------------------------------
  // View mode
  // ------------------------------------------------------------------
  if (!isEditMode) {
    return (
      <>
        <style>{WIDGET_ANIMATIONS}</style>
        <div className="space-y-5">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Period selector — pill tabs */}
            <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-muted/50 border border-border/40">
              {(Object.keys(PERIOD_LABELS) as Array<keyof typeof PERIOD_LABELS>).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                    period === p
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved layout
                </span>
              )}
              <button
                onClick={() => setIsEditMode(true)}
                disabled={isLoading}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full',
                  'text-xs font-medium text-muted-foreground',
                  'border border-border/50 hover:border-border',
                  'hover:bg-muted/40 hover:text-foreground',
                  'transition-all duration-150',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}>
                <LayoutDashboard className="h-3.5 w-3.5" />
                Customize
              </button>
            </div>
          </div>

          {/* Dashboard content */}
          {widgets.length > 0 && !isLoading ? (
            <CustomWidgetGrid
              widgets={widgets}
              metrics={metrics}
              isEditMode={false}
              onConfigure={handleConfigure}
              period={period}
              sensors={sensors}
              onDragEnd={handleDragEnd}
            />
          ) : (
            <EnhancedDashboard initialPeriod={period} />
          )}
        </div>
      </>
    );
  }

  // ------------------------------------------------------------------
  // Edit mode
  // ------------------------------------------------------------------
  return (
    <>
      <style>{WIDGET_ANIMATIONS}</style>

      <div className="pb-24">
        {/* Edit mode context hint */}
        <div className="flex items-center flex-wrap gap-3 mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/[0.07] border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary/80">Editing layout</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Drag to reorder · Drag edges to resize · Click ⚙ to configure
          </span>
          {hasUnsavedChanges && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-52 text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading layout…
          </div>
        ) : (
          <CustomWidgetGrid
            widgets={widgets}
            metrics={metrics}
            isEditMode={true}
            onConfigure={handleConfigure}
            onResize={handleResize}
            period={period}
            sensors={sensors}
            onDragEnd={handleDragEnd}
          />
        )}
      </div>

      {/* Floating bottom toolbar — draggable */}
      <div
        ref={toolbarRef}
        className="edit-toolbar-enter z-50 flex items-center gap-1 px-2 py-1.5 rounded-full border border-border/60 bg-background/95 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]"
        style={
          toolbarPos
            ? { position: 'fixed', left: toolbarPos.left, top: toolbarPos.top }
            : { position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)' }
        }>
        {/* Drag handle */}
        <div
          onPointerDown={handleToolbarDragStart}
          className="flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors select-none"
          title="Drag to move">
          <GripHorizontal className="h-3.5 w-3.5" />
        </div>

        <div className="w-px h-4 bg-border/50 mx-0.5" />

        <button
          onClick={() => user?.role && resetToDefaults(user.role)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>

        <div className="w-px h-4 bg-border/50 mx-0.5" />

        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
          <Plus className="h-3 w-3" />
          Add Widget
        </button>

        <div className="w-px h-4 bg-border/50 mx-0.5" />

        <button
          onClick={handleDiscard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
          <X className="h-3 w-3" />
          Discard
        </button>

        <button
          onClick={handleSaveAndExit}
          disabled={isSaving}
          className={cn(
            'inline-flex items-center gap-1.5 ml-1 px-4 py-1.5 rounded-full text-xs font-medium transition-all',
            'bg-foreground text-background hover:bg-foreground/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}>
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Save Layout
        </button>
      </div>

      <WidgetConfigPanel
        widget={configuringWidget}
        onClose={() => setConfiguringWidget(null)}
        onUpdate={updateWidgetConfig}
        onRemove={removeWidget}
        hasPermission={hasPermission}
      />

      <AddWidgetDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={addWidget}
        existingCount={widgets.length}
        hasPermission={hasPermission}
      />
    </>
  );
}
