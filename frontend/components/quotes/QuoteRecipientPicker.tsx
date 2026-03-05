'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Lead, Client, Project } from '@/lib/types';
import type { QuoteFormState } from './quote-editor-types';

const LABEL_CLASS =
  'text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/50';

interface QuoteRecipientPickerProps {
  form: QuoteFormState;
  leads: Lead[];
  clients: Client[];
  projects: Project[];
  onChange: (form: QuoteFormState) => void;
}

export default function QuoteRecipientPicker({
  form,
  leads,
  clients,
  projects,
  onChange,
}: QuoteRecipientPickerProps) {
  const [leadOpen, setLeadOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  const selectedLead = leads.find((l) => l.id === form.leadId);
  const selectedClient = clients.find((c) => c.id === form.clientId);
  const selectedProject = projects.find((p) => p.id === form.projectId);

  const filteredLeads = leads.filter(
    (l) =>
      l.contactName.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.company.toLowerCase().includes(leadSearch.toLowerCase()),
  );

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(clientSearch.toLowerCase()),
  );

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.client?.name || '').toLowerCase().includes(projectSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
        Link to Lead, Client, or Project
      </p>
      <div className="grid grid-cols-3 gap-3">
        {/* Lead picker */}
        <div>
          <label className={LABEL_CLASS}>Lead</label>
          <Popover open={leadOpen} onOpenChange={setLeadOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={leadOpen}
                className="w-full justify-between mt-1 h-9 text-sm font-normal"
                disabled={!!form.clientId || !!form.projectId}>
                {selectedLead ? (
                  <Badge
                    variant="secondary"
                    className="text-xs font-normal max-w-[120px] truncate">
                    {selectedLead.company}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Select lead...</span>
                )}
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search leads..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">
                    No leads found
                  </p>
                ) : (
                  filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        onChange({ ...form, leadId: lead.id, clientId: '', projectId: '' });
                        setLeadOpen(false);
                      }}>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          form.leadId === lead.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{lead.company}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.contactName}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              {form.leadId && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => {
                      onChange({ ...form, leadId: '' });
                      setLeadOpen(false);
                    }}>
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Client picker */}
        <div>
          <label className={LABEL_CLASS}>Client</label>
          <Popover open={clientOpen} onOpenChange={setClientOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clientOpen}
                className="w-full justify-between mt-1 h-9 text-sm font-normal"
                disabled={!!form.leadId || !!form.projectId}>
                {selectedClient ? (
                  <Badge
                    variant="secondary"
                    className="text-xs font-normal max-w-[120px] truncate">
                    {selectedClient.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Select client...</span>
                )}
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">
                    No clients found
                  </p>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        onChange({ ...form, clientId: client.id, leadId: '', projectId: '' });
                        setClientOpen(false);
                      }}>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          form.clientId === client.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {client.segment}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              {form.clientId && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => {
                      onChange({ ...form, clientId: '' });
                      setClientOpen(false);
                    }}>
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Project picker */}
        <div>
          <label className={LABEL_CLASS}>Project</label>
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={projectOpen}
                className="w-full justify-between mt-1 h-9 text-sm font-normal"
                disabled={!!form.leadId}>
                {selectedProject ? (
                  <Badge
                    variant="secondary"
                    className="text-xs font-normal max-w-[120px] truncate">
                    {selectedProject.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Select project...</span>
                )}
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">
                    No projects found
                  </p>
                ) : (
                  filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        onChange({
                          ...form,
                          projectId: project.id,
                          clientId: project.clientId || '',
                          leadId: '',
                        });
                        setProjectOpen(false);
                      }}>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          form.projectId === project.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        {project.client?.name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {project.client.name}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
              {form.projectId && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => {
                      onChange({ ...form, projectId: '', clientId: '' });
                      setProjectOpen(false);
                    }}>
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
