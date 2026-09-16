/**
 * Text normalisation, caption cleaning and deterministic categorisation.
 *
 * Shared by the build-time data generator (scripts/generate-data.ts) and the
 * client-side search engine (lib/search.ts). This module is intentionally free
 * of DOM/node APIs so the very same code runs in Node and in the browser.
 */

import type { ResourceCategory, ResourceType } from './types';

/* ------------------------------------------------------------------ */
/* HTML + character helpers                                            */
/* ------------------------------------------------------------------ */

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Decodes the HTML entities produced by the index generator. */
export function decodeEntities(input: string): string {
  return String(input ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** ২য় -> 2য, ২০২৬ -> 2026 ... so Bengali and English numerals can match. */
export function mapBengaliDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const i = BN_DIGITS.indexOf(ch);
    out += i >= 0 ? String(i) : ch;
  }
  return out;
}

const INVISIBLE_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/g;
const BENGALI_PUNCT_RE = /[\u0964\u0965\u09F2\u09F3\u09FB]/g;

/**
 * 1:1 character folding used both for search normalisation and for locating
 * cut points inside the *original* string (length is preserved).
 */
function foldChars(input: string): string {
  return input
    .replace(/[\uD800-\uDFFF\uFE0F]/g, ' ')
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F\u2190-\u2BFF\u2600-\u27BF]/g, ' ')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2010-\u2015\u2212\u2043]/g, '-')
    .replace(/[_\u2044\/\\|\u00A6]/g, ' ')
    .toLowerCase();
}

/**
 * Canonical search form of a string:
 * lowercased, Bengali/English digits unified, Bengali letter variants folded,
 * Latin diacritics stripped, punctuation / emoji / hyphens / underscores
 * replaced by single spaces and ordinal suffixes collapsed ("2nd" -> "2",
 * "২য়" -> "2").
 */
