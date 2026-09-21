'use client';

import Link from 'next/link';
import type { CategoryMeta } from '@/lib/categories';
import { useLang, fill } from '@/lib/i18n';

interface CategoryHeaderProps {
  meta: CategoryMeta;
  count: number;
}

export default function CategoryHeader({ meta, count }: CategoryHeaderProps) {
  const { t, fmt } = useLang();
  const cats = t.cats as Record<string, { name: string; blurb: string }>;
  const translated = cats[meta.slug] ?? { name: meta.name, blurb: meta.blurb };

  return (
    <header className="border-b border-[var(--c-line)] bg-[var(--c-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-[var(--c-fg-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--c-accent)]">
                {t.cat.home}
              </Link>
            </li>
            <li aria-hidden="true" className="text-[var(--c-fg-subtle)]">
              /
            </li>
            <li aria-current="page" className="text-[var(--c-fg)]">
              {translated.name}
            </li>
          </ol>
        </nav>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--c-fg)] sm:text-3xl">{translated.name}</h1>
        <p className="mt-2 max-w-2xl text-[var(--c-fg-muted)]">{translated.blurb}</p>
        <p className="mt-3 text-sm tabular-nums text-[var(--c-fg-subtle)]">
          {fmt(count)} {t.bento.resources}
        </p>
      </div>
    </header>
  );
}