import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QuoteSettingsService } from './quote-settings.service';
import * as path from 'path';
import * as fs from 'fs';

// sharp is CommonJS (`module.exports = <function>`). tsconfig has
// `allowSyntheticDefaultImports` but NOT `esModuleInterop`, so a plain
// `import sharp from 'sharp'` compiles to `sharp_1.default` which is
// undefined at runtime — use require to grab the function directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: typeof import('sharp') = require('sharp');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake/js/Printer').default;

function resolveFontPath(filename: string): string {
  const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
  return path.join(pdfmakeDir, 'fonts', 'Roboto', filename);
}

/**
 * Resolve a path to a file under backend/assets/, working both for compiled
 * code (`dist/quotes/pdf.service.js` → `../../assets/...`) and for ts-node
 * dev mode (`src/quotes/pdf.service.ts` → `../../assets/...`).
 */
function resolveAssetPath(filename: string): string {
  return path.resolve(__dirname, '..', '..', 'assets', filename);
}

let cachedLogoDataUrl: string | null = null;
function loadApexLogoDataUrl(): string | null {
  if (cachedLogoDataUrl !== null) return cachedLogoDataUrl || null;
  try {
    const buf = fs.readFileSync(resolveAssetPath('apex-logo.png'));
    cachedLogoDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    return cachedLogoDataUrl;
  } catch {
    cachedLogoDataUrl = '';
    return null;
  }
}

function escapePangoMarkup(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render a single piece of text using sharp's native text input and rotate it
 * by the given angle. Returns a Buffer of an RGBA PNG with a transparent
 * background. pdfmake's SVG-text rendering ignores `transform="rotate(...)"`,
 * so we have to bake the rotation into a raster image instead.
 */
async function renderRotatedTextPng(
  text: string,
  fontSizePt: number,
  angleDeg: number,
  maxLineWidthPx: number,
  dpi: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  // Important: we rely on `dpi` + a Pango-markup `size="Npt"` to get a
  // specific, deterministic text size. Without `dpi`, sharp auto-fits the
  // text to fill the given `width`/`height` box which gave us wildly
  // different (and huge) glyph sizes. With `dpi` set, `height` must be
  // omitted (sharp errors otherwise).
  //
  // We also point `fontfile` at the bundled Roboto-Medium.ttf (same font
  // pdfmake uses) so glyph widths are identical on macOS and Linux.
  //
  // `wrap: 'word'` keeps each word intact. Long single-word labels (e.g.
  // "ADMINISTRATOR") overflow the width and stay single-line.
  const horizontal = await sharp({
    text: {
      text:
        `<span foreground="#374151" font_weight="bold" size="${fontSizePt}pt">` +
        `${escapePangoMarkup(text)}</span>`,
      fontfile: resolveFontPath('Roboto-Medium.ttf'),
      font: 'Roboto',
      width: maxLineWidthPx,
      rgba: true,
      align: 'left' as const,
      wrap: 'word' as const,
      dpi,
    },
  })
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });

  // Rotate around center (sharp's default), with transparent background.
  const rotated = await sharp(horizontal.data)
    .rotate(angleDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: rotated.data,
    width: rotated.info.width,
    height: rotated.info.height,
  };
}

/**
 * Render a horizontal "FEE COMPUTATION WORKSHEET" title block with a
 * rectangular border, sized to fit a given pixel box. Used as a composite
 * onto the leading empty area of the headers PNG so the title block sits in
 * the task-description column visual area.
 */
