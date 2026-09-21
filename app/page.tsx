import type { Metadata } from 'next';
import Provider from '@/components/Provider';
import HomeSearch from '@/components/HomeSearch';
import Marquee from '@/components/Marquee';
import Bento from '@/components/Bento';
import StatementReveal from '@/components/motion/StatementReveal';
import ScrollReveal from '@/components/motion/ScrollReveal';
import LatestResources from '@/components/LatestResources';
import CtaBand from '@/components/CtaBand';
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
      <div className="w-full max-w-full overflow-x-hidden">
        <HomeSearch total={TOTAL_RESOURCES} />

        <Marquee />

        <Bento categories={CATEGORY_META} total={TOTAL_RESOURCES} />

        <section className="pb-24 sm:pb-32" aria-label="About the index">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <StatementReveal text="One channel. One index. Every book, test paper and digest — searchable in seconds, free forever." />
          </div>
        </section>

        <ScrollReveal>
          <LatestResources resources={RESOURCES.slice(0, 12)} latestDate={LATEST_RESOURCE_DATE} total={TOTAL_RESOURCES} />
        </ScrollReveal>

        <CtaBand />
        <Footer />
      </div>
    </Provider>
  );
}