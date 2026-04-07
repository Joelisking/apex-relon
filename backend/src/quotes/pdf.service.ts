import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QuoteSettingsService } from './quote-settings.service';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake/js/Printer').default;

function resolveFontPath(filename: string): string {
  const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
  return path.join(pdfmakeDir, 'fonts', 'Roboto', filename);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

@Injectable()
export class PdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quoteSettingsService: QuoteSettingsService,
  ) {}

  async generateQuotePdf(quoteId: string): Promise<Buffer> {
    const quote = await this.prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        lead: true,
        client: true,
        createdBy: true,
      },
    });

    const settings = await this.quoteSettingsService.getSettings();

    const fonts = {
      Roboto: {
        normal: resolveFontPath('Roboto-Regular.ttf'),
        bold: resolveFontPath('Roboto-Medium.ttf'),
        italics: resolveFontPath('Roboto-Italic.ttf'),
        bolditalics: resolveFontPath('Roboto-MediumItalic.ttf'),
      },
    };

    const printer = new PdfPrinter(fonts);
    const currency = quote.currency || settings.defaultCurrency || 'USD';
    const accentColor = settings.accentColor || '#1a56db';
    const quoteNumberStr = `${settings.quoteNumberPrefix || 'Q-'}${quote.quoteNumber.toString().padStart(4, '0')}`;
    const recipient = (quote.lead as any)?.company || (quote.client as any)?.name || 'N/A';
    const contactEmail = (quote.lead as any)?.email || (quote.client as any)?.email || null;
    const contactPhone = (quote.lead as any)?.phone || (quote.client as any)?.contactPhone || null;
    const issuedDate = new Date(quote.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const validUntilStr = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A';

    // Build header info lines
    const companyInfoLines: object[] = [];
    if (settings.companyAddress) {
      companyInfoLines.push({ text: settings.companyAddress, fontSize: 9, color: '#555555' });
    }
    const contactParts: string[] = [];
    if (settings.companyPhone) contactParts.push(settings.companyPhone);
    if (settings.companyEmail) contactParts.push(settings.companyEmail);
    if (settings.companyWebsite) contactParts.push(settings.companyWebsite);
    if (contactParts.length > 0) {
      companyInfoLines.push({ text: contactParts.join('  |  '), fontSize: 9, color: '#555555' });
    }

    // Build line items table rows
    const tableHeaderRow = [
      { text: 'Description', bold: true, color: '#ffffff', fillColor: accentColor },
      { text: 'Qty', bold: true, color: '#ffffff', fillColor: accentColor, alignment: 'center' as const },
      { text: 'Unit Price', bold: true, color: '#ffffff', fillColor: accentColor, alignment: 'right' as const },
      { text: 'Amount', bold: true, color: '#ffffff', fillColor: accentColor, alignment: 'right' as const },
    ];

    const dataRows = quote.lineItems.map((item, index) => {
      const rowFill = index % 2 === 0 ? '#ffffff' : '#f7f9fc';
      return [
        { text: item.description, fontSize: 9, fillColor: rowFill },
        { text: String(item.quantity), fontSize: 9, alignment: 'center' as const, fillColor: rowFill },
        { text: formatCurrency(item.unitPrice, currency), fontSize: 9, alignment: 'right' as const, fillColor: rowFill },
        { text: formatCurrency(item.lineTotal, currency), fontSize: 9, alignment: 'right' as const, fillColor: rowFill },
      ];
    });

    // Build totals rows
    const totalsStack: object[] = [
      {
        columns: [
          { text: 'Subtotal', width: '*', alignment: 'right' as const, fontSize: 9, color: '#555555' },
          { text: formatCurrency(quote.subtotal, currency), width: 110, alignment: 'right' as const, fontSize: 9 },
        ],
        margin: [0, 2, 0, 2],
      },
    ];

    if (settings.showTaxLine) {
      totalsStack.push({
        columns: [
          { text: `Tax (${quote.taxRate}%)`, width: '*', alignment: 'right' as const, fontSize: 9, color: '#555555' },
          { text: formatCurrency(quote.taxAmount, currency), width: 110, alignment: 'right' as const, fontSize: 9 },
        ],
        margin: [0, 2, 0, 2],
      });
    }

    if (settings.showDiscountLine && quote.discount > 0) {
      totalsStack.push({
        columns: [
          { text: 'Discount', width: '*', alignment: 'right' as const, fontSize: 9, color: '#555555' },
          { text: `- ${formatCurrency(quote.discount, currency)}`, width: 110, alignment: 'right' as const, fontSize: 9, color: '#c0392b' },
        ],
        margin: [0, 2, 0, 2],
      });
    }

    // Divider above total
    totalsStack.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }], margin: [0, 4, 0, 4] });

    totalsStack.push({
      columns: [
        { text: 'Total', width: '*', alignment: 'right' as const, fontSize: 12, bold: true },
        { text: formatCurrency(quote.total, currency), width: 110, alignment: 'right' as const, fontSize: 12, bold: true, color: accentColor },
      ],
      margin: [0, 2, 0, 2],
    });

    // Build content array
    const content: object[] = [
      // Header: company name + info
      {
        columns: [
          {
            stack: [
              {
                text: settings.companyName || 'Your Company',
                fontSize: 20,
                bold: true,
                color: accentColor,
              },
              ...companyInfoLines,
            ],
          },
          {
            stack: [
              { text: 'QUOTE', fontSize: 22, bold: true, alignment: 'right' as const, color: '#333333' },
              { text: quoteNumberStr, fontSize: 11, alignment: 'right' as const, color: '#555555', margin: [0, 2, 0, 0] },
              { text: `Issued: ${issuedDate}`, fontSize: 9, alignment: 'right' as const, color: '#888888', margin: [0, 4, 0, 0] },
              { text: `Valid Until: ${validUntilStr}`, fontSize: 9, alignment: 'right' as const, color: '#888888' },
            ],
          },
        ],
        margin: [0, 0, 0, 24],
      },

      // Horizontal divider
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: accentColor }], margin: [0, 0, 0, 16] },

      // Bill To block
      {
        stack: [
          { text: 'BILL TO', fontSize: 8, bold: true, color: '#888888', letterSpacing: 1 },
          { text: recipient, fontSize: 13, bold: true, color: '#222222', margin: [0, 4, 0, 2] },
          ...(contactEmail ? [{ text: contactEmail, fontSize: 9, color: '#555555' }] : []),
          ...(contactPhone ? [{ text: contactPhone, fontSize: 9, color: '#555555' }] : []),
        ],
        margin: [0, 0, 0, 24],
      },

      // Line items table
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [tableHeaderRow, ...dataRows],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e0e0e0',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 16],
      },

      // Totals section
      {
        stack: totalsStack,
        margin: [0, 0, 0, 24],
      },
    ];

    // Notes section
    if (quote.notes) {
      content.push({
        stack: [
          { text: 'NOTES', fontSize: 8, bold: true, color: '#888888', letterSpacing: 1, margin: [0, 0, 0, 4] },
          { text: quote.notes, fontSize: 9, color: '#444444', lineHeight: 1.4 },
        ],
        margin: [0, 0, 0, 16],
      });
    }

    // Terms & Conditions
    if (quote.termsAndConditions) {
      content.push({
        stack: [
          { text: 'TERMS & CONDITIONS', fontSize: 8, bold: true, color: '#888888', letterSpacing: 1, margin: [0, 0, 0, 4] },
          { text: quote.termsAndConditions, fontSize: 9, color: '#444444', lineHeight: 1.4 },
        ],
        margin: [0, 0, 0, 24],
      });
    }

    // Signature block
    if (settings.showSignatureBlock) {
      content.push({
        stack: [
          { text: '___________________________', fontSize: 12, color: '#333333', margin: [0, 0, 0, 4] },
          { text: 'Signature', fontSize: 9, color: '#888888' },
        ],
        margin: [0, 16, 0, 0],
      });
    }

    const docDefinition = {
      pageSize: 'A4' as const,
      pageMargins: [40, 40, 40, 60] as [number, number, number, number],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        color: '#333333',
      },
      content,
      footer: (currentPage: number, pageCount: number) => ({
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: 'center' as const,
        fontSize: 8,
        color: '#aaaaaa',
        margin: [0, 10, 0, 0],
      }),
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async generateScopePdf(quoteId: string): Promise<Buffer> {
    const quote = await this.prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          include: {
            serviceItem: {
              include: {
                subtasks: {
                  orderBy: { sortOrder: 'asc' },
                  include: { roleEstimates: { orderBy: { role: 'asc' } } },
                },
              },
            },
          },
        },
      },
    });

    const settings = await this.quoteSettingsService.getSettings();

    const fonts = {
      Roboto: {
        normal: resolveFontPath('Roboto-Regular.ttf'),
        bold: resolveFontPath('Roboto-Medium.ttf'),
        italics: resolveFontPath('Roboto-Italic.ttf'),
        bolditalics: resolveFontPath('Roboto-MediumItalic.ttf'),
      },
    };

    const printer = new PdfPrinter(fonts);
    const accentColor = settings.accentColor || '#1a56db';
    const sowNumberStr = `SOW-${quote.quoteNumber.toString().padStart(4, '0')}`;

    const companyInfoLines: object[] = [];
    if (settings.companyAddress) {
      companyInfoLines.push({ text: settings.companyAddress, fontSize: 9, color: '#555555' });
    }
    const contactParts: string[] = [];
    if (settings.companyPhone) contactParts.push(settings.companyPhone);
    if (settings.companyEmail) contactParts.push(settings.companyEmail);
    if (settings.companyWebsite) contactParts.push(settings.companyWebsite);
    if (contactParts.length > 0) {
      companyInfoLines.push({ text: contactParts.join('  |  '), fontSize: 9, color: '#555555' });
    }

    const content: object[] = [
      // Header
      {
        columns: [
          {
            stack: [
              {
                text: settings.companyName || 'Your Company',
                fontSize: 20,
                bold: true,
                color: accentColor,
              },
              ...companyInfoLines,
            ],
          },
          {
            stack: [
              { text: 'SCOPE OF WORK', fontSize: 22, bold: true, alignment: 'right' as const, color: '#333333' },
              { text: sowNumberStr, fontSize: 11, alignment: 'right' as const, color: '#555555', margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 24],
      },

      // Horizontal divider
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: accentColor }], margin: [0, 0, 0, 16] },
    ];

    const itemsWithServiceItem = (quote.lineItems as any[]).filter((li) => li.serviceItem);

    if (itemsWithServiceItem.length === 0) {
      content.push({ text: 'No service items attached to this quote.', fontSize: 10, color: '#888888' });
    } else {
      for (const item of itemsWithServiceItem) {
        const si = item.serviceItem;

        content.push({ text: si.name, fontSize: 12, bold: true, color: accentColor, margin: [0, 12, 0, 6] });

        if (si.description) {
          content.push({ text: si.description, fontSize: 9, color: '#555555', margin: [0, 0, 0, 8] });
        }

        const subtasks: any[] = si.subtasks ?? [];
        if (subtasks.length > 0) {
          const tableHeaderRow = [
            { text: 'Subtask', bold: true, color: '#ffffff', fillColor: accentColor },
            { text: 'Role', bold: true, color: '#ffffff', fillColor: accentColor },
            { text: 'Est. Hours', bold: true, color: '#ffffff', fillColor: accentColor, alignment: 'right' as const },
          ];

          const dataRows: object[] = [];
          for (const subtask of subtasks) {
            const roleEstimates: any[] = subtask.roleEstimates ?? [];
            if (roleEstimates.length === 0) {
              dataRows.push([
                { text: subtask.name, fontSize: 9 },
                { text: '—', fontSize: 9 },
                { text: '—', fontSize: 9, alignment: 'right' as const },
              ]);
            } else {
              for (const re of roleEstimates) {
                dataRows.push([
                  { text: subtask.name, fontSize: 9 },
                  { text: re.role, fontSize: 9 },
                  { text: String(re.estimatedHours), fontSize: 9, alignment: 'right' as const },
                ]);
              }
            }
          }

          content.push({
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto'],
              body: [tableHeaderRow, ...dataRows],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0,
              hLineColor: () => '#e0e0e0',
              paddingLeft: () => 8,
              paddingRight: () => 8,
              paddingTop: () => 6,
              paddingBottom: () => 6,
            },
            margin: [0, 0, 0, 8],
          });
        }
      }
    }

    const docDefinition = {
      pageSize: 'A4' as const,
      pageMargins: [40, 40, 40, 60] as [number, number, number, number],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        color: '#333333',
      },
      content,
      footer: (currentPage: number, pageCount: number) => ({
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: 'center' as const,
        fontSize: 8,
        color: '#aaaaaa',
        margin: [0, 10, 0, 0],
      }),
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async generateCostBreakdownPdf(id: string): Promise<Buffer> {
    const breakdown = await this.prisma.costBreakdown.findUniqueOrThrow({
      where: { id },
      include: {
        serviceType: true,
        lead: true,
        project: true,
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            serviceItem: { include: { subtasks: { orderBy: { sortOrder: 'asc' } } } },
            roleEstimates: true,
          },
        },
      },
    });

    const allRoles = await this.prisma.role.findMany({ orderBy: { label: 'asc' } });
    const settings = await this.quoteSettingsService.getSettings();

    // Compact currency: $680, $1.2k, $12k
    const compactCurrency = (n: number) =>
      n >= 1000 ? `$${+(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;

    // Sparse role columns — only roles with at least one estimate
    const allEstimates = breakdown.lines.flatMap((l) => l.roleEstimates);
    const usedRoleKeys = new Set(allEstimates.map((e) => e.role));
    // Include known API roles first (alphabetical), then any custom free-text roles not in DB
    const apiColumns = allRoles.filter((r) => usedRoleKeys.has(r.key));
    const apiKeySet = new Set(allRoles.map((r) => r.key));
    const customRoleKeys = [...usedRoleKeys].filter((k) => !apiKeySet.has(k)).sort();
    const columns: { key: string; label: string }[] = [
      ...apiColumns.map((r) => ({ key: r.key, label: r.label })),
      ...customRoleKeys.map((k) => ({ key: k, label: k })),
    ];

    // Grand totals & cost per role
    const grandTotalByRole: Record<string, number> = {};
    const grandCostByRole: Record<string, number> = {};
    columns.forEach((c) => { grandTotalByRole[c.key] = 0; grandCostByRole[c.key] = 0; });
    let grandTotalHours = 0;
    let grandTotalCost = 0;
    let anyRates = false;
    let allHaveRates = true;
    for (const est of allEstimates) {
      if (grandTotalByRole[est.role] !== undefined) {
        grandTotalByRole[est.role] += est.estimatedHours;
        grandTotalHours += est.estimatedHours;
        if (est.hourlyRate != null) {
          const cost = est.estimatedHours * est.hourlyRate;
          grandCostByRole[est.role] = (grandCostByRole[est.role] ?? 0) + cost;
          grandTotalCost += cost;
          anyRates = true;
        } else {
          allHaveRates = false;
        }
      }
    }

    const fonts = {
      Roboto: {
        normal: resolveFontPath('Roboto-Regular.ttf'),
        bold: resolveFontPath('Roboto-Medium.ttf'),
        italics: resolveFontPath('Roboto-Italic.ttf'),
        bolditalics: resolveFontPath('Roboto-MediumItalic.ttf'),
      },
    };
    const printer = new PdfPrinter(fonts);

    // Layout constants — tight to maximise one-page fit
    const COL_WIDTH = 30;
    const TOTAL_WIDTH = 36;
    const COST_WIDTH = 46;  // wider for cost row values
    const HEADER_ROTATION_MARGIN = 44;

    // ── Matrix rows ────────────────────────────────────────────────────

    // Column header row: rotated role labels + "Total hrs" + optional "Est. Cost"
    const headerRow: object[] = [
      { text: '', border: [false, false, false, true], fillColor: '#ffffff' },
      ...columns.map((col) => ({
        text: col.label,
        rotation: -60,
        fontSize: 7,
        bold: true,
        alignment: 'left' as const,
        margin: [2, HEADER_ROTATION_MARGIN, 2, 2],
        border: [false, false, false, true],
        color: '#374151',
      })),
      {
        text: 'Total\nhrs',
        fontSize: 7,
        bold: true,
        alignment: 'center' as const,
        border: [false, false, false, true],
        margin: [0, HEADER_ROTATION_MARGIN, 0, 2],
        color: '#374151',
      },
      ...(anyRates ? [{
        text: 'Est.\nCost',
        fontSize: 7,
        bold: true,
        alignment: 'center' as const,
        border: [false, false, false, true],
        margin: [0, HEADER_ROTATION_MARGIN, 0, 2],
        color: '#374151',
      }] : []),
    ];

    const matrixRows: object[][] = [headerRow];

    for (const line of breakdown.lines) {
      const si = line.serviceItem as any;
      // Honour excluded subtask IDs stored on the line
      const excluded = new Set((line as any).excludedSubtaskIds ?? []);
      const usedSubtasks: any[] = (si.subtasks as any[]).filter(
        (st: any) => !excluded.has(st.id) && line.roleEstimates.some((e) => (e as any).subtaskId === st.id),
      );
      if (usedSubtasks.length === 0) continue;

      // Phase totals by role
      const phaseTotalByRole: Record<string, number> = {};
      const phaseCostByRole: Record<string, number> = {};
      columns.forEach((c) => { phaseTotalByRole[c.key] = 0; phaseCostByRole[c.key] = 0; });
      let phaseTotal = 0;
      let phaseCost = 0;
      for (const est of line.roleEstimates) {
        if (phaseTotalByRole[est.role] !== undefined) {
          phaseTotalByRole[est.role] += est.estimatedHours;
          phaseTotal += est.estimatedHours;
          if (est.hourlyRate != null) {
            const c = est.estimatedHours * est.hourlyRate;
            phaseCostByRole[est.role] = (phaseCostByRole[est.role] ?? 0) + c;
            phaseCost += c;
          }
        }
      }

      // Phase row — neutral gray background, bold
      matrixRows.push([
        { text: si.name, bold: true, fontSize: 9, border: [false, false, false, false], fillColor: '#f3f4f6' },
        ...columns.map((col) => ({
          text: phaseTotalByRole[col.key] > 0 ? phaseTotalByRole[col.key].toFixed(1) : '',
          fontSize: 8,
          bold: true,
          alignment: 'center' as const,
          border: [false, false, false, false],
          fillColor: '#f3f4f6',
          color: phaseTotalByRole[col.key] > 0 ? '#111827' : '#d1d5db',
        })),
        {
          text: phaseTotal > 0 ? phaseTotal.toFixed(1) : '',
          fontSize: 8,
          bold: true,
          alignment: 'center' as const,
          border: [false, false, false, false],
          fillColor: '#f3f4f6',
        },
        ...(anyRates ? [{
          text: phaseCost > 0 ? compactCurrency(phaseCost) : '',
          fontSize: 7,
          alignment: 'center' as const,
          border: [false, false, false, false],
          fillColor: '#f3f4f6',
          color: '#374151',
        }] : []),
      ]);

      // Subtask rows — indented, lighter text
      for (const subtask of usedSubtasks) {
        const subtaskEsts = line.roleEstimates.filter((e) => (e as any).subtaskId === subtask.id);
        const subtaskByRole: Record<string, number> = {};
        const subtaskCostByRole: Record<string, number> = {};
        let subtaskTotal = 0;
        let subtaskCost = 0;
        for (const est of subtaskEsts) {
          subtaskByRole[est.role] = (subtaskByRole[est.role] ?? 0) + est.estimatedHours;
          subtaskTotal += est.estimatedHours;
          if (est.hourlyRate != null) {
            const c = est.estimatedHours * est.hourlyRate;
            subtaskCostByRole[est.role] = (subtaskCostByRole[est.role] ?? 0) + c;
            subtaskCost += c;
          }
        }

        matrixRows.push([
          { text: `  ${subtask.name}`, fontSize: 8, color: '#6b7280', border: [false, false, false, false] },
          ...columns.map((col) => ({
            text: subtaskByRole[col.key] > 0 ? subtaskByRole[col.key].toFixed(1) : '',
            fontSize: 7,
            alignment: 'center' as const,
            color: subtaskByRole[col.key] > 0 ? '#374151' : '#e5e7eb',
            border: [false, false, false, false],
          })),
          {
            text: subtaskTotal > 0 ? subtaskTotal.toFixed(1) : '',
            fontSize: 7,
            alignment: 'center' as const,
            color: '#6b7280',
            border: [false, false, false, false],
          },
          ...(anyRates ? [{
            text: subtaskCost > 0 ? compactCurrency(subtaskCost) : '',
            fontSize: 7,
            alignment: 'center' as const,
            color: '#9ca3af',
            border: [false, false, false, false],
          }] : []),
        ]);
      }
    }

    // Totals row — darker background
    matrixRows.push([
      { text: 'TOTAL', bold: true, fontSize: 9, border: [false, true, false, false], fillColor: '#e5e7eb' },
      ...columns.map((col) => ({
        text: grandTotalByRole[col.key] > 0 ? grandTotalByRole[col.key].toFixed(1) : '',
        fontSize: 8,
        bold: true,
        alignment: 'center' as const,
        border: [false, true, false, false],
        fillColor: '#e5e7eb',
        color: grandTotalByRole[col.key] > 0 ? '#111827' : '#d1d5db',
      })),
      {
        text: grandTotalHours > 0 ? grandTotalHours.toFixed(1) : '0',
        fontSize: 8,
        bold: true,
        alignment: 'center' as const,
        border: [false, true, false, false],
        fillColor: '#e5e7eb',
      },
      ...(anyRates ? [{
        text: grandTotalCost > 0 ? compactCurrency(grandTotalCost) : '',
        fontSize: 8,
        bold: true,
        alignment: 'center' as const,
        border: [false, true, false, false],
        fillColor: '#e5e7eb',
        color: '#111827',
      }] : []),
    ]);

    // ── Document header metadata ───────────────────────────────────────

    const linkedTo = (breakdown.lead as any)?.company || (breakdown.project as any)?.name || null;
    const jobType = (breakdown.serviceType as any)?.name || null;
    const dateStr = new Date(breakdown.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const metaParts: string[] = [];
    if (linkedTo) metaParts.push(linkedTo);
    if (jobType) metaParts.push(jobType);
    metaParts.push(dateStr);

    const tableWidths = anyRates
      ? ['*', ...columns.map(() => COL_WIDTH), TOTAL_WIDTH, COST_WIDTH]
      : ['*', ...columns.map(() => COL_WIDTH), TOTAL_WIDTH];

    const content: object[] = [
      // Compact 2-line header — no decorative elements
      {
        columns: [
          {
            stack: [
              {
                text: [
                  { text: 'COST BREAKDOWN', bold: true, fontSize: 14, color: '#111827' },
                  { text: `   ${breakdown.title}`, fontSize: 11, color: '#6b7280' },
                ],
              },
            ],
          },
          {
            stack: [
              {
                text: settings.companyName || 'Apex Consulting & Surveying',
                fontSize: 9,
                alignment: 'right' as const,
                color: '#6b7280',
              },
              {
                text: metaParts.join('  ·  '),
                fontSize: 8,
                alignment: 'right' as const,
                color: '#9ca3af',
                margin: [0, 1, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      },
      // Matrix table — fills the page
      {
        table: {
          headerRows: 1,
          widths: tableWidths,
          body: matrixRows,
        },
        layout: {
          hLineWidth: (i: number, node: any) =>
            i === 0 || i === node.table.body.length ? 0 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
      // Partial cost note if needed
      ...(!allHaveRates && anyRates ? [{
        text: '* Cost estimate is partial — some roles have no hourly rate set.',
        fontSize: 7,
        color: '#b45309',
        italics: true,
        margin: [0, 5, 0, 0],
      } as object] : []),
    ];

    const docDefinition = {
      pageSize: 'A4' as const,
      pageOrientation: 'landscape' as const,
      pageMargins: [28, 28, 28, 28] as [number, number, number, number],
      defaultStyle: { font: 'Roboto', fontSize: 8, color: '#374151' },
      content,
      footer: (currentPage: number, pageCount: number) =>
        pageCount > 1
          ? {
              text: `${currentPage} / ${pageCount}`,
              alignment: 'right' as const,
              fontSize: 7,
              color: '#9ca3af',
              margin: [0, 6, 28, 0],
            }
          : {},
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}
