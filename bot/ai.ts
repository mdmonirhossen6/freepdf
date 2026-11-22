import { GoogleGenAI, Type } from '@google/genai';

import { relatedResources, searchAll } from '../lib/search.ts';
import type { BotConfig } from './config.ts';
import type { AiQueryPlan, AiSearchDecision, BotResource, ConversationContext } from './types.ts';

const GEMINI_TIMEOUT_MS = 12_000;

interface RankedCandidate {
  resource: BotResource;
  score: number;
}

const DOMAIN_GLOSSARY = `Domain context (@hscfreepdf — Bangladesh HSC, University Admission, Medical, Engineering, BCS PDF channel):
- Subjects: Physics (পদার্থবিজ্ঞান), Chemistry (রসায়ন), Biology (জীববিজ্ঞান / উদ্ভিদবিজ্ঞান / প্রাণিবিজ্ঞান), Higher Math (উচ্চতর গণিত), ICT (তথ্য ও যোগাযোগ প্রযুক্তি), Bangla (বাংলা), English (ইংরেজি), GK (সাধারণ জ্ঞান).
- Papers: "1st paper" = "১ম পত্র", "2nd paper" = "২য় পত্র".
- Popular HSC textbook/marked-book authors: Hazari / হাজারী (Chemistry), Kabir / কবির (Chemistry), Guha / গুহ (Chemistry), Ishaq / ইসহাক (Physics), Tapan / Topan / তপন (Physics), Pramanik / প্রামাণিক (Physics), Gazi Azmal / গাজী আজমল (Zoology), Abul Hasan / আবুল হাসান (Botany), Ketab Uddin / কেতাব উদ্দিন (Math), SU Ahmed / এস ইউ আহমেদ (Math), Mahbubur Rahman / মাহবুবুর রহমান (ICT).
- Common Banglish terms: "dagano boi" / "marked book" = দাগানো বই, "proshnobank" / "qb" = প্রশ্নব্যাংক / Question Bank, "test paper" = টেস্ট পেপার, "supplement" = সাপ্লিমেন্ট, "solution" = সল্যুশন, "digest" = ডাইজেস্ট, "compact" = কমপ্যাক্ট.
- Popular coaching/publishers: Udvash (উদ্ভাস), Unmesh (উন্মেষ), ACS (এসিএস), Retina (রেটিনা), Panjeree (পাঞ্জেরী), Joykoli (জয়কলি), Aspect (আসপেক্ট), Royal (রয়েল), Medico (মেডিকো), Alal (আলাল), Zobayer (জোবায়ের), Lecture (লেকচার).`;

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
  const pdfResults = searchAll(resources, { query, typeFilter: 'PDF', limit: maxSimilar + 3 });
  const hits =
    pdfResults.results.length > 0
      ? pdfResults.results
      : searchAll(resources, { query, typeFilter: 'ALL', limit: maxSimilar + 3 }).results;

  if (hits.length === 0) {
    return {
      isPdfRequest: true,
      bestMatchId: null,
      similarIds: [],
      replyText:
        'এই নামে কোনো PDF চ্যানেলে খুঁজে পাওয়া যায়নি। অন্যভাবে লিখে (যেমন লেখক বা বিষয়ের নাম দিয়ে) আবার চেষ্টা করো।',
      usedAi: false,
      candidatesChecked: 0,
      expandedQueries: [query],
    };
  }

  const best = hits[0];
  const similarIds: string[] = [];
  const used = new Set<string>([best.id]);

  for (const hit of hits.slice(1)) {
    if (similarIds.length >= maxSimilar) break;
    if (!used.has(hit.id)) {
      used.add(hit.id);
      similarIds.push(hit.id);
    }
  }

  if (similarIds.length < maxSimilar) {
    const pdfPool = resources.filter((r) => r.type === 'PDF');
    for (const rel of relatedResources(best, pdfPool, maxSimilar + 2)) {
      if (similarIds.length >= maxSimilar) break;
      if (!used.has(rel.id)) {
        used.add(rel.id);
        similarIds.push(rel.id);
      }
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
1. Decide if the user is looking for a study PDF / book / question bank / guide / supplement / APK / resource (isPdfRequest=true), or just greeting/chatting without requesting any resource (isPdfRequest=false).
2. If isPdfRequest=false, provide a short, friendly chatReply (1 sentence in the user's language) reminding them to search with /pdf <book name>.
3. If isPdfRequest=true, generate 2 to 4 concise searchQueries mixing Bangla and English keywords (include author, subject, paper number, edition/year, or coaching brand if mentioned, plus 1 broader fallback query for similar books). If the user is replying to a previous search (e.g. "1st paper ta dao" or "similar aro dao"), combine with the previous context!
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
  ): Promise<{ bestMatchId: string | null; similarIds: string[]; replyText: string } | null> {
    if (!this.ai) return null;

    const catalog = candidates.map(formatCandidateLine).join('\n');
    const contextHint = replyContext
      ? `\nThe user is replying to a previous result: "${replyContext.bestMatchTitle ?? replyContext.userQuery}".`
      : '';

    const prompt = `You are the helpful AI librarian for the @hscfreepdf Telegram group.
${DOMAIN_GLOSSARY}
${contextHint}

User request: "${userQuery}"
User language: ${plan.language}

Candidate posts from @hscfreepdf (ONLY pick IDs from this exact list; NEVER invent an ID):
${catalog}

Instructions:
1. Pick "bestMatchId": the SINGLE best matching post ID for what the user wants.
   - Strongly prefer Type:PDF over Type:Image or Type:Text when a PDF post exists for the same book.
   - Prefer the newest edition/year unless the user requested a specific older year.
   - If the user asked for a specific author/paper/book and NONE of the candidates actually match it closely, set bestMatchId to "" (empty string) and put the closest helpful alternatives in similarIds instead!
2. Pick "similarIds": up to ${this.maxSimilarButtons} genuinely useful alternative or related PDFs (prefer Type:PDF) — e.g., other authors of the same subject/paper, companion 1st/2nd paper, newer/older edition, or related question bank/supplement. Never include bestMatchId in similarIds.
3. Write "replyText": 1-2 short, friendly sentences matching the user's language (${plan.language}).
   - If bestMatchId is found, briefly name the book found.
   - If bestMatchId is empty, politely say that exact PDF wasn't found in @hscfreepdf yet and point to the similar PDFs below.`;

    const text = await this.generateJson(
      prompt,
      {
        temperature: 0.15,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestMatchId: { type: Type.STRING },
            similarIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            replyText: { type: Type.STRING },
          },
          required: ['bestMatchId', 'similarIds', 'replyText'],
        },
      },
      'Gemini Stage 2',
    );

    const parsed = safeParseJson<{
      bestMatchId?: string;
      similarIds?: string[];
      replyText?: string;
    }>(text);
    if (!parsed) return null;

    return {
      bestMatchId: parsed.bestMatchId?.trim() || null,
      similarIds: Array.isArray(parsed.similarIds) ? parsed.similarIds.map((s) => String(s).trim()) : [],
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

      const candidates = collectCandidates(resources, expandedQueries, plan.preferPdfOnly, 35);
      if (candidates.length === 0) {
        return {
          isPdfRequest: true,
          bestMatchId: null,
          similarIds: [],
          replyText:
            plan.language === 'en'
              ? 'Sorry, I could not find any matching PDF in @hscfreepdf. Try another keyword or author name.'
              : 'দুঃখিত, এই নামে কোনো PDF @hscfreepdf চ্যানেলে পাওয়া যায়নি। অন্য কীওয়ার্ড বা লেখকের নাম দিয়ে আবার চেষ্টা করো।',
          usedAi: true,
          candidatesChecked: 0,
          expandedQueries,
        };
      }

      const candidateMap = new Map(candidates.map((c) => [c.id, c]));
      const ranked = await this.rankCandidates(trimmed, plan, candidates, replyContext);
      if (!ranked) {
        return fallbackLocalSearch(expandedQueries[0], resources, this.maxSimilarButtons);
      }

      // Hallucination guard: accept ONLY IDs verified to exist in candidateMap.
      const bestMatchId =
        ranked.bestMatchId && candidateMap.has(ranked.bestMatchId) ? ranked.bestMatchId : null;

      const validSimilar: string[] = [];
      const seen = new Set<string>(bestMatchId ? [bestMatchId] : []);
      for (const id of ranked.similarIds) {
        if (validSimilar.length >= this.maxSimilarButtons) break;
        if (!seen.has(id) && candidateMap.has(id)) {
          seen.add(id);
          validSimilar.push(id);
        }
      }

      // Backfill similar PDFs locally if AI returned fewer than 3 alternatives.
      if (bestMatchId && validSimilar.length < Math.min(3, this.maxSimilarButtons)) {
        const anchor = candidateMap.get(bestMatchId);
        if (anchor) {
          const pdfPool = resources.filter((r) => r.type === 'PDF');
          for (const rel of relatedResources(anchor, pdfPool, this.maxSimilarButtons + 2)) {
            if (validSimilar.length >= this.maxSimilarButtons) break;
            if (!seen.has(rel.id)) {
              seen.add(rel.id);
              validSimilar.push(rel.id);
            }
          }
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
            : 'সঠিক বইটি পাওয়া যায়নি, নিচের কাছাকাছি PDF গুলো দেখতে পারো:'),
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
