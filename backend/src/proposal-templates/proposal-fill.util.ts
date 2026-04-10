// eslint-disable-next-line @typescript-eslint/no-var-requires
const PizZip = require('pizzip') as typeof import('pizzip');

export interface ProposalData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  salutation?: string;
  companyName?: string;
  address?: string;
  suite?: string;
  city?: string;
  state?: string;
  zip?: string;
  projectName?: string;
  projectAddress?: string;
  projectDescription?: string;
  totalAmount?: string;
  timeline?: string;
  proposalDate?: string;
  month?: string;
  day?: string;
  year?: string;
}

// DOCPROPERTY field name → ProposalData key
const DOCPROPERTY_MAP: Record<string, keyof ProposalData> = {
  'First Name': 'firstName',
  'Last Name': 'lastName',
  'Company Name': 'companyName',
  Address: 'address',
  City: 'city',
  State: 'state',
  'ZIP Code': 'zip',
  'Mr./Mrs./Ms.': 'salutation',
  'Mr.,Mrs.': 'salutation',
  'Project Name': 'projectName',
  'Project Address': 'projectAddress',
  Fee: 'totalAmount',
  Timeline: 'timeline',
};

// ── Symbol font → Unicode mapping ─────────────────────────────────────────────
// Maps common <w:sym> glyph codes (hex char codes in the Private Use Area) to
// their Unicode equivalents so LibreOffice can render them without requiring
// the original symbol font (Wingdings, Symbol, etc.) to be installed.

const WINGDINGS_MAP: Record<string, string> = {
  'F020': ' ',  // space
  'F028': '✔',  // check mark
  'F04E': '✕',  // x mark
  'F050': '●',  // filled circle
  'F0B7': '•',  // bullet
  'F076': '◆',  // black diamond
  'F0FC': '✓',  // check mark
  'F0FE': '☑',  // ballot box with check
  'F036': '★',  // star
  'F025': '⊲',  // left-pointing triangle
  'F027': '▸',  // right-pointing triangle
  'F0D8': '➜',  // right arrow
  'F0E0': '✉',  // envelope
  'F06E': '⌚',  // watch / time
  'F09F': '➤',  // filled right arrow
};

const SYMBOL_MAP: Record<string, string> = {
  'F020': ' ',  // space
  'F0B7': '·',  // middle dot
  'F0A8': '»',  // double right arrow
  'F0B8': '÷',  // division sign
  'F0B4': '×',  // multiplication sign (Symbol font)
};

/**
 * Convert `<w:sym w:font="..." w:char="..."/>` elements to plain Unicode text
 * runs so they render correctly even when the symbol font is not installed.
 */
export function preprocessSymbolElements(xml: string): string {
  return xml.replace(
    /<w:sym\s+w:font="([^"]+)"\s+w:char="([0-9A-Fa-f]+)"[^>]*\/>/g,
    (_match, font: string, charCode: string) => {
      const code = charCode.toUpperCase();
      let unicode: string | undefined;
      if (font.toLowerCase().includes('wingdings')) {
        unicode = WINGDINGS_MAP[code];
      } else if (font.toLowerCase() === 'symbol') {
        unicode = SYMBOL_MAP[code];
      }
      if (!unicode) return _match; // keep original if unmapped
      return `<w:t>${escapeXml(unicode)}</w:t>`;
    },
  );
}

/**
 * Convert Private Use Area characters that live inside `<w:t>` text runs whose
 * `<w:rPr>` declares a Wingdings or Symbol font.
 *
 * Word stores e.g. a black diamond ornament as `<w:t>\uF076</w:t>` with a
 * `<w:rFonts w:ascii="Wingdings" .../>` ancestor — relying on the font to map
 * the PUA codepoint to the diamond glyph. Servers without Wingdings installed
 * (Liberation/FreeFont/Noto, the LibreOffice defaults on Linux) substitute a
 * font that has no PUA glyphs, so the chars render as tofu boxes — and tofu
 * is often taller than the original glyph, contributing to page overflow.
 *
 * We rewrite each such run by mapping the PUA codepoints to real Unicode and
 * stripping the symbol-font reference so the result renders in the inherited
 * default font (which always has these Unicode glyphs).
 */
