'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Square, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimeEntryDialog } from './TimeEntryDialog';

const TIMER_KEY = 'apex_active_timer';

interface TimerState {
  startedAt: number;
  projectId?: string;
  description?: string;
}

interface TimerWidgetProps {
  onSaved: () => void;
}

export function TimerWidget({ onSaved }: TimerWidgetProps) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [elapsedHours, setElapsedHours] = useState(0);

  // Restore timer from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_KEY);
    if (saved) {
      const t: TimerState = JSON.parse(saved);
      setTimer(t);
      setElapsed(Math.floor((Date.now() - t.startedAt) / 1000));
    }
  }, []);

  // Tick
  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timer.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const start = useCallback(() => {
    const state: TimerState = { startedAt: Date.now() };
    localStorage.setItem(TIMER_KEY, JSON.stringify(state));
    setTimer(state);
    setElapsed(0);
  }, []);

  const stop = useCallback(() => {
    if (!timer) return;
    const hours = Math.max(0.25, parseFloat((elapsed / 3600).toFixed(2)));
    setElapsedHours(hours);
    localStorage.removeItem(TIMER_KEY);
    setTimer(null);
    setElapsed(0);
    setSaveDialogOpen(true);
  }, [timer, elapsed]);

  const discard = useCallback(() => {
    localStorage.removeItem(TIMER_KEY);
    setTimer(null);
    setElapsed(0);
  }, []);

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <>
      {timer ? (
        <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-md px-2 py-1">
          <Timer className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
          <span className="font-mono text-sm text-orange-700">{formatElapsed(elapsed)}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={stop}>
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={discard}>
            ✕
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={start} className="gap-1.5">
          <Play className="h-3.5 w-3.5" />
          Start Timer
        </Button>
      )}

      <TimeEntryDialog
        open={saveDialogOpen}
        initialHours={elapsedHours}
        onOpenChange={setSaveDialogOpen}
        onSaved={() => {
          setSaveDialogOpen(false);
          onSaved();
        }}
      />
    </>
  );
}
