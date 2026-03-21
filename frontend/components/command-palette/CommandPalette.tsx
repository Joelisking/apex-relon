'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { projectsApi } from '@/lib/api/projects-client';
import {
  Building2,
  FolderKanban,
  Users,
  LayoutDashboard,
  Settings,
  FileText,
  Clock,
  BarChart3,
} from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Badge } from '@/components/ui/badge';

interface SearchableItem {
  id: string;
  label: string;
  subtitle?: string;
  type: 'client' | 'lead' | 'project';
  badge?: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/clients', icon: Building2 },
  { label: 'Prospective Projects', href: '/leads', icon: Users },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Quotes', href: '/quotes', icon: FileText },
  { label: 'Time Tracking', href: '/time-tracking', icon: Clock },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyRecord = any;

  const { data: rawClients = [] } = useQuery<AnyRecord[]>({
    queryKey: ['clients'],
    queryFn: () => api.clients.getAll(),
    staleTime: 60 * 1000,
  });

  const { data: rawLeads = [] } = useQuery<AnyRecord[]>({
    queryKey: ['leads'],
    queryFn: () => api.leads.getAll(),
    staleTime: 60 * 1000,
  });

  const { data: rawProjects = [] } = useQuery<AnyRecord[]>({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    staleTime: 60 * 1000,
  });

  const clients: SearchableItem[] = rawClients.map(
    (c: AnyRecord) => ({
      id: c.id ?? '',
      label: c.name || c.contactName || 'Unnamed Client',
      subtitle: c.industry || c.segment,
      type: 'client',
      badge: c.status,
    }),
  );

  const leads: SearchableItem[] = rawLeads.map((l: AnyRecord) => ({
    id: l.id ?? '',
    label: l.contactName || l.name || l.company || 'Unnamed Lead',
    subtitle: l.company || l.stage,
    type: 'lead',
    badge: l.stage,
  }));

  const projects: SearchableItem[] = rawProjects.map(
    (p: AnyRecord) => ({
      id: p.id ?? '',
      label: p.name || 'Unnamed Project',
      subtitle: p.client?.name,
      type: 'project',
      badge: p.status,
    }),
  );

  const q = query.toLowerCase().trim();

  const filteredClients = q
    ? clients.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.subtitle?.toLowerCase().includes(q),
      )
    : clients.slice(0, 5);

  const filteredLeads = q
    ? leads.filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          l.subtitle?.toLowerCase().includes(q) ||
          l.badge?.toLowerCase().includes(q),
      )
    : leads.slice(0, 5);

  const filteredProjects = q
    ? projects.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.subtitle?.toLowerCase().includes(q) ||
          p.badge?.toLowerCase().includes(q),
      )
    : projects.slice(0, 5);

  const filteredNav = q
    ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q))
    : NAV_ITEMS;

  const hasResults =
    filteredNav.length > 0 ||
    filteredClients.length > 0 ||
    filteredLeads.length > 0 ||
    filteredProjects.length > 0;

  function navigate(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <VisuallyHidden>
          <DialogTitle>Search</DialogTitle>
        </VisuallyHidden>
        {/* shouldFilter=false disables cmdk's built-in fuzzy filter so only our filter runs */}
        <Command
          shouldFilter={false}
          className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 **:[[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Search clients, projects, leads, pages..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!hasResults && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {filteredNav.length > 0 && (
              <CommandGroup heading="Navigation">
                {filteredNav.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.href}
                    onSelect={() => navigate(item.href)}
                    className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredClients.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Customers">
                  {filteredClients.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`client-${item.id}`}
                      onSelect={() => navigate('/clients')}
                      className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">
                        {item.label}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate max-w-32">
                          {item.subtitle}
                        </span>
                      )}
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {filteredLeads.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Prospective Projects">
                  {filteredLeads.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`lead-${item.id}`}
                      onSelect={() => navigate('/leads')}
                      className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">
                        {item.label}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate max-w-32">
                          {item.subtitle}
                        </span>
                      )}
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {filteredProjects.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Projects">
                  {filteredProjects.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`project-${item.id}`}
                      onSelect={() => navigate('/projects')}
                      className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">
                        {item.label}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate max-w-32">
                          {item.subtitle}
                        </span>
                      )}
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
