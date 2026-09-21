'use client';

import { useLang } from '@/lib/i18n';

export default function CtaBand() {
  const { t } = useLang();

  return (
    <section className="bg-[var(--c-fg)] py-24 text-[var(--c-bg)] sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--c-bg)] sm:text-5xl">{t.cta.heading}</h2>
        <p className="mx-auto mt-5 max-w-xl text-[var(--c-bg)] opacity-70 sm:text-lg">{t.cta.body}</p>
        <a
          href="https://t.me/hscfreepdf"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-9 inline-flex items-center gap-2 rounded-lg bg-[var(--c-bg)] px-6 py-3 font-medium text-[var(--c-fg)] transition hover:opacity-90"
        >
          {t.cta.button}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </a>
      </div>
    </section>
  );
}
