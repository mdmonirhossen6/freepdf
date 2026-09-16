'use client';

import { useState } from 'react';
import type { Resource } from '@/lib/types';
import { RESOURCES, TOTAL_RESOURCES } from '@/lib/generated/resources';
import ResourceCard, { formatDate } from '@/components/ResourceCard';
import Footer from '@/components/Footer';

interface DateGroup {
  date: string;
  items: Resource[];
}

const GROUPS: DateGroup[] = (() => {
  const map = new Map<string, Resource[]>();
  for (const resource of RESOURCES) {
    const list = map.get(resource.date);
    if (list) list.push(resource);
    else map.set(resource.date, [resource]);
  }
  return Array.from(map.entries())
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
})();

const PAGE_SIZE = 8;

export default function BrowsePage() {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = GROUPS.slice(0, visible);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--c-fg)] sm:text-3xl">Browse by date</h1>
        <p className="mt-2 text-[var(--c-fg-muted)]">
          All {TOTAL_RESOURCES.toLocaleString('en-US')} indexed resources, newest first — grouped by the day they were posted to the channel.
        </p>

        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Jump to month">
          {Array.from(new Set(GROUPS.map((g) => g.date.slice(0, 7)))).slice(0, 12).map((month) => (
            <a
              key={month}
              href={`#month-${month}`}
              className="rounded-full border border-[var(--c-line-strong)] px-3 py-1 text-xs text-[var(--c-fg-muted)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
            >
              {new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
            </a>
          ))}
        </nav>

        <div className="mt-8 flex flex-col gap-8">
          {shown.map((group) => (
            <section key={group.date} id={`month-${group.date.slice(0, 7)}`} aria-labelledby={`date-${group.date}`}>
              <div className="sticky top-0 z-10 -mx-1 mb-3 flex items-baseline gap-3 border-b border-[var(--c-line)] bg-[var(--c-bg)] px-1 py-2">
                <h2 id={`date-${group.date}`} className="text-base font-semibold text-[var(--c-fg)]">
                  {formatDate(group.date)}
                </h2>
                <span className="text-xs tabular-nums text-[var(--c-fg-subtle)]">{group.items.length} items</span>
              </div>
              <ul className="flex flex-col gap-3">
                {group.items.map((resource) => (
                  <li key={resource.id}>
                    <ResourceCard resource={resource} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {visible < GROUPS.length && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setVisible((value) => value + PAGE_SIZE)}
              className="btn-ghost text-sm"
            >
              Show more dates ({GROUPS.length - visible} remaining)
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}