export function normalizeText(input: string): string {
  let s = mapBengaliDigits(decodeEntities(input));
  s = s.toLowerCase();
  s = s.replace(INVISIBLE_RE, '');
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Bengali letter variants (both pre-composed and nukta forms).
  s = s.replace(/\u09DF/g, '\u09AF'); // য় -> য
  s = s.replace(/\u09BC/g, ''); // nukta
  s = s.replace(/\u09DC/g, '\u09A1'); // ড় -> ড
  s = s.replace(/\u09DD/g, '\u09A2'); // ঢ় -> ঢ
  s = s.replace(/\u09CE/g, '\u09A4'); // ৎ -> ত
  s = s.replace(/\u0981/g, ''); // chandrabindu
  s = s.replace(/\u09CD/g, ''); // hasanta (consistent on both sides)
  s = BENGALI_PUNCT_RE.test(s) ? s.replace(BENGALI_PUNCT_RE, ' ') : s;
  s = s.replace(/[!?.,;:()[\]{}<>"'*#~^%$&@+=_\-|\/\\]/g, ' ');
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  // "1st"/"2nd"/"৩য়"/"১ম" -> "1"/"2" so paper numbers match across languages.
  s = s.replace(/(\d)(st|nd|rd|th|ম|য|ৰ|র্থ|তম)/g, '$1');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Deduplicated, order preserving tokens of an already normalised string. */
export function tokenize(normalized: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(normalized ?? '').split(' ')) {
    if (!part || seen.has(part)) continue;
    seen.add(part);
    out.push(part);
  }
  return out;
}

/** Tokens too generic to drive "related resources" similarity. */
export const STOP_TOKENS = new Set([
  'pdf',
  'the',
  'and',
  'for',
  'with',
  'from',
  'book',
  'books',
  'বই',
  'পিডিএফ',
  'ফাইল',
  'file',
  'files',
  'পাওয়া',
  'জানু',
  'সংস্করণ',
  'edition',
  'latest',
  'সর্বশেষ',
  'ও',
  'এর',
  'এবং',
  '১',
  '২',
  '3',
  '1',
  '2',
]);

export function isStopToken(token: string): boolean {
  return STOP_TOKENS.has(token) || token.length < 2;
}

/* ------------------------------------------------------------------ */
/* Concept dictionary: Bengali <-> English equivalents                 */
/* ------------------------------------------------------------------ */

/**
 * Keyword phrases (Bengali and English) that mean the same thing. Indexing and
 * querying both append a synthetic `tc<concept>` token, which is how
 * "chemistry 2" matches "ACS রসায়ন ২য় পত্র" and "Current Affairs" matches
 * "কারেন্ট অ্যাফেয়ার্স".
 */
export const SEARCH_CONCEPTS: Record<string, string[]> = {
  // Subjects
  chemistry: ['chemistry', 'chem', 'রসায়ন', 'রসায়নবিজ্ঞান', 'কেমিস্ট্রি'],
  physics: ['physics', 'phy', 'পদার্থবিজ্ঞান', 'পদার্থ', 'গাণিতিক পদার্থবিজ্ঞান'],
  biology: ['biology', 'bio', 'জীববিজ্ঞান', 'বায়োলজি', 'বোটানি', 'botany', 'জুওলজি', 'zoology', 'উদ্ভিদবিজ্ঞান', 'প্রাণিবিজ্ঞান'],
  math: ['math', 'maths', 'mathematics', 'গণিত', 'ম্যাথ', 'উচ্চতর গণিত', 'higher math', 'iq math'],
  bangla: ['bangla', 'bengali', 'বাংলা'],
  english: ['english', 'ইংরেজি', 'ইংলিশ', 'grammar', 'vocabulary', 'ইংরেজি লিখিত'],
  ict: ['ict', 'তথ্য ও যোগাযোগ প্রযুক্তি'],
  gk: ['gk', 'general knowledge', 'সাধারণ জ্ঞান', 'সাধারণ জ্ঞান', 'সাধারণ জ্ঞান'],
  gs: ['বাংলাদেশ বিষয়াবলি', 'আন্তর্জাতিক বিষয়াবলি', 'bangladesh affairs', 'international affairs', 'সাবজেক্টিভ gk'],
  upskill: ['toefl', 'ielts', 'dictionary', 'ডিকশনারি', 'ভোকাবুলারি'],
  // Resource shapes
  questionbank: ['question bank', 'qb', 'প্রশ্নব্যাংক', 'প্রশ্ন ব্যাংক', 'master question bank', 'magnetic file'],
  guide: ['guide', 'গাইড', 'সহায়িকা', 'সহায়ক বই', 'নোট', 'notes', 'compact'],
  testpaper: ['test paper', 'টেস্ট পেপার', 'প্রশ্নপত্র', 'উত্তরপত্র', 'সাপ্লিমেন্ট', 'supplement', 'মডেল টেস্ট', 'model test'],
  solution: ['solution', 'solve', 'সমাধান', 'সল্যুশন', 'সলুশন'],
  paper: ['paper', 'পত্র'],
  exam: ['exam', 'পরীক্ষা', 'এক্সাম', 'weekly', 'উইকলি', 'দাগানো'],
  // Destinations
  hsc: ['hsc', 'এইচএসসি', 'একাদশ-দ্বাদশ', 'উচ্চ মাধ্যমিক'],
  admission: ['admission', 'এডমিশন', 'অ্যাডমিশন', 'ভর্তি'],
  varsity: ['varsity', 'versity', 'university', 'ভার্সিটি', 'বিশ্ববিদ্যালয়'],
  varsityk: ['varsity k', 'varsity ka', 'versity k', 'k unit', 'ক ইউনিট', 'ভার্সিটি ক'],
  varsitykh: ['varsity kh', 'kha unit', 'খ ইউনিট', 'ভার্সিটি খ'],
  medical: ['medical', 'মেডিকেল', 'ডেন্টাল', 'dental', 'mbbs', 'নার্সিং', 'nursing'],
  engineering: ['engineering', 'ইঞ্জিনিয়ারিং'],
  bcs: ['bcs', 'বিসিএস', 'bjs', 'ব্যাংক', 'bank', 'চাকরি', 'নিয়োগ', 'job', 'jobs', 'প্রাইমারি', 'শিক্ষক নিবন্ধন'],
  currentaffairs: ['current affairs', 'কারেন্ট অ্যাফেয়ার্স', 'সাম্প্রতিক', 'সাম্প্রতিক বিষয়াবলি', 'hour', 'capsule', 'ক্যাপসুল', 'monthly', 'মাসিক'],
  gst: ['gst', 'গুচ্ছ', 'agri cluster', 'কৃষি গুচ্ছ'],
  // Brands / institutions
  acs: ['acs', 'এসিএস'],
  udvash: ['udvash', 'উদ্ভাস'],
  unmesh: ['unmesh', 'উন্মেষ'],
  retina: ['retina', 'রেটিনা'],
  digest: ['digest', 'ডাইজেস্ট'],
  royal: ['royal', 'রয়েল', 'রয়াল'],
  joykoli: ['joykoli', 'জয়কলি'],
  alal: ['alal', 'আলাল', 'আলালস'],
  zobayer: ['zobayer', 'জোবায়ের'],
  panjeree: ['panjeree', 'পাঞ্জেরী', 'পাঞ্জেরি'],
  aspect: ['aspect', 'আসপেক্ট', 'এসপেক্ট'],
  network: ['network', 'নেটওয়ার্ক'],
  medico: ['medico', 'মেডিকো'],
  biologyhaters: ['biology haters', 'বায়োলজি হাটার্স'],
  // Exam bodies
  buet: ['buet', 'বুয়েট'],
  kuet: ['kuet', 'কুয়েট'],
  ruet: ['ruet', 'রুয়েট'],
  cuet: ['cuet', 'চুয়েট'],
  butex: ['butex', 'বুটেক্স'],
  du: ['ঢাবি', 'ঢাকা বিশ্ববিদ্যালয়', 'dhaka university'],
  ju: ['জাবি', 'জাহাঙ্গীরনগর'],
  sust: ['sust', 'সাস্ট', 'শাহজালাল'],
  ru: ['রাবি', 'রাজশাহী বিশ্ববিদ্যালয়'],
  cu: ['চবি', 'চট্টগ্রাম বিশ্ববিদ্যালয়'],
};

const CONCEPT_TOKEN_PREFIX = 'tc';

export interface ConceptEntry {
  id: string;
  /** Normalised keywords of the concept (single tokens and phrases). */
  tokens: string[];
}

const CONCEPT_ENTRIES: ConceptEntry[] = Object.entries(SEARCH_CONCEPTS).map(([id, keywords]) => ({
  id,
  tokens: Array.from(new Set(keywords.map((keyword) => normalizeText(keyword)).filter(Boolean))),
}));

const CONCEPT_BY_TOKEN = new Map<string, string[]>();
for (const entry of CONCEPT_ENTRIES) {
  for (const token of entry.tokens) {
    if (token.includes(' ')) continue;
    const list = CONCEPT_BY_TOKEN.get(token);
    if (list) list.push(entry.id);
    else CONCEPT_BY_TOKEN.set(token, [entry.id]);
  }
}

/** Concept ids a single normalised token belongs to (used by suggestions). */
export function conceptsForToken(token: string): string[] {
  return CONCEPT_BY_TOKEN.get(token) ?? [];
}

export function conceptTokenOf(id: string): string {
  return CONCEPT_TOKEN_PREFIX + id;
}

export function isConceptToken(token: string): boolean {
  if (!token.startsWith(CONCEPT_TOKEN_PREFIX)) return false;
  return CONCEPT_ENTRIES.some((entry) => conceptTokenOf(entry.id) === token);
}

/**
 * Synthetic concept tokens ("tcchemistry", "tcmedical", ...) for a normalised
 * string. Only concept tokens are returned — never the raw tokens — so they can
 * be appended to an already tokenised index.
 */
export function conceptTokensFor(normalized: string, tokens: string[]): string[] {
  const ids = new Set<string>();
  const padded = ` ${normalized} `;
  const tokenSet = new Set(tokens);
  for (const entry of CONCEPT_ENTRIES) {
    for (const keyword of entry.tokens) {
      const hit = keyword.includes(' ') ? padded.includes(` ${keyword} `) : tokenSet.has(keyword);
      if (hit) {
        ids.add(entry.id);
        break;
      }
    }
  }
  return Array.from(ids, (id) => conceptTokenOf(id));
}

/** Nicely cased words used by the "did you mean" banner. */
export const DISPLAY_ALIASES: Record<string, string> = {
  acs: 'ACS',
  hsc: 'HSC',
  ssc: 'SSC',
  bcs: 'BCS',
  bjs: 'BJS',
  gst: 'GST',
  ict: 'ICT',
  qb: 'QB',
  udvash: 'Udvash',
  unmesh: 'Unmesh',
  joykoli: 'Joykoli',
  buet: 'BUET',
  kuet: 'KUET',
  ruet: 'RUET',
  cuet: 'CUET',
  butex: 'BUTEX',
  sust: 'SUST',
  k: 'K',
  ka: 'KA',
  kh: 'KH',
  chemistry: 'Chemistry',
  physics: 'Physics',
  biology: 'Biology',
  math: 'Math',
  medical: 'Medical',
  engineering: 'Engineering',
  varsity: 'Varsity',
};
/* ------------------------------------------------------------------ */
/* Caption cleaning                                                    */
/* ------------------------------------------------------------------ */

/**
 * Softer normalisation that keeps Bengali hasanta/nukta. Used for rule matching
 * (categories, promo detection) so rules can be written in natural Bengali.
 */
export function looseFold(input: string): string {
  return mapBengaliDigits(decodeEntities(input ?? ''))
    .replace(INVISIBLE_RE, '')
    .replace(/\u09DF/g, '\u09AF')
    .replace(/\u09DC/g, '\u09A1')
    .replace(/\u09DD/g, '\u09A2')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Promotional / boilerplate markers. The earliest marker ends the useful part
 * of a caption — everything behind it is credit, channel spam or a link.
 */
const CUT_MARKERS: string[] = [
  'pdf credit',
  'pdf credit :',
  'pdf credit:',
  'pdf credit -',
  'credit :',
  'credit:',
  'credit -',
  'credit ©',
  '©',
  '©️',
  'join @',
  'join:',
  'জয়েন করো',
  'জয়েন কর',
  'ভিজিট করো',
  'ভিজিট কর',
  'web.prostuti.bd',
  'web.prostuti',
  'prostuti.bd',
  'prostuti app',
  'prostuti',
  'প্রস্তুতি অ্যাপ',
  '@prostutibd',
  '@prostutibot',
  '@hscfreepdf',
  '@pdfmultiverse',
  '@pdfnexus',
  '@admissionstuffs',
  'অ্যাডমিশন টেস্টের প্রতিযোগিতা',
  'প্রস্তুতির জন্য ভিজিট',
  'dont copy',
  "don't copy",
  'react দাও',
  'extra ',
  'download:',
  'download',
  'ডাউনলোড',
  '<sponsored>',
  'sponsored',
  'chorcha',
  'e test paper',
  'ডিজিটাল hsc টেস্ট পেপার',
  'hsc | versity',
  'সবই ফ্রিতে',
  'সম্পূর্ণ ফ্রি',
  'লাগবে',
  'lagbe',
  'https://',
  'http://',
  'www.',
  't.me/',
  'youtu.be',
  'drive.google.com',
  'wa.me',
  'hsc free pdf',
  'যোগাযোগ করো',
  'whatsapp',
];

const FOLDED_CUT_MARKERS = CUT_MARKERS.map((marker) => foldChars(marker));

/** Text before the earliest promo marker (a marker at index 0 is ignored). */
function cutAtPromoMarker(input: string): string {
  const folded = foldChars(input);
  let earliest = -1;
  for (const marker of FOLDED_CUT_MARKERS) {
    const index = folded.indexOf(marker);
    if (index > 0 && (earliest === -1 || index < earliest)) earliest = index;
  }
  return earliest > 0 ? input.slice(0, earliest) : input;
}

const PROMO_SEGMENT_MARKERS = [
  'pdf credit',
  'credit',
  'web prostuti',
  'prostuti',
  't me',
  'প্রস্তুতি অ্যাপ',
  'ভিজিট করো',
  'ফ্রিতে',
  'sponsored',
  'জয়েন করো',
  'সাবস্ক্রাইব',
  'কুপন কোড',
  'offer30',
  'react',
  'whatsapp',
  'যোগাযোগ করো',
];

/** Splits a caption into sentences / list items. */
export function splitSegments(input: string): string[] {
  return input
    .replace(/([।!?])\s+/g, '$1\n')
    .split(/[\n|•·]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** True when a caption sentence is credit / channel promo rather than content. */
export function isPromoSegment(segment: string): boolean {
  const folded = looseFold(segment);
  if (!folded) return true;
  if (folded.includes('http')) return true;
  return PROMO_SEGMENT_MARKERS.some((marker) => folded.includes(marker));
}

/** Drops promotional sentences while always keeping the opening one. */
function dropPromoSegments(input: string): string {
  const segments = splitSegments(input);
  if (segments.length < 2) return input;
  const kept = segments.filter((segment, index) => index === 0 || !isPromoSegment(segment));
  return kept.join(' | ');
}

/** Collapses repeated words and repeated two-word groups. */
function dedupeRepeats(input: string): string {
  const words = input.split(' ');
  const out: string[] = [];
  for (const word of words) {
    const key = looseFold(word);
    if (!key) continue;
    const last = out.length > 0 ? looseFold(out[out.length - 1]) : '';
    if (last === key) continue;
    if (out.length >= 3) {
      const prevWord = looseFold(out[out.length - 3]);
      const prevPair = `${prevWord} ${last}`.trim();
      if (prevPair === `${last} ${key}`.trim()) continue;
    }
    out.push(word);
  }
  return out.join(' ');
}
/** Removes links, handles, emoji noise and filename artefacts from a caption. */
function postClean(input: string): string {
  let s = input;
  s = s.replace(/https?:\/\/\S+/gi, ' ');
  s = s.replace(/(?:www\.|t\.me\/|wa\.me\/|youtu\.be\/)\S*/gi, ' ');
  s = s.replace(/@[A-Za-z0-9_.]{3,}/g, ' ');
  s = s.replace(/[\uD800-\uDFFF\uFE0F]/g, ' ');
  // Keep year ranges readable: 2026–27 stays "2026-27".
  s = s.replace(/[\u2010-\u2015\u2212\u2043]/g, '-');
  s = s.replace(/[\u2190-\u2BFF\u2600-\u27BF\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F]/g, ' ');
  s = s.replace(/[©®™]/g, ' ');
  s = s.replace(/[_*#~^`]+/g, ' ');
  s = s.replace(/\b(?:pdf|download|upload)\b/gi, ' ');
  s = s.replace(/পিডিএফ|ফাইল/g, ' ');
  s = s.replace(/(?:-{2,}|\.{2,}|\|{2,}|\+{2,}|\*{2,})/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\(\s*\d+\s*\)$/g, ' ');
  s = s.replace(/\.(?:pdf|zip|apk|docx?|xlsx?|txt)\b/gi, ' ');
  s = dedupeRepeats(s);
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/^[\s|,;:\-.।]+/, '').replace(/[\s|,;:\-.।]+$/, '');
  return s;
}

const TITLE_MAX_CHARS = 118;

/** Cuts a long title at a word boundary (never mid-word). */
export function truncateTitle(input: string, max = TITLE_MAX_CHARS): string {
  if (input.length <= max) return input;
  const slice = input.slice(0, max);
  const cut = slice.lastIndexOf(' ');
  const base = cut > max * 0.55 ? slice.slice(0, cut) : slice;
  return `${base.replace(/[\s|,;:\-.]+$/, '')}…`;
}

export interface CleanTitleResult {
  /** Clean, display ready title ('' when the caption had no usable text). */
  title: string;
}

/**
 * Canonical, display ready title: promotional credits, links, channel handles,
 * repeated text and decorative symbols removed — edition/year information kept.
 */
export function cleanTitle(rawTitle: string): CleanTitleResult {
  const raw = decodeEntities(rawTitle ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return { title: '' };

  const withoutPromoTail = splitSegments(dropPromoSegments(cutAtPromoMarker(raw))).join(' | ');
  const candidate = postClean(withoutPromoTail);
  if (candidate.length >= 6) return { title: truncateTitle(candidate) };

  // The caption started with promo text (e.g. "Prostuti App কেন ..."): keep the
  // opening sentence rather than dropping the post entirely.
  const fallback = postClean(raw);
  if (fallback.length >= 3) return { title: truncateTitle(fallback) };

  return { title: '' };
}

/**
 * Short, cleaned description. Only detail sentences that are NOT promotional
 * are used, and never text that already appears in the title.
 */
export function buildDescription(rawTitle: string, normalizedTitle: string): string {
  const raw = decodeEntities(rawTitle ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const details = splitSegments(raw).filter(
    (segment, index) => index > 0 && !isPromoSegment(segment),
  );
  if (details.length === 0) return '';
  const cleaned = postClean(details.join(' | '));
  if (cleaned.length < 12) return '';
  const normalizedDetail = normalizeText(cleaned);
  if (!normalizedDetail) return '';
  // Skip details the (possibly truncated) title already covers.
  const probe = normalizedDetail.split(' ').slice(0, 5).join(' ');
  if (probe && normalizedTitle.includes(probe)) return '';
  return truncateTitle(cleaned, 160);
}

/* ------------------------------------------------------------------ */
/* Generic titles, categories, types, years                            */
/* ------------------------------------------------------------------ */

const GENERIC_TITLE_FORMS = new Set([
  'telegram image',
  'telegram media',
  'telegram video',
  'telegram audio',
  'telegram file',
  'telegram photo',
  'image',
  'media',
  'video',
  'audio',
  'file',
  'photo',
  'picture',
  'hello',
  'hi',
  'test',
  'new',
  'ok',
  'untitled',
  'no title',
]);

/** True when the source caption carries no usable title text. */
export function isGenericRawTitle(rawTitle: string): boolean {
  const normalized = normalizeText(rawTitle);
  if (!normalized) return true;
  if (GENERIC_TITLE_FORMS.has(normalized)) return true;
  if (/^(?:telegram )?(?:image|media|video|audio|file|photo)$/.test(normalized)) return true;
  // Captions that are nothing but a link to another post in the channel.
  if (/^(?:https )?t me hscfreepdf \d+$/.test(normalized)) return true;
  return normalized.replace(/[\s\d]+/g, '').length < 3;
}

/** Telegram message id when a caption is just a link to another post. */
export function extractMessageIdFromTitle(rawTitle: string): string | null {
  const match = /t\.me\/[A-Za-z0-9_]+\/(\d+)/.exec(rawTitle ?? '');
  return match ? match[1] : null;
}

export function genericLabelFor(typeLabel: string): string {
  return `${typeLabel} Resource`;
}

/** Maps the source label onto the product's type buckets. */
export function typeBucketFor(sourceType: string): ResourceType {
  switch (sourceType) {
    case 'PDF':
      return 'PDF';
    case 'APK':
      return 'APK';
    case 'Image':
      return 'Image';
    case 'Text':
      return 'Text';
    default:
      return 'Other';
  }
}

interface CategoryRule {
  category: ResourceCategory;
  keywords: string[];
}

/**
 * Ordered rules; the first match becomes the primary category.
 * Keywords are matched against a soft-normalised title with a left word
 * boundary, so "প্রশ্নব্যাংক" never triggers "ব্যাংক".
 */
const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'General',
    keywords: ['prostuti app', 'web prostuti', 'prostuti', 'chorcha', 'telegram image', 'telegram media'],
  },
  {
    category: 'Current Affairs',
    keywords: ['কারেন্ট অ্যাফেয়ার্স', 'current affairs', 'সাম্প্রতিক', 'আলাল', 'জোবায়ের', 'hour', 'ক্যাপসুল'],
  },
  {
    category: 'Medical',
    keywords: [
      'মেডিকেল',
      'medical',
      'রেটিনা',
      'retina',
      'উন্মেষ',
      'unmesh',
      'medico',
      'মেডিকো',
      'ডেন্টাল',
      'dental',
      'mbbs',
      'নার্সিং',
      'nursing',
      'দাগানো',
      'biology haters',
      'বায়োলজি হাটার্স',
      'weekly mcq',
      'map weekly',
    ],
  },
  {
    category: 'Engineering',
    keywords: [
      'ইঞ্জিনিয়ারিং',
      'engineering',
      'buet',
      'বুয়েট',
      'kuet',
      'কুয়েট',
      'ruet',
      'cuet',
      'iut',
      'butex',
      'বুটেক্স',
      'জয়কলি',
      'joykoli',
    ],
  },
  {
    category: 'BCS & Jobs',
    keywords: [
      'bcs',
      'বিসিএস',
      'bjs',
      'ব্যাংক',
      'চাকরি',
      'নিয়োগ',
      'প্রাইমারি',
      'শিক্ষক নিবন্ধন',
      'bank job',
      'job',
      'jobs',
    ],
  },
  {
    category: 'General',
    keywords: ['ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'নবম', 'দশম', 'ssc', 'এসএসসি', 'জেএসসি', 'প্রাথমিক'],
  },
  {
    category: 'University Admission',
    keywords: [
      'ভার্সিটি',
      'varsity',
      'versity',
      'university',
      'বিশ্ববিদ্যালয়',
      'প্রশ্নব্যাংক',
      'question bank',
      'gst',
      'গুচ্ছ',
      'agri',
      'আগ্রি',
      'admission',
      'এডমিশন',
      'অ্যাডমিশন',
      'ভর্তি',
      'ঢাবি',
      'জাবি',
      'সাস্ট',
      'sust',
      'aspect',
      'আসপেক্ট',
      'এসপেক্ট',
      'ইউনিট',
      'unit',
      'admission stuff',
    ],
  },
  {
    category: 'HSC',
    keywords: [
      'hsc',
      'এইচএসসি',
      'একাদশ',
      'দ্বাদশ',
      'বোর্ড',
      'board',
      'টেস্ট পেপার',
      'test paper',
      'পাঞ্জেরী',
      'panjeree',
      'লেকচার',
      'lecture',
      'নবদূত',
      'nobodut',
      'বাংলাবাজ',
      'banglabaz',
      'অক্ষরপত্র',
      'তরবারি',
      'কম্প্যাক্ট',
      'compact',
      'সাপ্লিমেন্ট',
      'supplement',
      'made easy',
      'মেইড ইজি',
      'প্র্যাক্টিস',
      'সাজেশন',
      'গাইড',
      'guide',
      'সহায়িকা',
      'প্যারালাল',
      'parallel',
    ],
  },
  {
    category: 'General',
    keywords: ['toefl', 'ielts', 'dictionary', 'ডিকশনারি', 'vocabulary', 'ভোকাবুলারি', 'grammar'],
  },
];

/** Deterministic category inference — never invents data, falls back to General. */
export function inferCategories(title: string, type?: ResourceType): ResourceCategory[] {
  if (type === 'APK') return ['General'];
  const folded = looseFold(title);
  if (!folded) return ['General'];
  const padded = ` ${folded} `;
  const matched: ResourceCategory[] = [];
  for (const rule of CATEGORY_RULES) {
    if (matched.includes(rule.category)) continue;
    for (const keyword of rule.keywords) {
      const needle = looseFold(keyword);
      if (!needle) continue;
      if (padded.includes(` ${needle}`)) {
        matched.push(rule.category);
        break;
      }
    }
  }
  return matched.length > 0 ? matched : ['General'];
}

/** Edition / exam years mentioned in a caption ("২০২৬-২৭" -> ["2026", "27"]). */
export function extractYearTokens(normalized: string): string[] {
  const out = new Set<string>();
  for (const token of tokenize(normalized)) {
    if (/^20\d\d$/.test(token)) {
      out.add(token);
      out.add(token.slice(2));
    } else if (/^[2-4]\d$/.test(token)) {
      out.add(token);
    }
  }
  return Array.from(out);
}