'use client';

import Link from 'next/link';
import type { CategoryMeta } from '@/lib/categories';
import { RESOURCES } from '@/lib/generated/resources';
import { useLang } from '@/lib/i18n';
import { ArrowUpRight } from './icons';

interface BentoProps {
  categories: CategoryMeta[];
  /** Pass false on a page that already prints its own heading above the shelves. */
  heading?: string | false;
}

/**
 * The shelves, set as a dense ruled ledger: every track on one line with its
 * real count and blurb, no photography. At seven tracks a photo grid is seven
 * irrelevant pictures; a ledger is seven answers.
 */
export default function Bento({ categories, heading }: BentoProps) {
  const { t, fmt } = useLang();
  const cats = t.cats as Record<string, { name: string; blurb: string }>;

  const counts = new Map<string, number>();
  for (const resource of RESOURCES) {
    for (const category of resource.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return (
    <section className="section-tight border-b border-[var(--c-rule)]" aria-labelledby="bento-heading">
      <div className="wrap">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
          <div>
            {heading !== false && (
              <h2 id="bento-heading" className="font-display text-[1.7rem] font-semibold tracking-[-0.01em] sm:text-[2rem]">
                {heading ?? t.bento.heading}
              </h2>
            )}
            <p className="mt-2 max-w-[40ch] text-[0.9375rem] leading-relaxed text-[var(--c-fg-muted)]">
              {t.how.body}
            </p>
            <ol className="mt-4 space-y-3">
              {t.how.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3 border-t border-[var(--c-rule)] pt-3">
                  <span className="num text-[0.75rem] text-[var(--c-spot)]">0{index + 1}</span>
                  <span>
                    <span className="block text-[0.9375rem] font-semibold text-[var(--c-fg)]">{step.title}</span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--c-fg-muted)]">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <ul className="mask-in mask-1 border-t-2 border-[var(--c-fg)]">
            {categories.map((category) => {
              const meta = cats[category.slug] ?? { name: category.name, blurb: category.blurb };
              return (
                <li key={category.slug} className="border-b border-[var(--c-rule)]">
                  <Link
                    href={`/category/${category.slug}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 py-3 transition-colors hover:bg-[var(--c-panel)]"
                  >
                    <span className="flex items-baseline gap-2 font-display text-[1.15rem] font-semibold leading-tight text-[var(--c-fg)] transition-colors group-hover:text-[var(--c-spot)]">
                      {meta.name}
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--c-fg-subtle)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--c-spot)]" aria-hidden="true" />
                    </span>
                    <span className="num text-right text-[0.9375rem] text-[var(--c-fg)]">
                      {fmt(counts.get(category.name) ?? 0)}
                      <span className="ml-1 text-[0.6875rem] text-[var(--c-fg-subtle)]">{t.bento.resources}</span>
                    </span>
                    <span className="col-span-2 line-clamp-1 text-[0.8125rem] text-[var(--c-fg-muted)]">{meta.blurb}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}



