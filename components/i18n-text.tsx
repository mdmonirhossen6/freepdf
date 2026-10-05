'use client';

import Link from 'next/link';
import { useLang } from '@/lib/i18n';
import { ArrowLeft } from './icons';

/** Translated 404 block for unknown category slugs. */
export function CategoryNotFound() {
  const { t } = useLang();
  return (
    <div className="wrap py-20 text-center">
      <h1 className="font-display text-[2rem] font-semibold">{t.cat.notFound}</h1>
      <p className="mx-auto mt-4 max-w-[46ch] text-[var(--c-fg-muted)]">{t.cat.notFoundBody}</p>
      <p className="mt-6">
        <Link href="/" className="btn-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.cat.back}
        </Link>
      </p>
    </div>
  );
}

