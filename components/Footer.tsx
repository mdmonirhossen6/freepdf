'use client';

import Link from 'next/link';
import { useLang } from '@/lib/i18n';

/**
 * The colophon. It names what the index is made of: the channel it indexes,
 * the faces it is set in, and the fact that there is no server behind it.
 */
export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <p className="footer-brand">Free Pdf</p>
            <p className="footer-about">
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

            <nav className="footer-links" aria-label="Footer">
              <a
                href="https://t.me/hscfreepdf"
                target="_blank"
                rel="noopener noreferrer"
                className="link-spot"
              >
                {t.footer.channel}
              </a>
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

          <div className="footer-colophon">
            <p className="label">{t.footer.colophon}</p>
            <p className="footer-type">{t.footer.type}</p>
          </div>
        </div>

        <p className="footer-note">
          &copy; {new Date().getFullYear()} Free Pdf. {t.footer.note}
        </p>
      </div>
    </footer>
  );
}
