'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { projectsApi } from '@/lib/api/projects-client';
import { useAuth } from '@/contexts/auth-context';
import {
  Building2,
  FolderKanban,
  Users,
  LayoutDashboard,
  Settings,
  FileText,
  Clock,
  BarChart3,
  UserCog,
  Shield,
  ShieldCheck,
  GitBranch,
  Bot,
  Zap,
  CalendarDays,
  Layers,
  Wrench,
  ListChecks,
  Briefcase,
  DollarSign,
  MapPin,
  ClipboardList,
  ScrollText,
  History,
  Monitor,
  SlidersHorizontal,
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

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: undefined },
  { label: 'Customers', href: '/clients', icon: Building2, permission: 'clients:view' },
  { label: 'Prospective Projects', href: '/leads', icon: Users, permission: 'leads:view' },
  { label: 'Projects', href: '/projects', icon: FolderKanban, permission: 'projects:view' },
  { label: 'Invoicing', href: '/invoicing', icon: FileText, permission: 'quotes:view' },
  { label: 'Cost Breakdown', href: '/cost-breakdown', icon: FileText, permission: 'quotes:view' },
  { label: 'Time Tracking', href: '/time-tracking', icon: Clock, permission: 'time_tracking:view' },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays, permission: undefined },
  { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports:view' },
  { label: 'Settings', href: '/settings', icon: Settings, permission: undefined },
];

const ALL_ADMIN_ITEMS = [
  // People & Access
  { label: 'Admin — Users', href: '/admin/users', icon: UserCog, permission: 'users:view' },
  { label: 'Admin — Teams', href: '/admin/teams', icon: Users, permission: 'users:view' },
  { label: 'Admin — Roles', href: '/admin/roles', icon: ShieldCheck, permission: 'roles:view' },
  { label: 'Admin — Permissions', href: '/admin/permissions', icon: Shield, permission: 'permissions:view' },
  // Project Configuration
  { label: 'Admin — Divisions', href: '/admin/job-types', icon: Layers, permission: 'settings:manage' },
  { label: 'Admin — Job Types', href: '/admin/job-types', icon: Briefcase, permission: 'settings:manage' },
  { label: 'Admin — Service Items', href: '/admin/service-items', icon: Wrench, permission: 'settings:manage' },
  { label: 'Admin — Task Types', href: '/admin/task-types', icon: ListChecks, permission: 'settings:manage' },
  { label: 'Admin — Work Codes', href: '/admin/work-codes', icon: ClipboardList, permission: 'settings:manage' },
  // Financial Configuration
  { label: 'Admin — Pay Grades', href: '/admin/pay-grades', icon: Layers, permission: 'settings:manage' },
  { label: 'Admin — Pay Rates', href: '/admin/pay-rates', icon: DollarSign, permission: 'settings:manage' },
  { label: 'Admin — INDOT Pay Zones', href: '/admin/indot-pay-zones', icon: MapPin, permission: 'settings:manage' },
  { label: 'Admin — Invoicing Settings', href: '/admin/quote-settings', icon: FileText, permission: 'settings:manage' },
  // Pipeline & Automation
  { label: 'Admin — Pipeline', href: '/admin/pipeline', icon: GitBranch, permission: 'pipeline:manage' },
  { label: 'Admin — Workflows', href: '/admin/workflows', icon: Zap, permission: 'workflows:view' },
  // Proposals & Documents
  { label: 'Admin — Proposal Templates', href: '/admin/proposal-templates', icon: ScrollText, permission: 'settings:manage' },
  { label: 'Admin — Intake Forms', href: '/admin/lead-forms', icon: FileText, permission: 'settings:manage' },
  // Settings
  { label: 'Admin — General Settings', href: '/admin/general-settings', icon: Settings, permission: 'settings:manage' },
  { label: 'Admin — AI Settings', href: '/admin/ai-settings', icon: Bot, permission: 'ai_settings:view' },
  // System
  { label: 'Admin — Custom Fields', href: '/admin/custom-fields', icon: SlidersHorizontal, permission: 'settings:manage' },
  { label: 'Admin — Form Options', href: '/admin/dropdown-options', icon: ListChecks, permission: 'settings:manage' },
  { label: 'Admin — Audit Logs', href: '/admin/audit-logs', icon: History, permission: 'settings:manage' },
  { label: 'Admin — System', href: '/admin/system', icon: Monitor, permission: 'settings:manage' },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const router = useRouter();
  const { hasPermission } = useAuth();

  const NAV_ITEMS = ALL_NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  const ADMIN_ITEMS = ALL_ADMIN_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

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
    enabled: hasPermission('clients:view'),
  });

  const { data: rawLeads = [] } = useQuery<AnyRecord[]>({
    queryKey: ['leads'],
    queryFn: () => api.leads.getAll(),
    staleTime: 60 * 1000,
    enabled: hasPermission('leads:view'),
  });

  const { data: rawProjects = [] } = useQuery<AnyRecord[]>({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    staleTime: 60 * 1000,
    enabled: hasPermission('projects:view'),
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
    label: l.projectName || l.contactName || l.company || 'Unnamed Lead',
    subtitle: l.company,
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

  const filteredAdmin = ADMIN_ITEMS.filter((n) =>
    !q || n.label.toLowerCase().includes(q),
  );

  const hasResults =
    filteredNav.length > 0 ||
    filteredAdmin.length > 0 ||
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

            {filteredAdmin.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Admin">
                  {filteredAdmin.map((item) => (
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
              </>
            )}

            {filteredClients.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Customers">
                  {filteredClients.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`client-${item.id}`}
                      onSelect={() => navigate(`/clients/${item.id}`)}
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
                      onSelect={() => navigate(`/leads/${item.id}`)}
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
                      onSelect={() => navigate(`/projects/${item.id}`)}
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
