'use client';

import Link from 'next/link';
import { useLang, fill } from '@/lib/i18n';

/** Translated "<count> <name> resources" line for server-rendered category pages. */
export function CountLine({ count, name }: { count: number; name: string }) {
  const { t, fmt } = useLang();
  return (
    <p className="text-sm tabular-nums text-[var(--c-fg-subtle)]">
      <span className="font-medium text-[var(--c-fg)]">{fmt(count)}</span> {fill(t.cat.countLabel, { name })}
    </p>
  );
}

/** Translated 404 block for unknown category slugs. */
export function CategoryNotFound() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <h1 className="text-2xl font-medium tracking-tight text-[var(--c-fg)]">{t.cat.notFound}</h1>
      <p className="mt-4 text-[var(--c-fg-muted)]">{t.cat.notFoundBody}</p>
      <a href="/" className="mt-6 inline-flex items-center gap-2 rounded btn-primary">
        {t.cat.back}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </a>
    </main>
  );
}