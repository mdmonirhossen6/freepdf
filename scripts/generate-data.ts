/**
 * Build-time indexer.
 *
 * Parses the channel index snapshot (data/source/HSCFreePDF_Complete_Index.html)
 * and emits the local, typed dataset plus static SEO files:
 *
 *   lib/generated/resources.ts   -> typed Resource[] used by the app
 *   public/sitemap.xml           -> static sitemap
 *   public/robots.txt            -> static robots file
 *
 * The HTML snapshot never reaches the browser: after this step the app only
 * depends on the generated dataset.
 *
 * Run with `npm run data` (Node >= 20, uses native TypeScript type stripping).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATEGORY_META } from '../lib/categories.ts';
import {
  buildDescription,
  cleanTitle,
  conceptTokensFor,
  decodeEntities,
  extractMessageIdFromTitle,
  extractYearTokens,
  genericLabelFor,
  inferCategories,
  isGenericRawTitle,
  normalizeText,
  tokenize,
  typeBucketFor,
} from '../lib/text.ts';
import type { Resource, ResourceCategory, ResourceType } from '../lib/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCE_HTML = resolve(ROOT, 'data', 'source', 'HSCFreePDF_Complete_Index.html');
const GENERATED_FILE = resolve(ROOT, 'lib', 'generated', 'resources.ts');
const SITEMAP_FILE = resolve(ROOT, 'public', 'sitemap.xml');
const ROBOTS_FILE = resolve(ROOT, 'public', 'robots.txt');
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hscfreepdf.vercel.app').replace(/\/+$/, '');

const MONTHS: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

interface RawEntry {
  id: string;
  date: string;
  dateLabel: string;
  rawTitle: string;
  sourceType: string;
  telegramUrl: string;
}

const GROUP_RE = /<div class='date'>([^<]+)<\/div>\s*<ol>([\s\S]*?)<\/ol>/g;
const ITEM_RE =
  /<li><a href='([^']*)'>(.*?)<\/a><span class='type'>([^<]*)<\/span>(?:<span class='related'>[^<]*<\/span>)?<\/li>/g;

function parseDateLabel(label: string): string {
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(label.trim());
  if (!match) throw new Error(`Unrecognised date heading: "${label}"`);
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) throw new Error(`Unrecognised month: "${monthName}"`);
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

function parseIndex(html: string): RawEntry[] {
  const entries: RawEntry[] = [];
  let group: RegExpExecArray | null;
  while ((group = GROUP_RE.exec(html)) !== null) {
    const dateLabel = group[1].trim();
    const date = parseDateLabel(dateLabel);
    const listHtml = group[2];
    let item: RegExpExecArray | null;
    ITEM_RE.lastIndex = 0;
    while ((item = ITEM_RE.exec(listHtml)) !== null) {
      const telegramUrl = decodeEntities(item[1]).trim();
      const idMatch = /(\d+)\/?$/.exec(telegramUrl);
      if (!idMatch) continue;
      entries.push({
        id: idMatch[1],
        date,
        dateLabel,
        rawTitle: decodeEntities(item[2]).trim(),
        sourceType: decodeEntities(item[3]).trim() || 'Other',
        telegramUrl,
      });
    }
  }
  return entries;
}

interface BuildResult {
  resources: Resource[];
  duplicates: number;
  derivedTitles: number;
  placeholderTitles: number;
}

function buildResources(raws: RawEntry[]): BuildResult {
  // Pass 1 — canonical (promo free) titles. Needed up front so that generic
  // posts can borrow the title of the post they link to.
  const cleanedTitles = new Map<string, { title: string; generic: boolean }>();
  for (const raw of raws) {
    if (isGenericRawTitle(raw.rawTitle)) {
      cleanedTitles.set(raw.id, { title: '', generic: true });
      continue;
    }
    cleanedTitles.set(raw.id, { title: cleanTitle(raw.rawTitle).title, generic: false });
  }

  const resources: Resource[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let derivedTitles = 0;
  let placeholderTitles = 0;

  for (const raw of raws) {
    const cleaned = cleanedTitles.get(raw.id) ?? { title: '', generic: true };
    const type = typeBucketFor(raw.sourceType);
    const typeLabel = raw.sourceType;
    let title = cleaned.title;
    let genericTitle = cleaned.generic || !cleaned.title;
    let derivedFromId: string | null = null;

    if (genericTitle) {
      const linkedId = extractMessageIdFromTitle(raw.rawTitle);
      const linked = linkedId && linkedId !== raw.id ? cleanedTitles.get(linkedId) : undefined;
      if (linked && linked.title) {
        // "Confidently adjacent": the caption is a link to another indexed post.
        title = linked.title;
        derivedFromId = linkedId;
        derivedTitles += 1;
      } else {
        title = genericLabelFor(typeLabel);
        placeholderTitles += 1;
      }
    }

    const normalizedTitle = normalizeText(title);
    // Categories are inferred from the *cleaned* title only, so promotional
    // tails in the raw caption can never influence categorisation.
    const categories = inferCategories(title, type);
    const titleTokens = tokenize(normalizedTitle);
    const searchTokens = Array.from(
      new Set([
        ...titleTokens,
        ...conceptTokensFor(normalizedTitle, titleTokens),
        ...tokenize(normalizeText(typeLabel)),
      ]),
    );

    const resource: Resource = {
      id: raw.id,
      title,
      rawTitle: raw.rawTitle,
      normalizedTitle,
      date: raw.date,
      type,
      typeLabel,
      category: categories[0] as ResourceCategory,
      categories,
      telegramUrl: raw.telegramUrl,
      description: genericTitle ? '' : buildDescription(raw.rawTitle, normalizedTitle),
      searchTokens,
      years: extractYearTokens(normalizeText(`${raw.rawTitle} ${title}`)),
      genericTitle,
      derivedFromId,
    };

    // Duplicate handling: same title + same Telegram post => one result.
    // Different editions / years keep their own Telegram URL and stay distinct.
    const dedupeKey = `${resource.telegramUrl}|${resource.normalizedTitle}`;
    if (seen.has(dedupeKey)) {
      duplicates += 1;
      continue;
    }
    seen.add(dedupeKey);
    resources.push(resource);
  }

  resources.sort((a, b) => {
    if (a.date === b.date) return Number(b.id) - Number(a.id);
    return a.date < b.date ? 1 : -1;
  });

  return { resources, duplicates, derivedTitles, placeholderTitles };
}

function writeDataset(resources: Resource[]): void {
  const header = [
    '/**',
    ' * AUTO-GENERATED FILE — do not edit by hand.',
    ' *',
    ' * Produced by scripts/generate-data.ts from the channel index snapshot',
    ' * (data/source/HSCFreePDF_Complete_Index.html) in the @hscfreepdf channel.',
    ' *',
    ` * Indexed resources: ${resources.length}`,
    ' */',
    "import type { Resource } from '../types';",
    '',
    "export const SOURCE_CHANNEL = 'hscfreepdf';",
    "export const SOURCE_FILE = 'data/source/HSCFreePDF_Complete_Index.html';",
    '',
    'export const RESOURCES: Resource[] = [',
  ].join('\n');
  const body = resources.map((resource) => `  ${JSON.stringify(resource)},`).join('\n');
  const footer = [
    '];',
    '',
    'export const TOTAL_RESOURCES = RESOURCES.length;',
    `export const LATEST_RESOURCE_DATE = '${resources[0]?.date ?? ''}';`,
    '',
  ].join('\n');
  mkdirSync(dirname(GENERATED_FILE), { recursive: true });
  writeFileSync(GENERATED_FILE, `${header}\n${body}\n${footer}`, 'utf8');
}