export function convertSymbolFontTextRuns(xml: string): string {
  return xml.replace(
    /(<w:r\b[^>]*>)(<w:rPr>[\s\S]*?<\/w:rPr>)([\s\S]*?)(<\/w:r>)/g,
    (match, openTag: string, rPr: string, body: string, closeTag: string) => {
      const fontMatch = rPr.match(/<w:rFonts\b[^>]*\bw:ascii="([^"]+)"/);
      if (!fontMatch) return match;
      const font = fontMatch[1].toLowerCase();
      const isWingdings = font.includes('wingding');
      const isSymbol = font === 'symbol';
      if (!isWingdings && !isSymbol) return match;

      let touched = false;
      const newBody = body.replace(
        /<w:t([^>]*)>([\s\S]*?)<\/w:t>/g,
        (_m, attrs: string, text: string) => {
          const newText = text.replace(/[\uE000-\uF8FF]/g, (ch: string) => {
            const code = ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
            const map = isWingdings ? WINGDINGS_MAP : SYMBOL_MAP;
            const repl = map[code];
            touched = true;
            // Unmapped PUA char: drop it rather than leaving a tofu box.
            return repl ?? '';
          });
          return `<w:t${attrs}>${newText}</w:t>`;
        },
      );

      if (!touched) return match;

      // Strip the symbol-font declaration so the converted Unicode renders in
      // the surrounding default font (which has glyphs for these characters).
      const newRPr = rPr.replace(/<w:rFonts\b[^/]*\/>/g, '');
      return `${openTag}${newRPr}${newBody}${closeTag}`;
    },
  );
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Merge adjacent highlighted (yellow) runs within the XML.
 *
 * Word frequently splits highlighted placeholder text across multiple <w:r>
 * elements (e.g. MMMM | DD | YYYY, or $ | # | , | ## | . | ##).
 * This function merges consecutive highlighted runs into a single run so that
 * plain-string replacements can find the full placeholder text.
 *
 * Steps:
 *  1. Remove <w:proofErr> elements (spell/grammar markers that sit between runs).
 *  2. Tokenize the XML into run / non-run segments.
 *  3. Merge each maximal sequence of consecutive highlighted runs into one.
 */
export function mergeAdjacentHighlightedRuns(xml: string): string {
  // Step 1: Remove proofErr noise (spell/grammar check markers between runs)
  xml = xml.replace(/<w:proofErr\b[^/]*\/>/g, '');

  // Step 2: Tokenize — split into <w:r>...</w:r> blocks vs everything else.
  // <w:r> must not match <w:rPr>, <w:rFonts> etc.: the char after <w:r must be > or \s.
  const RUN_RE = /<w:r(?:>|\s[^>]*>)[\s\S]*?<\/w:r>/g;
  type Seg = { kind: 'run'; content: string } | { kind: 'other'; content: string };
  const segs: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = RUN_RE.exec(xml)) !== null) {
    if (m.index > last) segs.push({ kind: 'other', content: xml.slice(last, m.index) });
    segs.push({ kind: 'run', content: m[0] });
    last = m.index + m[0].length;
  }
  if (last < xml.length) segs.push({ kind: 'other', content: xml.slice(last) });

  // Step 3: Walk segments; merge runs of consecutive highlighted <w:r> elements.
  const isHighlighted = (run: string) =>
    /w:highlight\s+w:val="yellow"/.test(run);
  const runText = (run: string) =>
    [...run.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((x) => x[1]).join('');
  const runRpr = (run: string): string => {
    const hit = run.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    return hit ? `<w:rPr>${hit[1]}</w:rPr>` : '';
  };
  const runOpen = (run: string): string => {
    const hit = run.match(/^<w:r(?:>|\s[^>]*>)/);
    return hit ? hit[0] : '<w:r>';
  };

  const out: string[] = [];
  let i = 0;
  while (i < segs.length) {
    const seg = segs[i];
    if (seg.kind === 'run' && isHighlighted(seg.content)) {
      // Collect all consecutive highlighted runs
      let text = runText(seg.content);
      const rpr = runRpr(seg.content);
      const open = runOpen(seg.content);
      let j = i + 1;
      while (j < segs.length) {
        const nx = segs[j];
        if (nx.kind === 'other' && nx.content.trim() === '') {
          j++;          // skip insignificant whitespace between runs
        } else if (nx.kind === 'run' && isHighlighted(nx.content)) {
          text += runText(nx.content);
          j++;
        } else {
          break;
        }
      }
      out.push(`${open}${rpr}<w:t xml:space="preserve">${text}</w:t></w:r>`);
      i = j;
    } else {
      out.push(seg.content);
      i++;
    }
  }

  return out.join('');
}

