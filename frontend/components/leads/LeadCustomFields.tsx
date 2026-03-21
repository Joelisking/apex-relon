'use client';

import { useState, useMemo } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { customFieldsApi } from '@/lib/api/custom-fields-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  leadId: string;
}

export function LeadCustomFields({ leadId }: Props) {
  const queryClient = useQueryClient();
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});

  const { data: definitions = [] } = useQuery({
    queryKey: ['custom-field-definitions', 'LEAD'],
    queryFn: () => customFieldsApi.getDefinitions('LEAD'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: values } = useQuery({
    queryKey: ['custom-field-values', 'LEAD', leadId],
    queryFn: () => customFieldsApi.getValues('LEAD', leadId),
    staleTime: 2 * 60 * 1000,
    enabled: definitions.length > 0,
  });

  const customValues = useMemo(() => {
    const base: Record<string, string> = {};
    if (values) {
      Object.values(values).forEach((v) => {
        base[v.definitionId] = v.value != null ? String(v.value) : '';
      });
    }
    return { ...base, ...localEdits };
  }, [values, localEdits]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const fields = definitions.map((def) => {
        const raw = customValues[def.id] ?? '';
        let value: string | number | boolean | string[] | null = raw || null;
        if (def.fieldType === 'NUMBER') {
          const n = parseFloat(raw);
          value = raw !== '' && !isNaN(n) ? n : null;
        } else if (def.fieldType === 'BOOLEAN') {
          value = raw === 'true';
        } else if (def.fieldType === 'MULTI_SELECT') {
          value = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : null;
        }
        return { definitionId: def.id, value };
      });
      return customFieldsApi.setValues('LEAD', leadId, fields);
    },
    onSuccess: () => {
      toast.success('Custom fields saved');
      setLocalEdits({});
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', 'LEAD', leadId] });
    },
    onError: () => toast.error('Failed to save custom fields'),
  });

  const activeDefinitions = definitions.filter((d) => d.isActive);
  if (activeDefinitions.length === 0) return null;

  return (
    <section className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5" /> Custom Fields
      </h3>
      <div className="space-y-3">
        {activeDefinitions.map((def) => {
          const currentVal = customValues[def.id] ?? '';
          return (
            <div key={def.id} className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground/80">
                {def.label}
                {def.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              {def.fieldType === 'TEXT' && (
                <Input
                  value={currentVal}
                  onChange={(e) => setLocalEdits((p) => ({ ...p, [def.id]: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder={def.label}
                />
              )}
              {def.fieldType === 'NUMBER' && (
                <Input
                  type="number"
                  value={currentVal}
                  onChange={(e) => setLocalEdits((p) => ({ ...p, [def.id]: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder="0"
                />
              )}
              {def.fieldType === 'DATE' && (
                <DatePicker
                  value={currentVal}
                  onChange={(v) => setLocalEdits((p) => ({ ...p, [def.id]: v }))}
                  className="h-8 text-sm"
                />
              )}
              {def.fieldType === 'SELECT' && (
                <Select
                  value={currentVal || '__none__'}
                  onValueChange={(v) =>
                    setLocalEdits((p) => ({ ...p, [def.id]: v === '__none__' ? '' : v }))
                  }>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {(def.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {def.fieldType === 'BOOLEAN' && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`cf-lead-${def.id}`}
                    checked={currentVal === 'true'}
                    onCheckedChange={(checked) =>
                      setLocalEdits((p) => ({ ...p, [def.id]: checked ? 'true' : 'false' }))
                    }
                  />
                  <label
                    htmlFor={`cf-lead-${def.id}`}
                    className="text-sm text-muted-foreground cursor-pointer">
                    {def.label}
                  </label>
                </div>
              )}
              {def.fieldType === 'MULTI_SELECT' && (
                <div className="flex flex-wrap gap-1.5">
                  {(def.options ?? []).map((opt) => {
                    const selected = currentVal
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const current = currentVal
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          const next = selected
                            ? current.filter((v) => v !== opt)
                            : [...current, opt];
                          setLocalEdits((p) => ({ ...p, [def.id]: next.join(',') }));
                        }}
                        className={cn(
                          'text-xs px-2 py-1 rounded border transition-colors',
                          selected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border hover:border-primary/50',
                        )}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
              {def.fieldType === 'URL' && (
                <Input
                  type="url"
                  value={currentVal}
                  onChange={(e) => setLocalEdits((p) => ({ ...p, [def.id]: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder="https://"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-7 text-xs px-3 gap-1.5">
          {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Save Custom Fields
        </Button>
      </div>
    </section>
  );
}
