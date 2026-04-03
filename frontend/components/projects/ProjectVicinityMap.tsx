'use client';

import { useState, useCallback } from 'react';
import Map, { Marker, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import { MapPin, Layers, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/api/projects-client';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

type MapStyle = 'streets' | 'satellite';

const MAP_STYLES: Record<MapStyle, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

interface ProjectVicinityMapProps {
  project: Project;
  onEdit?: () => void;
  canEdit?: boolean;
}

export function ProjectVicinityMap({ project, onEdit, canEdit }: ProjectVicinityMapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyle>('satellite');

  const hasLocation =
    project.latitude != null &&
    project.longitude != null;

  const toggleStyle = useCallback(() => {
    setMapStyle((s) => (s === 'streets' ? 'satellite' : 'streets'));
  }, []);

  if (!hasLocation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
        <div className="rounded-full bg-muted p-4">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No location set</p>
          <p className="text-xs text-muted-foreground">
            Add a site address or coordinates to this project to see it on the map.
          </p>
        </div>
        {canEdit && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit Project
          </Button>
        )}
      </div>
    );
  }

  const lng = project.longitude as number;
  const lat = project.latitude as number;

  return (
    <div className="space-y-3">
      {project.address && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{project.address}</span>
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Edit
            </button>
          )}
        </div>
      )}

      <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-border">
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: lng,
            latitude: lat,
            zoom: 15,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLES[mapStyle]}
        >
          <NavigationControl position="top-right" />
          <ScaleControl position="bottom-left" />

          <Marker longitude={lng} latitude={lat} anchor="bottom">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-primary p-1.5 shadow-lg ring-2 ring-white">
                <MapPin className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="mt-1 max-w-[160px] truncate rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium shadow backdrop-blur-sm">
                {project.name}
              </div>
            </div>
          </Marker>
        </Map>

        {/* Style toggle */}
        <button
          onClick={toggleStyle}
          className={cn(
            'absolute bottom-8 right-2 z-10 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-md transition-colors',
            mapStyle === 'satellite'
              ? 'border-border bg-background/90 text-foreground backdrop-blur-sm hover:bg-background'
              : 'border-border bg-background/90 text-foreground backdrop-blur-sm hover:bg-background',
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          {mapStyle === 'satellite' ? 'Streets' : 'Satellite'}
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Lat: {lat.toFixed(6)}</span>
        <span>Lng: {lng.toFixed(6)}</span>
      </div>
    </div>
  );
}
