'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { formsApi } from '@/lib/api/forms-client';
import type { FormFieldDefinition, CreateLeadFormDto } from '@/lib/types';
import type { UserResponse } from '@/lib/api/users-client';

interface PipelineStage {
  id: string;
  name: string;
}

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  users: UserResponse[];
}

const DEFAULT_FIELDS: FormFieldDefinition[] = [
  {
    key: 'contactName',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'John Smith',
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
    placeholder: 'john@company.com',
  },
  {
    key: 'phone',
    label: 'Phone Number',
    type: 'tel',
    required: false,
    placeholder: '+1 234 567 8900',
  },
  {
    key: 'company',
    label: 'Company',
    type: 'text',
    required: false,
    placeholder: 'Acme Inc.',
  },
  {
    key: 'notes',
    label: 'Message',
    type: 'textarea',
    required: false,
    placeholder: 'Tell us about your project...',
  },
];

const FIELD_TYPE_LABELS: Record<FormFieldDefinition['type'], string> = {
  text: 'Text',
  email: 'Email',
  tel: 'Phone',
  textarea: 'Textarea',
  select: 'Select (Dropdown)',
};

function generateKey(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return base || `field_${index}`;
}

export function CreateFormDialog({
  open,
  onOpenChange,
  stages,
  users,
}: CreateFormDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetStage, setTargetStage] = useState('');
  const [assignToUserId, setAssignToUserId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Step 2 state
  const [fields, setFields] = useState<FormFieldDefinition[]>(DEFAULT_FIELDS);

  const resetState = () => {
    setStep(1);
    setName('');
    setDescription('');
    setTargetStage('');
    setAssignToUserId('');
    setIsActive(true);
    setFields(DEFAULT_FIELDS);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleNext = () => {
    if (!name.trim()) {
      toast.error('Form name is required');
      return;
    }
    if (!targetStage) {
      toast.error('Target stage is required');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (fields.length === 0) {
      toast.error('Add at least one field');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateLeadFormDto = {
        name: name.trim(),
        description: description.trim() || undefined,
        fields,
        targetStage,
        assignToUserId: assignToUserId || undefined,
        isActive,
      };
      await formsApi.create(payload);
      toast.success('Form created', {
        description: `"${name}" is ready to use.`,
      });
      queryClient.invalidateQueries({ queryKey: ['lead-forms'] });
      handleClose(false);
    } catch (err) {
      toast.error('Failed to create form', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        key: `field_${prev.length + 1}`,
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    setFields((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateField = (
    index: number,
    updates: Partial<FormFieldDefinition>,
  ) => {
    setFields((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...updates };
      // Auto-generate key from label when label changes and key hasn't been manually set
      if (updates.label !== undefined) {
        merged.key = generateKey(updates.label, index);
      }
      next[index] = merged;
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'New Lead Form' : 'Configure Fields'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Set up the basic details for your web-to-lead capture form.'
              : 'Add and configure the fields your prospects will fill in.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`}
          />
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}
          />
        </div>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Form Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Contact Us, Request a Quote"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <Textarea
                placeholder="Describe what this form is for..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Target Pipeline Stage <span className="text-destructive">*</span>
              </label>
              <Select value={targetStage} onValueChange={setTargetStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Where should submissions land?" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Assign Submissions To{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <Select
                value={assignToUserId || 'unassigned'}
                onValueChange={(v) =>
                  setAssignToUserId(v === 'unassigned' ? '' : v)
                }>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive forms will not accept new submissions
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {fields.map((field, index) => (
              <div
                key={index}
                className="rounded-lg border border-border/60 p-3 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {field.key || `field_${index + 1}`}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => moveField(index, 'up')}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={index === fields.length - 1}
                      onClick={() => moveField(index, 'down')}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => removeField(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Label
                    </label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Type
                    </label>
                    <Select
                      value={field.type}
                      onValueChange={(v) =>
                        updateField(index, {
                          type: v as FormFieldDefinition['type'],
                        })
                      }>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(FIELD_TYPE_LABELS) as Array<
                            [FormFieldDefinition['type'], string]
                          >
                        ).map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>
                            {lbl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Placeholder{' '}
                    <span className="text-muted-foreground/50">(optional)</span>
                  </label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Hint text shown inside the field"
                    value={field.placeholder ?? ''}
                    onChange={(e) =>
                      updateField(index, { placeholder: e.target.value })
                    }
                  />
                </div>

                {field.type === 'select' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Options{' '}
                      <span className="text-muted-foreground/50">
                        (comma-separated)
                      </span>
                    </label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Option A, Option B, Option C"
                      value={(field.options ?? []).join(', ')}
                      onChange={(e) =>
                        updateField(index, {
                          options: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) =>
                      updateField(index, { required: checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">Required</span>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={addField}>
              <Plus className="h-3.5 w-3.5" />
              Add Field
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step === 1 ? handleClose(false) : setStep(1))}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step === 1 ? (
            <Button type="button" onClick={handleNext}>
              Next: Configure Fields
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Form
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
