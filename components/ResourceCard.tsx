'use client';

import { useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { RESOURCES } from '@/lib/generated/resources';
import { relatedResources } from '@/lib/search';
import { useLang } from '@/lib/i18n';
import { ArrowUpRight, Check, Copy, X } from './icons';

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
 * One line of the register. The number is the file's id in the channel, so a
 * reader can still find the post by hand if the link dies. Title and metadata
 * take the width; the two actions are held in a compact column at the far edge
 * so every row shares the same right alignment.
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
  const shownCategory = category ?? resource.category;

  return (
    <>
      <article className="resource-row">
        <div className="resource-id" aria-hidden="true">
          {resource.id}
        </div>

        <div className="resource-main">
          <button
            type="button"
            className="resource-title"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            title={title}
          >
            {title}
          </button>

          {resource.description && <p className="resource-desc">{resource.description}</p>}

          <p className="resource-meta">
            <time dateTime={resource.date}>{formatDate(resource.date, locale)}</time>
            <span className="sep" aria-hidden="true" />
            <span>{resource.typeLabel}</span>
            <span className="sep" aria-hidden="true" />
            <span>{shownCategory}</span>
          </p>
        </div>

        <div className="resource-actions">
          <a
            href={resource.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="resource-action resource-action-strong"
          >
            {t.card.open}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <button type="button" className="resource-action" onClick={copy} aria-label={t.card.copyAria}>
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? t.card.copied : t.card.copy}
          </button>
        </div>
      </article>

      {open && (
        <div className="dialog-scrim">
          <button
            type="button"
            className="dialog-dismiss"
            onClick={() => setOpen(false)}
            aria-label={t.card.close}
            tabIndex={-1}
          />
          <div role="dialog" aria-modal="true" aria-labelledby={`sheet-${resource.id}`} className="dialog-panel">
            <div className="dialog-head">
              <div className="dialog-head-row">
                <p className="label">
                  {t.card.file} <span className="num text-[var(--c-fg)]">{resource.id}</span>
                </p>
                <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label={t.card.close}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <h2 id={`sheet-${resource.id}`} className="dialog-title">
                {title}
              </h2>
            </div>

            <div className="dialog-body">
              <dl className="dialog-meta">
                <div>
                  <dt className="label">{t.card.date}</dt>
                  <dd>
                    <time dateTime={resource.date}>{formatDate(resource.date, locale)}</time>
                  </dd>
                </div>
                <div>
                  <dt className="label">{t.card.category}</dt>
                  <dd>{shownCategory}</dd>
                </div>
                <div>
                  <dt className="label">{t.card.type}</dt>
                  <dd>{resource.typeLabel}</dd>
                </div>
              </dl>

              {resource.description && <p className="dialog-desc">{resource.description}</p>}

              <div className="dialog-actions">
                <a
                  href={resource.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ink btn-sm"
                >
                  {t.card.open}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <button type="button" className="btn-line btn-sm" onClick={copy}>
                  {copied ? t.card.copied : t.card.copy}
                </button>
              </div>

              {related.length > 0 && (
                <div className="dialog-related">
                  <h3 className="label">{t.card.related}</h3>
                  <ul className="related-list">
                    {related.map((item) => (
                      <li key={item.id}>
                        <a
                          href={item.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="related-row"
                        >
                          <span>{item.title}</span>
                          <span className="num">{item.id}</span>
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
