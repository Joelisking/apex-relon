'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Linkedin,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { contactsApi } from '@/lib/api/contacts-client';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import type { Contact } from '@/lib/types';

interface CustomerContactsListProps {
  clientId: string;
  canEdit: boolean;
}

function contactInitials(contact: Contact): string {
  return `${contact.firstName[0] ?? ''}${contact.lastName[0] ?? ''}`.toUpperCase();
}

export function CustomerContactsList({ clientId, canEdit }: CustomerContactsListProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', 'client', clientId],
    queryFn: () => contactsApi.getByClient(clientId),
    staleTime: 2 * 60 * 1000,
  });

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts', 'client', clientId] });
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingContact(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await contactsApi.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['contacts', 'client', clientId] });
      toast.success('Contact deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete contact');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading contacts...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="h-7 text-xs px-2.5 gap-1 ml-auto">
              <Plus className="h-3 w-3" />
              Add Contact
            </Button>
          )}
        </div>

        {/* Empty state */}
        {contacts.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
            <User className="h-7 w-7 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/50">No contacts yet.</p>
            {canEdit && (
              <p className="text-xs text-muted-foreground/40 mt-0.5">
                Add the first contact using the button above.
              </p>
            )}
          </div>
        )}

        {/* Contact cards */}
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between rounded-xl border border-border/50 px-3.5 py-3 bg-card hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                {/* Avatar initials */}
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
                  {contactInitials(contact)}
                </div>

                <div className="min-w-0 space-y-0.5">
                  {/* Name + badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">
                      {contact.firstName} {contact.lastName}
                    </span>
                    {contact.isPrimary && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Primary
                      </span>
                    )}
                    {contact.isDecisionMaker && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Decision Maker
                      </span>
                    )}
                  </div>

                  {/* Job title + department */}
                  {(contact.jobTitle || contact.department) && (
                    <p className="text-xs text-muted-foreground">
                      {[contact.jobTitle, contact.department]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}

                  {/* Email + phone */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Mail className="h-3 w-3 shrink-0" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Phone className="h-3 w-3 shrink-0" />
                        {contact.phone}
                      </a>
                    )}
                    {contact.linkedInUrl && (
                      <a
                        href={contact.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Linkedin className="h-3.5 w-3.5 shrink-0" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flex items-center gap-0.5 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(contact)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(contact)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit dialog */}
      <ContactDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        clientId={clientId}
        contact={editingContact}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>
                {deleteTarget?.firstName} {deleteTarget?.lastName}
              </strong>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
