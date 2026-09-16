import type { Metadata } from 'next';
import Link from 'next/link';
import Provider from '@/components/Provider';
import HomeSearch from '@/components/HomeSearch';
import LatestResources from '@/components/LatestResources';
import CategoryGrid from '@/components/CategoryGrid';
import Footer from '@/components/Footer';
import { RESOURCES, TOTAL_RESOURCES, LATEST_RESOURCE_DATE } from '@/lib/generated/resources';
import { CATEGORY_META } from '@/lib/categories';

const SITE = 'https://hscfreepdf.vercel.app';

export const metadata: Metadata = {
  title: 'Free Pdf — HSC & Admission PDF Search',
  description:
    'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources from the @hscfreepdf Telegram channel.',
  alternates: { canonical: `${SITE}/` },
  openGraph: {
    type: 'website',
    siteName: 'Free Pdf',
    title: 'Free Pdf — HSC & Admission PDF Search',
    description:
      'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources.',
    url: `${SITE}/`,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Free Pdf' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Pdf — HSC & Admission PDF Search',
    description:
      'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources.',
    images: ['/og.png'],
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Free Pdf',
  url: `${SITE}/`,
  description:
    'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources.',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export default function HomePage() {
  return (
    <Provider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomeSearch total={TOTAL_RESOURCES} />

      <section className="border-b border-[var(--c-line)] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--c-fg-subtle)]">
            Quick categories
          </p>
          <ul className="flex flex-wrap gap-2">
            {CATEGORY_META.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  className="inline-flex rounded-full border border-[var(--c-line-strong)] px-3 py-1.5 text-sm text-[var(--c-fg-muted)] transition hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
                >
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <LatestResources resources={RESOURCES.slice(0, 12)} latestDate={LATEST_RESOURCE_DATE} total={TOTAL_RESOURCES} />
      <CategoryGrid categories={CATEGORY_META} total={TOTAL_RESOURCES} />
      <Footer />
    </Provider>
  );
}