/**
 * Replace DOCPROPERTY field results in Word XML.
 * Handles multi-run results (e.g. Fee field split across 5 runs).
 */
function replaceDocpropertyFields(xml: string, data: ProposalData): string {
  return xml.replace(
    /(<w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar[^>]*w:fldCharType="begin"[^>]*\/>[\s\S]*?<\/w:r>[\s\S]*?<w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar[^>]*w:fldCharType="separate"[^>]*\/>[\s\S]*?<\/w:r>)([\s\S]*?)(<w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar[^>]*w:fldCharType="end"[^>]*\/>[\s\S]*?<\/w:r>)/g,
    (match, beforeResult: string, resultContent: string, endPart: string) => {
      // Collect ALL instrText segments — Word splits field instructions across
      // multiple runs, so a single .match() misses the rest of the field name.
      const instrParts: string[] = [];
      const instrPartsRe = /<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>/g;
      let instrPartM: RegExpExecArray | null;
      while ((instrPartM = instrPartsRe.exec(beforeResult)) !== null) {
        instrParts.push(instrPartM[1]);
      }
      if (instrParts.length === 0) return match;

      const instrText = instrParts.join('').trim();

      const docpropMatch = instrText.match(/DOCPROPERTY\s+"?([^"\\]+?)"?\s*\\/);
      if (docpropMatch) {
        const propName = docpropMatch[1].trim();
        const dataKey = DOCPROPERTY_MAP[propName];
        // Fill known fields with data; clear unknown fields (stale cached values
        // left by Word when the template was last saved — e.g. stray "P" characters).
        const value = dataKey ? (data[dataKey] ?? '') : '';
        const rPrMatch = resultContent.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
        const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : '';
        const newResult = `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`;
        return beforeResult + newResult + endPart;
      }

      if (instrText.includes('PRINTDATE')) {
        const fmtMatch = instrText.match(/\\@\s+"([^"]+)"/);
        const fmt = fmtMatch ? fmtMatch[1] : 'MMMM d, yyyy';
        const value = data.proposalDate ?? formatDateStr(new Date(), fmt);
        const rPrMatch = resultContent.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
        const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : '';
        const newResult = `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`;
        return beforeResult + newResult + endPart;
      }

      return match;
    },
  );
}

function formatDateStr(date: Date, fmt: string): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return fmt
    .replace('MMMM', months[date.getMonth()])
    .replace('MMM', months[date.getMonth()].slice(0, 3))
    .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
    .replace(/\bM\b/, String(date.getMonth() + 1))
    .replace('dd', String(date.getDate()).padStart(2, '0'))
    .replace(/\bd\b/, String(date.getDate()))
    .replace('yyyy', String(date.getFullYear()))
    .replace('yy', String(date.getFullYear()).slice(-2));
}

/**
 * Replace plain [bracket] placeholders and other text patterns in Word XML.
 * Call AFTER mergeAdjacentHighlightedRuns() so that split placeholders
 * have been joined into single text nodes.
 * Longer / more specific patterns come first to avoid partial matches.
 */
