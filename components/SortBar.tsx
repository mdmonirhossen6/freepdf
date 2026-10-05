'use client';

import type { SortKey } from '@/lib/types';
import { useLang } from '@/lib/i18n';

interface SortBarProps {
  activeSort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

const OPTIONS: SortKey[] = ['relevance', 'newest', 'oldest'];

export default function SortBar({ activeSort, onSortChange }: SortBarProps) {
  const { t } = useLang();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="label">{t.sort.label}</span>
      <div className="seg" role="group" aria-label={t.sort.label}>
        {OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSortChange(value)}
            aria-pressed={activeSort === value}
          >
            {t.sort[value]}
          </button>
        ))}
      </div>
    </div>
  );
}
