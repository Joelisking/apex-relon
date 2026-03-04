'use client';

import type { QuoteSettings } from '@/lib/types';
import type {
  QuoteFormState,
  LineItemRow,
} from './quote-editor-types';

interface QuotePDFPreviewProps {
  form: QuoteFormState;
  lineItems: LineItemRow[];
  settings: QuoteSettings | null;
  quoteNumber?: number;
  leadName?: string;
  leadCompany?: string;
  clientName?: string;
}

function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function QuotePDFPreview({
  form,
  lineItems,
  settings,
  quoteNumber,
  leadName,
  leadCompany,
  clientName,
}: QuotePDFPreviewProps) {
  const currency =
    form.currency || settings?.defaultCurrency || 'USD';
  const accent = settings?.accentColor || '#2563eb';

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice,
    0,
  );
  const taxableSubtotal = lineItems
    .filter((li) => li.taxable)
    .reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxAmount = (taxableSubtotal * form.taxRate) / 100;
  const total = subtotal + taxAmount - form.discount;

  const prefix = settings?.quoteNumberPrefix || 'Q-';
  const quoteLabel = quoteNumber
    ? `${prefix}${String(quoteNumber).padStart(4, '0')}`
    : `${prefix}DRAFT`;

  const billToName = leadCompany || clientName || '—';
  const billToContact = leadName || '';

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const showTax = settings?.showTaxLine !== false;
  const showDiscount = settings?.showDiscountLine !== false;
  const showSignature = settings?.showSignatureBlock !== false;

  return (
    <div className="overflow-auto h-full p-4 bg-muted/30 print:p-0 print:bg-white print:overflow-visible">
      <div
        className="mx-auto print:w-full"
        style={{ width: '210mm', minWidth: '500px' }}>
        <div className="bg-white shadow-lg rounded-sm p-12 text-[12px] leading-relaxed font-sans">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            {/* Company info */}
            <div>
              {settings?.companyName ? (
                <p className="text-[22px] font-bold text-gray-900 leading-tight">
                  {settings.companyName}
                </p>
              ) : (
                <p className="text-[22px] font-bold text-gray-400 leading-tight">
                  Your Company
                </p>
              )}
              <div className="mt-2 space-y-0.5 text-[11px] text-gray-500">
                {settings?.companyAddress && (
                  <p style={{ whiteSpace: 'pre-line' }}>
                    {settings.companyAddress}
                  </p>
                )}
                {settings?.companyPhone && (
                  <p>{settings.companyPhone}</p>
                )}
                {settings?.companyEmail && (
                  <p>{settings.companyEmail}</p>
                )}
                {settings?.companyWebsite && (
                  <p>{settings.companyWebsite}</p>
                )}
              </div>
            </div>

            {/* Quote heading */}
            <div className="text-right">
              <p
                className="text-[32px] font-bold tracking-tight leading-none"
                style={{ color: accent }}>
                QUOTE
              </p>
              <p className="text-[15px] font-semibold text-gray-700 mt-1">
                {quoteLabel}
              </p>
              <div className="mt-2 space-y-0.5 text-[11px] text-gray-500">
                <p>
                  <span className="font-medium text-gray-700">
                    Date:
                  </span>{' '}
                  {today}
                </p>
                {form.validUntil && (
                  <p>
                    <span className="font-medium text-gray-700">
                      Valid Until:
                    </span>{' '}
                    {fmtDate(form.validUntil + 'T00:00:00')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Accent divider */}
          <div
            className="h-0.5 w-full rounded-full mb-6"
            style={{ backgroundColor: accent }}
          />

          {/* Bill To */}
          <div className="mb-6">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1"
              style={{ color: accent }}>
              Bill To
            </p>
            <p className="text-[14px] font-semibold text-gray-900">
              {billToName}
            </p>
            {billToContact && (
              <p className="text-[11px] text-gray-500">
                {billToContact}
              </p>
            )}
          </div>

          {/* Line Items Table */}
          <div className="mb-6">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr
                  style={{ backgroundColor: `${accent}18` }}
                  className="rounded">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700 uppercase tracking-[0.06em] text-[10px]">
                    Description
                  </th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-700 uppercase tracking-[0.06em] text-[10px] w-16">
                    Qty
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 uppercase tracking-[0.06em] text-[10px] w-28">
                    Unit Price
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 uppercase tracking-[0.06em] text-[10px] w-28">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems
                  .filter(
                    (li) => li.description.trim() || li.unitPrice > 0,
                  )
                  .map((li, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100"
                      style={
                        i % 2 === 1
                          ? { backgroundColor: '#f9fafb' }
                          : {}
                      }>
                      <td className="py-2 px-3 text-gray-800">
                        {li.description || '—'}
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums text-gray-600">
                        {li.quantity}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-600">
                        {fmtCurrency(li.unitPrice, currency)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium text-gray-800">
                        {fmtCurrency(
                          li.quantity * li.unitPrice,
                          currency,
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-60 space-y-1 text-[11px]">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {fmtCurrency(subtotal, currency)}
                </span>
              </div>
              {showTax && form.taxRate > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({form.taxRate}%)</span>
                  <span className="tabular-nums">
                    {fmtCurrency(taxAmount, currency)}
                  </span>
                </div>
              )}
              {showDiscount && form.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span className="tabular-nums">
                    -{fmtCurrency(form.discount, currency)}
                  </span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-[13px] pt-2 mt-1 border-t-2"
                style={{ borderColor: accent }}>
                <span style={{ color: accent }}>Total</span>
                <span
                  className="tabular-nums"
                  style={{ color: accent }}>
                  {fmtCurrency(total, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {form.notes && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                Notes
              </p>
              <p className="text-[11px] text-gray-600 whitespace-pre-wrap">
                {form.notes}
              </p>
            </div>
          )}

          {/* Terms */}
          {form.termsAndConditions && (
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                Terms &amp; Conditions
              </p>
              <p className="text-[10px] text-gray-400 whitespace-pre-wrap leading-relaxed">
                {form.termsAndConditions}
              </p>
            </div>
          )}

          {/* Signature Block */}
          {showSignature && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">
                Acceptance
              </p>
              <div className="grid grid-cols-3 gap-6">
                {['Accepted by', 'Signature', 'Date'].map((label) => (
                  <div key={label}>
                    <p className="text-[10px] font-medium text-gray-500 mb-6">
                      {label}
                    </p>
                    <div className="border-b border-gray-400 h-px" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
