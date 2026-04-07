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

    // Only include role columns where at least one estimate exists
    const usedRoleKeys = new Set(
      breakdown.lines.flatMap((l) => l.roleEstimates).map((e) => e.role),
    );
    const columns = allRoles.filter((r) => usedRoleKeys.has(r.key));

    // Grand totals per role
    const grandTotalByRole: Record<string, number> = {};
    columns.forEach((c) => (grandTotalByRole[c.key] = 0));
    let grandTotalHours = 0;
    for (const est of breakdown.lines.flatMap((l) => l.roleEstimates)) {
      if (grandTotalByRole[est.role] !== undefined) {
        grandTotalByRole[est.role] += est.estimatedHours;
        grandTotalHours += est.estimatedHours;
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
    const accentColor = settings.accentColor || '#1a56db';
    const COL_WIDTH = 32;
    const TOTAL_WIDTH = 40;
    const HEADER_TOP_MARGIN = 50;

    // Header row with rotated role labels
    const headerRow: object[] = [
      { text: '', border: [false, false, false, true] },
      ...columns.map((col) => ({
        text: col.label,
        rotation: -60,
        fontSize: 8,
        bold: true,
        alignment: 'left' as const,
        margin: [2, HEADER_TOP_MARGIN, 2, 2],
        border: [false, false, false, true],
        color: '#333333',
      })),
      {
        text: 'Total\nhrs',
        fontSize: 8,
        bold: true,
        alignment: 'center' as const,
        border: [false, false, false, true],
        margin: [0, HEADER_TOP_MARGIN, 0, 2],
      },
    ];

    const matrixRows: object[][] = [headerRow];

    for (const line of breakdown.lines) {
      const si = line.serviceItem as any;
      const usedSubtasks: any[] = (si.subtasks as any[]).filter((st: any) =>
        line.roleEstimates.some((e) => (e as any).subtaskId === st.id),
      );
      if (usedSubtasks.length === 0) continue;

      // Phase row: sum all estimates for this line per role
      const phaseTotalByRole: Record<string, number> = {};
      columns.forEach((c) => (phaseTotalByRole[c.key] = 0));
      let phaseTotal = 0;
      for (const est of line.roleEstimates) {
        if (phaseTotalByRole[est.role] !== undefined) {
          phaseTotalByRole[est.role] += est.estimatedHours;
          phaseTotal += est.estimatedHours;
        }
      }

      matrixRows.push([
        { text: si.name, bold: true, fontSize: 10, border: [false, false, false, false], fillColor: '#f0f4ff' },
        ...columns.map((col) => ({
          text: phaseTotalByRole[col.key] > 0 ? phaseTotalByRole[col.key].toFixed(1) : '0',
          fontSize: 9,
          bold: true,
          alignment: 'center' as const,
          border: [false, false, false, false],
          fillColor: '#f0f4ff',
        })),
        {
          text: phaseTotal > 0 ? phaseTotal.toFixed(1) : '0',
          fontSize: 9,
          bold: true,
          alignment: 'center' as const,
          border: [false, false, false, false],
          fillColor: '#f0f4ff',
        },
      ]);

      // Subtask rows (only subtasks with at least one estimate)
      for (const subtask of usedSubtasks) {
        const subtaskEstimates = line.roleEstimates.filter((e) => (e as any).subtaskId === subtask.id);
        const subtaskByRole: Record<string, number> = {};
        let subtaskTotal = 0;
        for (const est of subtaskEstimates) {
          subtaskByRole[est.role] = (subtaskByRole[est.role] ?? 0) + est.estimatedHours;
          subtaskTotal += est.estimatedHours;
        }

        matrixRows.push([
          { text: `    ${subtask.name}`, fontSize: 9, color: '#555555', border: [false, false, false, false] },
          ...columns.map((col) => ({
            text: subtaskByRole[col.key] > 0 ? subtaskByRole[col.key].toFixed(1) : '0',
            fontSize: 9,
            alignment: 'center' as const,
            color: '#666666',
            border: [false, false, false, false],
          })),
          {
            text: subtaskTotal > 0 ? subtaskTotal.toFixed(1) : '0',
            fontSize: 9,
            alignment: 'center' as const,
            color: '#666666',
            border: [false, false, false, false],
          },
        ]);
      }
    }

    // Totals row
    matrixRows.push([
      { text: 'TOTAL', bold: true, fontSize: 10, border: [false, true, false, false], fillColor: '#f0f4ff' },
      ...columns.map((col) => ({
        text: grandTotalByRole[col.key] > 0 ? grandTotalByRole[col.key].toFixed(1) : '0',
        fontSize: 9,
        bold: true,
        alignment: 'center' as const,
        border: [false, true, false, false],
        fillColor: '#f0f4ff',
      })),
      {
        text: grandTotalHours > 0 ? grandTotalHours.toFixed(1) : '0',
        fontSize: 9,
        bold: true,
        alignment: 'center' as const,
        border: [false, true, false, false],
        fillColor: '#f0f4ff',
      },
    ]);

    // Document header metadata
    const linkedTo = (breakdown.lead as any)?.company || (breakdown.project as any)?.name || null;
    const jobType = (breakdown.serviceType as any)?.name || null;
    const dateStr = new Date(breakdown.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const companyInfoLines: object[] = [];
    if (settings.companyAddress) {
      companyInfoLines.push({ text: settings.companyAddress, fontSize: 9, color: '#555555' });
    }
    const contactParts: string[] = [];
    if (settings.companyPhone) contactParts.push(settings.companyPhone);
    if (settings.companyEmail) contactParts.push(settings.companyEmail);
    if (contactParts.length > 0) {
      companyInfoLines.push({ text: contactParts.join('  |  '), fontSize: 9, color: '#555555' });
    }

    const metaParts: string[] = [];
    if (linkedTo) metaParts.push(linkedTo);
    if (jobType) metaParts.push(jobType);
    metaParts.push(dateStr);

    const content: object[] = [
      {
        columns: [
          {
            stack: [
              { text: settings.companyName || 'Apex Consulting & Surveying', fontSize: 18, bold: true, color: accentColor },
              ...companyInfoLines,
            ],
          },
          {
            stack: [
              { text: 'COST BREAKDOWN', fontSize: 20, bold: true, alignment: 'right' as const, color: '#333333' },
              { text: breakdown.title, fontSize: 11, alignment: 'right' as const, color: '#555555', margin: [0, 2, 0, 0] },
              { text: metaParts.join('  ·  '), fontSize: 9, alignment: 'right' as const, color: '#888888', margin: [0, 4, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 16],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 760, y2: 0, lineWidth: 1, lineColor: accentColor }],
        margin: [0, 0, 0, 16],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', ...columns.map(() => COL_WIDTH), TOTAL_WIDTH],
          body: matrixRows,
        },
        layout: {
          hLineWidth: (i: number, node: any) =>
            i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#dddddd',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        margin: [0, 0, 0, 24],
      },
    ];

    // Cost section — only if any estimates have rates
    const estimatesWithRate = breakdown.lines
      .flatMap((l) => l.roleEstimates)
      .filter((e) => (e as any).hourlyRate != null);

    if (estimatesWithRate.length > 0) {
      const costByRole: Record<string, { hours: number; rate: number; label: string }> = {};
      for (const est of estimatesWithRate) {
        const roleLabel = allRoles.find((r) => r.key === est.role)?.label ?? est.role;
        if (!costByRole[est.role]) {
          costByRole[est.role] = { hours: 0, rate: (est as any).hourlyRate as number, label: roleLabel };
        }
        costByRole[est.role].hours += est.estimatedHours;
      }

      const costRows: object[][] = [
        [
          { text: 'Role', bold: true, color: '#ffffff', fillColor: accentColor, fontSize: 9 },
          { text: 'Hours', bold: true, color: '#ffffff', fillColor: accentColor, fontSize: 9, alignment: 'right' as const },
          { text: 'Rate', bold: true, color: '#ffffff', fillColor: accentColor, fontSize: 9, alignment: 'right' as const },
          { text: 'Cost', bold: true, color: '#ffffff', fillColor: accentColor, fontSize: 9, alignment: 'right' as const },
        ],
      ];

      let totalCost = 0;
      for (const info of Object.values(costByRole)) {
        const cost = info.hours * info.rate;
        totalCost += cost;
        costRows.push([
          { text: info.label, fontSize: 9 },
          { text: info.hours.toFixed(1), fontSize: 9, alignment: 'right' as const },
          { text: `$${info.rate}/hr`, fontSize: 9, alignment: 'right' as const },
          { text: formatCurrency(cost, 'USD'), fontSize: 9, alignment: 'right' as const },
        ]);
      }

      costRows.push([
        { text: 'Total Est. Cost', bold: true, fontSize: 9, colSpan: 3, fillColor: '#f0f4ff' },
        {},
        {},
        { text: formatCurrency(totalCost, 'USD'), bold: true, fontSize: 9, alignment: 'right' as const, fillColor: '#f0f4ff' },
      ]);

      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 60, 70, 80],
          body: costRows,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e0e0e0',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      } as object);

      const allEstHours = breakdown.lines.flatMap((l) => l.roleEstimates).reduce((s, e) => s + e.estimatedHours, 0);
      const ratedHours = estimatesWithRate.reduce((s, e) => s + e.estimatedHours, 0);
      if (ratedHours < allEstHours) {
        content.push({
          text: '⚠ Some roles have no hourly rate — cost estimate is partial.',
          fontSize: 8,
          color: '#b45309',
          margin: [0, 6, 0, 0],
        } as object);
      }
    }

    const docDefinition = {
      pageSize: 'A4' as const,
      pageOrientation: 'landscape' as const,
      pageMargins: [40, 50, 40, 50] as [number, number, number, number],
      defaultStyle: { font: 'Roboto', fontSize: 9, color: '#333333' },
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
}
