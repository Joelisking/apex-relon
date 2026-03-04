'use client';

import { Plus, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNumericInput } from './use-numeric-input';
import type { Product } from '@/lib/types';
import type { LineItemRow } from './quote-editor-types';

interface QuoteLineItemsTableProps {
  lineItems: LineItemRow[];
  currency: string;
  products: Product[];
  onChange: (items: LineItemRow[]) => void;
}

export default function QuoteLineItemsTable({
  lineItems,
  currency,
  products,
  onChange,
}: QuoteLineItemsTableProps) {
  const { getRaw, setRaw, clearRaw, parseRaw } = useNumericInput();

  const updateItem = (
    index: number,
    field: keyof LineItemRow,
    value: string | number | boolean,
  ) => {
    const updated = [...lineItems];
    (updated[index] as unknown as Record<string, string | number | boolean>)[field] = value;
    onChange(updated);
  };

  const addItem = () => {
    onChange([
      ...lineItems,
      { description: '', quantity: 1, unitPrice: 0, taxable: true, sortOrder: lineItems.length },
    ]);
  };

  const removeItem = (index: number) => {
    if (lineItems.length <= 1) return;
    onChange(lineItems.filter((_, i) => i !== index));
  };

  const addFromProduct = (product: Product) => {
    onChange([
      ...lineItems,
      {
        description: product.name + (product.description ? ` - ${product.description}` : ''),
        quantity: 1,
        unitPrice: product.defaultPrice,
        taxable: true,
        sortOrder: lineItems.length,
      },
    ]);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(n);

  const activeProducts = products.filter((p) => p.isActive);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
          Line Items
        </p>
        <div className="flex gap-2">
          {activeProducts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <DollarSign className="mr-1 h-3 w-3" />
                  From Product
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {activeProducts.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => addFromProduct(p)}>
                    {p.name}
                    {p.defaultPrice > 0 && (
                      <span className="ml-auto text-muted-foreground text-xs">
                        {fmt(p.defaultPrice)}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addItem}>
            <Plus className="mr-1 h-3 w-3" />
            Add Line
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="bg-muted/40 grid grid-cols-[1fr_60px_110px_90px_32px] gap-0 px-3 py-2">
          {['Description', 'Qty', 'Unit Price', 'Total', ''].map((h, i) => (
            <span
              key={i}
              className={`text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 ${
                i === 1 ? 'text-center' : i >= 2 ? 'text-right' : ''
              }`}>
              {h}
            </span>
          ))}
        </div>
        <div className="divide-y divide-border/40">
          {lineItems.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_60px_110px_90px_32px] gap-0 px-3 py-2 items-center">
              <Input
                value={item.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                placeholder="Description"
                className="h-8 text-sm border-0 shadow-none focus-visible:ring-0 px-0"
              />
              <Input
                type="text"
                inputMode="decimal"
                value={getRaw(`${i}-qty`, item.quantity)}
                onChange={(e) => setRaw(`${i}-qty`, e.target.value)}
                onBlur={() => {
                  const num = parseRaw(`${i}-qty`);
                  updateItem(i, 'quantity', isNaN(num) ? 1 : num);
                  clearRaw(`${i}-qty`);
                }}
                className="h-8 text-sm text-center border-0 shadow-none focus-visible:ring-0 px-1"
              />
              <Input
                type="text"
                inputMode="decimal"
                value={getRaw(`${i}-price`, item.unitPrice)}
                onChange={(e) => setRaw(`${i}-price`, e.target.value)}
                onBlur={() => {
                  const num = parseRaw(`${i}-price`);
                  updateItem(i, 'unitPrice', isNaN(num) ? 0 : num);
                  clearRaw(`${i}-price`);
                }}
                className="h-8 text-sm text-right border-0 shadow-none focus-visible:ring-0 px-1"
              />
              <p className="text-sm text-right tabular-nums pr-1 text-muted-foreground">
                {fmt(item.quantity * item.unitPrice)}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeItem(i)}
                disabled={lineItems.length <= 1}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