async function renderTitleBlockPng(
  widthPx: number,
  heightPx: number,
  pixelsPerPoint: number,
): Promise<Buffer> {
  const dpi = pixelsPerPoint * 72;
  // Render the two lines of text via sharp's text input. Point size is
  // specified in the Pango markup so dpi controls the pixel size.
  const textImg = await sharp({
    text: {
      text:
        '<span foreground="#1e3a5f" font_weight="bold" size="11pt">' +
        'FEE COMPUTATION\nWORKSHEET</span>',
      fontfile: resolveFontPath('Roboto-Medium.ttf'),
      font: 'Roboto',
      width: widthPx - Math.round(8 * pixelsPerPoint),
      rgba: true,
      align: 'center' as const,
      dpi,
    },
  })
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });

  // Border rectangle as an SVG (svg-to-pdfkit clip and rect rendering works,
  // it's only `rotate(text)` that breaks). We render it via sharp because we
  // want a PNG, not pdfmake-rendered SVG.
  const borderInsetPx = Math.round(4 * pixelsPerPoint);
  const innerW = widthPx - 2 * borderInsetPx;
  const innerH = heightPx - 2 * borderInsetPx;
  const strokePx = Math.max(1, Math.round(0.6 * pixelsPerPoint));
  const borderSvg =
    `<svg width="${widthPx}" height="${heightPx}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="${borderInsetPx + strokePx / 2}" y="${borderInsetPx + strokePx / 2}" ` +
    `width="${innerW - strokePx}" height="${innerH - strokePx}" ` +
    `fill="none" stroke="#1e3a5f" stroke-width="${strokePx}"/>` +
    `</svg>`;

  // Center the text inside the bordered area.
  const textLeft = Math.max(0, Math.round((widthPx - textImg.info.width) / 2));
  const textTop = Math.max(0, Math.round((heightPx - textImg.info.height) / 2));

  return sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      { input: Buffer.from(borderSvg), left: 0, top: 0 },
      { input: textImg.data, left: textLeft, top: textTop },
    ])
    .png()
    .toBuffer();
}

/**
 * Compose all rotated column headers into a single transparent PNG sized to
 * fit the *entire* table width — including the leading "task description"
 * column. The leading area stays empty so the leftmost rotated label has
 * room to project its tail upward and to the left into that area (this is
 * what makes the Apex layout look like the example: rotated tails extend
 * over the title-block region instead of getting clipped).
 *
 * Each label is positioned so the END of its (now-rotated) text lands at
 * the bottom-center of its column. After sharp rotates a horizontal strip
 * by -60° around its center, the END of the original text ends up at the
 * bottom-right of the new bbox, so we position the rotated image so its
 * bottom-right corner equals the desired pivot point.
 *
 * Canvas height adapts to the longest label so the rotated text is never
 * clipped — the caller reads `heightPt` back to set the table row height.
 */
