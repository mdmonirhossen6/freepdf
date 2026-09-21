'use client';

import Link from 'next/link';
import type { Resource } from '@/lib/types';
import ResourceCard, { formatDate } from './ResourceCard';
import { useLang, fill } from '@/lib/i18n';

interface LatestResourcesProps {
  resources: Resource[];
  latestDate: string;
  total: number;
}

export default function LatestResources({ resources, latestDate, total }: LatestResourcesProps) {
  const { t, fmt, locale } = useLang();

  return (
    <section className="border-t border-[var(--c-line)] py-12 sm:py-16" aria-labelledby="latest-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-fg-muted)]">
              <span aria-hidden="true" className="inline-block h-[3px] w-5 rounded-full bg-[var(--c-accent)]" />
              {t.latest.eyebrow}
            </p>
            <h2 id="latest-heading" className="mt-1 text-xl font-semibold text-[var(--c-fg)]">
              {t.latest.heading}
            </h2>
            <p className="mt-1 text-sm text-[var(--c-fg-muted)]">{fill(t.latest.uploaded, { date: formatDate(latestDate, locale) })}</p>
          </div>
          <Link href="/browse" className="text-sm font-medium text-[var(--c-accent)] hover:underline">
            {fill(t.latest.viewAll, { count: fmt(total) })} →
          </Link>
        </div>
        <ul className="flex flex-col gap-3">
          {resources.map((resource) => (
            <li key={resource.id} data-reveal>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}