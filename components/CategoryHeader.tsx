'use client';

import Link from 'next/link';
import type { CategoryMeta } from '@/lib/categories';
import { useLang } from '@/lib/i18n';

interface CategoryHeaderProps {
  meta: CategoryMeta;
  count: number;
}

/**
 * A track's own front page: breadcrumb, nameplate, one line of description and
 * the count. The register below starts straight in on the entries.
 */
export default function CategoryHeader({ meta, count }: CategoryHeaderProps) {
  const { t, fmt } = useLang();
  const cats = t.cats as Record<string, { name: string; blurb: string }>;
  const translated = cats[meta.slug] ?? { name: meta.name, blurb: meta.blurb };

  return (
    <header className="border-b border-[var(--c-rule)]">
      <div className="wrap page-head">
        <nav aria-label="Breadcrumb">
          <ol className="label breadcrumb">
            <li>
              <Link href="/">{t.cat.home}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[var(--c-fg)]">
              {translated.name}
            </li>
          </ol>
        </nav>

        <h1 className="page-title mt-4">{translated.name}</h1>
        <p className="page-lede">{translated.blurb}</p>
        <p className="num mt-3 text-[0.75rem] text-[var(--c-fg-subtle)]">
          {fmt(count)} <span className="font-sans">{t.bento.resources}</span>
        </p>
      </div>
    </header>
  );
}