function replacePlainBrackets(xml: string, data: ProposalData): string {
  // Amount without leading $ — used when the template has a static "$" before the placeholder
  const amountNoSign = (data.totalAmount ?? '').replace(/^\$/, '');

  const replacements: Array<[string | RegExp, string]> = [
    // ── Multi-word bracket patterns (must precede single-word ones) ───────────
    ['[First Last Name]',          `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim()],
    ['[Project Name, Address]',    [data.projectName, data.projectAddress].filter(Boolean).join(', ')],
    ['[Address/Project Name]',     data.projectAddress || data.projectName || ''],
    ['[Mr./Mrs./Ms.]',             data.salutation ?? ''],
    ['[Mr.,Mrs.]',                 data.salutation ?? ''],
    ['[First Name]',               data.firstName ?? ''],
    ['[Last Name]',                data.lastName ?? ''],
    ['[Company Name]',             data.companyName ?? ''],
    ['[Address]',                  data.address ?? ''],
    ['[Suite]',                    data.suite ?? ''],
    ['[City]',                     data.city ?? ''],
    ['[State]',                    data.state ?? ''],
    ['[ZIP Code]',                 data.zip ?? ''],
    ['[ZIP]',                      data.zip ?? ''],
    ['[Project Name]',             data.projectName ?? ''],
    ['[Project Address]',          data.projectAddress ?? ''],
    // [Project Description] is handled as a dynamic field — not in fixed list
    ['[Name]',                     data.lastName || data.firstName || ''],
    ['[Month]',                    data.month ?? ''],
    ['[DD]',                       data.day ?? ''],
    ['[YYYY]',                     data.year ?? ''],

    // ── Date line (plain text, not a DOCPROPERTY field) ───────────────────────
    // After run-merging, split "MMMM | DD | , | YYYY" collapses to "MMMM DD, YYYY"
    ['MMMM DD, YYYY',              data.proposalDate ?? ''],

    // ── Fee patterns ─────────────────────────────────────────────────────────
    // Some templates highlight the "$" as part of the placeholder; others keep
    // "$" in static text immediately before the highlighted number pattern.
    // After run-merging, the highlighted portion is a single text node.
    //
    // Pattern 1: $ IS part of the placeholder (e.g. VS Engineering template)
    //   → replace with full formatted amount including "$"
    [/\$[#0]{1,2},?[#0]{3}\.[#0]{2}/g,  data.totalAmount ?? ''],
    // Pattern 2: $ is static text; placeholder is just the number digits
    //   → replace with amount stripped of its leading "$"
    [/[#0]{1,2},?[#0]{3}\.[#0]{2}/g,    amountNoSign],

    // ── Timeline ─────────────────────────────────────────────────────────────
    // In templates, only the "#-#" or "#" is highlighted (a separate run) while
    // " weeks" is plain text in the next run — so the full phrase "#-# weeks" is
    // never contiguous in the raw XML.  Match the standalone patterns first so
    // the plain-text " weeks" that follows is left in place naturally.
    ['#-# weeks',                  data.timeline ?? ''],   // full phrase (fallback)
    ['#-#',                        data.timeline ?? ''],   // just the highlighted range
    ['# weeks',                    data.timeline ?? ''],   // full phrase (fallback)
  ];

  let result = xml;
  for (const [pattern, value] of replacements) {
    const escaped = escapeXml(value);
    if (typeof pattern === 'string') {
      result = result.split(pattern).join(escaped);
    } else {
      result = result.replace(pattern, escaped);
    }
  }
  return result;
}

/**
 * Update docProps/custom.xml property values.
 */
function updateCustomProps(customXml: string, data: ProposalData): string {
  let result = customXml;
  for (const [propName, dataKey] of Object.entries(DOCPROPERTY_MAP)) {
    const value = data[dataKey] ?? '';
    const escapedName = propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(
        `(<property[^>]+name="${escapedName}"[^>]*>\\s*<vt:lpwstr>)([^<]*)(</vt:lpwstr>)`,
        'g',
      ),
      (_, open, _old, close) => `${open}${escapeXml(value)}${close}`,
    );
  }
  return result;
}

/**
 * Replace [BracketName] placeholders using caller-supplied values.
 * Runs after the fixed replacePlainBrackets pass so custom fields take priority.
 */
function replaceDynamicBrackets(
  xml: string,
  dynamicValues: Record<string, string>,
): string {
  let result = xml;
  for (const [name, value] of Object.entries(dynamicValues)) {
    result = result.split(`[${name}]`).join(escapeXml(value));
  }
  return result;
}

/**
 * Strip yellow highlights from every run in the XML.
 * Called as the last step so any filled-in value loses its placeholder highlight.
 */
function removeYellowHighlights(xml: string): string {
  return xml.replace(/<w:highlight\s+w:val="yellow"\s*\/>/g, '');
}

/**
 * Replace individual table cells by positional key ("t{ti}r{ri}c{ci}").
 * Preserves cell/paragraph/run formatting from the original cell.
 */
function applyTableCellValues(
  xml: string,
  tableCellValues: Record<string, string>,
): string {
  // Group by table → row → cell
  const groups: Record<string, Record<string, Record<string, string>>> = {};
  for (const [key, value] of Object.entries(tableCellValues)) {
    const m = key.match(/^t(\d+)r(\d+)c(\d+)$/);
    if (!m) continue;
    const [, ti, ri, ci] = m;
    if (!groups[ti]) groups[ti] = {};
    if (!groups[ti][ri]) groups[ti][ri] = {};
    groups[ti][ri][ci] = value;
  }
  if (Object.keys(groups).length === 0) return xml;

  let tableIdx = 0;
  return xml.replace(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g, (tableXml) => {
    const ti = String(tableIdx++);
    if (!groups[ti]) return tableXml;

    let rowIdx = 0;
    return tableXml.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g, (rowXml) => {
      const ri = String(rowIdx++);
      if (!groups[ti][ri]) return rowXml;

      let cellIdx = 0;
      return rowXml.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (cellXml) => {
        const ci = String(cellIdx++);
        const newValue = groups[ti]?.[ri]?.[ci];
        if (newValue === undefined) return cellXml;
        return setCellText(cellXml, newValue);
      });
    });
  });
}

function setCellText(cellXml: string, newValue: string): string {
  const escaped = escapeXml(newValue);

  // Preserve cell properties (<w:tcPr>)
  const tcPrMatch = cellXml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/);
  const tcPr = tcPrMatch ? tcPrMatch[0] : '';

  // Preserve first paragraph properties (<w:pPr>) — e.g. right-alignment for prices
  const pPrMatch = cellXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';

  // Preserve run properties from first actual run (font, size, colour)
  const firstRunMatch = cellXml.match(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/);
  const rPrMatch = firstRunMatch
    ? firstRunMatch[1].match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
    : null;
  const rPr = rPrMatch ? rPrMatch[0] : '';

  return `<w:tc>${tcPr}<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escaped}</w:t></w:r></w:p></w:tc>`;
}

const XML_FILES = [
  'word/document.xml',
  'word/header1.xml',
  'word/header2.xml',
  'word/header3.xml',
  'word/footer1.xml',
  'word/footer2.xml',
  'word/footer3.xml',
];

/**
 * Remove known garbage left in the Apex proposal templates.
 *
 * Every template with a "Printed Name:" signature line ends that paragraph
 * with a stray run of the form
 *   <w:tab/><w:t>P</w:t></w:r></w:p>
 * which surfaces as a stray "P" character at the end of the line. It is not
 * a DOCPROPERTY field, so the stale-cache clearing in replaceDocpropertyFields()
 * can't remove it. We anchor on the unique "tab+P at the very end of a
 * paragraph" pattern — no legitimate paragraph in any template ends with a
 * literal single "P" preceded by a tab — and strip the <w:t>P</w:t> while
 * leaving the trailing tab in place so paragraph metrics don't shift.
 */
function stripKnownTemplateGarbage(xml: string): string {
  return xml.replace(
    /(<w:tab\/>)<w:t[^>]*>P<\/w:t>(<\/w:r>\s*<\/w:p>)/g,
    '$1$2',
  );
}

/**
 * Fill a .docx template buffer with proposal data.
 * Handles DOCPROPERTY fields, plain bracket placeholders, dynamic custom
 * brackets, positional table-cell overrides, and full paragraph overrides.
 */
export function fillDocx(
  templateBuffer: Buffer,
  data: ProposalData,
  dynamicValues?: Record<string, string>,
  tableCellValues?: Record<string, string>,
  paragraphOverrides?: Record<string, string>,
): Buffer {
  const zip = new PizZip(templateBuffer);

  // Update docProps/custom.xml if present
  const customXmlFile = zip.files['docProps/custom.xml'];
  if (customXmlFile) {
    const customXml = customXmlFile.asText();
    zip.file('docProps/custom.xml', updateCustomProps(customXml, data));
  }

  // Process each Word XML file
  for (const xmlPath of XML_FILES) {
    const xmlFile = zip.files[xmlPath];
    if (!xmlFile) continue;

    let xml = xmlFile.asText();
    // 0. Strip known template garbage (e.g. stray "P" after Printed Name lines)
    xml = stripKnownTemplateGarbage(xml);
    // 1a. Pre-process <w:sym> elements → Unicode so symbol fonts aren't required
    xml = preprocessSymbolElements(xml);
    // 1b. Pre-process Wingdings/Symbol PUA chars stored in <w:t> runs (header ornaments)
    xml = convertSymbolFontTextRuns(xml);
    // 1. Merge split highlighted runs so string patterns match
    xml = mergeAdjacentHighlightedRuns(xml);
    // 2. Paragraph overrides (document only — before DOCPROPERTY so brackets still fill)
    if (
      xmlPath === 'word/document.xml' &&
      paragraphOverrides &&
      Object.keys(paragraphOverrides).length > 0
    ) {
      xml = applyParagraphOverrides(xml, paragraphOverrides);
    }
    // 3. DOCPROPERTY fields
    xml = replaceDocpropertyFields(xml, data);
    // 4. Dynamic custom brackets (before fixed to avoid double-replacement)
    if (dynamicValues && Object.keys(dynamicValues).length > 0) {
      xml = replaceDynamicBrackets(xml, dynamicValues);
    }
    // 5. Fixed known brackets + numeric patterns
    xml = replacePlainBrackets(xml, data);
    // 6. Table cell overrides (positional)
    if (tableCellValues && Object.keys(tableCellValues).length > 0) {
      xml = applyTableCellValues(xml, tableCellValues);
    }
    // 7. Strip yellow highlights — placeholders are filled, highlight is no longer needed
    xml = removeYellowHighlights(xml);
    zip.file(xmlPath, xml);
  }

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ─── LibreOffice conversion helpers ─────────────────────────────────────────

/**
 * Before converting a .docx to PDF via LibreOffice, reduce the page margins
 * so that text-reflow differences between Word and LibreOffice's layout engine
 * (different line-break tables, kerning, font fallback, etc.) don't push
 * content that fits on N pages in Word onto N+1 pages in LibreOffice.
 *
 * Bottom: -720 twips (0.5"), floor 360 twips (0.25"). Most templates leave
 *   plenty of bottom whitespace, so a half-inch reclaim is invisible.
 * Top:    -288 twips (0.2"), floor 720 twips (0.5"). Smaller because the
 *   header watermark/letterhead sits closer to the top edge.
 */
export function patchDocxMarginsForLibreOffice(buffer: Buffer): Buffer {
  const zip = new PizZip(buffer);
  const docXml = zip.files['word/document.xml'];
  if (!docXml) return buffer;

  const BOTTOM_REDUCTION = 1080; // 0.75 inches
  const MIN_BOTTOM = 360; // floor: 0.25 inches
  const TOP_REDUCTION = 432; // 0.3 inches
  const MIN_TOP = 720; // floor: 0.5 inches

  const shrinkAttr = (
    pgMarTag: string,
    attr: string,
    reduction: number,
    floor: number,
  ): string =>
    pgMarTag.replace(
      new RegExp(`(\\s${attr}=")(\\d+)(")`),
      (_m, open: string, value: string, close: string) => {
        const reduced = Math.max(floor, parseInt(value, 10) - reduction);
        return `${open}${reduced}${close}`;
      },
    );

  const patched = docXml.asText().replace(
    /<w:pgMar\b[^/]*\/>/g,
    (pgMarTag) => {
      let updated = shrinkAttr(pgMarTag, 'w:bottom', BOTTOM_REDUCTION, MIN_BOTTOM);
      updated = shrinkAttr(updated, 'w:top', TOP_REDUCTION, MIN_TOP);
      return updated;
    },
  );

  zip.file('word/document.xml', patched);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ─── Formatting helpers used by the service ──────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function formatProposalDate(date: Date): string {
  const day = date.getDate();
  return `${MONTH_NAMES[date.getMonth()]} ${day}${getOrdinalSuffix(day)}, ${date.getFullYear()}`;
}

export function monthName(date: Date): string {
  return MONTH_NAMES[date.getMonth()];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Template content extraction (for live preview) ──────────────────────────

/**
 * DOCPROPERTY field name → the bracket/pattern placeholder that replaces it in preview mode.
 * Must align with the replacePlainBrackets substitution list.
 */
const DOCPROPERTY_BRACKETS: Record<string, string> = {
  'First Name': '[First Name]',
  'Last Name': '[Last Name]',
  'Company Name': '[Company Name]',
  'Address': '[Address]',
  'City': '[City]',
  'State': '[State]',
  'ZIP Code': '[ZIP Code]',
  'Mr./Mrs./Ms.': '[Mr./Mrs./Ms.]',
  'Mr.,Mrs.': '[Mr.,Mrs.]',
  'Project Name': '[Project Name]',
  'Project Address': '[Project Address]',
  'Fee': '$##,###.##',
  'Timeline': '# weeks',
};

/**
 * Replace the text content of a paragraph while preserving its pPr and first run's rPr.
 * Used by applyParagraphOverrides — does NOT XML-escape newText; callers must decide.
 */
function setParaText(paraXml: string, newText: string): string {
  const pPrMatch = paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';

  const firstRunMatch = paraXml.match(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/);
  const rPrMatch = firstRunMatch ? firstRunMatch[1].match(/<w:rPr>[\s\S]*?<\/w:rPr>/) : null;
  const rPr = rPrMatch ? rPrMatch[0] : '';

  if (!newText.trim()) {
    return `<w:p>${pPr}</w:p>`;
  }
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r></w:p>`;
}

/**
 * Replace paragraphs at the given global indices with user-supplied text.
 * Runs BEFORE all other substitutions so bracket placeholders in overridden
 * text are still filled by the normal pipeline.
 * Keys are global paragraph indices (counting ALL <w:p> elements, including table ones).
 */
export function applyParagraphOverrides(
  xml: string,
  overrides: Record<string, string>,
): string {
  let paraIdx = 0;
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paraXml) => {
    const key = String(paraIdx++);
    const newText = overrides[key];
    return newText !== undefined ? setParaText(paraXml, newText) : paraXml;
  });
}

