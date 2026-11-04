'use client';

import Link from 'next/link';
import { RESOURCES } from '@/lib/generated/resources';
import { useLang } from '@/lib/i18n';
import ResourceCard from './ResourceCard';

/**
 * The notice a printed index prints when a heading has no entries: the heading
 * itself, the reason, the neighbouring entries a reader can turn to instead.
 */
export default function EmptyState({ query }: { query: string }) {
  const { t } = useLang();
  const latest = RESOURCES.slice(0, 4);

  return (
    <div className="mt-6">
      <div className="border-t-2 border-[var(--c-fg)] pt-4">
        <h2 className="font-display text-[1.35rem] font-semibold">{t.empty.title}</h2>
        {query && (
          <p className="mt-2 text-[0.9375rem] text-[var(--c-fg-muted)]">
            {t.empty.prefix} <span className="text-[var(--c-fg)]">&ldquo;{query}&rdquo;</span>
          </p>
        )}

        <p className="label mt-5">{t.empty.try}</p>
        <ul className="mt-2">
          {t.empty.tips.map((tip) => (
            <li
              key={tip}
              className="max-w-[62ch] border-t border-[var(--c-rule)] py-2 text-[0.875rem] text-[var(--c-fg-muted)]"
            >
              {tip}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/search" className="btn-line btn-sm">
            {t.empty.startOver}
          </Link>
          <Link href="/browse" className="btn-line btn-sm">
            {t.empty.browseAll}
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="label">{t.empty.popular}</h3>
        <ul className="register mt-2">
          {latest.map((resource) => (
            <li key={resource.id}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
