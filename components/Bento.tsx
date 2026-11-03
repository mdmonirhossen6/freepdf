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
 * The shelves, set as a ruled ledger: how the index works on the left, every
 * track on the right with its real count. No photography and no tiles, because
 * at this density a picture is decoration and a count is an answer.
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
    <section className="section" aria-labelledby={heading === false ? undefined : 'bento-heading'}>
      <div className="wrap">
        {heading !== false && (
          <div className="section-head">
            <h2 id="bento-heading" className="section-title">
              {heading ?? t.bento.heading}
            </h2>
            <p className="text-sm">
              <Link href="/category" className="link-spot">
                {t.bento.all}
              </Link>
            </p>
          </div>
        )}

        <div className={`split${heading !== false ? ' mt-6' : ''}`}>
          <div>
            <h3 className="font-display text-[1.15rem] font-semibold leading-snug">{t.how.heading}</h3>
            <p className="split-lede mt-2">{t.how.body}</p>
            <ol className="steps">
              {t.how.steps.map((step, index) => (
                <li key={step.title} className="step">
                  <span className="step-no">0{index + 1}</span>
                  <span>
                    <span className="step-title">{step.title}</span>
                    <span className="step-body">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <ul className="track-list">
            {categories.map((category) => {
              const meta = cats[category.slug] ?? { name: category.name, blurb: category.blurb };
              return (
                <li key={category.slug}>
                  <Link href={`/category/${category.slug}`} className="track-row">
                    <span className="track-name">
                      {meta.name}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="track-count">
                      {fmt(counts.get(category.name) ?? 0)} <small>{t.bento.resources}</small>
                    </span>
                    <span className="track-blurb">{meta.blurb}</span>
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
