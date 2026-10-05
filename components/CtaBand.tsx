'use client';

import { useLang } from '@/lib/i18n';
import { ArrowUpRight } from './icons';

/**
 * The closing block: the page's single action, set as a dense frosted-glass
 * panel with a live count strip. No photography — the numbers are the visual.
 */
export default function CtaBand() {
  const { t } = useLang();

  return (
    <section className="section-tight border-b-2 border-[var(--c-fg)]">
      <div className="wrap">
        <div className="glass glass-heavy mask-in mask-1 flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-7">
          <div className="max-w-[52ch]">
            <h2 className="font-display text-[1.5rem] font-semibold leading-tight tracking-[-0.01em] sm:text-[1.7rem]">
              {t.cta.heading}
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--c-fg-muted)]">{t.cta.body}</p>
          </div>
          <p className="shrink-0">
            <a
              href="https://t.me/hscfreepdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ink"
            >
              {t.cta.button}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

