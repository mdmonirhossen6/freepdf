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
      className="icon-button"
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

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="2" fill="var(--c-spot)" />
      <path d="M20 12h24a4 4 0 0 1 4 4v36L32 41.5 16 52V16a4 4 0 0 1 4-4Z" fill="var(--c-bg)" />
      <path d="M27 23h10v2.5H27zM27 29h10v2.5H27z" fill="var(--c-spot)" />
    </svg>
  );
}

/**
 * One masthead on every page: bookmark mark, nameplate, section links and the
 * two view controls. It sits on the same measure as the content below, so the
 * left and right edges line up at every width.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <header className="site-header">
      <div className="wrap site-header-inner">
        <Link href="/" className="brand" aria-label="Free Pdf home">
          <BrandMark />
          <span className="brand-name">Free Pdf</span>
          <span className="brand-sub">PDF index</span>
        </Link>

        <nav aria-label="Main" className="site-nav">
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

        <div className="header-controls">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
