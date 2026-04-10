// eslint-disable-next-line @typescript-eslint/no-var-requires
const PizZip = require('pizzip') as typeof import('pizzip');
import { mergeAdjacentHighlightedRuns, normalizeDocpropertyFields } from './proposal-fill.util';

/**
 * Bracket placeholder names that are handled by the fixed fill system and
 * should NOT appear as dynamic custom fields in the editor.
 */
const KNOWN_BRACKET_NAMES = new Set([
  'First Name',
  'Last Name',
  'First Last Name',
  'Company Name',
  'Address',
  'Suite',
  'City',
  'State',
  'ZIP Code',
  'ZIP',
  'Project Name',
  'Project Address',
  'Project Name, Address',
  'Address/Project Name',
  'Mr./Mrs./Ms.',
  'Mr.,Mrs.',
  'Name',
  'Month',
  'DD',
  'YYYY',
]);

export interface EditableTableCell {
  rowIndex: number;
  cellIndex: number;
  text: string;
  key: string; // e.g. "t0r1c1"
}

export interface EditableTableRow {
  rowIndex: number;
  cells: EditableTableCell[];
}

export interface EditableTable {
  tableIndex: number;
  rows: EditableTableRow[];
}

export interface EditableParagraph {
  index: number; // Global paragraph index (stable between extract and fill)
  text: string;  // Raw text with placeholders intact
}

export interface TemplateFields {
  dynamicFields: string[]; // Unknown bracket names not in the fixed system
  tables: EditableTable[];
  editableParagraphs: EditableParagraph[];
}

/**
 * Scans a .docx buffer and returns:
 * - dynamicFields: bracket placeholder names not handled by the fixed fill system
 * - tables: all tables with their cell content (for inline editing)
 */
export function extractTemplateFields(buffer: Buffer): TemplateFields {
  const zip = new PizZip(buffer);
  const xmlFile = zip.files['word/document.xml'];
  if (!xmlFile) return { dynamicFields: [], tables: [], editableParagraphs: [] };

  let xml = xmlFile.asText();
  // Merge split highlighted runs so brackets across multiple runs are joined
  xml = mergeAdjacentHighlightedRuns(xml);

  // ── 1. Find dynamic bracket fields ───────────────────────────────────────
  const dynamicFields: string[] = [];
  const seen = new Set<string>();
  const bracketRe = /\[([^\]]{1,80})\]/g;
  let m: RegExpExecArray | null;

  while ((m = bracketRe.exec(xml)) !== null) {
    const name = m[1].trim();
    if (!KNOWN_BRACKET_NAMES.has(name) && !seen.has(name)) {
      seen.add(name);
      dynamicFields.push(name);
    }
  }

  // ── 2. Extract all tables ─────────────────────────────────────────────────
  const tables: EditableTable[] = [];
  const tblRe = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g;
  let tableIdx = 0;

  while ((m = tblRe.exec(xml)) !== null) {
    const tableXml = m[0];
    const rows: EditableTableRow[] = [];

    const trRe = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
    let rowIdx = 0;
    let rm: RegExpExecArray | null;

    while ((rm = trRe.exec(tableXml)) !== null) {
      const rowXml = rm[0];
      const cells: EditableTableCell[] = [];

      const tcRe = /<w:tc>[\s\S]*?<\/w:tc>/g;
      let cellIdx = 0;
      let cm: RegExpExecArray | null;

      while ((cm = tcRe.exec(rowXml)) !== null) {
        const cellXml = cm[0];
        const texts: string[] = [];
        const textRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
        let tm: RegExpExecArray | null;
        while ((tm = textRe.exec(cellXml)) !== null) {
          texts.push(tm[1]);
        }
        const text = texts
          .join('')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim();

        cells.push({
          rowIndex: rowIdx,
          cellIndex: cellIdx,
          text,
          key: `t${tableIdx}r${rowIdx}c${cellIdx}`,
        });
        cellIdx++;
      }

      if (cells.length > 0) {
        rows.push({ rowIndex: rowIdx, cells });
      }
      rowIdx++;
    }

    if (rows.length > 0) {
      tables.push({ tableIndex: tableIdx, rows });
    }
    tableIdx++;
  }

  // ── 3. Extract editable paragraphs (non-table only) ─────────────────────────
  // Compute table ranges so we can exclude paragraphs inside tables.
  const tableRanges: Array<[number, number]> = [];
  {
    const tRe = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(xml)) !== null) {
      tableRanges.push([tm.index, tm.index + tm[0].length]);
    }
  }

  const editableParagraphs: EditableParagraph[] = [];
  const allParaRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let globalParaIdx = 0;
  let pm: RegExpExecArray | null;
  while ((pm = allParaRe.exec(xml)) !== null) {
    const insideTable = tableRanges.some(([s, e]) => pm!.index >= s && pm!.index < e);
    if (!insideTable) {
      // Normalize DOCPROPERTY fields to bracket notation for display
      const normalizedParaXml = normalizeDocpropertyFields(pm[0]);
      let text = '';
      const tRe2 = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      let textMatch: RegExpExecArray | null;
      while ((textMatch = tRe2.exec(normalizedParaXml)) !== null) {
        text += textMatch[1];
      }
      text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      editableParagraphs.push({ index: globalParaIdx, text });
    }
    globalParaIdx++;
  }

  return { dynamicFields, tables, editableParagraphs };
}
