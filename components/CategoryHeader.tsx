'use client';

import Link from 'next/link';
import type { CategoryMeta } from '@/lib/categories';
import { useLang, fill } from '@/lib/i18n';

interface CategoryHeaderProps {
  meta: CategoryMeta;
  count: number;
}

/**
 * A track's own front page: breadcrumb, nameplate, one line of description, the
 * count, and the track's plate. The count is printed once, here, and the
 * register below it starts straight in on the entries.
 */
export default function CategoryHeader({ meta, count }: CategoryHeaderProps) {
  const { t, fmt } = useLang();
  const cats = t.cats as Record<string, { name: string; blurb: string }>;
  const translated = cats[meta.slug] ?? { name: meta.name, blurb: meta.blurb };

  return (
    <header className="border-b border-[var(--c-rule)]">
      <div className="wrap py-8">
        <nav aria-label="Breadcrumb">
          <ol className="label flex items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[var(--c-spot)]">
                {t.cat.home}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[var(--c-fg)]">
              {translated.name}
            </li>
          </ol>
        </nav>

        <h1 className="mt-4 font-display text-[2rem] font-semibold leading-tight tracking-[-0.015em] sm:text-[2.6rem]">
          {translated.name}
        </h1>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-[var(--c-fg-muted)]">{translated.blurb}</p>
        <p className="num mt-3 text-[0.8125rem] text-[var(--c-fg-subtle)]">
          {fmt(count)} <span className="font-sans">{t.bento.resources}</span>
        </p>
      </div>
    </header>
  );
}
