// eslint-disable-next-line @typescript-eslint/no-require-imports
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
function mergeAdjacentHighlightedRuns(xml: string): string {
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
      const instrMatch = beforeResult.match(
        /<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>/,
      );
      if (!instrMatch) return match;

      const instrText = instrMatch[1].trim();

      const docpropMatch = instrText.match(/DOCPROPERTY\s+"?([^"\\]+?)"?\s*\\/);
      if (docpropMatch) {
        const propName = docpropMatch[1].trim();
        const dataKey = DOCPROPERTY_MAP[propName];
        if (!dataKey) return match;

        const value = data[dataKey] ?? '';
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
    ['[Project Description]',      data.projectDescription ?? ''],
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
    // "#-# weeks" (range) must come before "# weeks" (single) to avoid partial match
    ['#-# weeks',                  data.timeline ?? ''],
    ['# weeks',                    data.timeline ?? ''],
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
 * Fill a .docx template buffer with proposal data.
 * Handles both DOCPROPERTY-based and plain-bracket templates.
 */
export function fillDocx(templateBuffer: Buffer, data: ProposalData): Buffer {
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
    // Merge split highlighted runs FIRST so string replacements find full placeholders
    xml = mergeAdjacentHighlightedRuns(xml);
    xml = replaceDocpropertyFields(xml, data);
    xml = replacePlainBrackets(xml, data);
    zip.file(xmlPath, xml);
  }

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ─── Formatting helpers used by the service ──────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatProposalDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
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
