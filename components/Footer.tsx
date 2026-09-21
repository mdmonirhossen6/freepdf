'use client';

import Link from 'next/link';
import { useLang } from '@/lib/i18n';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="border-t border-[var(--c-line-strong)] bg-[var(--c-bg)]">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 text-sm text-[var(--c-fg-muted)] sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3 text-[var(--c-fg-muted)]">
            <p className="font-display text-lg font-semibold text-[var(--c-fg)]">Free Pdf</p>
            <p className="max-w-md text-[var(--c-fg-muted)]">
              {t.footer.about.split('@hscfreepdf')[0]}
              <a
                href="https://t.me/hscfreepdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline-offset-2 hover:text-[var(--c-accent)] hover:underline"
              >
                @hscfreepdf
              </a>{' '}
              {t.footer.about.split('@hscfreepdf')[1] ?? ''}
            </p>
          </div>
          <nav className="flex flex-wrap gap-6 text-[var(--c-fg-muted)]" aria-label="Footer links">
            <Link href="https://t.me/hscfreepdf" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-[var(--c-accent)] hover:underline">
              {t.footer.channel}
            </Link>
            <Link href="https://prostuti.bd" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-[var(--c-accent)] hover:underline">
              Prostuti
            </Link>
            <Link href="/browse" className="underline-offset-2 hover:text-[var(--c-accent)] hover:underline">
              {t.footer.browseLatest}
            </Link>
            <Link href="/search" className="underline-offset-2 hover:text-[var(--c-accent)] hover:underline">
              {t.footer.search}
            </Link>
          </nav>
          <p className="text-[var(--c-fg-subtle)] text-xs text-center md:text-left">
            &copy; {new Date().getFullYear()} Free Pdf. {t.footer.note}
          </p>
        </div>
      </div>
    </footer>
  );
}