'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Link2,
  Mail,
  Phone,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { contactsApi } from '@/lib/api/contacts-client';
import type { Contact } from '@/lib/types';

interface LeadContactsSectionProps {
  leadId: string;
  clientId: string | null | undefined;
  canEdit: boolean;
}

function contactInitials(contact: Contact): string {
  return `${contact.firstName[0] ?? ''}${contact.lastName[0] ?? ''}`.toUpperCase();
}

function ContactCompactCard({
  contact,
  onUnlink,
  canEdit,
  unlinking,
}: {
  contact: Contact;
  onUnlink: () => void;
  canEdit: boolean;
  unlinking: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 bg-muted/10 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
          {contactInitials(contact)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug truncate">
            {contact.firstName} {contact.lastName}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {contact.jobTitle && (
              <span className="truncate">{contact.jobTitle}</span>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-0.5 hover:text-foreground transition-colors shrink-0">
                <Mail className="h-3 w-3" />
                {contact.email}
              </a>
            )}
          </div>
        </div>
      </div>
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0 ml-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onUnlink}
          disabled={unlinking}>
          {unlinking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}

export function LeadContactsSection({
  leadId,
  clientId,
  canEdit,
}: LeadContactsSectionProps) {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [linkingIds, setLinkingIds] = useState<Set<string>>(new Set());

  // Contacts already linked to this lead
  const { data: linkedContacts = [], isLoading: loadingLinked } = useQuery({
    queryKey: ['contacts', 'lead', leadId],
    queryFn: () => contactsApi.getByLead(leadId),
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000,
  });

  // All contacts for the parent client (used in the picker)
  const { data: clientContacts = [], isLoading: loadingClient } = useQuery({
    queryKey: ['contacts', 'client', clientId],
    queryFn: () => contactsApi.getByClient(clientId!),
    enabled: !!clientId && pickerOpen,
    staleTime: 2 * 60 * 1000,
  });

  const linkedIds = new Set(linkedContacts.map((c) => c.id));

  const handleUnlink = async (contactId: string) => {
    setUnlinkingId(contactId);
    try {
      await contactsApi.unlinkFromLead(leadId, contactId);
      queryClient.invalidateQueries({ queryKey: ['contacts', 'lead', leadId] });
      toast.success('Contact unlinked');
    } catch {
      toast.error('Failed to unlink contact');
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleToggleLink = async (contact: Contact) => {
    const isLinked = linkedIds.has(contact.id);
    setLinkingIds((prev) => new Set(prev).add(contact.id));
    try {
      if (isLinked) {
        await contactsApi.unlinkFromLead(leadId, contact.id);
        toast.success('Contact unlinked');
      } else {
        await contactsApi.linkToLead(leadId, contact.id);
        toast.success('Contact linked');
      }
      queryClient.invalidateQueries({ queryKey: ['contacts', 'lead', leadId] });
    } catch {
      toast.error(isLinked ? 'Failed to unlink contact' : 'Failed to link contact');
    } finally {
      setLinkingIds((prev) => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    }
  };

  if (loadingLinked) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading contacts...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold">
            Client Contacts
          </p>
          {canEdit && clientId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground">
              <Link2 className="h-3 w-3" />
              Link
            </Button>
          )}
        </div>

        {/* Linked contacts list */}
        {linkedContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-1">
            No contacts linked.
            {canEdit && clientId && ' Use "Link" to associate contacts.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            {linkedContacts.map((contact) => (
              <ContactCompactCard
                key={contact.id}
                contact={contact}
                canEdit={canEdit}
                unlinking={unlinkingId === contact.id}
                onUnlink={() => handleUnlink(contact.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Link picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Client Contacts</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-1">
            {loadingClient ? (
              <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading contacts...
              </div>
            ) : clientContacts.length === 0 ? (
              <div className="py-8 text-center">
                <User className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No contacts on the parent client.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add contacts from the client record first.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {clientContacts.map((contact) => {
                  const isLinked = linkedIds.has(contact.id);
                  const isUpdating = linkingIds.has(contact.id);

                  return (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => !isUpdating && handleToggleLink(contact)}>
                      <Checkbox
                        checked={isLinked}
                        disabled={isUpdating}
                        className="shrink-0"
                      />
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold text-muted-foreground">
                        {contactInitials(contact)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none mb-0.5">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {contact.jobTitle && <span>{contact.jobTitle}</span>}
                          {contact.email && (
                            <span className="flex items-center gap-0.5">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      {isUpdating && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
