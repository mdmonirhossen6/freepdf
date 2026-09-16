import { RESOURCE_TYPES, RESOURCE_CATEGORIES, type ResourceType, type ResourceCategory } from '@/lib/types';

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
  return (
    <div className="flex flex-wrap gap-2">
      {/* Type filters */}
      <fieldset className="flex items-center gap-1">
        <legend className="sr-only">Resource type</legend>
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
        <legend className="sr-only">Education category</legend>
        {RESOURCE_CATEGORIES.map((category) => (
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
            {category}
          </button>
        ))}
      </fieldset>
    </div>
  );
}