'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DynamicFieldsSectionProps {
  fields: string[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

export default function DynamicFieldsSection({
  fields,
  values,
  onChange,
}: DynamicFieldsSectionProps) {
  if (fields.length === 0) return null;

  return (
    <div className="px-6 py-5 border-b border-border/40 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Custom Fields
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {fields.map((name) => (
          <div key={name}>
            <Label className="text-[10px] text-muted-foreground block mb-1">{name}</Label>
            <Input
              value={values[name] ?? ''}
              onChange={(e) => onChange(name, e.target.value)}
              className="text-sm h-8"
              placeholder={`[${name}]`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
