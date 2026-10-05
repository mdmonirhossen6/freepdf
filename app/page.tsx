import type { Metadata } from 'next';
import Provider from '@/components/Provider';
import FrontPage from '@/components/FrontPage';
import Bento from '@/components/Bento';
import LatestResources from '@/components/LatestResources';
import CtaBand from '@/components/CtaBand';
import Footer from '@/components/Footer';
import { RESOURCES, TOTAL_RESOURCES, LATEST_RESOURCE_DATE } from '@/lib/generated/resources';
import { CATEGORY_META } from '@/lib/categories';

const SITE = 'https://hscfreepdf.vercel.app';

export const metadata: Metadata = {
  title: 'Free Pdf | HSC & Admission PDF Search',
  description:
    'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources from the @hscfreepdf Telegram channel.',
  alternates: { canonical: `${SITE}/` },
  openGraph: {
    type: 'website',
    siteName: 'Free Pdf',
    title: 'Free Pdf | HSC & Admission PDF Search',
    description:
      'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources.',
    url: `${SITE}/`,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Free Pdf' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Pdf | HSC & Admission PDF Search',
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
        <FrontPage total={TOTAL_RESOURCES} />

        <LatestResources resources={RESOURCES.slice(0, 6)} latestDate={LATEST_RESOURCE_DATE} />

        <Bento categories={CATEGORY_META} />

        <CtaBand />
        <Footer />
      </div>
    </Provider>
  );
}