'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { quotesApi, productsApi, quoteSettingsApi } from '@/lib/api/quotes-client';
import { leadsApi, clientsApi } from '@/lib/api/client';
import type { Quote, Lead, Client, Product, QuoteSettings } from '@/lib/types';
import type { QuoteFormState, LineItemRow } from './quote-editor-types';
import QuoteEditorForm from './QuoteEditorForm';
import QuotePDFPreview from './QuotePDFPreview';

interface QuoteEditorProps {
  quoteId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
};

const DEFAULT_FORM: QuoteFormState = {
  leadId: '',
  clientId: '',
  validUntil: '',
  notes: '',
  termsAndConditions: '',
  taxRate: 0,
  discount: 0,
  currency: 'USD',
};

const DEFAULT_LINE_ITEM: LineItemRow = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxable: true,
  sortOrder: 0,
};

export default function QuoteEditor({ quoteId }: QuoteEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [settings, setSettings] = useState<QuoteSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [existingQuote, setExistingQuote] = useState<Quote | null>(null);
  const [form, setForm] = useState<QuoteFormState>(DEFAULT_FORM);
  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { ...DEFAULT_LINE_ITEM },
  ]);

  const initFromSettings = useCallback(
    (s: QuoteSettings) => {
      setForm((prev) => ({
        ...prev,
        taxRate: s.defaultTaxRate,
        currency: s.defaultCurrency || 'USD',
        notes: s.defaultNotes || '',
        termsAndConditions: s.defaultTerms || '',
      }));
    },
    [],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fetchedSettings, fetchedProducts, fetchedLeads, fetchedClients] =
          await Promise.all([
            quoteSettingsApi.get(),
            productsApi.getAll(),
            leadsApi.getAll(),
            clientsApi.getAll(),
          ]);
        setSettings(fetchedSettings);
        setProducts(fetchedProducts);
        setLeads(fetchedLeads);
        setClients(fetchedClients);

        if (quoteId) {
          const quote = await quotesApi.getById(quoteId);
          setExistingQuote(quote);
          setForm({
            leadId: quote.leadId || '',
            clientId: quote.clientId || '',
            validUntil: quote.validUntil ? quote.validUntil.split('T')[0] : '',
            notes: quote.notes || '',
            termsAndConditions: quote.termsAndConditions || '',
            taxRate: quote.taxRate,
            discount: quote.discount,
            currency: quote.currency,
          });
          setLineItems(
            quote.lineItems.map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              taxable: li.taxable,
              sortOrder: li.sortOrder,
            })),
          );
        } else {
          initFromSettings(fetchedSettings);
          const prefilledLeadId = searchParams.get('leadId');
          if (prefilledLeadId) {
            setForm((prev) => ({ ...prev, leadId: prefilledLeadId }));
          }
        }
      } catch (err) {
        console.error('Failed to load quote editor data', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [quoteId, initFromSettings, searchParams]);

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        leadId: form.leadId || undefined,
        clientId: form.clientId || undefined,
        validUntil: form.validUntil || undefined,
        lineItems: lineItems
          .filter((li) => li.description.trim())
          .map((li, i) => ({ ...li, sortOrder: i })),
      };

      if (quoteId && existingQuote) {
        const updated = await quotesApi.update(quoteId, payload);
        setExistingQuote(updated);
      } else {
        const created = await quotesApi.create(payload);
        router.replace(`/quotes/${created.id}/edit`);
      }
      return true;
    } catch (err) {
      console.error('Failed to save quote', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quoteId) return;
    setIsDownloading(true);
    try {
      const isDraftOrNew = !existingQuote || existingQuote.status === 'DRAFT';
      if (isDraftOrNew) {
        const saved = await handleSave();
        if (!saved) {
          setIsDownloading(false);
          return;
        }
      }
      const blob = await quotesApi.downloadPdf(quoteId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const quoteNumber = existingQuote
        ? String(existingQuote.quoteNumber).padStart(4, '0')
        : quoteId;
      a.href = url;
      a.download = `quote-${quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const quoteTitle = existingQuote
    ? `Quote Q-${String(existingQuote.quoteNumber).padStart(4, '0')}`
    : 'New Quote';

  const selectedLead = leads.find((l) => l.id === form.leadId) ?? null;
  const selectedClient = clients.find((c) => c.id === form.clientId) ?? null;

  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: 'calc(100vh - 48px)' }}>
      {/* Top bar */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 border-b border-border/60 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/quotes')}
            className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Quotes
          </Button>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-sm font-semibold">{quoteTitle}</span>
          {existingQuote && (
            <Badge
              className={`text-[10px] font-medium ${
                STATUS_COLORS[existingQuote.status] || 'bg-slate-100 text-slate-700'
              }`}>
              {existingQuote.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={saving || isDownloading || !quoteId}>
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left: form */}
        <div className="print:hidden w-[45%] overflow-y-auto p-6 border-r border-border/60">
          <QuoteEditorForm
            form={form}
            lineItems={lineItems}
            settings={settings}
            products={products}
            leads={leads}
            clients={clients}
            onChange={setForm}
            onLineItemsChange={setLineItems}
          />
        </div>

        {/* Right: preview */}
        <div className="flex-1 overflow-hidden bg-muted/20 print:overflow-visible print:w-full">
          <QuotePDFPreview
            form={form}
            lineItems={lineItems}
            settings={settings}
            quoteNumber={existingQuote?.quoteNumber}
            leadName={selectedLead?.contactName}
            leadCompany={selectedLead?.company}
            clientName={selectedClient?.name}
          />
        </div>
      </div>
    </div>
  );
}
