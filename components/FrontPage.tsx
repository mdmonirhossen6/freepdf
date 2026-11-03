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
 * The front page masthead: headline, search, the index ledger on the margin and
 * the popular terms under a rule. The category shelves live once, further down
 * the page, so the hero does not repeat them.
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
    <section className="hero" aria-labelledby="hero-heading">
      <div className="wrap hero-grid">
        <div className="mask-in mask-1">
          <p className="hero-kicker">
            {fmt(TOTAL_RESOURCES)} {t.bento.resources} · PDF index
          </p>
          <h1 id="hero-heading" className="hero-title">
            {t.hero.title}
          </h1>
          <p className="hero-lede">{fill(t.hero.rule, { count: fmt(total) })}</p>

          <form onSubmit={onSubmit} className="mt-6 max-w-[34rem]">
            <label htmlFor="home-search" className="sr-only">
              {t.hero.searchLabel}
            </label>
            <div className="field field-lg">
              <MagnifyingGlass className="ml-4 h-4 w-4 shrink-0 self-center text-[var(--c-fg-subtle)]" aria-hidden="true" />
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
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="label">{t.recent.recentTitle}</span>
              {recent.slice(0, 3).map((query) => (
                <button key={query} type="button" onClick={() => openQuery(query)} className="mark">
                  {query}
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="hero-aside" aria-label={t.ledger.eyebrow}>
          <p className="label">{t.ledger.eyebrow}</p>
          <dl className="ledger">
            <div className="ledger-row">
              <dt className="ledger-label">{t.ledger.total}</dt>
              <dd className="ledger-value">{fmt(TOTAL_RESOURCES)}</dd>
            </div>
            <div className="ledger-row">
              <dt className="ledger-label">{t.ledger.pdf}</dt>
              <dd className="ledger-value">{fmt(pdfs)}</dd>
            </div>
            <div className="ledger-row">
              <dt className="ledger-label">{t.ledger.tracks}</dt>
              <dd className="ledger-value">{fmt(CATEGORY_META.length)}</dd>
            </div>
            <div className="ledger-row">
              <dt className="ledger-label">{t.ledger.updated}</dt>
              <dd className="ledger-value ledger-value-small">{formatDate(LATEST_RESOURCE_DATE, locale)}</dd>
            </div>
          </dl>
          <p className="hero-aside-foot">
            <Link href="/browse" className="link-spot">
              {t.hero.browse}
            </Link>
          </p>
        </aside>
      </div>

      <div className="popular-strip">
        <div className="wrap popular-inner">
          <span className="label">{t.hero.popular}</span>
          <ul className="popular-list">
            {shortcuts.map((item) => (
              <li key={item.query} className="popular-item">
                <Link
                  href={`/search?q=${encodeURIComponent(item.query)}`}
                  onClick={() => add(item.query)}
                  className="link-spot"
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
