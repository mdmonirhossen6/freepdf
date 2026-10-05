'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { Moon, Sun } from './icons';

const NAV = [
  { href: '/search', label: 'Search' },
  { href: '/category', label: 'Categories' },
  { href: '/browse', label: 'Browse' },
];

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  const { t } = useLang();

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
      className="border border-[var(--c-fg)] p-1.5 text-[var(--c-fg)] transition-colors hover:bg-[var(--c-fg)] hover:text-[var(--c-bg)]"
      aria-label={dark ? t.a11y.toDark : t.a11y.toLight}
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang, t } = useLang();

  return (
    <div className="seg" role="group" aria-label={t.a11y.lang}>
      {(['en', 'bn'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          /* Endonyms stay untranslated, and carry their own lang so screen
             readers pronounce "বাংলা" as Bengali rather than as English. */
          lang={code}
          aria-label={code === 'en' ? 'English' : 'বাংলা'}
          title={code === 'en' ? 'English' : 'বাংলা'}
        >
          {code === 'en' ? 'EN' : 'বাং'}
        </button>
      ))}
    </div>
  );
}

/**
 * The masthead. A printed index of this kind opens with a nameplate over a heavy
 * rule, then a line of small caps for the sections, so the header is set as a
 * nameplate rather than as an app bar: no logo tile, no pill navigation, no
 * shadow. The heavy rule underneath is what closes the nameplate off.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <header className="sticky top-0 z-[var(--z-header)] px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="site-header-bar mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl border border-[var(--glass-edge)] px-4 shadow-[var(--shadow-lift)] sm:px-5">
        <Link href="/" className="flex items-baseline gap-2.5 text-[var(--c-fg)]">
          <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[-0.015em]">
            Free Pdf
          </span>
          <span className="hidden font-mono text-[0.625rem] uppercase tracking-[0.18em] text-[var(--c-fg-subtle)] sm:inline">
            PDF index
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-5 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const label = t.nav[item.label.toLowerCase() as 'search' | 'categories' | 'browse'];
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="navlink"
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="mark md:hidden"
            aria-label={t.a11y.openSearch}
          >
            {t.nav.search}
          </Link>
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
