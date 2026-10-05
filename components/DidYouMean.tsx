'use client';

import { useLang, fill } from '@/lib/i18n';
import { Lightbulb } from './icons';

interface DidYouMeanProps {
  suggestion: string;
  query: string;
  onSelect: (suggestion: string) => void;
}

/**
 * The spelling correction, printed as a correction line under a rule, in the
 * voice a printed index would use rather than as a highlighted callout box.
 */
export default function DidYouMean({ suggestion, query, onSelect }: DidYouMeanProps) {
  const { t } = useLang();
  if (!suggestion) return null;
  const text = suggestion.replace(/^Did you mean:\s*/, '');

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-[var(--c-rule)] pt-3 text-[0.9375rem]">
      <Lightbulb className="h-4 w-4 shrink-0 self-center text-[var(--c-fg-subtle)]" aria-hidden="true" />
      <span className="text-[var(--c-fg-muted)]">{t.dym}</span>
      <button type="button" onClick={() => onSelect(text)} className="entry-title text-[1rem]">
        {text}
      </button>
      <span className="sr-only">{fill(t.dymSr, { query })}</span>
    </div>
  );
}
