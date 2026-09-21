import type { Metadata } from 'next';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: {
    template: '%s — Free Pdf',
    default: 'Free Pdf — HSC & Admission PDF Search',
  },
  description:
    'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources from the @hscfreepdf Telegram channel.',
  metadataBase: new URL('https://hscfreepdf.vercel.app'),
  applicationName: 'Free Pdf',
  openGraph: {
    type: 'website',
    siteName: 'Free Pdf',
    title: 'Free Pdf — HSC & Admission PDF Search',
    description:
      'Search HSC, University Admission, Medical, Engineering, BCS and other educational PDFs and study resources.',
    url: 'https://hscfreepdf.vercel.app/',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Free Pdf — HSC & Admission PDF Search',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Pdf — HSC & Admission PDF Search',
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

const themeScript = `(function(){try{var s=localStorage.getItem('hscfreepdf_theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500..700;1,9..144,500..700&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-[var(--c-bg)] text-[var(--c-fg)] antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}