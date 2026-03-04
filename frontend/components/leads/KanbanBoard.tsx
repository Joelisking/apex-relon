'use client';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core';
import type { Lead } from '@/lib/types';
import { DEFAULT_PIPELINE_STAGES } from './constants';
import { LeadCardContent, DraggableLeadCard } from './LeadCard';

// Maps Tailwind bg-color class → hex for inline styles (avoids Tailwind purging dynamic classes)
const BG_TO_HEX: Record<string, string> = {
  'bg-gray-400': '#9ca3af',
  'bg-gray-500': '#6b7280',
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-orange-500': '#f97316',
  'bg-green-500': '#22c55e',
  'bg-red-500': '#ef4444',
  'bg-yellow-500': '#eab308',
  'bg-teal-500': '#14b8a6',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
};

function stageHex(color: string): string {
  return BG_TO_HEX[color] ?? '#6b7280';
}

interface StageConfig {
  name: string;
  color: string;
  lightColor: string;
  border: string;
  probability?: number;
}

interface KanbanBoardProps {
  leads: Lead[];
  mounted: boolean;
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  activeDragId: string | null;
  activeLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  stages?: StageConfig[];
}

// Droppable Column Component
function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
}

export function KanbanBoard({
  leads,
  mounted,
  sensors,
  handleDragStart,
  handleDragEnd,
  handleDragCancel,
  activeDragId,
  activeLead,
  setSelectedLead,
  stages,
}: KanbanBoardProps) {
  const pipelineStages = stages || DEFAULT_PIPELINE_STAGES;

  const renderColumn = (
    stage: StageConfig,
    stageLeads: Lead[],
    cardSlot: React.ReactNode,
  ) => {
    const hexColor = stageHex(stage.color);
    const isWon = stage.name === 'Won';
    const probability = stage.probability ?? 0;
    const stageExpectedValue = stageLeads.reduce(
      (acc, l) => acc + (l.expectedValue || 0),
      0,
    );
    const stagePipelineValue = stageLeads.reduce(
      (acc, l) => acc + ((l.expectedValue || 0) * probability) / 100,
      0,
    );
    const stageContractedValue = stageLeads.reduce(
      (acc, l) => acc + (l.contractedValue ?? l.expectedValue ?? 0),
      0,
    );

    return (
      <div
        key={stage.name}
        className="flex-1 min-w-96 rounded-xl border border-border/50 bg-muted/20 overflow-hidden flex flex-col"
        style={{ borderTopColor: hexColor, borderTopWidth: '2px' }}>
        {/* Column header */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/40 bg-card">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: hexColor }}
            />
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
              {stage.name}
            </h3>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-full border border-border/40 tabular-nums">
            {stageLeads.length}
          </span>
        </div>

        {/* Stage value strip */}
        <div className="px-3.5 py-2 border-b border-border/30 bg-card/60">
          {isWon ? (
            <p className="text-xs text-muted-foreground">
              Contracted{' '}
              <span className="font-semibold text-foreground tabular-nums">
                ${stageContractedValue.toLocaleString()}
              </span>
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Expected{' '}
                <span className="text-foreground font-medium tabular-nums">
                  ${stageExpectedValue.toLocaleString()}
                </span>
              </p>
              {probability > 0 && (
                <p className="text-xs text-muted-foreground ml-auto">
                  Pipeline{' '}
                  <span className="text-foreground font-semibold tabular-nums">
                    ${Math.round(stagePipelineValue).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    ({probability}%)
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Cards zone */}
        {cardSlot}
      </div>
    );
  };

  if (!mounted) {
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-[1200px]">
          {pipelineStages.map((stage) => {
            const stageLeads = leads.filter(
              (lead) => lead.stage === stage.name,
            );
            return renderColumn(
              stage,
              stageLeads,
              <div className="p-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No prospective projects
                  </p>
                ) : (
                  stageLeads.map((lead) => (
                    <LeadCardContent key={lead.id} lead={lead} />
                  ))
                )}
              </div>,
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-[1200px]">
          {pipelineStages.map((stage) => {
            const stageLeads = leads.filter(
              (lead) => lead.stage === stage.name,
            );
            return renderColumn(
              stage,
              stageLeads,
              <DroppableColumn id={stage.name}>
                <div className="p-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No prospective projects
                    </p>
                  ) : (
                    stageLeads.map((lead) => (
                      <DraggableLeadCard
                        key={lead.id}
                        lead={lead}
                        onSelect={setSelectedLead}
                        isDragging={activeDragId === lead.id}
                      />
                    ))
                  )}
                </div>
              </DroppableColumn>,
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeLead ? (
          <div className="opacity-90 cursor-grabbing rotate-1 scale-[1.02]">
            <LeadCardContent lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
