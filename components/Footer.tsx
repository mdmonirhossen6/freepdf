'use client';

import Link from 'next/link';
import { useLang } from '@/lib/i18n';

/**
 * The colophon. A glass index ends by naming what it is made of: the faces it
 * is set in, the channel it indexes, and the fact that it carries no server
 * behind it. No photography anywhere on the page, so no photo credits.
 */
export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="border-t border-[var(--c-rule)] bg-[var(--c-band)] backdrop-blur-md">
      <div className="wrap py-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="font-display text-[1.25rem] font-semibold">Free Pdf</p>
            <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-[var(--c-fg-muted)]">
              {t.footer.about.split('@hscfreepdf')[0]}
              <a
                href="https://t.me/hscfreepdf"
                target="_blank"
                rel="noopener noreferrer"
                className="link-spot"
              >
                @hscfreepdf
              </a>{' '}
              {t.footer.about.split('@hscfreepdf')[1] ?? ''}
            </p>

            <nav className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[0.875rem]" aria-label="Footer">
              <Link
                href="https://t.me/hscfreepdf"
                target="_blank"
                rel="noopener noreferrer"
                className="link-spot"
              >
                {t.footer.channel}
              </Link>
              <Link href="https://prostuti.bd" target="_blank" rel="noopener noreferrer" className="link-spot">
                Prostuti
              </Link>
              <Link href="/browse" className="link-spot">
                {t.footer.browseLatest}
              </Link>
              <Link href="/search" className="link-spot">
                {t.footer.search}
              </Link>
            </nav>
          </div>

          <div className="border-t-2 border-[var(--c-fg)] pt-3">
            <p className="label">{t.footer.colophon}</p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--c-fg-muted)]">{t.footer.type}</p>
          </div>
        </div>

        <p className="mt-6 border-t border-[var(--c-rule-strong)] pt-4 text-[0.75rem] text-[var(--c-fg-subtle)]">
          &copy; {new Date().getFullYear()} Free Pdf. {t.footer.note}
        </p>
      </div>
    </footer>
  );
}

