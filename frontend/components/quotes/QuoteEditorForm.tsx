'use client';

import { X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useNumericInput } from './use-numeric-input';
import QuoteRecipientPicker from './QuoteRecipientPicker';
import QuoteLineItemsTable from './QuoteLineItemsTable';
import type { Lead, Client, Product, QuoteSettings } from '@/lib/types';
import type { QuoteFormState, LineItemRow } from './quote-editor-types';

const LABEL_CLASS =
  'text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/50';

interface QuoteEditorFormProps {
  form: QuoteFormState;
  lineItems: LineItemRow[];
  settings: QuoteSettings | null;
  products: Product[];
  leads: Lead[];
  clients: Client[];
  onChange: (form: QuoteFormState) => void;
  onLineItemsChange: (items: LineItemRow[]) => void;
}

export default function QuoteEditorForm({
  form,
  lineItems,
  settings,
  products,
  leads,
  clients,
  onChange,
  onLineItemsChange,
}: QuoteEditorFormProps) {
  const { rawValues, getRaw, setRaw, clearRaw, parseRaw } = useNumericInput();

  return (
    <div className="space-y-6">
      <QuoteRecipientPicker
        form={form}
        leads={leads}
        clients={clients}
        onChange={onChange}
      />

      {/* Valid Until */}
      <div>
        <label className={LABEL_CLASS}>Valid Until</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal mt-1 h-9 text-sm',
                !form.validUntil && 'text-muted-foreground',
              )}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {form.validUntil
                ? format(new Date(form.validUntil + 'T00:00:00'), 'd MMM yyyy')
                : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={
                form.validUntil ? new Date(form.validUntil + 'T00:00:00') : undefined
              }
              onSelect={(date) =>
                onChange({ ...form, validUntil: date ? format(date, 'yyyy-MM-dd') : '' })
              }
              initialFocus
            />
            {form.validUntil && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => onChange({ ...form, validUntil: '' })}>
                  <X className="mr-1 h-3 w-3" />
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Tax Rate + Discount */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Tax Rate (%)</label>
          <Input
            type="text"
            inputMode="decimal"
            value={getRaw('taxRate', form.taxRate)}
            onChange={(e) => setRaw('taxRate', e.target.value)}
            onBlur={() => {
              const num = parseRaw('taxRate');
              onChange({ ...form, taxRate: isNaN(num) ? 0 : num });
              clearRaw('taxRate');
            }}
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Discount ($)</label>
          <Input
            type="text"
            inputMode="decimal"
            value={getRaw('discount', form.discount)}
            onChange={(e) => setRaw('discount', e.target.value)}
            onBlur={() => {
              const num = parseRaw('discount');
              onChange({ ...form, discount: isNaN(num) ? 0 : num });
              clearRaw('discount');
            }}
            className="mt-1 h-9 text-sm"
          />
        </div>
      </div>

      <QuoteLineItemsTable
        lineItems={lineItems}
        currency={form.currency}
        products={products}
        onChange={onLineItemsChange}
      />

      {/* Notes */}
      <div>
        <label className={LABEL_CLASS}>Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          placeholder={settings?.defaultNotes || 'Optional notes...'}
          className="mt-1 text-sm resize-none"
          rows={3}
        />
      </div>

      {/* Terms & Conditions */}
      <div>
        <label className={LABEL_CLASS}>Terms &amp; Conditions</label>
        <Textarea
          value={form.termsAndConditions}
          onChange={(e) => onChange({ ...form, termsAndConditions: e.target.value })}
          placeholder={settings?.defaultTerms || 'Optional terms...'}
          className="mt-1 text-sm resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}
