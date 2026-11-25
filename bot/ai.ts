import { GoogleGenAI, Type } from '@google/genai';

import { relatedResources, searchAll } from '../lib/search.ts';
import { normalizeText } from '../lib/text.ts';
import type { BotConfig } from './config.ts';
import type { AiQueryPlan, AiSearchDecision, BotResource, ConversationContext } from './types.ts';

const GEMINI_TIMEOUT_MS = 12_000;

interface RankedCandidate {
  resource: BotResource;
  score: number;
}

interface StrictEntityDef {
  id: string;
  kind: 'university' | 'class';
  labelEn: string;
  labelBn: string;
  /** Aliases matched as whole words/phrases against normalized text. */
  aliases: string[];
}

/**
 * Distinct universities / institutions / school classes that must NEVER be faked
 * as an exact bestMatchId when absent from the channel index.
 * - For missing 'university' entities: say it's not available, force bestMatchId=null,
 *   and still offer genuinely related admission/question-bank PDFs as buttons.
 * - For missing 'class' entities (Class 6-8): say it's not available with no unrelated HSC PDFs.
 */
const STRICT_ENTITIES: StrictEntityDef[] = [
  { id: 'jnu', kind: 'university', labelEn: 'JnU (Jagannath University)', labelBn: 'জগন্নাথ বিশ্ববিদ্যালয় (JnU)', aliases: ['jnu', 'jagannath', 'জগন্নাথ', 'জবি'] },
  { id: 'hstu', kind: 'university', labelEn: 'HSTU (Hajee Danesh University)', labelBn: 'হাজী দানেশ বিশ্ববিদ্যালয় (HSTU)', aliases: ['hstu', 'haji danesh', 'haji danes', 'hajee danesh', 'hajee danes', 'hajee mohammad danesh', 'danesh', 'danes', 'হাজী দানেশ', 'হাজি দানেশ', 'হাবিপ্রবি'] },
  { id: 'du', kind: 'university', labelEn: 'Dhaka University (DU)', labelBn: 'ঢাকা বিশ্ববিদ্যালয় (ঢাবি)', aliases: ['dhaka university', 'ঢাকা বিশ্ববিদ্যালয়', 'ঢাবি', 'du'] },
  { id: 'ju', kind: 'university', labelEn: 'Jahangirnagar University (JU)', labelBn: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয় (জাবি)', aliases: ['jahangirnagar', 'জাহাঙ্গীরনগর', 'জাবি', 'ju'] },
  { id: 'ru', kind: 'university', labelEn: 'Rajshahi University (RU)', labelBn: 'রাজশাহী বিশ্ববিদ্যালয় (রাবি)', aliases: ['rajshahi university', 'রাজশাহী বিশ্ববিদ্যালয়', 'রাবি', 'ru'] },
  { id: 'cu', kind: 'university', labelEn: 'Chittagong University (CU)', labelBn: 'চট্টগ্রাম বিশ্ববিদ্যালয় (চবি)', aliases: ['chittagong university', 'চট্টগ্রাম বিশ্ববিদ্যালয়', 'চবি', 'cu'] },
  { id: 'sust', kind: 'university', labelEn: 'SUST', labelBn: 'শাহজালাল বিশ্ববিদ্যালয় (SUST)', aliases: ['sust', 'shahjalal', 'শাহজালাল', 'সাস্ট'] },
  { id: 'buet', kind: 'university', labelEn: 'BUET', labelBn: 'বুয়েট (BUET)', aliases: ['buet', 'বুয়েট'] },
  { id: 'kuet', kind: 'university', labelEn: 'KUET', labelBn: 'কুয়েট (KUET)', aliases: ['kuet', 'কুয়েট'] },
  { id: 'ruet', kind: 'university', labelEn: 'RUET', labelBn: 'রুয়েট (RUET)', aliases: ['ruet', 'রুয়েট'] },
  { id: 'cuet', kind: 'university', labelEn: 'CUET', labelBn: 'চুয়েট (CUET)', aliases: ['cuet', 'চুয়েট'] },
  { id: 'butex', kind: 'university', labelEn: 'BUTEX', labelBn: 'বুটেক্স (BUTEX)', aliases: ['butex', 'বুটেক্স'] },
  { id: 'iut', kind: 'university', labelEn: 'IUT', labelBn: 'আইইউটি (IUT)', aliases: ['iut', 'আইইউটি'] },
  { id: 'mist', kind: 'university', labelEn: 'MIST', labelBn: 'এমআইএসটি (MIST)', aliases: ['mist', 'এমআইএসটি'] },
  { id: 'bup', kind: 'university', labelEn: 'BUP', labelBn: 'বিইউপি (BUP)', aliases: ['bup', 'বিইউপি'] },
  { id: 'ku', kind: 'university', labelEn: 'Khulna University (KU)', labelBn: 'খুলনা বিশ্ববিদ্যালয় (খুবি)', aliases: ['khulna university', 'খুলনা বিশ্ববিদ্যালয়', 'খুবি'] },
  { id: 'iu', kind: 'university', labelEn: 'Islamic University (IU)', labelBn: 'ইসলামী বিশ্ববিদ্যালয় (ইবি)', aliases: ['islamic university', 'ইসলামী বিশ্ববিদ্যালয়', 'ইবি'] },
  { id: 'cou', kind: 'university', labelEn: 'Comilla University (CoU)', labelBn: 'কুমিল্লা বিশ্ববিদ্যালয় (কুবি)', aliases: ['comilla university', 'কুমিল্লা বিশ্ববিদ্যালয়', 'কুবি', 'cou'] },
  { id: 'brur', kind: 'university', labelEn: 'Begum Rokeya University (BRUR)', labelBn: 'বেগম রোকেয়া বিশ্ববিদ্যালয় (BRUR)', aliases: ['brur', 'begum rokeya', 'বেগম রোকেয়া', 'বেরোবি'] },
  { id: 'mbstu', kind: 'university', labelEn: 'MBSTU', labelBn: 'মাওলানা ভাসানী বিশ্ববিদ্যালয় (MBSTU)', aliases: ['mbstu', 'mawlana bhashani', 'মাভাবিপ্রবি'] },
  { id: 'nstu', kind: 'university', labelEn: 'NSTU', labelBn: 'নোয়াখালী বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (NSTU)', aliases: ['nstu', 'noakhali science', 'নোবিপ্রবি'] },
  { id: 'just', kind: 'university', labelEn: 'JUST', labelBn: 'যশোর বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (JUST)', aliases: ['yobiprobi', 'যবিপ্রবি', 'jashore university', 'jessore university'] },
  { id: 'pstu', kind: 'university', labelEn: 'PSTU', labelBn: 'পটুয়াখালী বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (PSTU)', aliases: ['pstu', 'patuakhali', 'পবিপ্রবি'] },
  { id: 'bau', kind: 'university', labelEn: 'BAU', labelBn: 'বাংলাদেশ কৃষি বিশ্ববিদ্যালয় (BAU)', aliases: ['bau', 'বাকৃবি'] },
  { id: 'sau', kind: 'university', labelEn: 'SAU', labelBn: 'শেরেবাংলা কৃষি বিশ্ববিদ্যালয় (SAU)', aliases: ['sau', 'শেকৃবি', 'sher e bangla'] },
  { id: 'nu', kind: 'university', labelEn: 'National University (NU)', labelBn: 'জাতীয় বিশ্ববিদ্যালয় (NU)', aliases: ['national university', 'জাতীয় বিশ্ববিদ্যালয়'] },
  { id: 'class6', kind: 'class', labelEn: 'Class 6', labelBn: 'ষষ্ঠ শ্রেণি (Class 6)', aliases: ['class 6', 'ষষ্ঠ শ্রেণি', 'ষষ্ঠ শ্রেণী'] },
  { id: 'class7', kind: 'class', labelEn: 'Class 7', labelBn: 'সপ্তম শ্রেণি (Class 7)', aliases: ['class 7', 'সপ্তম শ্রেণি', 'সপ্তম শ্রেণী'] },
  { id: 'class8', kind: 'class', labelEn: 'Class 8', labelBn: 'অষ্টম শ্রেণি (Class 8)', aliases: ['class 8', 'অষ্টম শ্রেণি', 'অষ্টম শ্রেণী', 'jsc', 'জেএসসি'] },
  { id: 'class9', kind: 'class', labelEn: 'Class 9', labelBn: 'নবম শ্রেণি (Class 9)', aliases: ['class 9', 'নবম শ্রেণি', 'নবম শ্রেণী'] },
  { id: 'class10', kind: 'class', labelEn: 'Class 10', labelBn: 'দশম শ্রেণি (Class 10)', aliases: ['class 10', 'দশম শ্রেণি', 'দশম শ্রেণী'] },
];

/**
 * Fold text for exact entity matching while PRESERVING Bengali vowel signs (\p{M}),
 * so words like "সমাজবিজ্ঞান" are never split into "সম জব জঞ ন" and falsely matched against "জবি".
 */
function entityFold(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NORMALIZED_STRICT_ENTITIES = STRICT_ENTITIES.map((entity) => ({
  ...entity,
  normalizedAliases: Array.from(new Set(entity.aliases.map((a) => entityFold(a)).filter(Boolean))),
}));

function textMatchesAlias(foldedText: string, tokenSet: Set<string>, alias: string): boolean {
  if (alias.includes(' ')) {
    return ` ${foldedText} `.includes(` ${alias} `);
  }
  return tokenSet.has(alias);
}

function detectStrictEntities(query: string): typeof NORMALIZED_STRICT_ENTITIES {
  const folded = entityFold(query);
  if (!folded) return [];
  const tokenSet = new Set(folded.split(' '));
  return NORMALIZED_STRICT_ENTITIES.filter((entity) =>
    entity.normalizedAliases.some((alias) => textMatchesAlias(folded, tokenSet, alias)),
  );
}

function resourceMatchesEntity(
  resource: BotResource,
  entity: (typeof NORMALIZED_STRICT_ENTITIES)[number],
): boolean {
  const haystack = entityFold(
    `${resource.title} ${resource.filename ?? ''} ${resource.description ?? ''}`,
  );
  if (!haystack) return false;
  const tokenSet = new Set(haystack.split(' '));
  return entity.normalizedAliases.some((alias) => textMatchesAlias(haystack, tokenSet, alias));
}

function detectQueryLanguage(text: string): 'bn' | 'en' | 'banglish' {
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/\b(dao|lagbe|chai|er|ta|boi|proshno|kobir|tapan|topon|hazari|dagano)\b/i.test(text)) {
    return 'banglish';
  }
  return 'en';
}

function formatNotFoundReply(
  language: 'bn' | 'en' | 'banglish',
  missingEntity?: StrictEntityDef,
  hasRelated = false,
): string {
  if (missingEntity) {
    if (language === 'en') {
      return hasRelated
        ? `Sorry, exact "${missingEntity.labelEn}" PDF is not in @hscfreepdf yet, but you can check these related PDFs below:`
        : `Sorry, "${missingEntity.labelEn}" PDF is not available in @hscfreepdf right now.`;
    }
    if (language === 'banglish') {
      return hasRelated
        ? `Sorry, exact ${missingEntity.labelEn} er PDF ekhono @hscfreepdf channel e nai, tobe nicher related PDF gula dekhte paro:`
        : `Sorry, ${missingEntity.labelEn} er kono PDF ekhono @hscfreepdf channel e nai.`;
    }
    return hasRelated
      ? `দুঃখিত, সরাসরি ${missingEntity.labelBn}-এর PDF এখনো @hscfreepdf চ্যানেলে নেই, তবে নিচের কাছাকাছি PDF গুলো দেখতে পারো:`
      : `দুঃখিত, ${missingEntity.labelBn}-এর কোনো PDF এখনো @hscfreepdf চ্যানেলে নেই।`;
  }
  if (language === 'en') {
    return hasRelated
      ? 'Sorry, that exact PDF was not found in @hscfreepdf yet, but here are the closest related PDFs:'
      : 'Sorry, no matching PDF was found in @hscfreepdf for that request.';
  }
  if (language === 'banglish') {
    return hasRelated
      ? 'Sorry, exact ei PDF ta @hscfreepdf channel e pawa jayni, tobe nicher related PDF gula dekhte paro:'
      : 'Sorry, ei namer kono PDF @hscfreepdf channel e pawa jayni.';
  }
  return hasRelated
    ? 'দুঃখিত, সরাসরি এই PDF টি এখনো @hscfreepdf চ্যানেলে পাওয়া যায়নি, তবে নিচের কাছাকাছি PDF গুলো দেখতে পারো:'
    : 'দুঃখিত, এই নামে কোনো PDF এখনো @hscfreepdf চ্যানেলে পাওয়া যায়নি।';
}

/** Deduplication key for inline similar buttons so 4 identical-looking labels never stack. */
function buttonLabelKey(resource: BotResource): string {
  return normalizeText(resource.title).slice(0, 38);
}

const DOMAIN_GLOSSARY = `Domain context (@hscfreepdf — Bangladesh HSC, University Admission, Medical, Engineering, BCS PDF channel):
- Subjects: Physics (পদার্থবিজ্ঞান), Chemistry (রসায়ন), Biology (জীববিজ্ঞান / উদ্ভিদবিজ্ঞান / প্রাণিবিজ্ঞান), Higher Math (উচ্চতর গণিত), ICT (তথ্য ও যোগাযোগ প্রযুক্তি), Bangla (বাংলা), English (ইংরেজি), GK (সাধারণ জ্ঞান).
- Papers: "1st paper" = "১ম পত্র", "2nd paper" = "২য় পত্র".
- Popular HSC textbook/marked-book authors: Hazari / হাজারী (Chemistry), Kabir / কবির (Chemistry), Guha / গুহ (Chemistry), Ishaq / ইসহাক (Physics), Tapan / Topan / তপন (Physics), Pramanik / প্রামাণিক (Physics), Gazi Azmal / গাজী আজমল (Zoology), Abul Hasan / আবুল হাসান (Botany), Ketab Uddin / কেতাব উদ্দিন (Math), SU Ahmed / এস ইউ আহমেদ (Math), Mahbubur Rahman / মাহবুবুর রহমান (ICT).
- Common Banglish terms: "dagano boi" / "marked book" = দাগানো বই, "proshnobank" / "qb" = প্রশ্নব্যাংক / Question Bank, "test paper" = টেস্ট পেপার, "supplement" = সাপ্লিমেন্ট, "solution" = সল্যুশন, "digest" = ডাইজেস্ট, "compact" = কমপ্যাক্ট.
- Popular coaching/publishers: Udvash (উদ্ভাস), Unmesh (উন্মেষ), ACS (এসিএস), Retina (রেটিনা), Panjeree (পাঞ্জেরী), Joykoli (জয়কলি), Aspect (আসপেক্ট), Royal (রয়েল), Medico (মেডিকো), Alal (আলাল), Zobayer (জোবায়ের), Lecture (লেকচার).
- DISTINCT Universities / Exam Bodies (NEVER substitute one for another!): DU (ঢাবি), JnU (জবি / জগন্নাথ), JU (জাবি / জাহাঙ্গীরনগর), RU (রাবি / রাজশাহী), CU (চবি / চট্টগ্রাম), SUST (সাস্ট / শাহজালাল), HSTU (হাজী দানেশ), BUET, KUET, RUET, CUET, BUTEX, GST (গুচ্ছ), Agri Cluster (কৃষি গুচ্ছ), Medical, Dental, BCS.`;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function safeParseJson<T>(text: string | undefined): T | null {
  if (!text) return null;
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/**
 * Multi-query local candidate collector powered by the repo's existing lib/search.ts.
 * Always prioritizes PDFs and pulls in relatedResources so similar PDFs are available.
 */
export function collectCandidates(
  resources: BotResource[],
  queries: string[],
  preferPdfOnly: boolean,
  maxCandidates = 35,
): BotResource[] {
  const uniqueQueries = Array.from(
    new Set(queries.map((q) => q.trim()).filter((q) => q.length > 0)),
  );
  if (uniqueQueries.length === 0) return [];

  const pdfPool = resources.filter((r) => r.type === 'PDF');
  const scoreMap = new Map<string, RankedCandidate>();

  const addHit = (item: BotResource, score: number) => {
    const existing = scoreMap.get(item.id);
    if (existing) {
      // Multi-query match gets a mild boost over single-query score.
      existing.score = Math.max(existing.score, score) + Math.min(existing.score, score) * 0.25;
    } else {
      scoreMap.set(item.id, { resource: item, score });
    }
  };

  for (const query of uniqueQueries) {
    const primary = searchAll(resources, {
      query,
      typeFilter: preferPdfOnly ? 'PDF' : 'ALL',
      limit: 20,
    });
    for (const hit of primary.results) {
      const full = hit as BotResource;
      const pdfBonus = full.type === 'PDF' ? 1.15 : 0.85;
      addHit(full, hit.score * pdfBonus);
    }

    // If PDF-only returned very few items, also search all types (e.g., index/image posts).
    if (preferPdfOnly && primary.results.length < 5) {
      const broadened = searchAll(resources, {
        query,
        typeFilter: 'ALL',
        limit: 12,
      });
      for (const hit of broadened.results) {
        addHit(hit as BotResource, hit.score * 0.7);
      }
    }
  }

  const ranked = Array.from(scoreMap.values()).sort((a, b) => b.score - a.score);
  const selected: BotResource[] = [];
  const selectedIds = new Set<string>();

  for (const entry of ranked.slice(0, Math.min(25, maxCandidates))) {
    selected.push(entry.resource);
    selectedIds.add(entry.resource.id);
  }

  // Pull in locally related PDFs around the top 3 matches so AI has rich alternatives.
  const seedForRelated = selected.slice(0, 3);
  for (const anchor of seedForRelated) {
    if (selected.length >= maxCandidates) break;
    const related = relatedResources(anchor, preferPdfOnly ? pdfPool : resources, 8);
    for (const rel of related) {
      if (selected.length >= maxCandidates) break;
      if (selectedIds.has(rel.id)) continue;
      selectedIds.add(rel.id);
      selected.push(rel as BotResource);
    }
  }

  return selected;
}

function formatCandidateLine(item: BotResource): string {
  const filePart = item.filename ? ` | File: ${item.filename}` : '';
  return `ID:${item.id} | Type:${item.type} | Date:${item.date} | Cat:${item.category} | Title:${item.title}${filePart}`;
}

/** Graceful local fallback if GEMINI_API_KEY is unset or Gemini fails/rate-limits. */
export function fallbackLocalSearch(
  query: string,
  resources: BotResource[],
  maxSimilar: number,
): AiSearchDecision {
  const language = detectQueryLanguage(query);
  const strictEntities = detectStrictEntities(query);
  let missingEntity: StrictEntityDef | undefined;
  let pool = resources;

  if (strictEntities.length > 0) {
    const entityFiltered = resources.filter((r) =>
      strictEntities.every((entity) => resourceMatchesEntity(r, entity)),
    );
    if (entityFiltered.length === 0) {
      missingEntity = strictEntities[0];
      // For missing school classes (e.g. Class 8), don't show unrelated HSC/Admission PDFs.
      if (missingEntity.kind === 'class') {
        return {
          isPdfRequest: true,
          bestMatchId: null,
          similarIds: [],
          replyText: formatNotFoundReply(language, missingEntity, false),
          usedAi: false,
          candidatesChecked: 0,
          expandedQueries: [query],
        };
      }
      // For missing universities, fall through to find genuinely related admission/QB PDFs
      // ONLY as similarIds (bestMatchId MUST remain null!).
    } else {
      pool = entityFiltered;
    }
  }

  const pdfResults = searchAll(pool, { query, typeFilter: 'PDF', limit: maxSimilar + 8 });
  const hits =
    pdfResults.results.length > 0
      ? pdfResults.results
      : searchAll(pool, { query, typeFilter: 'ALL', limit: maxSimilar + 8 }).results;

  if (hits.length === 0) {
    return {
      isPdfRequest: true,
      bestMatchId: null,
      similarIds: [],
      replyText: formatNotFoundReply(language, missingEntity, false),
      usedAi: false,
      candidatesChecked: 0,
      expandedQueries: [query],
    };
  }

  const similarIds: string[] = [];
  const usedIds = new Set<string>();
  const usedLabels = new Set<string>();

  const tryAddSimilar = (item: BotResource) => {
    if (similarIds.length >= maxSimilar) return;
    if (usedIds.has(item.id)) return;
    const labelKey = buttonLabelKey(item);
    if (labelKey && usedLabels.has(labelKey)) return;
    usedIds.add(item.id);
    if (labelKey) usedLabels.add(labelKey);
    similarIds.push(item.id);
  };

  if (missingEntity) {
    for (const hit of hits) {
      tryAddSimilar(hit as BotResource);
    }
    return {
      isPdfRequest: true,
      bestMatchId: null,
      similarIds,
      replyText: formatNotFoundReply(language, missingEntity, similarIds.length > 0),
      usedAi: false,
      candidatesChecked: hits.length,
      expandedQueries: [query],
    };
  }

  const best = hits[0] as BotResource;
  usedIds.add(best.id);
  usedLabels.add(buttonLabelKey(best));

  for (const hit of hits.slice(1)) {
    tryAddSimilar(hit as BotResource);
  }

  if (similarIds.length < maxSimilar) {
    const pdfPool = pool.filter((r) => r.type === 'PDF');
    for (const rel of relatedResources(best, pdfPool, maxSimilar + 4)) {
      tryAddSimilar(rel as BotResource);
    }
  }

  return {
    isPdfRequest: true,
    bestMatchId: best.id,
    similarIds,
    replyText: `সর্বোত্তম মিল: ${best.title}`,
    usedAi: false,
    candidatesChecked: hits.length,
    expandedQueries: [query],
  };
}

const DEFAULT_FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

export class PdfAiEngine {
  private readonly ai: GoogleGenAI | null;
  private readonly models: string[];
  private readonly maxSimilarButtons: number;

  constructor(config: BotConfig) {
    this.models = Array.from(new Set([config.geminiModel, ...DEFAULT_FALLBACK_MODELS]));
    this.maxSimilarButtons = config.maxSimilarButtons;
    this.ai = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;
  }

  isEnabled(): boolean {
    return this.ai !== null;
  }

  private async generateJson(
    prompt: string,
    config: {
      temperature: number;
      responseSchema: Record<string, unknown>;
    },
    label: string,
  ): Promise<string | undefined> {
    if (!this.ai) return undefined;
    let lastError: unknown;

    for (const model of this.models) {
      try {
        const response = await withTimeout(
          this.ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: config.temperature,
              responseMimeType: 'application/json',
              responseSchema: config.responseSchema,
              abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
            },
          }),
          GEMINI_TIMEOUT_MS + 1000,
          `${label} (${model})`,
        );
        return response.text;
      } catch (err) {
        lastError = err;
        const status = (err as { status?: number })?.status;
        const isTimeout =
          err instanceof Error &&
          (err.name === 'TimeoutError' ||
            err.name === 'AbortError' ||
            err.message.includes('timed out'));
        // Fail over to next model on transient overload / timeout / quota / unavailable model.
        if (isTimeout || status === 503 || status === 429 || status === 404 || status === 500) {
          console.warn(`[AI] ${model} failed (${status ?? 'timeout'}), trying next fallback model...`);
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  /** Stage 1: Understand natural Bangla/Banglish/English message and expand search queries. */
  private async planQuery(
    userQuery: string,
    replyContext?: ConversationContext,
  ): Promise<AiQueryPlan | null> {
    if (!this.ai) return null;

    const contextBlock = replyContext
      ? `\nPrevious bot search context the user is replying to:
- Previous query: "${replyContext.userQuery}"
- Previous top PDF: "${replyContext.bestMatchTitle ?? 'none'}"
- Previous similar PDFs: ${replyContext.similarTitles.join(' ; ') || 'none'}`
      : '';

    const prompt = `You are the search planner for the @hscfreepdf Telegram PDF bot.
${DOMAIN_GLOSSARY}
${contextBlock}

User message: "${userQuery}"

Tasks:
1. Decide if the user is looking for a study PDF / book / class / question bank / guide / supplement / APK / resource (isPdfRequest=true), or just greeting/chatting without requesting any resource (isPdfRequest=false). Note: short messages naming a class, subject, university, or book (e.g. "Class 8", "Physics", "JnU") ARE resource requests (isPdfRequest=true).
2. If isPdfRequest=false, provide a short, friendly chatReply (1 sentence in the user's language) reminding them to search with /pdf <book name>.
3. If isPdfRequest=true, generate 2 to 4 concise searchQueries mixing Bangla and English keywords:
   - First 2-3 queries MUST target the EXACT requested book/university/author/subject.
   - Add 1 broader related-category query (e.g. if user asks for a university A-unit question bank, include "varsity A unit question bank" or "university question bank") so related PDFs can be suggested ONLY IF the exact one is missing.
   - If the user is replying to a previous search (e.g. "1st paper ta dao" or "similar aro dao"), combine with the previous context.
4. Set preferPdfOnly=true unless the user explicitly asks for an app/APK, image, notice, or result.
5. Detect user language: "bn" (Bengali script), "banglish" (Bengali written in Latin letters), or "en" (English).`;

    const text = await this.generateJson(
      prompt,
      {
        temperature: 0.1,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isPdfRequest: { type: Type.BOOLEAN },
            searchQueries: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            preferPdfOnly: { type: Type.BOOLEAN },
            language: {
              type: Type.STRING,
              enum: ['bn', 'en', 'banglish'],
            },
            chatReply: { type: Type.STRING },
          },
          required: ['isPdfRequest', 'searchQueries', 'preferPdfOnly', 'language'],
        },
      },
      'Gemini Stage 1',
    );

    return safeParseJson<AiQueryPlan>(text);
  }

  /** Stage 2: Select exact match + best similar PDFs from verified candidate list. */
  private async rankCandidates(
    userQuery: string,
    plan: AiQueryPlan,
    candidates: BotResource[],
    replyContext?: ConversationContext,
    missingEntity?: StrictEntityDef,
  ): Promise<{
    matchQuality: 'exact' | 'close' | 'none';
    bestMatchId: string | null;
    similarIds: string[];
    replyText: string;
  } | null> {
    if (!this.ai) return null;

    const catalog = candidates.map(formatCandidateLine).join('\n');
    const contextHint = replyContext
      ? `\nThe user is replying to a previous result: "${replyContext.bestMatchTitle ?? replyContext.userQuery}".`
      : '';
    const missingHint = missingEntity
      ? `\nIMPORTANT VERIFIED FACT: There is NO post for "${missingEntity.labelEn}" in @hscfreepdf right now. Therefore you MUST set bestMatchId="" and matchQuality="close" (if genuinely useful related PDFs exist below) or "none" (if none are relevant). Clearly tell the user "${missingEntity.labelEn}" is not available yet, and offer the best related PDFs in similarIds!`
      : '';

    const prompt = `You are the strict, honest AI librarian for the @hscfreepdf Telegram group.
${DOMAIN_GLOSSARY}
${contextHint}
${missingHint}

User request: "${userQuery}"
User language: ${plan.language}

Candidate posts from @hscfreepdf (ONLY pick IDs from this exact list; NEVER invent an ID):
${catalog}

STRICT MATCHING RULES (FOLLOW EXACTLY):
1. First decide "matchQuality":
   - "exact": A candidate GENUINELY matches the user's requested book, subject, author/coaching (if specified), and university/exam/class (if specified).
   - "close": The exact requested university, author, edition, or book is NOT in the list, BUT there are genuinely useful related PDFs in the same study/exam category (e.g. user asked for JnU or HSTU question bank and it's not available → offer Varsity 'Ka' / GST / University Master Question Banks in similarIds; or user asked for Ketab Uddin Math and SU Ahmed Math is available). Set bestMatchId="" and put up to ${this.maxSimilarButtons} DISTINCT related PDFs in similarIds!
   - "none": The request is completely outside the channel's content (e.g. fiction novels like Harry Potter, Class 6-8 school books, non-study requests) and NO candidates are meaningfully helpful. Set bestMatchId="" and similarIds=[].
2. NEVER FAKE AN EXACT MATCH:
   - NEVER substitute one university for another as bestMatchId (JnU ≠ GST/SUST/Varsity Master QB; HSTU ≠ GST/SUST/Varsity Master QB).
   - If the requested PDF is NOT directly in the list, bestMatchId MUST be "" (empty string) — NEVER put a substitute PDF into bestMatchId! Put helpful alternatives in similarIds instead!
   - Avoid picking multiple duplicate posts of the same book in similarIds; pick distinct, varied helpful PDFs (prefer Type:PDF).
3. When matchQuality="exact":
   - Pick "bestMatchId": the SINGLE best matching post ID (prefer Type:PDF and newest edition/year unless an older year was requested).
   - Pick "similarIds": up to ${this.maxSimilarButtons} genuinely useful, DISTINCT alternatives. Never include bestMatchId in similarIds.
4. Write "replyText": 1-2 short, clear, honest sentences in the user's language (${plan.language}).
   - If matchQuality="exact": briefly confirm the exact PDF found.
   - If matchQuality="close": clearly say that the exact requested PDF is NOT available in @hscfreepdf yet, and invite them to check the related PDFs below.
   - If matchQuality="none": clearly and politely say that this PDF is not available in @hscfreepdf.`;

    const text = await this.generateJson(
      prompt,
      {
        temperature: 0.1,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchQuality: {
              type: Type.STRING,
              enum: ['exact', 'close', 'none'],
            },
            bestMatchId: { type: Type.STRING },
            similarIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            replyText: { type: Type.STRING },
          },
          required: ['matchQuality', 'bestMatchId', 'similarIds', 'replyText'],
        },
      },
      'Gemini Stage 2',
    );

    const parsed = safeParseJson<{
      matchQuality?: 'exact' | 'close' | 'none';
      bestMatchId?: string;
      similarIds?: string[];
      replyText?: string;
    }>(text);
    if (!parsed) return null;

    let matchQuality: 'exact' | 'close' | 'none' =
      parsed.matchQuality === 'exact' || parsed.matchQuality === 'close' || parsed.matchQuality === 'none'
        ? parsed.matchQuality
        : parsed.bestMatchId?.trim()
          ? 'exact'
          : 'none';

    // Hard guarantee: if the requested university/entity doesn't exist in index, NEVER allow exact/bestMatchId.
    if (missingEntity && matchQuality === 'exact') {
      matchQuality = 'close';
    }

    return {
      matchQuality,
      bestMatchId: !missingEntity && matchQuality === 'exact' ? parsed.bestMatchId?.trim() || null : null,
      similarIds:
        matchQuality === 'none'
          ? []
          : Array.isArray(parsed.similarIds)
            ? parsed.similarIds.map((s) => String(s).trim())
            : [],
      replyText: parsed.replyText?.trim() || '',
    };
  }

  /** End-to-end 2-stage AI + local hybrid search with automatic fallback. */
  async search(
    userQuery: string,
    resources: BotResource[],
    replyContext?: ConversationContext,
  ): Promise<AiSearchDecision> {
    const trimmed = userQuery.trim();
    if (!trimmed) {
      return {
        isPdfRequest: false,
        bestMatchId: null,
        similarIds: [],
        replyText: 'কোন বই বা PDF খুঁজছো? এভাবে লেখো: /pdf তপন স্যার পদার্থবিজ্ঞান ২য় পত্র',
        usedAi: false,
        candidatesChecked: 0,
        expandedQueries: [],
      };
    }

    // Deterministic entity check:
    // - If a requested school class (e.g. Class 8) has 0 posts, return clean "Not Found" immediately.
    // - If a requested university (e.g. JnU, HSTU) has 0 posts, mark missingEntity so bestMatchId is
    //   strictly forced to null ("not found"), while still searching the full index for related PDFs!
    // - If the requested university DOES have posts, scope candidate search to those posts first.
    const strictEntities = detectStrictEntities(trimmed);
    let missingEntity: StrictEntityDef | undefined;
    let searchPool = resources;

    if (strictEntities.length > 0) {
      const entityMatches = resources.filter((r) =>
        strictEntities.every((entity) => resourceMatchesEntity(r, entity)),
      );
      if (entityMatches.length === 0) {
        missingEntity = strictEntities[0];
        if (missingEntity.kind === 'class') {
          return {
            isPdfRequest: true,
            bestMatchId: null,
            similarIds: [],
            replyText: formatNotFoundReply(detectQueryLanguage(trimmed), missingEntity, false),
            usedAi: false,
            candidatesChecked: 0,
            expandedQueries: [trimmed],
          };
        }
      } else {
        searchPool = entityMatches;
      }
    }

    if (!this.ai) {
      return fallbackLocalSearch(trimmed, resources, this.maxSimilarButtons);
    }

    try {
      const plan = await this.planQuery(trimmed, replyContext);
      if (!plan) {
        return fallbackLocalSearch(trimmed, resources, this.maxSimilarButtons);
      }

      if (!plan.isPdfRequest) {
        return {
          isPdfRequest: false,
          bestMatchId: null,
          similarIds: [],
          replyText:
            plan.chatReply?.trim() ||
            'হ্যালো! কোনো PDF খুঁজতে চাইলে `/pdf বইয়ের নাম` লিখে পাঠাও।',
          usedAi: true,
          candidatesChecked: 0,
          expandedQueries: [],
        };
      }

      const expandedQueries = Array.from(
        new Set([trimmed, ...plan.searchQueries.map((q) => q.trim()).filter(Boolean)]),
      ).slice(0, 5);

      const candidates = collectCandidates(searchPool, expandedQueries, plan.preferPdfOnly, 35);
      if (candidates.length === 0) {
        return {
          isPdfRequest: true,
          bestMatchId: null,
          similarIds: [],
          replyText: formatNotFoundReply(plan.language, missingEntity, false),
          usedAi: true,
          candidatesChecked: 0,
          expandedQueries,
        };
      }

      const candidateMap = new Map(candidates.map((c) => [c.id, c]));
      const ranked = await this.rankCandidates(
        trimmed,
        plan,
        candidates,
        replyContext,
        missingEntity,
      );
      if (!ranked) {
        return fallbackLocalSearch(expandedQueries[0], resources, this.maxSimilarButtons);
      }

      if (ranked.matchQuality === 'none') {
        return {
          isPdfRequest: true,
          bestMatchId: null,
          similarIds: [],
          replyText: ranked.replyText || formatNotFoundReply(plan.language, missingEntity, false),
          usedAi: true,
          candidatesChecked: candidates.length,
          expandedQueries,
        };
      }

      // Hallucination guard: accept ONLY IDs verified to exist in candidateMap.
      const bestMatchId =
        !missingEntity && ranked.bestMatchId && candidateMap.has(ranked.bestMatchId)
          ? ranked.bestMatchId
          : null;

      const validSimilar: string[] = [];
      const seenIds = new Set<string>(bestMatchId ? [bestMatchId] : []);
      const seenLabels = new Set<string>(
        bestMatchId && candidateMap.has(bestMatchId)
          ? [buttonLabelKey(candidateMap.get(bestMatchId)!)]
          : [],
      );

      const tryAddSimilar = (item: BotResource | undefined) => {
        if (!item || validSimilar.length >= this.maxSimilarButtons) return;
        if (seenIds.has(item.id)) return;
        const labelKey = buttonLabelKey(item);
        if (labelKey && seenLabels.has(labelKey)) return;
        seenIds.add(item.id);
        if (labelKey) seenLabels.add(labelKey);
        validSimilar.push(item.id);
      };

      for (const id of ranked.similarIds) {
        tryAddSimilar(candidateMap.get(id));
      }

      // Backfill similar PDFs locally if we had an exact match and fewer than 3 alternatives,
      // OR if a requested university was missing and AI returned 0 similarIds despite candidates existing.
      if (bestMatchId && validSimilar.length < Math.min(3, this.maxSimilarButtons)) {
        const anchor = candidateMap.get(bestMatchId);
        if (anchor) {
          const pdfPool = searchPool.filter((r) => r.type === 'PDF');
          for (const rel of relatedResources(anchor, pdfPool, this.maxSimilarButtons + 4)) {
            tryAddSimilar(rel as BotResource);
          }
        }
      } else if (missingEntity && validSimilar.length === 0) {
        for (const cand of candidates) {
          if (cand.type === 'PDF') tryAddSimilar(cand);
        }
      }

      return {
        isPdfRequest: true,
        bestMatchId,
        similarIds: validSimilar,
        replyText:
          ranked.replyText ||
          (bestMatchId
            ? `পাওয়া গেছে: ${candidateMap.get(bestMatchId)?.title}`
            : formatNotFoundReply(plan.language, missingEntity, validSimilar.length > 0)),
        usedAi: true,
        candidatesChecked: candidates.length,
        expandedQueries,
      };
    } catch (err) {
      console.error('[AI] Gemini error — falling back to local search:', err);
      return fallbackLocalSearch(trimmed, resources, this.maxSimilarButtons);
    }
  }
}
