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
        jobType: true,
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

    const usd = (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

    // ── Sparse role columns — only roles with at least one estimate ─────────────
    const allEstimates = breakdown.lines.flatMap((l) => l.roleEstimates);
    const usedRoleKeys = new Set(allEstimates.map((e) => e.role));
    const apiColumns = allRoles.filter((r) => usedRoleKeys.has(r.key));
    const apiKeySet = new Set(allRoles.map((r) => r.key));
    const customRoleKeys = [...usedRoleKeys].filter((k) => !apiKeySet.has(k)).sort();
    const columns: { key: string; label: string }[] = [
      ...apiColumns.map((r) => ({ key: r.key, label: r.label })),
      ...customRoleKeys.map((k) => ({ key: k, label: k })),
    ];
    const nCols = columns.length; // total number of role columns

    // ── Per-role representative hourly rate (first non-null found) ──────────────
    const rateByRole: Record<string, number | null> = {};
    columns.forEach((c) => { rateByRole[c.key] = null; });
    for (const est of allEstimates) {
      if (rateByRole[est.role] === null && est.hourlyRate != null) {
        rateByRole[est.role] = est.hourlyRate;
      }
    }
    const anyRates = Object.values(rateByRole).some((r) => r != null);

    // ── Grand totals per role ───────────────────────────────────────────────────
    const grandHoursByRole: Record<string, number> = {};
    const grandCostByRole: Record<string, number> = {};
    columns.forEach((c) => { grandHoursByRole[c.key] = 0; grandCostByRole[c.key] = 0; });
    let grandTotalHours = 0;
    let grandTotalLaborCost = 0;
    for (const est of allEstimates) {
      if (grandHoursByRole[est.role] !== undefined) {
        grandHoursByRole[est.role] += est.estimatedHours;
        grandTotalHours += est.estimatedHours;
        if (est.hourlyRate != null) {
          const c = est.estimatedHours * est.hourlyRate;
          grandCostByRole[est.role] += c;
          grandTotalLaborCost += c;
        }
      }
    }

    // ── Direct expenses ────────────────────────────────────────────────────────
    const bd = breakdown as any;
    const showDirectExpenses: boolean = bd.showDirectExpenses !== false; // default true
    const mileageTotal = (bd.mileageQty ?? 0) * (bd.mileageRate ?? 0);
    const lodgingTotal = (bd.lodgingQty ?? 0) * (bd.lodgingRate ?? 0);
    const perDiemTotal = (bd.perDiemQty ?? 0) * (bd.perDiemRate ?? 0);
    const totalDirectExpenses = mileageTotal + lodgingTotal + perDiemTotal;
    const totalFee = grandTotalLaborCost + (showDirectExpenses ? totalDirectExpenses : 0);
    const roundedFee: number | null = bd.roundedFee ?? null;
    const hasDirectExpenses =
      bd.mileageQty != null || bd.lodgingQty != null || bd.perDiemQty != null;

    // ── pdfmake setup ──────────────────────────────────────────────────────────
    const fonts = {
      Roboto: {
        normal: resolveFontPath('Roboto-Regular.ttf'),
        bold: resolveFontPath('Roboto-Medium.ttf'),
        italics: resolveFontPath('Roboto-Italic.ttf'),
        bolditalics: resolveFontPath('Roboto-MediumItalic.ttf'),
      },
    };
    const printer = new PdfPrinter(fonts);

    // Column widths: task-description ('*'), one per role (26pt), total-hours, total-fee
    const COL = 26;
    const TOT_HRS = 34;
    const TOT_FEE = 56;
    const HDR_ROT = 52; // margin for rotated header text
    // Total number of cells per row: 1 (task) + nCols (roles) + 1 (hrs) + 1 (fee) = nCols + 3
    const nCells = nCols + 3;

    const COLORS = {
      sectionHeader: '#D4E4F7',   // light steel blue — phase rows
      laborRates:    '#F3F4F6',   // light gray — rates row at top
      totalHours:    '#D4E4F7',   // same blue — TOTAL HOURS row
      hourlyRate:    '#FFF2CC',   // pale yellow — HOURLY RATE row
      laborCost:     '#FFE599',   // yellow — TOTAL LABOR COST row
      expenses:      '#FCE5CD',   // peach — direct expenses rows
      totalFee:      '#F9CB9C',   // light orange — TOTAL FEE
      roundedFee:    '#F6B26B',   // amber — ROUNDED FEE
    };

    // Helper: blank filler cells for colSpan rows
    const blanks = (n: number) => Array(n).fill({ text: '' });

    // Helper: a standard numeric cell
    const num = (val: string | number, opts: object = {}) => ({
      text: typeof val === 'number' ? (val === 0 ? '' : val.toFixed(1)) : val,
      fontSize: 7,
      alignment: 'center' as const,
      border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
      ...opts,
    });

    // Helper: a footer label cell that spans everything but last col
    const footerLabel = (text: string, fill: string, bold = true): object[] => [
      {
        text,
        colSpan: nCols + 2,
        bold,
        fontSize: 8,
        border: [false, false, false, false],
        fillColor: fill,
        margin: [2, 2, 2, 2],
      },
      ...blanks(nCols + 1),
    ];

    // Helper: a footer row with per-role values + total in last col
    const footerRow = (
      label: string,
      fill: string,
      roleValues: (string | number)[],
      lastVal: string,
    ): object[] => [
      {
        text: label,
        bold: true,
        fontSize: 8,
        border: [false, true, false, false],
        fillColor: fill,
        margin: [2, 1, 2, 1],
      },
      ...columns.map((col, i) => ({
        text: roleValues[i] || '',
        fontSize: 7,
        bold: false,
        alignment: 'center' as const,
        border: [false, true, false, false],
        fillColor: fill,
      })),
      { text: '', fontSize: 7, border: [false, true, false, false], fillColor: fill }, // total hrs col (blank)
      { text: lastVal, fontSize: 8, bold: true, alignment: 'right' as const, border: [false, true, false, false], fillColor: fill, margin: [0, 1, 2, 1] },
    ];

    // ── Column header row ──────────────────────────────────────────────────────
    const headerRow: object[] = [
      { text: 'Task Description', fontSize: 7, bold: true, color: '#6b7280', border: [false, false, false, true], fillColor: '#ffffff', margin: [2, HDR_ROT, 2, 2] },
      ...columns.map((col) => ({
        text: col.label,
        rotation: -60,
        fontSize: 7,
        bold: true,
        alignment: 'left' as const,
        margin: [1, HDR_ROT, 1, 2],
        border: [false, false, false, true],
        color: '#374151',
      })),
      { text: 'Total\nHours', fontSize: 7, bold: true, alignment: 'center' as const, border: [false, false, false, true], margin: [0, HDR_ROT, 0, 2], color: '#374151' },
      { text: 'Total\nFee', fontSize: 7, bold: true, alignment: 'center' as const, border: [false, false, false, true], margin: [0, HDR_ROT, 0, 2], color: '#374151' },
    ];

    // ── Labor Rates row (top) ─────────────────────────────────────────────────
    const laborRatesRow: object[] = [
      { text: 'Labor Rates (Hrly)', fontSize: 7, bold: true, border: [false, false, false, false], fillColor: COLORS.laborRates, color: '#374151', margin: [2, 1, 2, 1] },
      ...columns.map((col) => ({
        text: rateByRole[col.key] != null ? usd(rateByRole[col.key]!) : '',
        fontSize: 7,
        alignment: 'center' as const,
        border: [false, false, false, false],
        fillColor: COLORS.laborRates,
        color: '#374151',
      })),
      { text: '', fontSize: 7, border: [false, false, false, false], fillColor: COLORS.laborRates },
      { text: '', fontSize: 7, border: [false, false, false, false], fillColor: COLORS.laborRates },
    ];

    const matrixRows: object[][] = [headerRow, laborRatesRow];

    // ── Phase and subtask rows ─────────────────────────────────────────────────
    let phaseIndex = 0;
    for (const line of breakdown.lines) {
      const si = line.serviceItem as any;
      const excluded = new Set((line as any).excludedSubtaskIds ?? []);
      const usedSubtasks: any[] = (si.subtasks as any[]).filter(
        (st: any) => !excluded.has(st.id) && line.roleEstimates.some((e) => (e as any).subtaskId === st.id),
      );
      if (usedSubtasks.length === 0) continue;

      phaseIndex++;
      const phaseHoursByRole: Record<string, number> = {};
      columns.forEach((c) => { phaseHoursByRole[c.key] = 0; });
      let phaseTotal = 0;
      let phaseCost = 0;

      for (const est of line.roleEstimates) {
        if (phaseHoursByRole[est.role] !== undefined) {
          phaseHoursByRole[est.role] += est.estimatedHours;
          phaseTotal += est.estimatedHours;
          if (est.hourlyRate != null) phaseCost += est.estimatedHours * est.hourlyRate;
        }
      }

      // Phase header row — light blue
      matrixRows.push([
        { text: `${phaseIndex}   ${si.name}`, bold: true, fontSize: 9, border: [false, false, false, false], fillColor: COLORS.sectionHeader, margin: [2, 2, 2, 2] },
        ...columns.map((col) => ({
          text: phaseHoursByRole[col.key] > 0 ? phaseHoursByRole[col.key].toFixed(1) : '',
          fontSize: 8, bold: true, alignment: 'center' as const,
          border: [false, false, false, false], fillColor: COLORS.sectionHeader,
          color: phaseHoursByRole[col.key] > 0 ? '#1e3a5f' : '#d1d5db',
        })),
        { text: phaseTotal > 0 ? phaseTotal.toFixed(1) : '', fontSize: 8, bold: true, alignment: 'center' as const, border: [false, false, false, false], fillColor: COLORS.sectionHeader, color: '#1e3a5f' },
        { text: anyRates && phaseCost > 0 ? usd(phaseCost) : '', fontSize: 7, alignment: 'right' as const, border: [false, false, false, false], fillColor: COLORS.sectionHeader, color: '#1e3a5f', margin: [0, 0, 2, 0] },
      ]);

      // Subtask rows
      for (const subtask of usedSubtasks) {
        const subtaskEsts = line.roleEstimates.filter((e) => (e as any).subtaskId === subtask.id);
        const stByRole: Record<string, number> = {};
        let stTotal = 0;
        let stCost = 0;
        for (const est of subtaskEsts) {
          stByRole[est.role] = (stByRole[est.role] ?? 0) + est.estimatedHours;
          stTotal += est.estimatedHours;
          if (est.hourlyRate != null) stCost += est.estimatedHours * est.hourlyRate;
        }

        matrixRows.push([
          { text: `    ${subtask.name}`, fontSize: 8, color: '#4b5563', border: [false, false, false, false] },
          ...columns.map((col) => ({
            text: stByRole[col.key] > 0 ? stByRole[col.key].toFixed(1) : '',
            fontSize: 7, alignment: 'center' as const, color: '#374151',
            border: [false, false, false, false],
          })),
          { text: stTotal > 0 ? stTotal.toFixed(1) : '', fontSize: 7, alignment: 'center' as const, color: '#6b7280', border: [false, false, false, false] },
          { text: anyRates && stCost > 0 ? usd(stCost) : '', fontSize: 7, alignment: 'right' as const, color: '#9ca3af', border: [false, false, false, false], margin: [0, 0, 2, 0] },
        ]);
      }
    }

    // ── Footer rows ────────────────────────────────────────────────────────────

    // TOTAL HOURS row
    matrixRows.push([
      { text: 'TOTAL HOURS', bold: true, fontSize: 8, border: [false, true, false, false], fillColor: COLORS.totalHours, margin: [2, 2, 2, 2] },
      ...columns.map((col) => ({
        text: grandHoursByRole[col.key] > 0 ? grandHoursByRole[col.key].toFixed(1) : '',
        fontSize: 8, bold: true, alignment: 'center' as const,
        border: [false, true, false, false], fillColor: COLORS.totalHours,
        color: grandHoursByRole[col.key] > 0 ? '#1e3a5f' : '#d1d5db',
      })),
      { text: grandTotalHours > 0 ? grandTotalHours.toFixed(1) : '', fontSize: 8, bold: true, alignment: 'center' as const, border: [false, true, false, false], fillColor: COLORS.totalHours, color: '#1e3a5f' },
      { text: '', border: [false, true, false, false], fillColor: COLORS.totalHours },
    ]);

    if (anyRates) {
      // HOURLY RATE row
      matrixRows.push([
        { text: 'HOURLY RATE', bold: true, fontSize: 8, border: [false, false, false, false], fillColor: COLORS.hourlyRate, margin: [2, 1, 2, 1] },
        ...columns.map((col) => ({
          text: rateByRole[col.key] != null ? usd(rateByRole[col.key]!) : '',
          fontSize: 7, alignment: 'center' as const,
          border: [false, false, false, false], fillColor: COLORS.hourlyRate,
        })),
        { text: '', border: [false, false, false, false], fillColor: COLORS.hourlyRate },
        { text: '', border: [false, false, false, false], fillColor: COLORS.hourlyRate },
      ]);

      // TOTAL LABOR COST row — per role cost + grand total
      matrixRows.push([
        { text: 'TOTAL LABOR COST', bold: true, fontSize: 8, border: [false, false, false, false], fillColor: COLORS.laborCost, margin: [2, 1, 2, 1] },
        ...columns.map((col) => ({
          text: grandCostByRole[col.key] > 0 ? usd(grandCostByRole[col.key]) : '',
          fontSize: 7, alignment: 'center' as const,
          border: [false, false, false, false], fillColor: COLORS.laborCost,
        })),
        { text: '', border: [false, false, false, false], fillColor: COLORS.laborCost },
        { text: grandTotalLaborCost > 0 ? usd(grandTotalLaborCost) : '', fontSize: 8, bold: true, alignment: 'right' as const, border: [false, false, false, false], fillColor: COLORS.laborCost, margin: [0, 1, 2, 1] },
      ]);

      // DIRECT EXPENSES rows
      const mileageLabel = bd.mileageQty != null
        ? `${(bd.mileageQty as number).toLocaleString()} miles  @  $${(bd.mileageRate ?? 0).toFixed(2)} per mile  =`
        : '—';
      const lodgingLabel = bd.lodgingQty != null
        ? `${(bd.lodgingQty as number).toLocaleString()} nights  @  $${(bd.lodgingRate ?? 0).toFixed(2)} per night  =`
        : '—';
      const perDiemLabel = bd.perDiemQty != null
        ? `${(bd.perDiemQty as number).toLocaleString()} days  @  $${(bd.perDiemRate ?? 0).toFixed(2)} per day  =`
        : '—';

      const expenseRow = (label: string, fill: string, total: number, rowLabel: string): object[] => [
        {
          text: rowLabel,
          bold: true,
          fontSize: 8,
          border: [false, false, false, false],
          fillColor: fill,
          margin: [2, 1, 2, 1],
        },
        {
          text: label,
          colSpan: nCols + 1,
          fontSize: 7,
          alignment: 'left' as const,
          border: [false, false, false, false],
          fillColor: fill,
          margin: [4, 1, 4, 1],
          color: '#6b4226',
        },
        ...blanks(nCols),
        {
          text: total > 0 ? usd(total) : '$  –',
          fontSize: 7,
          bold: true,
          alignment: 'right' as const,
          border: [false, false, false, false],
          fillColor: fill,
          margin: [0, 1, 2, 1],
        },
      ];

      if (showDirectExpenses) {
        matrixRows.push(...[
          expenseRow(mileageLabel, COLORS.expenses, mileageTotal, 'DIRECT EXPENSES (MILEAGES)'),
          expenseRow(lodgingLabel, COLORS.expenses, lodgingTotal, 'DIRECT EXPENSES (LODGING)'),
          expenseRow(perDiemLabel, COLORS.expenses, perDiemTotal, 'DIRECT EXPENSES (PER DIEM)'),
        ]);
      }

      // TOTAL FEE
      matrixRows.push([
        ...footerLabel('TOTAL FEE', COLORS.totalFee),
        { text: usd(totalFee), fontSize: 9, bold: true, alignment: 'right' as const, border: [false, false, false, false], fillColor: COLORS.totalFee, margin: [0, 2, 2, 2] },
      ]);

      // ROUNDED FEE (only if explicitly set)
      if (roundedFee != null) {
        matrixRows.push([
          ...footerLabel('ROUNDED FEE', COLORS.roundedFee),
          { text: usd(roundedFee), fontSize: 9, bold: true, alignment: 'right' as const, border: [false, false, false, false], fillColor: COLORS.roundedFee, margin: [0, 2, 2, 2] },
        ]);
      }
    }

    // ── Document metadata ──────────────────────────────────────────────────────
    const clientName = (breakdown.lead as any)?.company || (breakdown.project as any)?.name || null;
    const projectName = (breakdown.lead as any)?.projectName || null;
    const jobType = (breakdown.jobType as any)?.name || null;
    const dateStr = new Date(breakdown.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const companyName = settings.companyName || 'Apex Consulting & Surveying';

    const tableWidths = ['*', ...columns.map(() => COL), TOT_HRS, TOT_FEE];

    const content: object[] = [
      // ── Document header ──────────────────────────────────────────────
      {
        columns: [
          {
            stack: [
              { text: 'MANHOUR JUSTIFICATION', bold: true, fontSize: 15, color: '#1e3a5f', margin: [0, 0, 0, 2] },
              { text: breakdown.title, fontSize: 10, color: '#374151', bold: true },
              ...(clientName ? [{ text: clientName, fontSize: 9, color: '#6b7280', margin: [0, 1, 0, 0] }] : []),
              ...(projectName ? [{ text: projectName, fontSize: 8, color: '#9ca3af' }] : []),
              ...(jobType ? [{ text: jobType, fontSize: 8, color: '#9ca3af' }] : []),
            ],
          },
          {
            stack: [
              { text: companyName, fontSize: 10, bold: true, alignment: 'right' as const, color: '#1e3a5f' },
              { text: `Date: ${dateStr}`, fontSize: 8, alignment: 'right' as const, color: '#6b7280', margin: [0, 2, 0, 0] },
            ],
            width: 180,
          },
        ],
        margin: [0, 0, 0, 10],
      },
      // Horizontal rule
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 532, y2: 0, lineWidth: 1.5, lineColor: '#1e3a5f' }], margin: [0, 0, 0, 10] },
      // Matrix table
      {
        table: {
          headerRows: 2,
          widths: tableWidths,
          body: matrixRows,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0.3),
          vLineWidth: () => 0.3,
          hLineColor: () => '#d1d5db',
          vLineColor: () => '#e5e7eb',
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
    ];

    const docDefinition = {
      pageSize: 'LETTER' as const,
      pageOrientation: 'portrait' as const,
      pageMargins: [40, 44, 40, 40] as [number, number, number, number],
      defaultStyle: { font: 'Roboto', fontSize: 8, color: '#374151' },
      content,
      footer: (currentPage: number, pageCount: number) =>
        pageCount > 1
          ? {
              text: `${currentPage} / ${pageCount}`,
              alignment: 'right' as const,
              fontSize: 7,
              color: '#9ca3af',
              margin: [0, 6, 40, 0],
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
