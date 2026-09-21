'use client';

import Link from 'next/link';
import { RESOURCES } from '@/lib/generated/resources';
import { useLang, fill } from '@/lib/i18n';

export default function EmptyState({ query, total }: { query: string; total: number }) {
  const { t, fmt } = useLang();
  const latest = RESOURCES.slice(0, 6);

  return (
    <div className="mx-auto max-w-2xl py-10 text-center">
      <div className="rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-panel)] p-8 dark:border-[var(--c-line)]">
        <h2 className="text-lg font-semibold text-[var(--c-fg)]">{t.empty.title}</h2>
        {query && (
          <p className="mt-2 text-sm text-[var(--c-fg-muted)]">
            {t.empty.prefix}{' '}
            <span className="font-medium text-[var(--c-fg)]">&ldquo;{query}&rdquo;</span>
          </p>
        )}
        <div className="mt-5 text-left text-sm text-[var(--c-fg-muted)]">
          <p className="font-medium text-[var(--c-fg)]">{t.empty.try}</p>
          <ul className="mt-1.5 list-inside list-disc space-y-1">
            {t.empty.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/search" className="btn-primary text-sm">
            {t.search.clear}
          </Link>
          <Link href="/browse" className="btn-ghost text-sm">
            {fill(t.empty.browseAll, { count: fmt(total) })}
          </Link>
        </div>
      </div>

      <div className="mt-8 text-left">
        <h3 className="text-sm font-medium text-[var(--c-fg)]">{t.empty.popular}</h3>
        <ul className="mt-2 flex flex-col divide-y divide-[var(--c-line)] rounded-lg border border-[var(--c-line)]">
          {latest.map((resource) => (
            <li key={resource.id} className="px-4 py-2.5">
              <span className="mr-2 inline-flex rounded border border-[var(--c-line-strong)] px-1 py-0.5 text-[10px] font-semibold uppercase text-[var(--c-fg-subtle)]">
                {resource.typeLabel}
              </span>
              <a
                href={resource.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--c-fg-muted)] hover:text-[var(--c-accent)]"
              >
                {resource.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}