'use client';

import { useLang } from '@/lib/i18n';
import { ArrowUpRight } from './icons';

/**
 * The closing block: a flat band under a heavy rule with the page's one action.
 * It reads as the end of a printed sheet, not as a floating card.
 */
export default function CtaBand() {
  const { t } = useLang();

  return (
    <section className="cta-band">
      <div className="wrap cta-inner">
        <div className="max-w-[54ch]">
          <h2 className="cta-title">{t.cta.heading}</h2>
          <p className="cta-body">{t.cta.body}</p>
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
    </section>
  );
}
