'use client';

import Link from 'next/link';
import { RESOURCES } from '@/lib/generated/resources';
import { useLang } from '@/lib/i18n';

/**
 * The notice a printed index prints when a heading has no entries: the heading
 * itself, the reason, and the neighbouring entries a reader can turn to instead.
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
            {t.search.clear}
          </Link>
          <Link href="/browse" className="btn-line btn-sm">
            {t.empty.browseAll}
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="label">{t.empty.popular}</h3>
        <ul className="mt-3 register register-2col">
          {latest.map((resource) => (
            <li key={resource.id}>
              <div className="entry">
                <div className="entry-no num" aria-hidden="true">
                  {resource.id}
                </div>
                <div className="min-w-0">
                  <a
                    href={resource.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="entry-title inline"
                  >
                    {resource.title}
                  </a>
                  <p className="entry-meta">
                    <time dateTime={resource.date}>{resource.date}</time>
                    <span className="sep" aria-hidden="true" />
                    <span>{resource.typeLabel}</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
