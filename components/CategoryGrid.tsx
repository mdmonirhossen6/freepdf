import Link from 'next/link';
import type { CategoryMeta } from '@/lib/categories';
import { RESOURCES } from '@/lib/generated/resources';

interface CategoryGridProps {
  categories: CategoryMeta[];
  total: number;
}

export default function CategoryGrid({ categories, total }: CategoryGridProps) {
  const counts = new Map<string, number>();
  for (const resource of RESOURCES) {
    for (const category of resource.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return (
    <section className="border-t border-[var(--c-line)] py-12 sm:py-16" aria-labelledby="categories-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-fg-muted)]">
            <span aria-hidden="true" className="inline-block h-[3px] w-5 rounded-full bg-[var(--c-accent)]" />
            Browse by category
          </p>
          <h2 id="categories-heading" className="mt-1 text-xl font-semibold text-[var(--c-fg)]">
            Popular categories
          </h2>
          <p className="mt-1 text-sm text-[var(--c-fg-muted)]">
            {total.toLocaleString('en-US')} resources indexed from the @hscfreepdf channel.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/category/${category.slug}`}
                className="group flex h-full flex-col rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-5 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--c-accent)] hover:shadow-pop"
              >
                <span className="text-base font-semibold text-[var(--c-fg)] group-hover:text-[var(--c-accent)]">
                  {category.name}
                </span>
                <span className="mt-1.5 text-sm leading-relaxed text-[var(--c-fg-muted)]">{category.blurb}</span>
                <span className="mt-3 text-xs tabular-nums text-[var(--c-fg-subtle)]">
                  {(counts.get(category.name) ?? 0).toLocaleString('en-US')} resources
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}