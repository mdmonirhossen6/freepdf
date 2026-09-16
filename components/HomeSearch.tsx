'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecentSearches } from '@/components/RecentSearches';

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
    <section className="border-b border-[var(--c-line)] bg-[var(--c-bg)] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--c-fg)] sm:text-4xl lg:text-5xl">
          Free Pdf
        </h1>
        <p className="mt-2 text-base font-medium text-[var(--c-fg)] sm:text-lg">Find the PDF you need.</p>
        <p className="mt-1 text-[var(--c-fg-muted)] sm:text-base">
          Search HSC, University Admission, Medical, Engineering, BCS and other study resources.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex w-full flex-col items-center sm:mt-10 sm:flex-row sm:justify-center"
        >
          <div className="relative w-full max-w-xl">
            <div className="group relative flex items-center border border-[var(--c-line-strong)] bg-[var(--c-panel)] px-4 shadow-sm transition-shadow hover:border-[var(--c-fg-muted)] focus-within:border-[var(--c-accent)] focus-within:shadow-md dark:border-[var(--c-line)] sm:py-3">
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
                Search
              </button>
            </div>
            {recent.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-panel)] shadow-lg dark:border-[var(--c-line)] sm:relative sm:mt-2 sm:box-shadow-none sm:border sm:bg-transparent sm:shadow-none">
                <div className="flex items-center justify-between border-b border-[var(--c-line-strong)] px-4 py-2 dark:border-[var(--c-line)]">
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--c-fg-muted)]">Recent</span>
                  <button
                    type="button"
                    onClick={() => router.push('/search')}
                    className="text-xs text-[var(--c-accent)] hover:underline"
                  >
                    View all
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

        <p className="mt-6 text-xs text-[var(--c-fg-subtle)]">
          {total.toLocaleString('en-US')} resources indexed · {new Date().getFullYear()}
        </p>
      </div>
    </section>
  );
}