import type { ResourceCategory } from './types';

export interface CategoryMeta {
  slug: string;
  name: ResourceCategory;
  /** Label used on chips and nav. */
  label: string;
  /** One-liner used on category cards and landing pages. */
  blurb: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  {
    slug: 'hsc',
    name: 'HSC',
    label: 'HSC',
    blurb: 'HSC board books, test papers, supplements, compact series and guides.',
  },
  {
    slug: 'university-admission',
    name: 'University Admission',
    label: 'University Admission',
    blurb: 'Varsity, guccha (GST) and unit-wise admission question banks.',
  },
  {
    slug: 'medical',
    name: 'Medical',
    label: 'Medical',
    blurb: 'Medical & dental admission guides, marked books and weekly exams.',
  },
  {
    slug: 'engineering',
    name: 'Engineering',
    label: 'Engineering',
    blurb: 'BUET, KUET, RUET, CUET, BUTEX and engineering admission material.',
  },
  {
    slug: 'bcs-jobs',
    name: 'BCS & Jobs',
    label: 'BCS & Jobs',
    blurb: 'BCS, bank and job preparation resources.',
  },
  {
    slug: 'current-affairs',
    name: 'Current Affairs',
    label: 'Current Affairs',
    blurb: 'Monthly current affairs, capsules and সাম্প্রতিক affairs digests.',
  },
  {
    slug: 'general',
    name: 'General',
    label: 'General',
    blurb: 'School, language and everything else indexed from the channel.',
  },
];

export function categoryBySlug(slug: string): CategoryMeta | undefined {
  return CATEGORY_META.find((meta) => meta.slug === slug);
}

export function metaForCategory(name: ResourceCategory): CategoryMeta {
  return CATEGORY_META.find((meta) => meta.name === name) ?? CATEGORY_META[CATEGORY_META.length - 1];
}

export function slugForCategory(name: ResourceCategory): string {
  return metaForCategory(name).slug;
}