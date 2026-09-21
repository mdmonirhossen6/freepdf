'use client';

import Link from 'next/link';
import { CATEGORY_META } from '@/lib/categories';
import { RESOURCES, TOTAL_RESOURCES } from '@/lib/generated/resources';
import { useLang, fill } from '@/lib/i18n';

export default function CategoryIndex() {
  const { t, fmt } = useLang();
  const cats = t.cats as Record<string, { name: string; blurb: string }>;

  const counts = new Map<string, number>();
  for (const resource of RESOURCES) {
    for (const category of resource.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--c-fg)]">{t.cat.title}</h1>
      <p className="mt-2 max-w-2xl text-[var(--c-fg-muted)]">{fill(t.cat.subtitle, { count: fmt(TOTAL_RESOURCES) })}</p>

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_META.map((category) => {
          const meta = cats[category.slug] ?? { name: category.name, blurb: category.blurb };
          return (
            <li key={category.slug}>
              <Link
                href={`/category/${category.slug}`}
                className="group flex h-full flex-col rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-5 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--c-accent)] hover:shadow-pop"
              >
                <span className="text-base font-semibold text-[var(--c-fg)] group-hover:text-[var(--c-accent)]">
                  {meta.name}
                </span>
                <span className="mt-1.5 text-sm leading-relaxed text-[var(--c-fg-muted)]">{meta.blurb}</span>
                <span className="mt-3 text-xs tabular-nums text-[var(--c-fg-subtle)]">
                  {fmt(counts.get(category.name) ?? 0)} {t.bento.resources}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}