'use client';

import { useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { RESOURCES } from '@/lib/generated/resources';
import { relatedResources } from '@/lib/search';
import { useLang } from '@/lib/i18n';
import { Check, Copy, X } from './icons';

export function formatDate(iso: string, locale = 'en-US'): string {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

interface ResourceCardProps {
  resource: Resource;
  /** Overrides the category printed in the meta line (used on category pages). */
  category?: string;
}

/**
 * One line of the register. The number column is the file's id in the channel,
 * so a reader can find the post by hand if the link dies. Metadata is separated
 * by hairlines rather than dots, actions are printed marks rather than buttons,
 * and the row carries no card, no shadow, no badge block and no photography:
 * at two hundred rows, furniture is noise, and the accent belongs to the page's
 * own action, not to every link.
 */
export default function ResourceCard({ resource, category }: ResourceCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t, locale } = useLang();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resource.telegramUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const related = open ? relatedResources(resource, RESOURCES, 4) : [];
  const title = resource.title || `${t.card.generic} ${resource.id}`;

  return (
    <>
      <article className="entry">
        <div className="entry-no num" aria-hidden="true">
          {resource.id}
        </div>

        <div className="min-w-0">
          <button type="button" className="entry-title" onClick={() => setOpen(true)}>
            {title}
          </button>

          {resource.description && <p className="entry-desc line-clamp-2">{resource.description}</p>}

          <p className="entry-meta">
            <time dateTime={resource.date}>{formatDate(resource.date, locale)}</time>
            <span className="sep" aria-hidden="true" />
            <span>{resource.typeLabel}</span>
            <span className="sep" aria-hidden="true" />
            <span>{category ?? resource.category}</span>
          </p>

          <div className="entry-acts">
            <a
              href={resource.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mark mark-strong"
            >
              {t.card.open}
            </a>
            <button type="button" className="mark" onClick={copy} aria-label={t.card.copyAria}>
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? t.card.copied : t.card.copy}
            </button>
          </div>
        </div>
      </article>

      {open && (
        <div className="fixed inset-0 z-[var(--z-dialog)] flex items-end justify-center bg-[rgb(6_4_12/0.66)] backdrop-blur-md sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label={t.card.close}
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`sheet-${resource.id}`}
            className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-[var(--c-fg)] bg-[var(--c-bg)] shadow-[0_32px_80px_-16px_rgb(0_0_0_/_0.7)]"
          >
            <div className="border-b-2 border-[var(--c-fg)] px-5 py-4 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <p className="label">
                  {t.card.file} <span className="num text-[var(--c-fg)]">{resource.id}</span>
                </p>
                <button type="button" className="mark" onClick={() => setOpen(false)} aria-label={t.card.close}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <h2 id={`sheet-${resource.id}`} className="mt-2 text-[1.35rem] font-semibold leading-snug">
                {title}
              </h2>
            </div>

            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <div>
                  <dt className="label">{t.card.date}</dt>
                  <dd className="mt-1 text-sm">
                    <time dateTime={resource.date}>{formatDate(resource.date, locale)}</time>
                  </dd>
                </div>
                <div>
                  <dt className="label">{t.card.category}</dt>
                  <dd className="mt-1 text-sm">{category ?? resource.category}</dd>
                </div>
                <div>
                  <dt className="label">{t.card.type}</dt>
                  <dd className="mt-1 text-sm">{resource.typeLabel}</dd>
                </div>
              </dl>

              {resource.description && (
                <p className="mt-5 text-sm leading-relaxed text-[var(--c-fg-muted)]">{resource.description}</p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={resource.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ink btn-sm"
                >
                  {t.card.open}
                </a>
                <button type="button" className="btn-line btn-sm" onClick={copy}>
                  {copied ? t.card.copied : t.card.copy}
                </button>
              </div>

              {related.length > 0 && (
                <div className="mt-6 border-t border-[var(--c-rule)] pt-4">
                  <h3 className="label">{t.card.related}</h3>
                  <ul className="mt-2">
                    {related.map((item) => (
                      <li key={item.id} className="border-b border-[var(--c-rule)]">
                        <a
                          href={item.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-baseline justify-between gap-4 py-2.5 text-sm text-[var(--c-fg-muted)] transition-colors hover:text-[var(--c-spot)]"
                        >
                          <span className="line-clamp-1">{item.title}</span>
                          <span className="num shrink-0 text-[0.6875rem] text-[var(--c-fg-subtle)]">{item.id}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
