'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Building2,
  FileSignature,
  Palette,
  Link2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { quoteSettingsApi } from '@/lib/api/quotes-client';
import { toast } from 'sonner';
import type { QuoteSettings } from '@/lib/types';
import ProposalTemplatesSection from './ProposalTemplatesSection';

type Section = 'branding' | 'defaults' | 'display' | 'integrations' | 'templates';

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'branding', label: 'Company Branding', icon: Building2 },
  { id: 'defaults', label: 'Quote Defaults', icon: FileSignature },
  { id: 'display', label: 'Display Options', icon: Palette },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'templates', label: 'Proposal Templates', icon: FileText },
];

const LABEL_CLASS =
  'text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold';

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-border/40 last:border-0">
      <Label className={`${LABEL_CLASS} block mb-1.5`}>{label}</Label>
      {hint && (
        <p className="text-[11px] text-muted-foreground mb-2">{hint}</p>
      )}
      {children}
    </div>
  );
}

export default function AdminQuoteSettingsView() {
  const [activeSection, setActiveSection] = useState<Section>('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<QuoteSettings, 'id'>>({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    logoUrl: '',
    quoteNumberPrefix: 'Q-',
    defaultTaxRate: 0,
    defaultValidityDays: 180,
    defaultCurrency: 'USD',
    defaultNotes: '',
    defaultTerms: '',
    accentColor: '#2563eb',
    showTaxLine: true,
    showDiscountLine: true,
    showSignatureBlock: true,
    enableLeadIntegration: true,
  });

  useEffect(() => {
    quoteSettingsApi
      .get()
      .then((s) => {
        setForm({
          companyName: s.companyName,
          companyAddress: s.companyAddress,
          companyPhone: s.companyPhone,
          companyEmail: s.companyEmail,
          companyWebsite: s.companyWebsite,
          logoUrl: s.logoUrl ?? '',
          quoteNumberPrefix: s.quoteNumberPrefix,
          defaultTaxRate: s.defaultTaxRate,
          defaultValidityDays: s.defaultValidityDays,
          defaultCurrency: s.defaultCurrency,
          defaultNotes: s.defaultNotes,
          defaultTerms: s.defaultTerms,
          accentColor: s.accentColor,
          showTaxLine: s.showTaxLine,
          showDiscountLine: s.showDiscountLine,
          showSignatureBlock: s.showSignatureBlock,
          enableLeadIntegration: s.enableLeadIntegration,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await quoteSettingsApi.update({
        ...form,
        logoUrl: form.logoUrl || undefined,
      });
      toast.success('Quote settings saved');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast.error('Failed to save settings', { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quote Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure company branding and defaults for all quotes
          </p>
        </div>
        {activeSection !== 'templates' && <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Settings
            </>
          )}
        </Button>}
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar nav */}
        <nav className="w-52 shrink-0">
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            {NAV.map((item, i) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i > 0 ? 'border-t border-border/40' : ''
                  } ${
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[13px] font-medium">{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── Company Branding ─────────────────────────────────────── */}
          {activeSection === 'branding' && (
            <>
              <section>
                <SectionLabel>Company Information</SectionLabel>
                <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                  <FieldRow
                    label="Company Name"
                    hint="Appears as the large heading at the top-left of every quote.">
                    <Input
                      value={form.companyName}
                      onChange={(e) => set('companyName', e.target.value)}
                      placeholder="Acme Corp"
                      className="text-sm"
                    />
                  </FieldRow>
                  <FieldRow
                    label="Address"
                    hint="Multi-line address displayed below the company name.">
                    <Textarea
                      value={form.companyAddress}
                      onChange={(e) => set('companyAddress', e.target.value)}
                      placeholder={'123 Main St\nSuite 100\nNew York, NY 10001'}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </FieldRow>
                  <FieldRow label="Phone">
                    <Input
                      value={form.companyPhone}
                      onChange={(e) => set('companyPhone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="text-sm"
                    />
                  </FieldRow>
                  <FieldRow label="Email">
                    <Input
                      type="email"
                      value={form.companyEmail}
                      onChange={(e) => set('companyEmail', e.target.value)}
                      placeholder="quotes@acme.com"
                      className="text-sm"
                    />
                  </FieldRow>
                  <FieldRow label="Website">
                    <Input
                      value={form.companyWebsite}
                      onChange={(e) => set('companyWebsite', e.target.value)}
                      placeholder="https://acme.com"
                      className="text-sm"
                    />
                  </FieldRow>
                  <FieldRow
                    label="Logo URL"
                    hint="Paste a publicly accessible image URL. Leave blank to show the company name as text.">
                    <Input
                      value={form.logoUrl ?? ''}
                      onChange={(e) => set('logoUrl', e.target.value)}
                      placeholder="https://cdn.acme.com/logo.png"
                      className="text-sm"
                    />
                  </FieldRow>
                </div>
              </section>

              <section>
                <SectionLabel>Accent Colour</SectionLabel>
                <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="px-5 py-4">
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Used for the QUOTE heading, divider line, Bill To label, and totals row.
                    </p>
                    <div className="flex items-center gap-4">
                      <div
                        className="h-9 w-9 rounded-md border border-border/60 shrink-0"
                        style={{ backgroundColor: form.accentColor }}
                      />
                      <Input
                        type="color"
                        value={form.accentColor}
                        onChange={(e) => set('accentColor', e.target.value)}
                        className="h-9 w-20 cursor-pointer p-0.5"
                      />
                      <Input
                        value={form.accentColor}
                        onChange={(e) => set('accentColor', e.target.value)}
                        placeholder="#2563eb"
                        className="text-sm font-mono w-32"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ── Quote Defaults ────────────────────────────────────────── */}
          {activeSection === 'defaults' && (
            <section>
              <SectionLabel>Quote Defaults</SectionLabel>
              <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                <FieldRow
                  label="Quote Number Prefix"
                  hint="Prepended to the auto-incrementing quote number (e.g. Q-0001).">
                  <Input
                    value={form.quoteNumberPrefix}
                    onChange={(e) => set('quoteNumberPrefix', e.target.value)}
                    placeholder="Q-"
                    className="text-sm w-32"
                    maxLength={10}
                  />
                </FieldRow>
                <FieldRow label="Default Currency">
                  <Select
                    value={form.defaultCurrency}
                    onValueChange={(v) => set('defaultCurrency', v)}>
                    <SelectTrigger className="text-sm w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow
                  label="Default Tax Rate (%)"
                  hint="Applied to new quotes. Can be overridden per quote.">
                  <Input
                    type="number"
                    value={form.defaultTaxRate}
                    onChange={(e) =>
                      set('defaultTaxRate', Number(e.target.value))
                    }
                    className="text-sm w-24"
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </FieldRow>
                <FieldRow
                  label="Default Validity (days)"
                  hint="How many days a new quote is valid for.">
                  <Input
                    type="number"
                    value={form.defaultValidityDays}
                    onChange={(e) =>
                      set('defaultValidityDays', Number(e.target.value))
                    }
                    className="text-sm w-24"
                    min={1}
                  />
                </FieldRow>
                <FieldRow
                  label="Default Notes"
                  hint="Pre-filled in the Notes field on every new quote.">
                  <Textarea
                    value={form.defaultNotes}
                    onChange={(e) => set('defaultNotes', e.target.value)}
                    placeholder="Thank you for your business…"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </FieldRow>
                <FieldRow
                  label="Default Terms & Conditions"
                  hint="Pre-filled in the Terms field on every new quote.">
                  <Textarea
                    value={form.defaultTerms}
                    onChange={(e) => set('defaultTerms', e.target.value)}
                    placeholder="Payment due within 30 days of invoice date…"
                    rows={4}
                    className="text-sm resize-none"
                  />
                </FieldRow>
              </div>
            </section>
          )}

          {/* ── Display Options ───────────────────────────────────────── */}
          {activeSection === 'display' && (
            <section>
              <SectionLabel>Sections to Show on Quote</SectionLabel>
              <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                {[
                  {
                    key: 'showTaxLine' as const,
                    label: 'Tax Line',
                    desc: 'Show tax amount in the totals block.',
                  },
                  {
                    key: 'showDiscountLine' as const,
                    label: 'Discount Line',
                    desc: 'Show discount amount in the totals block.',
                  },
                  {
                    key: 'showSignatureBlock' as const,
                    label: 'Acceptance / Signature Block',
                    desc: 'Show the "Accepted by / Signature / Date" section at the bottom.',
                  },
                ].map((item, i) => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between px-5 py-4 ${
                      i > 0 ? 'border-t border-border/40' : ''
                    }`}>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                    <Switch
                      checked={form[item.key]}
                      onCheckedChange={(v) => set(item.key, v)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          {/* ── Proposal Templates ───────────────────────────────────── */}
          {activeSection === 'templates' && <ProposalTemplatesSection />}

          {/* ── Integrations ──────────────────────────────────────────── */}
          {activeSection === 'integrations' && (
            <section>
              <SectionLabel>Lead Lifecycle</SectionLabel>
              <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="text-[13px] font-medium text-foreground">
                      Lead-Quote Lifecycle Integration
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      When enabled: accepting a quote prompts to advance the linked lead&apos;s pipeline stage; marking a lead Won automatically accepts its open quotes.
                    </p>
                  </div>
                  <Switch
                    checked={form.enableLeadIntegration}
                    onCheckedChange={(v) => set('enableLeadIntegration', v)}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
