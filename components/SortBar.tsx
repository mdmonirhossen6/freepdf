'use client';

import type { SortKey } from '@/lib/types';
import { useLang } from '@/lib/i18n';

interface SortBarProps {
  activeSort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

export default function SortBar({ activeSort, onSortChange }: SortBarProps) {
  const { t } = useLang();

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.sort.label}>
      <span className="mr-1 text-xs font-medium text-[var(--c-fg-muted)]">{t.sort.label}</span>
      {OPTIONS.map((option) => {
        const active = activeSort === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortChange(option.value)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? 'border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-[var(--c-accent)]'
                : 'border-[var(--c-line-strong)] text-[var(--c-fg-muted)] hover:border-[var(--c-fg-muted)] hover:text-[var(--c-fg)]'
            }`}
          >
            {t.sort[option.value]}
          </button>
        );
      })}
    </div>
  );
}