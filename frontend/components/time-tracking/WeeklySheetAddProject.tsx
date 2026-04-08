'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';

interface ProjectOption {
  id: string;
  name: string;
  status: string;
  jobNumber?: string | null;
}

interface WeeklySheetAddProjectProps {
  existingProjectIds: Set<string>;
  statusFilter: string;
  onAdd: (project: { id: string; name: string; status: string; jobNumber: string | null }) => void;
}

export function WeeklySheetAddProject({
  existingProjectIds,
  statusFilter,
  onAdd,
}: WeeklySheetAddProjectProps) {
  const [open, setOpen] = useState(false);

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ['projects-for-weekly-sheet'],
    queryFn: async () => {
      const token = getTokenFromClientCookies() ?? '';
      const res = await fetch(`${API_URL}/projects?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return Array.isArray(data) ? data : (data.projects ?? data.data ?? []);
    },
    staleTime: 60_000,
  });

  const available = projects.filter((p) => {
    if (existingProjectIds.has(p.id)) return false;
    if (statusFilter !== 'all' && p.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1 px-2">
          <Plus className="h-3 w-3" />
          Add project
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              {available.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.jobNumber ?? ''}`}
                  onSelect={() => {
                    onAdd({ id: p.id, name: p.name, status: p.status, jobNumber: p.jobNumber ?? null });
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{p.name}</span>
                    {p.jobNumber && (
                      <span className="text-xs text-muted-foreground">{p.jobNumber}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
