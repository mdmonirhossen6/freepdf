'use client';

import Link from 'next/link';
import type { Resource } from '@/lib/types';
import ResourceCard, { formatDate } from './ResourceCard';
import { useLang, fill } from '@/lib/i18n';

interface LatestResourcesProps {
  resources: Resource[];
  latestDate: string;
}

/**
 * The six most recent entries, printed as the top of the register. Only the
 * first three carry a plate, because the plate marks the day's leading entries
 * rather than decorating every row.
 */
export default function LatestResources({ resources, latestDate }: LatestResourcesProps) {
  const { t, locale } = useLang();

  return (
    <section className="section-tight border-b border-[var(--c-rule)]" aria-labelledby="latest-heading">
      <div className="wrap">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="latest-heading" className="font-display text-[1.7rem] font-semibold tracking-[-0.01em] sm:text-[2rem]">
            {t.latest.heading}
          </h2>
          <p className="label">{fill(t.latest.uploaded, { date: formatDate(latestDate, locale) })}</p>
        </div>

        <ul className="register mask-in mask-1 mt-4">
          {resources.map((resource) => (
            <li key={resource.id}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm">
          <Link href="/browse" className="link-spot">
            {t.latest.viewAll}
          </Link>
        </p>
      </div>
    </section>
  );
}
