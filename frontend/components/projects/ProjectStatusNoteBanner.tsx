'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { projectsApi, type Project } from '@/lib/api/projects-client';

interface ProjectStatusNoteBannerProps {
  project: Project;
  onNoteUpdated: (updated: Project) => void;
}

export function ProjectStatusNoteBanner({
  project,
  onNoteUpdated,
}: ProjectStatusNoteBannerProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    setIsSavingNote(true);
    try {
      const updated = await projectsApi.update(project.id, {
        statusNote: noteInput.trim(),
      });
      onNoteUpdated(updated);
      setIsAddingNote(false);
      setNoteInput('');
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  if (project.statusNote) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-3 text-amber-900">
        <svg
          className="h-4 w-4 mt-0.5 shrink-0 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-0.5">
            {project.status} — Note
          </p>
          <p className="text-sm leading-snug">{project.statusNote}</p>
        </div>
      </div>
    );
  }

  if (project.status === 'On Hold') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-3 text-amber-900">
        <svg
          className="h-4 w-4 mt-0.5 shrink-0 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
            On Hold — No reason given
          </p>
          {isAddingNote ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNote();
                  if (e.key === 'Escape') {
                    setIsAddingNote(false);
                    setNoteInput('');
                  }
                }}
                placeholder="Why is this project on hold?"
                className="flex-1 text-sm bg-white border border-amber-300 rounded px-2 py-1 text-amber-900 placeholder:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteInput.trim()}
                className="text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50">
                {isSavingNote ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsAddingNote(false);
                  setNoteInput('');
                }}
                className="text-xs text-amber-500 hover:text-amber-700">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingNote(true)}
              className="text-sm text-amber-700 underline underline-offset-2 hover:text-amber-900">
              Add a reason
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
