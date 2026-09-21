import type { Metadata } from 'next';
import CategoryIndex from '@/components/CategoryIndex';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Categories',
  description:
    'Browse Free Pdf resources by category: HSC, University Admission, Medical, Engineering, BCS & Jobs and Current Affairs.',
  alternates: { canonical: 'https://hscfreepdf.vercel.app/category/' },
};

export default function CategoryIndexPage() {
  return (
    <>
      <CategoryIndex />
      <Footer />
    </>
  );
}