/**
 * Replace DOCPROPERTY field results with bracket notation and PRINTDATE with
 * "MMMM DD, YYYY" so the extracted paragraph text contains recognizable placeholders.
 */
export function normalizeDocpropertyFields(xml: string): string {
  return xml.replace(
    /(<w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar[^>]*w:fldCharType="begin"[^>]*\/>[\s\S]*?<\/w:r>[\s\S]*?<w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar[^>]*w:fldCharType="separate"[^>]*\/>[\s\S]*?<\/w:r>)([\s\S]*?)(<w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar[^>]*w:fldCharType="end"[^>]*\/>[\s\S]*?<\/w:r>)/g,
    (match, beforeResult, _resultContent, endPart) => {
      // Collect ALL instrText segments — Word splits field instructions across
      // multiple runs, so a single .match() misses the rest of the field name.
      const instrParts: string[] = [];
      const instrPartsRe = /<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>/g;
      let instrPartM: RegExpExecArray | null;
      while ((instrPartM = instrPartsRe.exec(beforeResult)) !== null) {
        instrParts.push(instrPartM[1]);
      }
      if (instrParts.length === 0) return match;
      const instrText = instrParts.join('').trim();

      const docpropMatch = instrText.match(/DOCPROPERTY\s+"?([^"\\]+?)"?\s*\\/);
      if (docpropMatch) {
        const propName = docpropMatch[1].trim();
        const bracket = DOCPROPERTY_BRACKETS[propName];
        // Known fields → show bracket placeholder; unknown fields → clear stale cache.
        const display = bracket ?? '';
        return (
          beforeResult +
          `<w:r><w:t xml:space="preserve">${escapeXml(display)}</w:t></w:r>` +
          endPart
        );
      }
      if (instrText.includes('PRINTDATE')) {
        return (
          beforeResult +
          `<w:r><w:t>MMMM DD, YYYY</w:t></w:r>` +
          endPart
        );
      }
      return match;
    },
  );
}

/**
 * Extract paragraphs from a .docx template as plain text strings.
 * Applies run-merging and normalizes field placeholders so the caller
 * can substitute values client-side for live preview.
 */
export function extractParagraphs(templateBuffer: Buffer): string[] {
  const zip = new PizZip(templateBuffer);
  const xmlFile = zip.files['word/document.xml'];
  if (!xmlFile) return [];

  let xml = xmlFile.asText();
  xml = stripKnownTemplateGarbage(xml);
  xml = mergeAdjacentHighlightedRuns(xml);
  xml = normalizeDocpropertyFields(xml);

  const paragraphs: string[] = [];
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = paraRe.exec(xml)) !== null) {
    const paraXml = m[0];
    let text = '';
    const textRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = textRe.exec(paraXml)) !== null) {
      text += tm[1];
    }
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    paragraphs.push(text);
  }
  return paragraphs;
}
