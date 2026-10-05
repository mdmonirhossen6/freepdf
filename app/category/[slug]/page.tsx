import type { Metadata } from 'next';
import { CATEGORY_META, categoryBySlug } from '@/lib/categories';
import { RESOURCES } from '@/lib/generated/resources';
import { searchAll } from '@/lib/search';
import ResourceCard from '@/components/ResourceCard';
import Provider from '@/components/Provider';
import CategoryHeader from '@/components/CategoryHeader';
import RecentSearches from '@/components/RecentSearches';
import EmptyState from '@/components/EmptyState';
import Footer from '@/components/Footer';
import { CategoryNotFound } from '@/components/i18n-text';

export async function generateStaticParams() {
  return CATEGORY_META.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = categoryBySlug(slug);
  if (!meta) return { title: 'Free Pdf' };
  return {
    title: `${meta.name} | Free Pdf`,
    description: meta.blurb,
    alternates: { canonical: `https://hscfreepdf.vercel.app/category/${slug}/` },
    openGraph: {
      title: `${meta.name} | Free Pdf`,
      description: meta.blurb,
      url: `https://hscfreepdf.vercel.app/category/${slug}/`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${meta.name} | Free Pdf`,
      description: meta.blurb,
    },
  };
}

/**
 * A track's register. The head already prints the count and the track plate, so
 * the register starts straight in on the entries: number, title, meta and the
 * two marks a reader needs, in two columns on a wide screen.
 */
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = categoryBySlug(slug);
  if (!meta) return <CategoryNotFound />;
  const category = meta.name;

  const results = searchAll(RESOURCES, {
    query: '',
    typeFilter: 'ALL',
    categoryFilter: category,
    sort: 'newest',
    limit: 400,
  });
  const count = results.total;
  const displayCategory = meta.name;

  return (
    <Provider>
      <CategoryHeader meta={meta} count={count} />
      <div className="wrap pt-6">
        <RecentSearches />
      </div>
      {results.results.length === 0 ? (
        <div className="wrap pb-16 pt-6">
          <EmptyState query="" />
        </div>
      ) : (
        <section className="wrap pb-16 pt-6" aria-label={displayCategory}>
          <ul className="register register-2col">
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
