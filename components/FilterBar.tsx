'use client';

import { RESOURCE_TYPES, RESOURCE_CATEGORIES, type ResourceType } from '@/lib/types';
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

/**
 * Filters as two sets of printed index tabs. Square, flush, one ink block for
 * the tab that is on, instead of a field of pills.
 */
export default function FilterBar({ activeType, activeCategory, onTypeChange, onCategoryChange }: FilterBarProps) {
  const { t } = useLang();
  const cats = t.cats as Record<string, { name: string; blurb: string }>;
  const slugFor = (name: string) => CATEGORY_META.find((meta) => meta.name === name)?.slug;

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 border-0 p-0">
        <legend className="label">{t.filter.type}</legend>
        <div className="seg mt-2">
          {RESOURCE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onTypeChange(activeType === type ? '' : type)}
              aria-pressed={activeType === type}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="label">{t.filter.category}</legend>
        <div className="seg mt-2">
          {RESOURCE_CATEGORIES.map((category) => {
            const slug = slugFor(category);
            const label = (slug && cats[slug]?.name) || category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(activeCategory === category ? '' : category)}
                aria-pressed={activeCategory === category}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
