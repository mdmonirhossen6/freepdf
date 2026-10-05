'use client';

import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/i18n';
import { CaretDown, ClockCounterClockwise, MagnifyingGlass } from './icons';

const STORAGE_KEY = 'hscfreepdf_recent_searches';
const MAX = 6;

export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setRecent(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const add = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, MAX);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const clear = () => {
    setRecent([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return { recent, add, clear };
}

/**
 * The search history drawer on the search page, set as a ruled slip rather than
 * a floating panel. Kept in markup only while it has something to hold.
 */
export default function RecentSearches() {
  const { t } = useLang();
  const { recent, add, clear } = useRecentSearches();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (recent.length === 0) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border border-[var(--c-fg)] bg-[var(--c-panel)] px-3 py-2 text-left transition-colors hover:bg-[var(--c-band)]"
      >
        <span className="label flex items-center gap-2">
          <ClockCounterClockwise className="h-3.5 w-3.5" aria-hidden="true" />
          {t.recent.recentTitle}
        </span>
        <CaretDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-[var(--z-sticky)] mt-1 border border-[var(--c-fg)] bg-[var(--c-panel)]">
          <div className="flex items-center justify-between border-b border-[var(--c-rule)] px-3 py-2">
            <span className="label">{t.recent.recentTitle}</span>
            <button type="button" onClick={clear} className="mark">
              {t.recent.clear}
            </button>
          </div>
          <ul>
            {recent.map((query) => (
              <li key={query} className="border-b border-[var(--c-rule)] last:border-b-0">
                <a
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => add(query)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[0.875rem] text-[var(--c-fg)] transition-colors hover:bg-[var(--c-band)] hover:text-[var(--c-spot)]"
                >
                  <MagnifyingGlass className="h-3.5 w-3.5 shrink-0 text-[var(--c-fg-subtle)]" aria-hidden="true" />
                  {query}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
