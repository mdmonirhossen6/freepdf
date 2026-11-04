'use client';

import { useEffect, useState, type MouseEvent } from 'react';
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

const MONTHS = Array.from(new Set(GROUPS.map((group) => group.date.slice(0, 7))));

const PAGE_SIZE = 8;

export default function BrowsePage() {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const { t, fmt, locale } = useLang();
  const shown = GROUPS.slice(0, visible);

  useEffect(() => {
    if (!jumpTo) return;
    const target = document.getElementById(`month-${jumpTo}`);
    if (!target) return;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    target.scrollIntoView({ block: 'start' });
    root.style.scrollBehavior = previous;
    setJumpTo(null);
  }, [jumpTo, visible]);

  const jumpToMonth = (month: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const index = GROUPS.findIndex((group) => group.date.slice(0, 7) === month);
    if (index < 0) return;
    history.replaceState(null, '', `#month-${month}`);
    setVisible((value) => Math.max(value, index + 1));
    setJumpTo(month);
  };

  return (
    <>
      <div className="wrap">
        <header className="page-head">
          <h1 className="page-title">{t.browse.title}</h1>
          <p className="page-lede">{fill(t.browse.subtitle, { count: fmt(TOTAL_RESOURCES) })}</p>
        </header>

        <nav className="mb-6" aria-label={t.browse.jump}>
          <p className="label mb-2">{t.browse.jump}</p>
          <div className="month-nav">
            {MONTHS.map((month) => (
              <a key={month} href={`#month-${month}`} className="month-tab" onClick={jumpToMonth(month)}>
                {new Date(`${month}-01T00:00:00Z`).toLocaleDateString(locale, {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </a>
            ))}
          </div>
        </nav>

        <div className="pb-2">
          {shown.map((group, index) => {
            const month = group.date.slice(0, 7);
            const firstOfMonth = index === 0 || shown[index - 1]?.date.slice(0, 7) !== month;
            return (
              <section
                key={group.date}
                id={firstOfMonth ? `month-${month}` : undefined}
                aria-labelledby={`date-${group.date}`}
                className={`date-group${index === 0 ? '' : ' mt-7'}`}
              >
                <div className="date-heading">
                  <h2 id={`date-${group.date}`} className="date-title">
                    {formatDate(group.date, locale)}
                  </h2>
                  <span className="date-count">
                    {fmt(group.items.length)} {group.items.length === 1 ? t.browse.itemOne : t.browse.items}
                  </span>
                </div>
                <ul className="register">
                  {group.items.map((resource) => (
                    <li key={resource.id}>
                      <ResourceCard resource={resource} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
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
        <div className="pb-16" />
      </div>
      <Footer />
    </>
  );
}
