import type { Metadata } from 'next';
import { EB_Garamond, Hind_Siliguri, IBM_Plex_Mono, Noto_Serif_Bengali } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import { LangProvider } from '@/lib/i18n';

/**
 * Type stack, self-hosted at build time by next/font so first paint never waits
 * on a third-party font CDN. Four faces, four jobs:
 *   EB Garamond          the masthead and headlines, Latin
 *   Noto Serif Bengali   the masthead and headlines, Bangla (a Latin serif
 *                        carries no Bengali glyphs, so it cannot be faked)
 *   Hind Siliguri        running text in both scripts
 *   IBM Plex Mono        file numbers, dates, counts, column labels
 * Weights are trimmed to what the sheet actually sets, because a Bengali subset
 * is a large download for a reader on a phone.
 */
const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-garamond',
});

const bengaliSerif = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['600'],
  display: 'swap',
  variable: '--font-bengali-serif',
});

const hind = Hind_Siliguri({
  subsets: ['latin', 'bengali'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-hind',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Free Pdf',
    default: 'Free Pdf | HSC & Admission PDF Search',
  },
  description:
    'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources from the @hscfreepdf Telegram channel.',
  metadataBase: new URL('https://hscfreepdf.vercel.app'),
  applicationName: 'Free Pdf',
  openGraph: {
    type: 'website',
    siteName: 'Free Pdf',
    title: 'Free Pdf | HSC & Admission PDF Search',
    description:
      'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources.',
    url: 'https://hscfreepdf.vercel.app/',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Free Pdf | HSC & Admission PDF Search',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Pdf | HSC & Admission PDF Search',
    description:
      'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

/**
 * Runs before paint: resolves the stored theme and UI language onto <html>.
 * The document must not claim to be Bengali while the English UI is on screen,
 * because that breaks screen readers, browser translation and font fallback.
 */
const bootScript = `(function(){try{var t=localStorage.getItem('hscfreepdf_theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');var l=localStorage.getItem('hscfreepdf_lang');document.documentElement.lang=(l==='bn'||l==='en')?l:'en';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${hind.variable} ${garamond.variable} ${bengaliSerif.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-[100dvh] bg-[var(--c-bg)] text-[var(--c-fg)] antialiased">
        <a href="#main" className="skip">
          Skip to content
        </a>
        <LangProvider>
          <SiteHeader />
          <main id="main">{children}</main>
        </LangProvider>
        <div className="screen" aria-hidden="true" />
      </body>
    </html>
  );
}
