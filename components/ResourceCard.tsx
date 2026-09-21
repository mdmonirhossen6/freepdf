'use client';

import { useEffect, useState } from 'react';
import type { Resource } from '@/lib/types';
import { RESOURCES } from '@/lib/generated/resources';
import { relatedResources } from '@/lib/search';

const TYPE_STYLES: Record<string, string> = {
  PDF: 'border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-[var(--c-accent)]',
  APK: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  Image: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Text: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300',
  Other: 'border-[var(--c-line-strong)] bg-[var(--c-bg-subtle)] text-[var(--c-fg-muted)]',
};

export function formatDate(iso: string): string {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function ResourceCard({ resource, category }: { resource: Resource; category?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const badge = TYPE_STYLES[resource.type] ?? TYPE_STYLES.Other;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resource.telegramUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <article className="rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-4 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--c-accent)] hover:shadow-pop dark:border-[var(--c-line)]">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge}`}>
            {resource.typeLabel}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-medium leading-snug text-[var(--c-fg)]">
              <button type="button" onClick={() => setOpen(true)} className="text-left hover:text-[var(--c-accent)]">
                {resource.title || `Resource ${resource.id}`}
              </button>
            </h3>

            {resource.description && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[var(--c-fg-muted)]">{resource.description}</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--c-fg-subtle)]">
              <time dateTime={resource.date} className="tabular-nums">
                {formatDate(resource.date)}
              </time>
              <span aria-hidden="true">·</span>
              <span>{category ?? resource.category}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={resource.telegramUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs">
                Open on Telegram
              </a>
              <button type="button" onClick={copy} className="btn-ghost text-xs" aria-live="polite">
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>
      </article>

      {open && <ResourceModal resource={resource} onClose={() => setOpen(false)} />}
    </>
  );
}

function ResourceModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const related = relatedResources(resource, RESOURCES, 5).filter((r) => r.id !== resource.id);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={resource.title}
    >
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close dialog" tabIndex={-1} />
      <div className="glass-panel relative w-full max-w-2xl overflow-hidden rounded-t-xl sm:rounded-xl">
        <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TYPE_STYLES[resource.type] ?? TYPE_STYLES.Other}`}>
            {resource.typeLabel}
          </span>
          <button type="button" onClick={onClose} className="rounded p-1 text-[var(--c-fg-muted)] hover:text-[var(--c-fg)]" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h2 className="mt-3 text-lg font-semibold leading-snug text-[var(--c-fg)]">
          {resource.title || `Resource ${resource.id}`}
        </h2>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--c-fg-subtle)]">Date</dt>
            <dd className="mt-0.5 text-[var(--c-fg)]">{formatDate(resource.date)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--c-fg-subtle)]">Category</dt>
            <dd className="mt-0.5 text-[var(--c-fg)]">{resource.category}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--c-fg-subtle)]">Type</dt>
            <dd className="mt-0.5 text-[var(--c-fg)]">{resource.typeLabel}</dd>
          </div>
        </dl>

        {resource.description && (
          <p className="mt-4 text-sm leading-relaxed text-[var(--c-fg-muted)]">{resource.description}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <a href={resource.telegramUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
            Open on Telegram
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(resource.telegramUrl)}
            className="btn-ghost text-sm"
          >
            Copy link
          </button>
        </div>

        {related.length > 0 && (
          <div className="mt-6 border-t border-[var(--c-line)] pt-4">
            <h3 className="text-sm font-medium text-[var(--c-fg)]">Related resources</h3>
            <ul className="mt-2 flex flex-col divide-y divide-[var(--c-line)]">
              {related.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 py-2 text-sm text-[var(--c-fg-muted)] hover:text-[var(--c-accent)]"
                  >
                    <span className="line-clamp-1">{item.title}</span>
                    <span className="shrink-0 text-xs text-[var(--c-fg-subtle)]">{item.typeLabel}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}