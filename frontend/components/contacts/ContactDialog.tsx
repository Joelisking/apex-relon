'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { contactsApi } from '@/lib/api/contacts-client';
import type { Contact, CreateContactDto } from '@/lib/types';

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  contact?: Contact | null;
  onSaved: () => void;
}

const EMPTY_FORM: CreateContactDto = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
  department: '',
  linkedInUrl: '',
  isPrimary: false,
  isDecisionMaker: false,
  notes: '',
};

export function ContactDialog({
  open,
  onClose,
  clientId,
  contact,
  onSaved,
}: ContactDialogProps) {
  const [form, setForm] = useState<CreateContactDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});

  const isEditing = !!contact;

  useEffect(() => {
    if (!open) return;
    if (contact) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        jobTitle: contact.jobTitle ?? '',
        department: contact.department ?? '',
        linkedInUrl: contact.linkedInUrl ?? '',
        isPrimary: contact.isPrimary,
        isDecisionMaker: contact.isDecisionMaker,
        notes: contact.notes ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, contact]);

  const validate = (): boolean => {
    const newErrors: { firstName?: string; lastName?: string } = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: CreateContactDto = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        jobTitle: form.jobTitle?.trim() || undefined,
        department: form.department?.trim() || undefined,
        linkedInUrl: form.linkedInUrl?.trim() || undefined,
        isPrimary: form.isPrimary,
        isDecisionMaker: form.isDecisionMaker,
        notes: form.notes?.trim() || undefined,
      };

      if (isEditing && contact) {
        await contactsApi.update(contact.id, payload);
        toast.success('Contact updated');
      } else {
        await contactsApi.create(clientId, payload);
        toast.success('Contact added');
      }

      onSaved();
      onClose();
    } catch {
      toast.error(isEditing ? 'Failed to update contact' : 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Jane"
                className="h-9 text-sm"
                autoFocus
              />
              {errors.firstName && (
                <p className="text-[11px] text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Smith"
                className="h-9 text-sm"
              />
              {errors.lastName && (
                <p className="text-[11px] text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 555 000 0000"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Job Title + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle" className="text-xs">Job Title</Label>
              <Input
                id="jobTitle"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="Director"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-xs">Department</Label>
              <Input
                id="department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Operations"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-1.5">
            <Label htmlFor="linkedInUrl" className="text-xs">LinkedIn URL</Label>
            <Input
              id="linkedInUrl"
              value={form.linkedInUrl}
              onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })}
              placeholder="https://linkedin.com/in/jane-smith"
              className="h-9 text-sm"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPrimary"
                checked={!!form.isPrimary}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isPrimary: !!checked })
                }
              />
              <Label htmlFor="isPrimary" className="text-sm cursor-pointer">
                Primary Contact
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isDecisionMaker"
                checked={!!form.isDecisionMaker}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isDecisionMaker: !!checked })
                }
              />
              <Label htmlFor="isDecisionMaker" className="text-sm cursor-pointer">
                Decision Maker
              </Label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional context..."
              className="resize-none text-sm min-h-[80px]"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
