'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/search', label: 'Search' },
  { href: '/category', label: 'Categories' },
  { href: '/browse', label: 'Browse' },
];

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try {
      localStorage.setItem('hscfreepdf_theme', next ? 'dark' : 'light');
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-[var(--c-line-strong)] p-2 text-[var(--c-fg-muted)] transition hover:border-[var(--c-fg-muted)] hover:text-[var(--c-fg)]"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="glass-chrome sticky top-0 z-40 border-b border-[var(--c-line)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-[var(--c-fg)] font-display">
          <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
            <rect width="24" height="24" rx="6" fill="var(--c-accent)" />
            <path d="M8 5h8a1 1 0 0 1 1 1v13.6l-5-3-5 3V6a1 1 0 0 1 1-1Z" fill="rgb(250 246 239 / 0.96)" />
            <path d="M10 9.5h4v1.2h-4zM10 12.5h4v1.2h-4z" fill="var(--c-accent)" />
          </svg>
          Free Pdf
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 sm:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`text-sm transition ${
                  active
                    ? 'font-medium text-[var(--c-fg)]'
                    : 'text-[var(--c-fg-muted)] hover:text-[var(--c-fg)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/search" className="btn-ghost px-3 py-1.5 text-xs sm:hidden" aria-label="Open search">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Search
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}