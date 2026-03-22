'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { ProjectCard, DraggableProjectCard } from './ProjectCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Project } from '@/lib/api/projects-client';
import type { PipelineStage } from '@/lib/api/pipeline-client';

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

// Fallback hex for known status labels when no color class is available
const STATUS_HEX: Record<string, string> = {
  Planning: '#3b82f6',
  Active: '#22c55e',
  'On Hold': '#f59e0b',
  Completed: '#9ca3af',
  Cancelled: '#ef4444',
};

function columnHex(color: string | undefined, label: string): string {
  if (color && BG_TO_HEX[color]) return BG_TO_HEX[color];
  return STATUS_HEX[label] ?? '#6b7280';
}

interface ProjectKanbanBoardProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onStatusChange: (projectId: string, newStatus: string) => void;
  stages: PipelineStage[];
  stagesLoading?: boolean;
}

// Droppable column wrapper
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

export function ProjectKanbanBoard({
  projects,
  onProjectClick,
  onStatusChange,
  stages,
  stagesLoading,
}: ProjectKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  if (stagesLoading) {
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-[1200px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-96 rounded-xl border bg-muted/20 p-3 space-y-3">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
              <div className="space-y-2 pt-1">
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  const columns = stages.map((s) => ({
    key: s.name,
    label: s.name,
    color: s.color,
    probability: s.probability,
  }));

  const grouped = columns.map((col) => ({
    ...col,
    projects: projects.filter((p) => p.status === col.key),
  }));

  const activeProject = activeId
    ? projects.find((p) => p.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id as string;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;

    onStatusChange(projectId, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-[1200px]">
          {grouped.map((column) => {
            const hexColor = columnHex(
              column.color,
              column.label,
            );
            const colProjects = column.projects;
            const totalContracted = colProjects.reduce(
              (acc, p) => acc + p.contractedValue,
              0,
            );

            return (
              <div
                key={column.key}
                className="flex-1 min-w-96 rounded-xl border border-border/50 bg-muted/20 overflow-hidden flex flex-col"
                style={{
                  borderTopColor: hexColor,
                  borderTopWidth: '2px',
                }}>
                {/* Column header */}
                <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/40 bg-card">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: hexColor }}
                    />
                    <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
                      {column.label}
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground/60 bg-muted/60 px-2 py-0.5 rounded-full border border-border/40 tabular-nums">
                    {colProjects.length}
                  </span>
                </div>

                {/* Value strip */}
                <div className="px-3.5 py-2 border-b border-border/30 bg-card/60">
                  <p className="text-xs text-muted-foreground">
                    Contracted{' '}
                    <span className="font-semibold text-foreground tabular-nums">
                      ${totalContracted.toLocaleString()}
                    </span>
                  </p>
                </div>

                {/* Droppable zone */}
                <DroppableColumn id={column.key}>
                  <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                    {colProjects.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/50 text-center py-8">
                        No projects
                      </p>
                    ) : (
                      colProjects.map((project) => (
                        <DraggableProjectCard
                          key={project.id}
                          project={project}
                          onClick={() => onProjectClick(project)}
                          isDragging={activeId === project.id}
                          stageProbability={column.probability}
                        />
                      ))
                    )}
                  </div>
                </DroppableColumn>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeProject ? (
          <div className="opacity-90 cursor-grabbing rotate-1 scale-[1.02]">
            <ProjectCard
              project={activeProject}
              stageProbability={
                columns.find((c) => c.key === activeProject.status)
                  ?.probability
              }
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
