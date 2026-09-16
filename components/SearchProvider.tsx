'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type SearchState = {
  query: string;
  typeFilter: string;
  categoryFilter: string;
  sort: 'relevance' | 'newest' | 'oldest';
  page: number;
};

const STORAGE_KEY = 'hscfreepdf_search_state_v1';

function pushQuery(state: SearchState) {
  const base = '/search';
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.typeFilter) params.set('type', state.typeFilter);
  if (state.categoryFilter) params.set('category', state.categoryFilter);
  if (state.sort !== 'relevance') params.set('sort', state.sort);
  const qs = params.toString();
  window.history.replaceState(null, '', qs ? `${base}?${qs}` : base);
}

function loadInitial(): SearchState {
  if (typeof window === 'undefined') return { query: '', typeFilter: '', categoryFilter: '', sort: 'relevance', page: 1 };
  const h = window.location.pathname;
  if (!h.startsWith('/search')) return { query: '', typeFilter: '', categoryFilter: '', sort: 'relevance', page: 1 };
  const u = new URL(window.location.href);
  return {
    query: u.searchParams.get('q') ?? '',
    typeFilter: u.searchParams.get('type') ?? '',
    categoryFilter: u.searchParams.get('category') ?? '',
    sort: (u.searchParams.get('sort') as SearchState['sort']) ?? 'relevance',
    page: Math.max(1, Number(u.searchParams.get('page') ?? 1)),
  };
}

/**
 * Keeps the in-page search input state in sync with the browser URL.
 * Other components read from this shared store via `useSearchState()`.
 */
export function useSearchState() {
  const [state, setState] = useState<SearchState>(loadInitial);

  const setSearch = useCallback((next: Partial<SearchState>) => {
    setState((prev) => {
      const nextState = { ...prev, ...next, page: 1 };
      pushQuery(nextState);
      return nextState;
    });
  }, []);

  const commitFromLocation = useCallback(() => {
    setState(loadInitial());
  }, []);

  useEffect(() => {
    const onPop = () => setState(loadInitial());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return { state, setSearch, commitFromLocation };
}

export { type SearchState };