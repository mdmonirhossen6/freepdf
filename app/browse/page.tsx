'use client';

import { useState } from 'react';
import type { Resource } from '@/lib/types';
import { RESOURCES, TOTAL_RESOURCES } from '@/lib/generated/resources';
import ResourceCard, { formatDate } from '@/components/ResourceCard';
import Footer from '@/components/Footer';
import { useLang, fill } from '@/lib/i18n';

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
  const { t, fmt, locale } = useLang();
  const shown = GROUPS.slice(0, visible);

  return (
    <>
      <div className="wrap pb-16 pt-8">
        <h1 className="font-display text-[1.9rem] font-semibold tracking-[-0.015em] sm:text-[2.3rem]">
          {t.browse.title}
        </h1>
        <p className="mt-2 max-w-[72ch] text-[var(--c-fg-muted)]">
          {fill(t.browse.subtitle, { count: fmt(TOTAL_RESOURCES) })}
        </p>

        <nav className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2" aria-label={t.browse.jump}>
          <span className="label">{t.browse.jump}</span>
          <div className="seg">
            {Array.from(new Set(GROUPS.map((g) => g.date.slice(0, 7))))
              .slice(0, 12)
              .map((month) => (
                <a key={month} href={`#month-${month}`}>
                  {new Date(`${month}-01T00:00:00Z`).toLocaleDateString(locale, {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </a>
              ))}
          </div>
        </nav>

        <div className="mt-8">
          {shown.map((group, groupIndex) => (
            <section
              key={group.date}
              id={`month-${group.date.slice(0, 7)}`}
              aria-labelledby={`date-${group.date}`}
              className="mb-8"
            >
              <div className="sticky top-[4.1rem] z-[var(--z-sticky)] flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-[var(--c-fg)] bg-[var(--c-bg)] pb-2 pt-2">
                <h2 id={`date-${group.date}`} className="font-display text-[1.15rem] font-semibold">
                  {formatDate(group.date, locale)}
                </h2>
                <span className="num text-[0.75rem] text-[var(--c-fg-subtle)]">
                  {fmt(group.items.length)} {t.browse.items}
                </span>
              </div>
              <ul className="register register-2col">
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
          <p className="mt-8">
            <button type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)} className="btn-line">
              {t.browse.showMore}
              <span className="num">
                ({fill(t.browse.remaining, { count: fmt(GROUPS.length - visible) })})
              </span>
            </button>
          </p>
        )}
      </div>
      <Footer />
    </>
  );
}
