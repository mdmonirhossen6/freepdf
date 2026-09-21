'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRecentSearches } from '@/components/RecentSearches';
import { useLang, fill } from '@/lib/i18n';

const PLACEHOLDERS = [
  'Search for a book, subject, author or topic...',
  'ACS Chemistry 2nd Paper',
  'রসায়ন ২য় পত্র',
  'মেডিকেল ভর্তি প্রশ্নব্যাংক',
  'ইঞ্জিনিয়ারিং ভর্তি',
  'কারেন্ট অ্যাফেয়ার্স সেপ্টেম্বর',
  'জোবায়ের সিরিজ',
  'Retina Digest',
];

export default function HomeSearch({ total }: { total: number }) {
  const router = useRouter();
  const { t, fmt } = useLang();
  const [value, setValue] = useState('');
  const [pointer, setPointer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { recent, add } = useRecentSearches();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPointer((p) => (p + 1) % PLACEHOLDERS.length);
    }, 4500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value?.trim() ?? '';
      if (q) {
        add(q);
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
    },
    [add, router],
  );

  return (
    <section className="relative overflow-hidden border-b border-[var(--c-line)] px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 65% at 28% 8%, var(--c-accent-soft) 0%, transparent 58%), radial-gradient(45% 55% at 78% 12%, rgb(224 168 70 / 0.16) 0%, transparent 60%), radial-gradient(70% 90% at 50% 0%, var(--c-accent-soft) 0%, transparent 64%)',
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="mb-5 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--c-fg-muted)]">
          <span aria-hidden="true" className="inline-block h-[3px] w-5 rounded-full bg-[var(--c-accent)]" />
          {t.hero.eyebrow}
          <span aria-hidden="true" className="inline-block h-[3px] w-5 rounded-full bg-[var(--c-accent)]" />
        </p>
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--c-fg)] sm:text-5xl lg:text-[3.4rem]">
          {t.hero.titleA} <em className="italic text-[var(--c-accent)]">{t.hero.titleAccent}</em> {t.hero.titleB}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[var(--c-fg-muted)] sm:text-lg">
          {fill(t.hero.subtitle, { count: fmt(total) })}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex w-full flex-col items-center sm:mt-10 sm:flex-row sm:justify-center"
        >
          <div className="relative w-full max-w-xl">
            <div className="glass-panel glass-enter group relative flex items-center overflow-hidden rounded-xl px-4 sm:px-5 sm:py-3.5">
              <span className="glass-sheen" aria-hidden="true" />
              <svg
                className="mr-3 h-5 w-5 shrink-0 text-[var(--c-fg-muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                name="q"
                type="search"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={PLACEHOLDERS[pointer]}
                className="flex-1 bg-transparent text-[var(--c-fg)] placeholder:text-[var(--c-fg-subtle)] focus:outline-none sm:text-base"
                aria-label="Search resources"
              />
              <button
                type="submit"
                className="rounded-full bg-[var(--c-accent)] px-4 py-1.5 text-sm font-medium text-[var(--c-accent-fg)] hover:brightness(1.05) transition sm:px-5 sm:py-2"
              >
                {t.hero.searchBtn}
              </button>
            </div>
            {recent.length > 0 && (
              <div className="glass-panel glass-enter absolute z-10 mt-1 w-full overflow-hidden rounded-lg sm:relative sm:mt-2">
                <div className="flex items-center justify-between border-b border-[var(--c-line-strong)] px-4 py-2 dark:border-[var(--c-line)]">
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--c-fg-muted)]">{t.recent.title}</span>
                  <button
                    type="button"
                    onClick={() => router.push('/search')}
                    className="text-xs text-[var(--c-accent)] hover:underline"
                  >
                    {t.recent.viewAll}
                  </button>
                </div>
                <ul className="py-1" role="list">
                  {recent.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => {
                          add(q);
                          router.push(`/search?q=${encodeURIComponent(q)}`);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[var(--c-fg)] hover:bg-[var(--c-bg-subtle)] dark:hover:bg-[var(--c-bg-subtle)]"
                      >
                        <svg className="h-4 w-4 shrink-0 text-[var(--c-fg-subtle)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </form>

        <p className="mt-5 text-sm text-[var(--c-fg-subtle)]">
          or{' '}
          <Link
            href="/browse"
            className="font-medium text-[var(--c-accent)] underline-offset-4 hover:underline"
          >
            {t.hero.browse}
          </Link>
        </p>
      </div>
    </section>
  );
}