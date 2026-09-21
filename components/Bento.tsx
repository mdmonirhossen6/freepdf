'use client';

import Link from 'next/link';
import { BookOpen, GraduationCap, Stethoscope, Cog, Briefcase, Newspaper, Library, Layers } from 'lucide-react';
import type { CategoryMeta } from '@/lib/categories';
import { RESOURCES } from '@/lib/generated/resources';
import { useLang, fill } from '@/lib/i18n';

interface BentoProps {
  categories: CategoryMeta[];
  total: number;
}

const ICONS: Record<string, typeof BookOpen> = {
  HSC: BookOpen,
  'University Admission': GraduationCap,
  Medical: Stethoscope,
  Engineering: Cog,
  'BCS & Jobs': Briefcase,
  'Current Affairs': Newspaper,
  General: Library,
};

export default function Bento({ categories, total }: BentoProps) {
  const { t, fmt } = useLang();
  const cats = t.cats as Record<string, { name: string; blurb: string }>;

  const counts = new Map<string, number>();
  for (const resource of RESOURCES) {
    for (const category of resource.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  const span: Record<string, string> = {
    HSC: 'col-span-2 row-span-2',
    'University Admission': 'col-span-2',
  };

  return (
    <section className="py-24 sm:py-32" aria-labelledby="bento-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-fg-muted)]">
              <span aria-hidden="true" className="inline-block h-[3px] w-5 rounded-full bg-[var(--c-accent)]" />
              {t.bento.eyebrow}
            </p>
            <h2 id="bento-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.bento.heading}
            </h2>
          </div>
          <Link href="/category/" className="btn-ghost hidden text-sm sm:inline-flex">
            {t.bento.all}
          </Link>
        </div>

        <ul className="grid grid-flow-dense grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((category) => {
            const Icon = ICONS[category.name] ?? Library;
            const meta = cats[category.slug] ?? { name: category.name, blurb: category.blurb };
            return (
              <li key={category.slug} data-reveal className={span[category.name] ?? 'col-span-1'}>
                <Link
                  href={`/category/${category.slug}`}
                  className={`group flex h-full flex-col rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-5 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--c-accent)] hover:shadow-pop ${
                    category.name === 'HSC' ? 'sm:p-7' : ''
                  }`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-accent-soft)] text-[var(--c-accent)] transition group-hover:bg-[var(--c-accent)] group-hover:text-[var(--c-accent-fg)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    className={`mt-4 font-semibold text-[var(--c-fg)] group-hover:text-[var(--c-accent)] ${
                      category.name === 'HSC' ? 'font-display text-2xl sm:text-3xl' : 'text-base'
                    }`}
                  >
                    {meta.name}
                  </span>
                  <span className="mt-1.5 text-sm leading-relaxed text-[var(--c-fg-muted)] line-clamp-2">
                    {meta.blurb}
                  </span>
                  <span className="mt-auto pt-4 text-xs tabular-nums text-[var(--c-fg-subtle)]">
                    {fmt(counts.get(category.name) ?? 0)} {t.bento.resources}
                  </span>
                </Link>
              </li>
            );
          })}

          <li data-reveal className="col-span-1">
            <div className="flex h-full flex-col justify-between rounded-lg bg-[var(--c-fg)] p-5 text-[var(--c-bg)]">
              <Layers className="h-5 w-5 text-[var(--c-bg)] opacity-60" aria-hidden="true" />
              <div className="mt-6">
                <p className="font-display text-3xl font-semibold tabular-nums sm:text-4xl">{fmt(total)}</p>
                <p className="mt-1 text-xs opacity-70">{t.bento.stat}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}

