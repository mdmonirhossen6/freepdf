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
 * The six most recent entries, printed as the top of the register. No plates,
 * no cards: the row alignment and the metadata carry the structure.
 */
export default function LatestResources({ resources, latestDate }: LatestResourcesProps) {
  const { t, locale } = useLang();

  return (
    <section className="section" aria-labelledby="latest-heading">
      <div className="wrap">
        <div className="section-head">
          <h2 id="latest-heading" className="section-title">
            {t.latest.heading}
          </h2>
          <p className="label">{fill(t.latest.uploaded, { date: formatDate(latestDate, locale) })}</p>
        </div>

        <ul className="register mt-4">
          {resources.map((resource) => (
            <li key={resource.id}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>

        <p className="section-foot">
          <Link href="/browse" className="link-spot">
            {t.latest.viewAll}
          </Link>
        </p>
      </div>
    </section>
  );
}
