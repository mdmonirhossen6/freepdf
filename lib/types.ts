/**
 * Shared data model for the HSCFreePDF resource library.
 *
 * Every resource is derived from the source channel index
 * (data/source/HSCFreePDF_Complete_Index.html) by scripts/generate-data.ts.
 */

/** Buckets used by the type filter / badge, per product spec. */
export type ResourceType = 'PDF' | 'APK' | 'Image' | 'Text' | 'Other';

/** Education categories, inferred deterministically from the title. */
export type ResourceCategory =
  | 'HSC'
  | 'University Admission'
  | 'Medical'
  | 'Engineering'
  | 'BCS & Jobs'
  | 'Current Affairs'
  | 'General';

export const RESOURCE_TYPES: ResourceType[] = ['PDF', 'APK', 'Image', 'Text', 'Other'];

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  'HSC',
  'University Admission',
  'Medical',
  'Engineering',
  'BCS & Jobs',
  'Current Affairs',
  'General',
];

export type SortKey = 'relevance' | 'newest' | 'oldest';

export interface Resource {
  /** Telegram message id, e.g. "1918". */
  id: string;
  /** Cleaned, display-ready title (promotional noise removed). */
  title: string;
  /** Original title exactly as it appears in the source index. */
  rawTitle: string;
  /** Canonical search form of `title` (lowercased, folded, punctuation free). */
  normalizedTitle: string;
  /** ISO date of the Telegram post (UTC), e.g. "2026-09-16". */
  date: string;
  /** Spec bucket for filtering/badges. */
  type: ResourceType;
  /** Label shown on the badge — the original source type (e.g. "Video"). */
  typeLabel: string;
  /** Primary inferred category. */
  category: ResourceCategory;
  /** Every category whose rules matched (used by the category filter). */
  categories: ResourceCategory[];
  /** Original Telegram post URL — the only outbound link. */
  telegramUrl: string;
  /** Short cleaned remainder of the caption, when it carries real information. */
  description: string;
  /** Pre-computed, pre-normalised tokens (title tokens + concept tokens). */
  searchTokens: string[];
  /** Edition / exam years mentioned in the caption (e.g. ["2026", "27"]). */
  years: string[];
  /** True when the source title held no usable text (e.g. "Telegram Image"). */
  genericTitle: boolean;
  /** For generic posts: the message id the title was derived from, if any. */
  derivedFromId: string | null;
}