function writeSitemap(resources: Resource[]): void {
  const lastmod = resources[0]?.date ?? '2026-01-01';
  const urls: Array<{ loc: string; priority: string; changefreq: string }> = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${SITE_URL}/browse/`, priority: '0.9', changefreq: 'daily' },
    { loc: `${SITE_URL}/search/`, priority: '0.8', changefreq: 'weekly' },
    ...CATEGORY_META.map((meta) => ({
      loc: `${SITE_URL}/category/${meta.slug}/`,
      priority: '0.7',
      changefreq: 'weekly',
    })),
  ];
  const body = urls
    .map((url) =>
      [
        '  <url>',
        `    <loc>${url.loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${url.changefreq}</changefreq>`,
        `    <priority>${url.priority}</priority>`,
        '  </url>',
      ].join('\n'),
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  mkdirSync(dirname(SITEMAP_FILE), { recursive: true });
  writeFileSync(SITEMAP_FILE, xml, 'utf8');
}

function writeRobots(): void {
  const content = [
    '# Free Pdf — HSC, admission, medical, engineering and BCS resource search',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
  mkdirSync(dirname(ROBOTS_FILE), { recursive: true });
  writeFileSync(ROBOTS_FILE, content, 'utf8');
}

function report(
  raws: RawEntry[],
  resources: Resource[],
  duplicates: number,
  derivedTitles: number,
  placeholderTitles: number,
): void {
  const byType = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const resource of resources) {
    byType.set(resource.type, (byType.get(resource.type) ?? 0) + 1);
    byCategory.set(resource.category, (byCategory.get(resource.category) ?? 0) + 1);
  }

  const line = '──────────────────────────────────────────────';
  console.log(line);
  console.log('Free Pdf — data build');
  console.log(line);
  console.log(`source entries parsed : ${raws.length}`);
  console.log(`resources written     : ${resources.length}`);
  console.log(`duplicates removed    : ${duplicates}`);
  console.log(`generic titles        : ${resources.filter((r) => r.genericTitle).length} (${derivedTitles} derived from a linked post, ${placeholderTitles} labelled "<Type> Resource")`);
  console.log(`with description      : ${resources.filter((r) => r.description).length}`);
  console.log(`date range            : ${resources[resources.length - 1]?.date} → ${resources[0]?.date}`);
  console.log(`by type               : ${[...byType.entries()].map(([k, v]) => `${k}=${v}`).join('  ')}`);
  console.log(`by category           : ${[...byCategory.entries()].map(([k, v]) => `${k}=${v}`).join('  ')}`);

  const noisy = resources.filter((r) => /prostuti|\bcredit\b|@|https?:/i.test(r.title));
  console.log(`titles still containing promo noise: ${noisy.length}`);
  for (const resource of noisy.slice(0, 12)) console.log(`   ! ${resource.id} ${resource.title}`);

  console.log('sample: General category titles');
  for (const resource of resources.filter((r) => r.category === 'General').slice(0, 8)) {
    console.log(`   ~ ${resource.id} [${resource.typeLabel}] ${resource.title}`);
  }
  console.log('sample: description field');
  for (const resource of resources.filter((r) => r.description).slice(0, 6)) {
    console.log(`   d ${resource.id} ${resource.description}`);
  }

  console.log(line);
  console.log('spot checks (id | type | category | title)');
  for (const id of ['1921', '1920', '1918', '1906', '1893', '1873', '1838', '1821', '1889', '1880', '795', '4']) {
    const resource = resources.find((item) => item.id === id);
    if (!resource) continue;
    console.log(`   ${resource.id.padStart(5)} | ${resource.typeLabel.padEnd(7)} | ${resource.category.padEnd(20)} | ${resource.title}`);
  }
  console.log(line);
}

function main(): void {
  const html = readFileSync(SOURCE_HTML, 'utf8');
  const raws = parseIndex(html);
  if (raws.length < 100) throw new Error('Index parse produced suspiciously few entries — aborting.');
  const { resources, duplicates, derivedTitles, placeholderTitles } = buildResources(raws);

  writeDataset(resources);
  writeSitemap(resources);
  writeRobots();
  report(raws, resources, duplicates, derivedTitles, placeholderTitles);
}

main();