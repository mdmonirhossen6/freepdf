import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_META } from '@/lib/categories';
import { RESOURCES, TOTAL_RESOURCES } from '@/lib/generated/resources';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Categories',
  description:
    'Browse Free Pdf resources by category: HSC, University Admission, Medical, Engineering, BCS & Jobs and Current Affairs.',
  alternates: { canonical: 'https://hscfreepdf.vercel.app/category/' },
};

export default function CategoryIndexPage() {
  const counts = new Map<string, number>();
  for (const resource of RESOURCES) {
    for (const category of resource.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--c-fg)]">Categories</h1>
        <p className="mt-2 max-w-2xl text-[var(--c-fg-muted)]">
          Browse all {TOTAL_RESOURCES.toLocaleString('en-US')} indexed resources by exam track. Categories are inferred
          from each post&apos;s title.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_META.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/category/${category.slug}`}
                className="group flex h-full flex-col rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-panel)] p-5 transition hover:border-[var(--c-accent)]"
              >
                <span className="text-base font-semibold text-[var(--c-fg)] group-hover:text-[var(--c-accent)]">
                  {category.name}
                </span>
                <span className="mt-1.5 text-sm leading-relaxed text-[var(--c-fg-muted)]">{category.blurb}</span>
                <span className="mt-3 text-xs tabular-nums text-[var(--c-fg-subtle)]">
                  {(counts.get(category.name) ?? 0).toLocaleString('en-US')} resources
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-bg-subtle)] p-6">
          <h2 className="text-base font-semibold text-[var(--c-fg)]">Looking for something specific?</h2>
          <p className="mt-1 text-sm text-[var(--c-fg-muted)]">
            Use the search to look up a book, subject, author, series or topic in Bengali or English.
          </p>
          <Link href="/search" className="btn-primary mt-4 text-sm">
            Search the library
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}