/**
 * Client-side search engine for the HSCFreePDF library.
 *
 * Scoring uses each resource's PRE-COMPUTED tokens (`Resource.searchTokens`), which
 * already contain the normalised title tokens plus synthetic concept tokens
 * (tcchemistry, tcmedical, tccurrentaffairs, …). That is what lets "chemistry 2",
 * "রসায়ন ২য়" and "Current Affairs" all reach the same resources.
 *
 * Weights: exact title >> prefix >> phrase >> token >> concept >> year >> prefix/fuzzy.
 * Recency is only a small tie-breaker, so promotional text can never dominate.
 */

import type { Resource, ResourceCategory, ResourceType, SortKey } from './types.ts';
import { conceptTokensFor, isStopToken, normalizeText, tokenize } from './text.ts';

export interface SearchInput {
  query: string;
  typeFilter?: ResourceType | 'ALL';
  categoryFilter?: ResourceCategory | 'ALL';
  sort?: SortKey;
  limit?: number;
}

export interface ScoredResource extends Resource {
  score: number;
  matchedTokens: string[];
}

export interface SearchResult {
  total: number;
  results: ScoredResource[];
  didYouMean: string;
  query: string;
}

const W = {
  exactTitle: 12000,
  titlePrefix: 6000,
  titlePhrase: 4000,
  token: 900,
  concept: 1100,
  year: 600,
  prefix: 250,
  fuzzy: 100,
};

function recencyRatio(resource: Resource): number {
  const [y, m, d] = resource.date.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const t = Date.UTC(y, m - 1, d);
  const min = Date.UTC(2024, 0, 1);
  const max = Date.UTC(2027, 0, 1);
  return Math.max(0, Math.min(1, (t - min) / (max - min)));
}

function isOneEditApart(a: string, b: string): boolean {
  if (a === b) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return true;
}

export function searchAll(resources: Resource[], input: SearchInput): SearchResult {
  const typeFilter = input.typeFilter ?? 'ALL';
  const categoryFilter = input.categoryFilter ?? 'ALL';
  const sort = input.sort ?? 'relevance';
  const limit = Math.min(500, Math.max(1, input.limit ?? 120));

  const rawQuery = (input.query ?? '').trim();
  const query = normalizeText(rawQuery);
  const queryTokens = tokenize(query);
  const meaningful = queryTokens.filter((token) => token.length > 1 && !isStopToken(token));
  const queryConcepts = query.length > 0 ? conceptTokensFor(query, queryTokens) : [];

  const scored: ScoredResource[] = [];

  for (const resource of resources) {
    if (typeFilter !== 'ALL' && resource.type !== typeFilter) continue;
    if (categoryFilter !== 'ALL' && !resource.categories.includes(categoryFilter)) continue;

    if (query.length === 0) {
      scored.push({ ...resource, score: recencyRatio(resource) * 10, matchedTokens: [] });
      continue;
    }

    const tokenSet = new Set(resource.searchTokens);
    const title = resource.normalizedTitle;
    const yearSet = new Set(resource.years);

    let score = 0;
    const matched: string[] = [];

    if (title === query) score += W.exactTitle;
    else if (title.startsWith(query) && query.length >= 3) score += W.titlePrefix;
    else if (title.includes(query) && query.length >= 3) score += W.titlePhrase;

    let tokenHits = 0;
    for (const token of meaningful) {
      if (tokenSet.has(token)) {
        score += W.token;
        tokenHits += 1;
        matched.push(token);
        continue;
      }
      if (yearSet.has(token)) {
        score += W.year;
        tokenHits += 1;
        matched.push(token);
        continue;
      }
      if (token.length >= 3) {
        let prefixHit = false;
        for (const candidate of tokenSet) {
          if (candidate.startsWith(token) || token.startsWith(candidate)) {
            prefixHit = true;
            break;
          }
        }
        if (prefixHit) {
          score += W.prefix;
          tokenHits += 1;
          matched.push(token);
          continue;
        }
        if (token.length >= 5) {
          for (const candidate of tokenSet) {
            if (isOneEditApart(token, candidate)) {
              score += W.fuzzy;
              tokenHits += 1;
              matched.push(token);
              break;
            }
          }
        }
      }
    }

    let conceptHits = 0;
    for (const conceptToken of queryConcepts) {
      if (tokenSet.has(conceptToken)) {
        score += W.concept;
        conceptHits += 1;
        matched.push(conceptToken);
      }
    }

    if (score === 0) continue;

    const denominator = Math.max(1, meaningful.length + queryConcepts.length * 0.5);
    const coverage = Math.min(1, (tokenHits + conceptHits * 0.5) / denominator);
    score *= 0.35 + 0.65 * coverage;
    score += recencyRatio(resource) * 6;

    scored.push({ ...resource, score, matchedTokens: matched });
  }

  const total = scored.length;

  if (sort === 'newest') {
    scored.sort((a, b) => (a.date === b.date ? Number(b.id) - Number(a.id) : a.date < b.date ? 1 : -1));
  } else if (sort === 'oldest') {
    scored.sort((a, b) => (a.date === b.date ? Number(a.id) - Number(b.id) : a.date < b.date ? -1 : 1));
  } else {
    scored.sort((a, b) => b.score - a.score || Number(b.id) - Number(a.id));
  }

  const results = scored.slice(0, limit);

  return {
    total,
    results,
    didYouMean: suggest(query, results),
    query,
  };
}

/**
 * "Did you mean" — only appears when the query looks like a typo or abbreviation of a
 * clearly better title, never when the match is already strong.
 */
function suggest(query: string, results: ScoredResource[]): string {
  if (!query || query.length < 4 || results.length === 0) return '';
  const top = results[0];
  if (top.score >= W.titlePrefix) return '';

  const queryTokens = tokenize(query).filter((token) => token.length >= 2);
  if (queryTokens.length === 0) return '';
  const titleTokens = new Set(tokenize(top.normalizedTitle));

  let overlapping = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      overlapping += 1;
      continue;
    }
    for (const candidate of titleTokens) {
      if (candidate.startsWith(token) || isOneEditApart(token, candidate)) {
        overlapping += 1;
        break;
      }
    }
  }

  if (overlapping / queryTokens.length < 0.5) return '';
  return `Did you mean: ${top.title}`;
}

/** Related resources for the detail modal — local similarity only, no API. */
export function relatedResources(resource: Resource, all: Resource[], count = 6): Resource[] {
  const ownTokens = new Set(resource.searchTokens.filter((token) => token.length >= 3 && !isStopToken(token)));
  const ownCategories = new Set(resource.categories);
  const scored: Array<{ id: string; score: number }> = [];

  for (const candidate of all) {
    if (candidate.id === resource.id) continue;
    let score = 0;
    if (ownCategories.has(candidate.category)) score += 40;
    for (const category of candidate.categories) {
      if (ownCategories.has(category)) score += 10;
    }
    for (const token of candidate.searchTokens) {
      if (ownTokens.has(token)) score += 12;
    }
    if (score > 0) scored.push({ id: candidate.id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const byId = new Map(all.map((item) => [item.id, item]));

  return scored
    .slice(0, count)
    .map((entry) => byId.get(entry.id))
    .filter((item): item is Resource => Boolean(item));
}