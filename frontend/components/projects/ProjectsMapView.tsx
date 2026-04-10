'use client';

import { useState, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl, type MarkerEvent } from 'react-map-gl/mapbox';
import { useRouter } from 'next/navigation';
import { MapPin, AlertCircle, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/api/projects-client';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

type MapStyle = 'streets' | 'satellite';

const MAP_STYLES: Record<MapStyle, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

// Fort Wayne, IN — default center when no projects are located
const DEFAULT_CENTER = { longitude: -85.1394, latitude: 41.0793, zoom: 10 };

const STATUS_COLORS: Record<string, string> = {
  'Completed': '#22c55e',
  'On Hold': '#f59e0b',
  'Cancelled': '#ef4444',
  'Closed': '#6b7280',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#3b82f6';
}

interface ProjectsMapViewProps {
  projects: Project[];
}

const ALL_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

export function ProjectsMapView({ projects }: ProjectsMapViewProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    () => new Set(['Planning', 'Active', 'On Hold']),
  );

  const toggleStatus = useCallback((status: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const filteredProjects = useMemo(
    () => projects.filter((p) => activeStatuses.has(p.status)),
    [projects, activeStatuses],
  );

  const located = useMemo(
    () => filteredProjects.filter((p) => p.latitude != null && p.longitude != null),
    [filteredProjects],
  );
  const unlocated = filteredProjects.length - located.length;

  const selectedProject = located.find((p) => p.id === selectedId) ?? null;

  const toggleStyle = useCallback(() => {
    setMapStyle((s) => (s === 'streets' ? 'satellite' : 'streets'));
  }, []);

  const initialViewState = useMemo(() => {
    if (located.length === 0) return DEFAULT_CENTER;
    if (located.length === 1) {
      return {
        longitude: located[0].longitude as number,
        latitude: located[0].latitude as number,
        zoom: 13,
      };
    }
    const lngs = located.map((p) => p.longitude as number);
    const lats = located.map((p) => p.latitude as number);
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    return { longitude: midLng, latitude: midLat, zoom: 9 };
  }, [located]);

  return (
    <div className="flex flex-col gap-3">
      {/* Status filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Filter:</span>
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => toggleStatus(status)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              activeStatuses.has(status)
                ? 'border-transparent text-white'
                : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
            )}
            style={activeStatuses.has(status) ? { backgroundColor: getStatusColor(status) } : undefined}
          >
            {status}
            {activeStatuses.has(status) && (
              <span className="text-[10px] opacity-80 ml-0.5">
                ({projects.filter((p) => p.status === status).length})
              </span>
            )}
          </button>
        ))}
        {activeStatuses.size < ALL_STATUSES.length && (
          <button
            onClick={() => setActiveStatuses(new Set(ALL_STATUSES))}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Show all
          </button>
        )}
      </div>

      {unlocated > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {unlocated} project{unlocated !== 1 ? 's have' : ' has'} no location set and{' '}
            {unlocated !== 1 ? 'are' : 'is'} not shown on the map.
          </span>
        </div>
      )}

      <div className="relative h-[calc(100vh-280px)] min-h-[480px] w-full overflow-hidden rounded-xl border border-border">
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={initialViewState}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLES[mapStyle]}
          onClick={() => setSelectedId(null)}
        >
          <NavigationControl position="top-right" />
          <ScaleControl position="bottom-left" />

          {located.map((project) => (
            <Marker
              key={project.id}
              longitude={project.longitude as number}
              latitude={project.latitude as number}
              anchor="bottom"
              onClick={(e: MarkerEvent<MouseEvent>) => {
                e.originalEvent?.stopPropagation();
                setSelectedId(project.id === selectedId ? null : project.id);
              }}
            >
              <div
                className={cn(
                  'flex flex-col items-center cursor-pointer transition-transform',
                  selectedId === project.id ? 'scale-125' : 'hover:scale-110',
                )}
              >
                <div
                  className="rounded-full p-1.5 shadow-md ring-2 ring-white"
                  style={{ backgroundColor: getStatusColor(project.status) }}
                >
                  <MapPin className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            </Marker>
          ))}

          {selectedProject && (
            <Popup
              longitude={selectedProject.longitude as number}
              latitude={selectedProject.latitude as number}
              anchor="bottom"
              offset={28}
              closeButton={false}
              onClose={() => setSelectedId(null)}
              className="z-20"
            >
              <div className="min-w-[200px] space-y-1.5 p-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight">{selectedProject.name}</p>
                  <button
                    className="ml-1 mt-0.5 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => setSelectedId(null)}
                  >
                    ×
                  </button>
                </div>
                {selectedProject.client && (
                  <p className="text-xs text-muted-foreground">{selectedProject.client.name}</p>
                )}
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: getStatusColor(selectedProject.status) }}
                  />
                  <span className="text-xs">{selectedProject.status}</span>
                  {selectedProject.jobNumber && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      #{selectedProject.jobNumber}
                    </span>
                  )}
                </div>
                {selectedProject.address && (
                  <p className="text-xs text-muted-foreground leading-snug">
                    {selectedProject.address}
                  </p>
                )}
                <button
                  className="mt-1 w-full rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  onClick={() => router.push(`/projects/${selectedProject.id}`)}
                >
                  View Project →
                </button>
              </div>
            </Popup>
          )}
        </Map>

        {/* Style toggle */}
        <button
          onClick={toggleStyle}
          className="absolute bottom-8 right-2 z-10 flex items-center gap-1.5 rounded-md border border-border bg-background/90 px-2.5 py-1.5 text-xs font-medium shadow-md backdrop-blur-sm transition-colors hover:bg-background"
        >
          <Layers className="h-3.5 w-3.5" />
          {mapStyle === 'satellite' ? 'Streets' : 'Satellite'}
        </button>

        {/* Legend */}
        <div className="absolute bottom-8 left-2 z-10 flex flex-col gap-1 rounded-md border border-border bg-background/90 px-2.5 py-2 shadow-md backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
            Status
          </p>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground">{status}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-muted-foreground">Active</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {located.length} of {projects.length} project{projects.length !== 1 ? 's' : ''} on map.
      </p>
    </div>
  );
}
