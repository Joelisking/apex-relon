'use client';

import { useMemo } from 'react';

export interface PreviewData {
  salutation?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  totalAmount?: string;
  timeline?: string;
  proposalDate?: string; // ISO "YYYY-MM-DD"
  projectName?: string;
  projectAddress?: string;
}

interface ProposalPreviewProps {
  paragraphs: string[];
  data: PreviewData;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function applySubstitutions(text: string, data: PreviewData): string {
  const d = data.proposalDate
    ? new Date(data.proposalDate + 'T12:00:00')
    : new Date();
  const proposalDate = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const month = MONTHS[d.getMonth()];
  const day = String(d.getDate());
  const year = String(d.getFullYear());

  const firstName = data.firstName || '';
  const lastName = data.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const salutation = data.salutation || '';
  const companyName = data.companyName || '';
  const address = data.address || '';
  const city = data.city || '';
  const state = data.state || '';
  const zip = data.zip || '';
  const totalAmount = data.totalAmount || '';
  const amountNoSign = totalAmount.replace(/^\$/, '');
  const timeline = data.timeline || '';
  const projectName = data.projectName || '';
  const projectAddress = data.projectAddress || '';

  // Only substitute when value is non-empty (keeps placeholder visible otherwise)
  const sub = (s: string, pattern: string | RegExp, value: string): string => {
    if (!value) return s;
    if (typeof pattern === 'string') return s.split(pattern).join(value);
    return s.replace(pattern, value);
  };

  let result = text;
  // Apply in same order as backend replacePlainBrackets (longer patterns first)
  result = sub(result, '[First Last Name]', fullName);
  result = sub(result, '[Project Name, Address]', [projectName, projectAddress].filter(Boolean).join(', '));
  result = sub(result, '[Address/Project Name]', projectAddress || projectName);
  result = sub(result, '[Mr./Mrs./Ms.]', salutation);
  result = sub(result, '[Mr.,Mrs.]', salutation);
  result = sub(result, '[First Name]', firstName);
  result = sub(result, '[Last Name]', lastName);
  result = sub(result, '[Company Name]', companyName);
  result = sub(result, '[Address]', address);
  result = sub(result, '[City]', city);
  result = sub(result, '[State]', state);
  result = sub(result, '[ZIP Code]', zip);
  result = sub(result, '[ZIP]', zip);
  result = sub(result, '[Project Name]', projectName);
  result = sub(result, '[Project Address]', projectAddress);
  result = sub(result, '[Name]', lastName || firstName);
  // Date parts — always substituted (proposalDate always has a value)
  result = sub(result, '[Month]', month);
  result = sub(result, '[DD]', day);
  result = sub(result, '[YYYY]', year);
  result = sub(result, 'MMMM DD, YYYY', proposalDate);
  // Fee patterns
  if (totalAmount) {
    result = result.replace(/\$[#0]{1,2},?[#0]{3}\.[#0]{2}/g, totalAmount);
    result = result.replace(/[#0]{1,2},?[#0]{3}\.[#0]{2}/g, amountNoSign);
  }
  // Timeline patterns (longer first)
  result = sub(result, '#-# weeks', timeline);
  result = sub(result, '# weeks', timeline);
  return result;
}

// Splits on remaining unfilled placeholder patterns and styles them distinctly
const SPLIT_RE = /(\[[^\]]+\]|\$[#0]{1,2},?[#0]{3}\.[#0]{2}|[#0]{1,2},?[#0]{3}\.[#0]{2}|MMMM\s+DD,?\s+YYYY|#-#\s+weeks|#\s+weeks)/;

function renderText(text: string): React.ReactNode {
  const parts = text.split(SPLIT_RE);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={i}
        className="bg-amber-50 text-amber-600 border border-amber-200/80 rounded px-0.5 text-[0.875em] font-mono">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function ProposalPreview({ paragraphs, data }: ProposalPreviewProps) {
  const substituted = useMemo(
    () => paragraphs.map((p) => applySubstitutions(p, data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paragraphs, JSON.stringify(data)],
  );

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20 p-8 h-full">
      <div className="max-w-[680px] mx-auto bg-white rounded-lg shadow-sm border border-border/30 px-10 py-12 min-h-[600px]">
        {substituted.map((text, i) =>
          text.trim() ? (
            <p key={i} className="text-sm text-gray-800 leading-relaxed mb-2">
              {renderText(text)}
            </p>
          ) : (
            <p key={i} className="mb-2">&nbsp;</p>
          ),
        )}
      </div>
    </div>
  );
}
