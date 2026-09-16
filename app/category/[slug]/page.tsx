import type { Metadata } from 'next';
import { CATEGORY_META, categoryBySlug } from '@/lib/categories';
import { RESOURCES, TOTAL_RESOURCES } from '@/lib/generated/resources';
import { searchAll } from '@/lib/search';
import ResourceCard from '@/components/ResourceCard';
import Provider from '@/components/Provider';
import CategoryHeader from '@/components/CategoryHeader';
import RecentSearches from '@/components/RecentSearches';
import EmptyState from '@/components/EmptyState';
import Footer from '@/components/Footer';

export async function generateStaticParams() {
  return CATEGORY_META.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = categoryBySlug(slug);
  if (!meta) return { title: 'Free Pdf' };
  return {
    title: `${meta.name} — Free Pdf`,
    description: meta.blurb,
    openGraph: {
      title: `${meta.name} — Free Pdf`,
      description: meta.blurb,
      url: `https://hscfreepdf.vercel.app/category/${slug}/`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${meta.name} — Free Pdf`,
      description: meta.blurb,
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = categoryBySlug(slug);
  if (!meta) return <NotFound />;
  const category = meta.name;

  const results = searchAll(RESOURCES, { query: '', typeFilter: 'ALL', categoryFilter: category, sort: 'newest', limit: 400 });
  const count = results.total;

  const displayTitle = meta.name;
  const displayCategory = meta.name;

  return (
    <Provider>
      <CategoryHeader meta={meta} count={count} />
      <RecentSearches />
      {results.results.length === 0 ? (
        <EmptyState query="" total={TOTAL_RESOURCES} />
      ) : (
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8" aria-label={`${displayCategory} resources`}>
          <div className="mb-6 flex items-baseline gap-3">
            <p className="text-sm tabular-nums text-[var(--c-fg-subtle)]">
              <span className="font-medium text-[var(--c-fg)]">{count.toLocaleString('en-US')}</span>{' '}
              {displayTitle} resources
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {results.results.map((resource) => (
              <li key={resource.id}>
                <ResourceCard resource={resource} category={displayCategory} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <Footer />
    </Provider>
  );
}

async function NotFound() {
  return (
    <Provider>
      <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-medium tracking-tight text-fg">Page not found</h1>
        <p className="mt-4 text-fg-muted">This category isn't available right now.</p>
        <a href="/" className="mt-6 inline-flex items-center gap-2 rounded btn-primary">
          Back to home
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </a>
      </main>
    </Provider>
  );
}