import Link from 'next/link';
import type { Resource } from '@/lib/types';
import ResourceCard from './ResourceCard';

interface LatestResourcesProps {
  resources: Resource[];
  latestDate: string;
  total: number;
}

function formatDate(iso: string): string {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function LatestResources({ resources, latestDate, total }: LatestResourcesProps) {
  return (
    <section className="border-t border-[var(--c-line)] py-12 sm:py-16" aria-labelledby="latest-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--c-fg-subtle)]">Recently added</p>
            <h2 id="latest-heading" className="mt-1 text-xl font-semibold text-[var(--c-fg)]">
              Newest resources
            </h2>
            <p className="mt-1 text-sm text-[var(--c-fg-muted)]">Latest upload: {formatDate(latestDate)}</p>
          </div>
          <Link href="/browse" className="text-sm font-medium text-[var(--c-accent)] hover:underline">
            View all {total.toLocaleString('en-US')} resources →
          </Link>
        </div>
        <ul className="flex flex-col gap-3">
          {resources.map((resource) => (
            <li key={resource.id}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}