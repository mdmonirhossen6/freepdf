'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RESOURCES } from '@/lib/generated/resources';
import { searchAll } from '@/lib/search';
import type { ResourceCategory, ResourceType, SortKey } from '@/lib/types';
import ResourceCard from '@/components/ResourceCard';
import FilterBar from '@/components/FilterBar';
import SortBar from '@/components/SortBar';
import DidYouMean from '@/components/DidYouMean';
import EmptyState from '@/components/EmptyState';
import RecentSearches, { useRecentSearches } from '@/components/RecentSearches';
import { useLang, fill } from '@/lib/i18n';

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, fmt } = useLang();
  const { add } = useRecentSearches();

  const urlQuery = params.get('q') ?? '';
  const urlType = params.get('type') ?? '';
  const urlCategory = params.get('category') ?? '';
  const urlSort = (params.get('sort') as SortKey) ?? 'relevance';

  const [input, setInput] = useState(urlQuery);
  const [debounced, setDebounced] = useState(urlQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInput(urlQuery);
    setDebounced(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(input), 130);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [input]);

  const pushUrl = useCallback(
    (next: { q?: string; type?: string; category?: string; sort?: SortKey }) => {
      const sp = new URLSearchParams();
      const q = next.q !== undefined ? next.q : urlQuery;
      const t = next.type !== undefined ? next.type : urlType;
      const c = next.category !== undefined ? next.category : urlCategory;
      const s = next.sort !== undefined ? next.sort : urlSort;
      if (q) sp.set('q', q);
      if (t) sp.set('type', t);
      if (c) sp.set('category', c);
      if (s && s !== 'relevance') sp.set('sort', s);
      const qs = sp.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    },
    [router, urlQuery, urlType, urlCategory, urlSort],
  );

  useEffect(() => {
    if (debounced !== urlQuery) pushUrl({ q: debounced });
  }, [debounced, urlQuery, pushUrl]);

  const result = useMemo(
    () =>
      searchAll(RESOURCES, {
        query: urlQuery,
        typeFilter: (urlType || 'ALL') as ResourceType | 'ALL',
        categoryFilter: (urlCategory || 'ALL') as ResourceCategory | 'ALL',
        sort: urlSort,
        limit: 300,
      }),
    [urlQuery, urlType, urlCategory, urlSort],
  );

  const hasFilters = Boolean(urlType || urlCategory);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDebounced(input);
    if (input.trim()) add(input.trim());
    pushUrl({ q: input });
  };

  const clearAll = () => {
    setInput('');
    setDebounced('');
    router.replace('/search', { scroll: false });
  };

  return (
    <div className="wrap pb-16 pt-8">
      <h1 className="font-display text-[1.9rem] font-semibold tracking-[-0.015em] sm:text-[2.3rem]">
        {t.search.title}
      </h1>
      <p className="mt-2 max-w-[72ch] text-[var(--c-fg-muted)]">
        {fill(t.search.subtitle, { count: fmt(RESOURCES.length) })}
      </p>

      <form onSubmit={onSubmit} className="mt-6 max-w-[40rem]">
        <label htmlFor="search-input" className="sr-only">
          {t.search.query}
        </label>
        <div className="field">
          <input
            id="search-input"
            name="q"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t.search.query}
            aria-label={t.search.query}
          />
          <button type="submit" className="field-button">
            {t.hero.searchBtn}
          </button>
        </div>
      </form>

      <div className="mt-4 max-w-[40rem]">
        <RecentSearches />
      </div>

      {result.didYouMean && (
        <div className="mt-4">
          <DidYouMean
            suggestion={result.didYouMean}
            query={urlQuery}
            onSelect={(value) => {
              setInput(value);
              setDebounced(value);
              pushUrl({ q: value });
            }}
          />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-6 border-t-2 border-[var(--c-fg)] pt-4 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <FilterBar
          activeType={urlType}
          activeCategory={urlCategory}
          onTypeChange={(value) => pushUrl({ type: value })}
          onCategoryChange={(value) => pushUrl({ category: value })}
        />
        <SortBar activeSort={urlSort} onSortChange={(value) => pushUrl({ sort: value })} />
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="num text-[1.05rem]">{fmt(result.total)}</span>
        <span className="text-[var(--c-fg-muted)]">{t.search.results}</span>
        {urlQuery && (
          <span className="font-mono text-[0.8125rem] text-[var(--c-fg-subtle)]">&ldquo;{urlQuery}&rdquo;</span>
        )}
        {hasFilters && (
          <button type="button" onClick={clearAll} className="mark ml-auto">
            {t.search.clear}
          </button>
        )}
      </div>

      {result.results.length === 0 ? (
        <EmptyState query={urlQuery} />
      ) : (
        <ul className="register register-2col mt-3" aria-label={t.search.results}>
          {result.results.map((resource) => (
            <li key={resource.id}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export default function SearchPage() {
  const { t } = useLang();
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-[var(--c-fg-muted)] sm:px-6 lg:px-8">
          {t.search.loading}
        </div>
      }
    >
      <SearchInner />
    </Suspense>
  );
}