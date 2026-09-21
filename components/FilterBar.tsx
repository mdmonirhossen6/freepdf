'use client';

import { RESOURCE_TYPES, RESOURCE_CATEGORIES, type ResourceType, type ResourceCategory } from '@/lib/types';
import { CATEGORY_META } from '@/lib/categories';
import { useLang } from '@/lib/i18n';

interface FilterBarProps {
  activeType: string;
  activeCategory: string;
  onTypeChange: (type: string) => void;
  onCategoryChange: (category: string) => void;
}

const TYPE_LABELS: Record<ResourceType, string> = {
  PDF: 'PDF',
  APK: 'APK',
  Image: 'Image',
  Text: 'Text',
  Other: 'Other',
};

export default function FilterBar({ activeType, activeCategory, onTypeChange, onCategoryChange }: FilterBarProps) {
  const { t } = useLang();
  const cats = t.cats as Record<string, { name: string; blurb: string }>;
  const slugFor = (name: string) => CATEGORY_META.find((meta) => meta.name === name)?.slug;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Type filters */}
      <fieldset className="flex items-center gap-1">
        <legend className="sr-only">{t.filter.type}</legend>
        {RESOURCE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange(activeType === type ? '' : type)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              activeType === type
                ? 'border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-[var(--c-accent)] dark:border-[var(--c-accent)] dark:bg-[var(--c-accent-soft)]'
                : 'border-[var(--c-line-strong)] bg-[var(--c-bg)] text-[var(--c-fg-muted)] hover:border-[var(--c-fg-muted)] hover:text-[var(--c-fg)] dark:border-[var(--c-line)] dark:bg-[var(--c-bg-subtle)]'
            }`}
            aria-pressed={activeType === type}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </fieldset>

      <span className="mx-1 h-5 w-px shrink-0 bg-[var(--c-line-strong)] sm:mx-3" aria-hidden="true" />

      {/* Category filters */}
      <fieldset className="flex flex-wrap gap-1">
        <legend className="sr-only">{t.filter.category}</legend>
        {RESOURCE_CATEGORIES.map((category) => {
          const slug = slugFor(category);
          const label = (slug && cats[slug]?.name) || category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(activeCategory === category ? '' : category)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                activeCategory === category
                  ? 'border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-[var(--c-accent)] dark:border-[var(--c-accent)] dark:bg-[var(--c-accent-soft)]'
                  : 'border-[var(--c-line-strong)] bg-[var(--c-bg)] text-[var(--c-fg-muted)] hover:border-[var(--c-fg-muted)] hover:text-[var(--c-fg)] dark:border-[var(--c-line)] dark:bg-[var(--c-bg-subtle)]'
              }`}
              aria-pressed={activeCategory === category}
            >
              {label}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}