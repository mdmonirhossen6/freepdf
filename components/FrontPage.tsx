'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRecentSearches } from '@/components/RecentSearches';
import { useLang, fill } from '@/lib/i18n';
import { searchAll } from '@/lib/search';
import { RESOURCES, TOTAL_RESOURCES, LATEST_RESOURCE_DATE } from '@/lib/generated/resources';
import { CATEGORY_META } from '@/lib/categories';
import { formatDate } from '@/components/ResourceCard';
import { ArrowUpRight, MagnifyingGlass } from '@/components/icons';

const PLACEHOLDERS = [
  'Search by book, subject or topic',
  'ACS Chemistry 2nd Paper',
  'রসায়ন ২য় পত্র',
  'মেডিকেল ভর্তি প্রশ্নব্যাংক',
  'ইঞ্জিনিয়ারিং ভর্তি',
  'কারেন্ট অ্যাফেয়ার্স সেপ্টেম্বর',
];

const SHORTCUTS = ['রসায়ন ২য় পত্র', 'জোবায়ের সিরিজ', 'মেডিকেল ভর্তি', 'BCS Preliminary', 'Udvash Solution'];

/**
 * The front page. One dense command panel, no photography: headline, search,
 * ledger strip and popular terms. The type and the numbers do the work.
 */
export default function FrontPage({ total }: { total: number }) {
  const router = useRouter();
  const { t, fmt, locale } = useLang();
  const [pointer, setPointer] = useState(0);
  const { recent, add } = useRecentSearches();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setPointer((value) => (value + 1) % PLACEHOLDERS.length), 4500);
    return () => window.clearInterval(id);
  }, []);

  const shortcuts = useMemo(
    () =>
      SHORTCUTS.map((query) => ({ query, count: searchAll(RESOURCES, { query, limit: 1 }).total }))
        .filter((item) => item.count > 0)
        .slice(0, 5),
    [],
  );

  const pdfs = useMemo(() => RESOURCES.filter((r) => r.type === 'PDF').length, []);

  const trackCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const resource of RESOURCES) {
      for (const category of resource.categories) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    return counts;
  }, []);

  const openQuery = (query: string) => {
    add(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = (event.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value.trim() ?? '';
    if (query) openQuery(query);
  };

  return (
    <section className="border-b border-[var(--c-rule)]">
      <div className="wrap">
        <div className="grid gap-4 py-6 sm:py-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
          {/* Search panel: frosted command deck, type and numbers do the work. */}
          <div className="glass mask-in mask-1 px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex h-full flex-col justify-center">
              <p className="rule-cap">
                {fmt(TOTAL_RESOURCES)} {t.bento.resources} · PDF index
              </p>
              <h1 className="mt-3 font-display text-[2.3rem] font-semibold leading-[1.04] tracking-[-0.02em] sm:text-[3rem] lg:text-[3.3rem]">
                {t.hero.title}
              </h1>

              <p className="pull-quote mt-4 max-w-[52ch] text-[1.125rem] leading-relaxed text-[var(--c-fg-muted)]">
                {fill(t.hero.rule, { count: fmt(total) })}
              </p>

              <form onSubmit={onSubmit} className="mt-6 max-w-[32rem]">
                <label htmlFor="home-search" className="sr-only">
                  {t.hero.searchLabel}
                </label>
                <div className="field field-luxe">
                  <MagnifyingGlass className="h-4 w-4 shrink-0 text-[var(--c-fg-subtle)]" aria-hidden="true" />
                  <input
                    id="home-search"
                    name="q"
                    type="search"
                    autoComplete="off"
                    placeholder={PLACEHOLDERS[pointer]}
                    className="text-[var(--c-fg)] placeholder:text-[var(--c-fg-subtle)]"
                  />
                  <button type="submit" className="field-button">
                    {t.hero.searchBtn}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </form>

              {recent.length > 0 && (
                <ul className="mt-4 max-w-[32rem] border-t border-[var(--c-rule)]">
                  {recent.slice(0, 3).map((query) => (
                    <li key={query} className="border-b border-[var(--c-rule)]">
                      <button
                        type="button"
                        onClick={() => openQuery(query)}
                        className="w-full cursor-pointer py-1.5 text-left font-mono text-[0.75rem] text-[var(--c-fg-muted)] transition-colors hover:text-[var(--c-spot)]"
                      >
                        {query}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Ledger strip: the index at a glance, folded into the card. */}
              <dl className="mt-6 grid grid-cols-3 gap-4 border-t-2 border-[var(--c-fg)] pt-4 sm:grid-cols-4">
                <div>
                  <dt className="rule-cap">{t.ledger.total}</dt>
                  <dd className="num mt-1 text-[1.35rem] leading-none">{fmt(TOTAL_RESOURCES)}</dd>
                </div>
                <div>
                  <dt className="rule-cap">{t.ledger.pdf}</dt>
                  <dd className="num mt-1 text-[1.35rem] leading-none">{fmt(pdfs)}</dd>
                </div>
                <div>
                  <dt className="rule-cap">{t.ledger.tracks}</dt>
                  <dd className="num mt-1 text-[1.35rem] leading-none">{fmt(CATEGORY_META.length)}</dd>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <dt className="rule-cap">{t.ledger.updated}</dt>
                  <dd className="mt-1 text-[0.8125rem] leading-snug">{formatDate(LATEST_RESOURCE_DATE, locale)}</dd>
                </div>
              </dl>

              <p className="mt-5 text-[0.9375rem]">
                <Link href="/browse" className="link-spot">
                  {t.hero.browse}
                </Link>
              </p>
            </div>
          </div>

          {/* Tracks at a glance: glass list with live counts. */}
          <div className="glass mask-in mask-2 px-5 py-5 sm:px-6">
            <p className="rule-cap">{t.bento.heading}</p>
            <ul className="mt-2 border-t-2 border-[var(--c-fg)]">
              {CATEGORY_META.map((category) => (
                <li key={category.slug} className="border-b border-[var(--c-rule)]">
                  <Link
                    href={`/category/${category.slug}`}
                    className="group flex items-baseline justify-between gap-3 py-1.5"
                  >
                    <span className="text-[0.9375rem] font-semibold text-[var(--c-fg)] transition-colors group-hover:text-[var(--c-spot)]">
                      {category.label}
                    </span>
                    <span className="num text-[0.75rem] text-[var(--c-fg-subtle)]">
                      {fmt(trackCounts.get(category.name) ?? 0)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              <Link href="/category" className="link-spot">
                {t.bento.all}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Popular terms as a frosted strip, not pills. */}
      <div className="border-t border-[var(--c-rule)] bg-[var(--c-band)] backdrop-blur-md">
        <div className="wrap flex flex-wrap items-baseline gap-x-4 gap-y-2 py-3">
          <span className="label">{t.hero.popular}</span>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {shortcuts.map((item) => (
              <li key={item.query} className="flex items-baseline gap-1.5">
                <Link
                  href={`/search?q=${encodeURIComponent(item.query)}`}
                  onClick={() => add(item.query)}
                  className="link-spot text-[0.8125rem]"
                  aria-label={fill(t.hero.chipAria, { q: item.query, count: fmt(item.count) })}
                >
                  {item.query}
                </Link>
                <span className="num text-[0.6875rem] text-[var(--c-fg-subtle)]">{fmt(item.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
