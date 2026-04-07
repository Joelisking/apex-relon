'use client';

import { useEffect, useRef, memo } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditableParagraph } from '@/lib/api/proposal-templates-client';

interface AdvancedEditSectionProps {
  paragraphs: EditableParagraph[];
  overrides: Record<string, string>;
  onChange: (index: number, value: string) => void;
  onReset: (index: number) => void;
}

interface ParagraphRowProps {
  para: EditableParagraph;
  value: string;
  isOverridden: boolean;
  onChange: (val: string) => void;
  onReset: () => void;
}

const ParagraphRow = memo(function ParagraphRow({
  para,
  value,
  isOverridden,
  onChange,
  onReset,
}: ParagraphRowProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(34, el.scrollHeight) + 'px';
  }, [value]);

  return (
    <div
      className={cn(
        'group relative rounded-md border transition-colors',
        isOverridden
          ? 'border-primary/40 bg-primary/[0.03]'
          : 'border-transparent hover:border-border/50 bg-white',
        !value.trim() && 'opacity-50',
      )}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none border-0 focus:outline-none text-sm text-gray-800 leading-relaxed bg-transparent px-3 py-2 rounded-md font-[inherit]"
        rows={1}
        style={{ overflow: 'hidden', minHeight: '34px' }}
        placeholder={para.text.trim() ? undefined : '(empty line)'}
      />
      {isOverridden && (
        <button
          onClick={onReset}
          title="Reset to original"
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground">
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});

export default function AdvancedEditSection({
  paragraphs,
  overrides,
  onChange,
  onReset,
}: AdvancedEditSectionProps) {
  if (paragraphs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">No paragraphs found in template.</p>
      </div>
    );
  }

  // Only show paragraphs that have actual content OR have been overridden
  const displayParagraphs = paragraphs.filter(
    (p) => p.text.trim() !== '' || String(p.index) in overrides,
  );

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20 p-8 h-full">
      <div className="max-w-[680px] mx-auto bg-white rounded-lg shadow-sm border border-border/30 px-10 py-12 min-h-[600px]">
        <div className="mb-6 pb-4 border-b border-border/30">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Edit any paragraph below. Placeholders like{' '}
            <span className="font-mono bg-amber-50 text-amber-600 border border-amber-200/80 rounded px-0.5">
              [Company Name]
            </span>{' '}
            still get filled when you generate. Click{' '}
            <RotateCcw className="inline h-3 w-3" /> to reset a paragraph to the template original.
          </p>
        </div>
        <div className="space-y-0.5">
          {displayParagraphs.map((para) => {
            const key = String(para.index);
            const isOverridden = key in overrides;
            const value = isOverridden ? overrides[key] : para.text;
            return (
              <ParagraphRow
                key={para.index}
                para={para}
                value={value}
                isOverridden={isOverridden}
                onChange={(val) => onChange(para.index, val)}
                onReset={() => onReset(para.index)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
