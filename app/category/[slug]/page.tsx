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
import { CountLine, CategoryNotFound } from '@/components/i18n-text';

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
  if (!meta) return <CategoryNotFound />;
  const category = meta.name;

  const results = searchAll(RESOURCES, { query: '', typeFilter: 'ALL', categoryFilter: category, sort: 'newest', limit: 400 });
  const count = results.total;

  const displayCategory = meta.name;

  return (
    <Provider>
      <CategoryHeader meta={meta} count={count} />
      <RecentSearches />
      {results.results.length === 0 ? (
        <EmptyState query="" total={TOTAL_RESOURCES} />
      ) : (
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8" aria-label={`${displayCategory}`}>
          <div className="mb-6 flex items-baseline gap-3">
            <CountLine count={count} name={displayCategory} />
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