async function renderColumnHeadersPng(
  labels: string[],
  columnWidthsPt: number[],
  leadingEmptyPt: number,
  pixelsPerPoint: number,
  fontSizePt: number,
): Promise<{
  buffer: Buffer;
  widthPx: number;
  heightPx: number;
  heightPt: number;
  widthPt: number;
}> {
  const totalWidthPt = leadingEmptyPt + columnWidthsPt.reduce((a, b) => a + b, 0);
  const widthPx = Math.round(totalWidthPt * pixelsPerPoint);
  // Sharp needs an explicit `dpi` to render text at a specific point size.
  // `pixelsPerPoint * 72` is the correct conversion: at 72 DPI, 1 pt = 1 px,
  // so at 288 DPI (pixelsPerPoint=4) 1 pt = 4 px.
  const dpi = pixelsPerPoint * 72;
  // Wrap width in pixels at the target DPI. Tuned so short/medium labels
  // stay single-line but long ones ("SURVEY CREW CHIEF", "SURVEY
  // TECHNICIAN") break at a word boundary — measured with Roboto-Medium.
  const maxLineWidthPx = Math.round(fontSizePt * pixelsPerPoint * 9);

  const rendered = await Promise.all(
    labels.map((label) =>
      renderRotatedTextPng(label, fontSizePt, -60, maxLineWidthPx, dpi),
    ),
  );

  // Canvas height = tallest rotated label + a small bottom padding.
  const bottomPaddingPx = Math.round(3 * pixelsPerPoint);
  const maxRotatedHeight = rendered.reduce((m, r) => Math.max(m, r.height), 0);
  const heightPx = maxRotatedHeight + bottomPaddingPx;

  let cursorPx = Math.round(leadingEmptyPt * pixelsPerPoint);
  const composites = rendered.map((r, i) => {
    const colWidthPx = Math.round(columnWidthsPt[i] * pixelsPerPoint);
    // Pivot at the RIGHT edge of the column (where the column divider
    // line is). Matches the Apex reference: each rotated label's END is
    // anchored to the right border of its column, and the tail extends
    // up-and-left from there.
    const pivotX = cursorPx + colWidthPx;
    const pivotY = heightPx - bottomPaddingPx;
    const left = Math.max(0, pivotX - r.width);
    const top = Math.max(0, pivotY - r.height);
    cursorPx += colWidthPx;
    return { input: r.buffer, left, top };
  });

  // Title block composited into the leading empty area, vertically centered
  // (and slightly inset from the canvas edges so the border has breathing room).
  const titleInsetPx = Math.round(8 * pixelsPerPoint);
  const titleWidthPx = Math.round(leadingEmptyPt * pixelsPerPoint) - 2 * titleInsetPx;
  const titleHeightPx = Math.min(
    heightPx - 2 * titleInsetPx,
    Math.round(50 * pixelsPerPoint),
  );
  if (titleWidthPx > 0 && titleHeightPx > 0) {
    const titleBuf = await renderTitleBlockPng(
      titleWidthPx,
      titleHeightPx,
      pixelsPerPoint,
    );
    composites.unshift({
      input: titleBuf,
      left: titleInsetPx,
      top: Math.max(0, heightPx - titleHeightPx - titleInsetPx),
    });
  }

  const composed = await sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: composed.data,
    widthPx: composed.info.width,
    heightPx: composed.info.height,
    heightPt: composed.info.height / pixelsPerPoint,
    widthPt: totalWidthPt,
  };
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

    // Column widths: task-description ('*'), one per role, total-hours, total-fee.
    // Role columns are wide enough that 2-line-wrapped rotated labels don't
    // overlap their neighbours (the math: at 8pt font + wrap to ~2 lines,
    // the rotated bbox is ~140-170px, which fits in a 44pt column = 176px
    // at 4 pixels-per-point).
    const COL = 44;
    const TOT_HRS = 44;
    const TOT_FEE = 62;
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
    // Left cell: "FEE COMPUTATION WORKSHEET" title block, rowSpan 2 so it
    // covers both the rotated-header row and the labor-rates row.
    //
    // Role + total columns: rotated text doesn't render at all in pdfmake's
    // SVG support, so we composite all labels into a single PNG via sharp
    // and use a colSpan cell to host it. The rotation pivot of each label
    // sits centered over its column position.
    const headerLabels = [
      ...columns.map((c) => c.label.toUpperCase()),
      'TOTAL HOURS',
      'TOTAL FEE',
    ];
    const headerColumnWidthsPt = [
      ...columns.map(() => COL),
      TOT_HRS,
      TOT_FEE,
    ];
    // Compute the leading task-description column width so the headers image
    // can include it as transparent left padding (gives the leftmost rotated
    // labels' tails room to extend over the title-block area).
    // Page width minus margins minus the fixed-width columns to the right.
    const PAGE_W = 612; // Letter
    const PAGE_MARGINS = 80; // 40 left + 40 right
    const TASK_COL_WIDTH = Math.max(
      120,
      PAGE_W - PAGE_MARGINS - (nCols * COL + TOT_HRS + TOT_FEE),
    );

    const headerImage = await renderColumnHeadersPng(
      headerLabels,
      headerColumnWidthsPt,
      TASK_COL_WIDTH,
      4, // 4 device pixels per PDF point — sharp text stays crisp at this density
      6, // font size in PDF points (small, like the Apex example)
    );
    const headerImageDataUrl = `data:image/png;base64,${headerImage.buffer.toString('base64')}`;
    const headerRowHeightPt = headerImage.heightPt;

    // The headers image is rendered as a STANDALONE element above the
    // table (not as a table cell). This way cell padding doesn't shift it
    // relative to the data columns — the image sits at the exact same
    // horizontal position as the table, so each rotated label lines up
    // with its column below.

    // ── Labor Rates row ────────────────────────────────────────────────
    const laborRatesRow: object[] = [
      { text: 'Labor Rates (Hrly)', fontSize: 7, bold: true, color: '#374151', fillColor: COLORS.laborRates, border: [false, false, false, true] as [boolean, boolean, boolean, boolean], margin: [2, 1, 2, 1] as [number, number, number, number] },
      ...columns.map((col) => ({
        text: rateByRole[col.key] != null ? usd(rateByRole[col.key]!) : '',
        fontSize: 7,
        alignment: 'center' as const,
        border: [false, false, false, true] as [boolean, boolean, boolean, boolean],
        fillColor: COLORS.laborRates,
        color: '#374151',
      })),
      { text: '', fontSize: 7, border: [false, false, false, true] as [boolean, boolean, boolean, boolean], fillColor: COLORS.laborRates },
      { text: '', fontSize: 7, border: [false, false, false, true] as [boolean, boolean, boolean, boolean], fillColor: COLORS.laborRates },
    ];

    // ── "Labor Rates (Hrly)" label row — appears just below the title block,
    //    above the first phase. The leftmost cell is a regular header now
    //    (the title block has ended). This is what introduces the
    //    "Task Description" header for the data rows.
    const taskHeaderRow: object[] = [
      { text: 'Task Description', fontSize: 8, bold: true, color: '#374151', border: [false, true, false, true], fillColor: '#ffffff', margin: [2, 2, 2, 2] },
      ...columns.map(() => ({ text: '', border: [false, true, false, true], fillColor: '#ffffff' })),
      { text: '', border: [false, true, false, true], fillColor: '#ffffff' },
      { text: '', border: [false, true, false, true], fillColor: '#ffffff' },
    ];

    const matrixRows: object[][] = [laborRatesRow, taskHeaderRow];

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

    // Explicit task-column width (rather than '*') so the pdfmake column
    // positions exactly match the column positions baked into the headers
    // image. pdfmake's '*' calculation accounts for internal padding and
    // gives a slightly different width than our compute, which offset the
    // rotated labels from their columns.
    const tableWidths = [TASK_COL_WIDTH, ...columns.map(() => COL), TOT_HRS, TOT_FEE];

    const logoDataUrl = loadApexLogoDataUrl();
    const projectLabelLine =
      projectName || clientName || breakdown.title || '—';

    const content: object[] = [
      // ── Document header: "Survey Manhours" + project label on the left,
      //    Apex logo (or company text fallback) on the right.
      {
        columns: [
          {
            stack: [
              { text: 'Survey Manhours', fontSize: 11, bold: true, color: '#1e3a5f', margin: [0, 0, 0, 1] },
              { text: `Project: ${projectLabelLine}`, fontSize: 9, color: '#374151', bold: true },
              ...(clientName && clientName !== projectLabelLine
                ? [{ text: clientName, fontSize: 8, color: '#6b7280', margin: [0, 1, 0, 0] }]
                : []),
              ...(jobType ? [{ text: jobType, fontSize: 8, color: '#9ca3af' }] : []),
            ],
          },
          logoDataUrl
            ? { image: logoDataUrl, width: 90, alignment: 'right' as const }
            : {
                stack: [
                  { text: companyName, fontSize: 10, bold: true, alignment: 'right' as const, color: '#1e3a5f' },
                  { text: `Date: ${dateStr}`, fontSize: 8, alignment: 'right' as const, color: '#6b7280', margin: [0, 2, 0, 0] },
                ],
                width: 180,
              },
        ],
        margin: [0, 0, 0, 14],
      },
      // Date strip below header (when logo is shown, date moves here so the
      // logo can dominate the right side without competing text)
      ...(logoDataUrl
        ? [
            {
              text: `Date: ${dateStr}`,
              fontSize: 8,
              alignment: 'right' as const,
              color: '#6b7280',
              margin: [0, -8, 0, 8] as [number, number, number, number],
            },
          ]
        : []),
      // Matrix table
      {
        table: {
          headerRows: 3,
          widths: tableWidths,
          // Force the rotated-header row to the exact height of the
          // composited PNG; remaining rows auto-size from content.
          heights: (rowIndex: number) => (rowIndex === 0 ? headerRowHeightPt : ('auto' as any)),
          body: matrixRows,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0.5 : 0.3),
          vLineWidth: () => 0.3,
          hLineColor: () => '#9ca3af',
          vLineColor: () => '#9ca3af',
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
