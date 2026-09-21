'use client';

import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/i18n';

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
        className="flex w-full items-center justify-between rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-panel)] px-4 py-3 text-left transition hover:border-[var(--c-fg-muted)] dark:border-[var(--c-line)]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm text-[var(--c-fg-muted)]">
          <svg className="h-4 w-4 shrink-0 text-[var(--c-fg-subtle)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-medium">{t.recent.recentTitle}</span>
        </span>
        <svg className={`h-4 w-4 shrink-0 text-[var(--c-fg-muted)] transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="glass-panel mt-1 overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-[var(--c-line)] px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--c-fg-subtle)]">{t.recent.recentTitle}</span>
            <button type="button" onClick={clear} className="text-xs text-[var(--c-accent)] hover:underline">
              {t.recent.clear}
            </button>
          </div>
          <ul className="py-1">
            {recent.map((query) => (
              <li key={query}>
                <a
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => add(query)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--c-fg)] hover:bg-[var(--c-bg-subtle)]"
                >
                  <svg className="h-4 w-4 shrink-0 text-[var(--c-fg-subtle)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
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