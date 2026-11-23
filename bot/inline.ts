import { InlineKeyboard, type Bot } from 'grammy';
import type { InlineQueryResultArticle } from 'grammy/types';

import { searchAll } from '../lib/search.ts';
import type { BotConfig } from './config.ts';
import type { BotStateStore, PromoConfig } from './state.ts';
import type { ResourceStore } from './store.ts';
import type { BotResource } from './types.ts';

const PAGE_SIZE = 15;

/** Common Banglish -> Bangla/English equivalents so instant inline search nails typos. */
const BANGLISH_EXPANSIONS: Array<[RegExp, string]> = [
  [/\b(topon|topan|tapan)\b/gi, 'তপন tapan'],
  [/\b(hazari|hajari|hajar)\b/gi, 'হাজারী hazari'],
  [/\b(ishak|ishaq|eshak|ishaque)\b/gi, 'ইসহাক ishaq'],
  [/\b(pramanik|pramonik|promanik)\b/gi, 'প্রামাণিক pramanik'],
  [/\b(kabir|kobir)\b/gi, 'কবির kabir'],
  [/\b(guha|guho)\b/gi, 'গুহ guha'],
  [/\b(azmal|ajmal|gazi)\b/gi, 'আজমল গাজী azmal'],
  [/\b(hasan|abul)\b/gi, 'হাসান আবুল hasan'],
  [/\b(ketab|kitab)\b/gi, 'কেতাব ketab'],
  [/\b(mahbub|mahbubur)\b/gi, 'মাহবুবুর mahbubur'],
  [/\b(dagano|daganoo|marked)\b/gi, 'দাগানো marked'],
  [/\b(proshnobank|proshno|qb)\b/gi, 'প্রশ্নব্যাংক question bank'],
  [/\b(podartho|podarthobiggan|phy)\b/gi, 'পদার্থবিজ্ঞান physics'],
  [/\b(rosayon|roshayan|roshayon|chem)\b/gi, 'রসায়ন chemistry'],
  [/\b(jibbiggan|jibobiggan|bio)\b/gi, 'জীববিজ্ঞান biology'],
  [/\b(gonit|gonith)\b/gi, 'গণিত math'],
  [/\b(udvash|udbhash)\b/gi, 'উদ্ভাস udvash'],
  [/\b(unmesh|unmosh)\b/gi, 'উন্মেষ unmesh'],
  [/\b(panjeree|panjeri|panjiri)\b/gi, 'পাঞ্জেরী panjeree'],
  [/\b(joykoli|joykali)\b/gi, 'জয়কলি joykoli'],
  [/\b(zobayer|jobayer|jubayer)\b/gi, 'জোবায়ের zobayer'],
  [/\b(alal|alals)\b/gi, 'আলাল alal'],
  [/\b(retina)\b/gi, 'রেটিনা retina'],
  [/\b(potro)\b/gi, 'পত্র paper'],
];

function expandBanglishQuery(query: string): string {
  const extras: string[] = [];
  for (const [pattern, replacement] of BANGLISH_EXPANSIONS) {
    if (pattern.test(query)) {
      extras.push(replacement);
    }
  }
  return extras.length > 0 ? `${query} ${extras.join(' ')}` : query;
}

function detectWantedPaper(query: string): '1' | '2' | null {
  const q = query.toLowerCase();
  const wants1 = /(?:^|\s)(?:1st|first|1m|১ম|প্রথম)(?:\s|$)/i.test(q);
  const wants2 = /(?:^|\s)(?:2nd|second|2y|২য়|২য়|দ্বিতীয়|দ্বিতীয়)(?:\s|$)/i.test(q);
  if (wants1 && !wants2) return '1';
  if (wants2 && !wants1) return '2';
  return null;
}

function resourcePaperHint(item: BotResource): '1' | '2' | null {
  const text = `${item.title} ${item.filename ?? ''}`.toLowerCase();
  const has1 = /(?:1st|১ম|প্রথম|1st\s*paper|_১ম_)/i.test(text);
  const has2 = /(?:2nd|২য়|২য়|দ্বিতীয়|দ্বিতীয়|2nd\s*paper|_২য়_|_২য়_)/i.test(text);
  if (has1 && !has2) return '1';
  if (has2 && !has1) return '2';
  return null;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function typeEmoji(item: BotResource): string {
  switch (item.type) {
    case 'PDF':
      return '📄';
    case 'APK':
      return '📱';
    case 'Image':
      return '🖼';
    default:
      return '📌';
  }
}

/** Fast (<15ms) Banglish + paper-aware search built specifically for Telegram Inline Mode. */
export function searchInlineResources(
  resources: BotResource[],
  rawQuery: string,
  limit = 45,
): BotResource[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    // Empty query: show the latest PDFs first.
    const pdfs = resources.filter((r) => r.type === 'PDF');
    return (pdfs.length > 0 ? pdfs : resources).slice(0, limit);
  }

  const expanded = expandBanglishQuery(trimmed);
  const wantedPaper = detectWantedPaper(trimmed);

  const scoreMap = new Map<string, { item: BotResource; score: number }>();

  const runPass = (query: string, typeFilter: 'PDF' | 'ALL', weight: number) => {
    const res = searchAll(resources, { query, typeFilter, limit: 40 });
    for (const hit of res.results) {
      const full = hit as BotResource;
      let score = hit.score * weight;
      if (full.type === 'PDF') score *= 1.25;
      if (wantedPaper) {
        const paper = resourcePaperHint(full);
        if (paper === wantedPaper) score += 3000;
        else if (paper && paper !== wantedPaper) score -= 1200;
      }
      const existing = scoreMap.get(full.id);
      if (existing) {
        existing.score = Math.max(existing.score, score) + Math.min(existing.score, score) * 0.2;
      } else {
        scoreMap.set(full.id, { item: full, score });
      }
    }
  };

  runPass(trimmed, 'PDF', 1.0);
  if (expanded !== trimmed) {
    runPass(expanded, 'PDF', 1.05);
  }
  if (scoreMap.size < 8) {
    runPass(expanded, 'ALL', 0.7);
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e) => e.item);
}

function buildInlineArticle(
  item: BotResource,
  channelUsername: string,
  botUsername: string,
  promo: PromoConfig | null,
): InlineQueryResultArticle {
  const meta: string[] = [item.typeLabel, item.category, item.date];
  if (item.filename) meta.push(item.filename);

  const lines = [
    `${typeEmoji(item)} <b>${escapeHtml(item.title)}</b>`,
    `<code>${escapeHtml(meta.join(' • '))}</code>`,
  ];
  if (promo?.enabled && promo.text.trim()) {
    lines.push('');
    lines.push('───────────────');
    lines.push(`📣 ${escapeHtml(promo.text.trim())}`);
  }

  const kb = new InlineKeyboard()
    .url(`📥 Open ${item.type} in @${channelUsername}`, item.telegramUrl)
    .row()
    .switchInlineCurrent('🔎 Search More', '')
    .url('➕ Add Bot to Group', `https://t.me/${botUsername}?startgroup=true`);

  if (promo?.enabled && promo.buttonText && promo.buttonUrl) {
    kb.row().url(`✨ ${promo.buttonText}`, promo.buttonUrl);
  }

  return {
    type: 'article',
    id: `res_${item.id}`,
    title: `${typeEmoji(item)} ${item.title.slice(0, 120)}`,
    description: meta.join(' • ').slice(0, 160),
    input_message_content: {
      message_text: lines.join('\n'),
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    },
    reply_markup: kb,
  };
}

export function registerInlineHandlers(
  bot: Bot,
  config: BotConfig,
  store: ResourceStore,
  state: BotStateStore,
): void {
  bot.on('inline_query', async (ctx) => {
    const userId = ctx.from?.id;
    if (state.isBanned(userId)) {
      await ctx.answerInlineQuery([], { cache_time: 10 }).catch(() => {});
      return;
    }

    const settings = state.getSettings();
    if (settings.maintenance && !state.isAdmin(userId)) {
      await ctx
        .answerInlineQuery(
          [
            {
              type: 'article',
              id: 'maintenance',
              title: '🛠 Bot is currently under maintenance',
              description: 'Please try again in a few minutes.',
              input_message_content: {
                message_text: '🛠 বটটি বর্তমানে মেইনটেনেন্সে আছে, কিছুক্ষণ পর আবার চেষ্টা করো।',
              },
            },
          ],
          { cache_time: 5 },
        )
        .catch(() => {});
      return;
    }

    const query = (ctx.inlineQuery.query ?? '').trim();
    const offset = Math.max(0, Number.parseInt(ctx.inlineQuery.offset || '0', 10) || 0);

    if (query.length >= 2 && offset === 0) {
      state.trackUser(ctx.from, { isSearch: true });
    }

    const matches = searchInlineResources(store.getAll(), query, 60);
    const page = matches.slice(offset, offset + PAGE_SIZE);
    const nextOffset = offset + PAGE_SIZE < matches.length ? String(offset + PAGE_SIZE) : '';

    const promo = state.getPromo();
    const activePromo = promo.enabled && promo.text.trim() ? promo : null;
    const botUsername = ctx.me.username;

    let results: InlineQueryResultArticle[];
    if (page.length > 0) {
      results = page.map((item) =>
        buildInlineArticle(item, config.channelUsername, botUsername, activePromo),
      );
    } else if (offset === 0) {
      results = [
        {
          type: 'article',
          id: 'no_match',
          title: `❌ "${query.slice(0, 40)}" এর কোনো PDF পাওয়া যায়নি`,
          description: `অন্য কীওয়ার্ড লিখো অথবা @${config.channelUsername} চ্যানেল ঘুরে দেখো`,
          input_message_content: {
            message_text:
              `❌ <b>"${escapeHtml(query)}"</b> নামে কোনো PDF চ্যানেলে পাওয়া যায়নি।\n` +
              `অন্যভাবে (লেখক বা বিষয়ের নাম দিয়ে) আবার চেষ্টা করো!`,
            parse_mode: 'HTML',
          },
          reply_markup: new InlineKeyboard()
            .url(`📢 Browse @${config.channelUsername}`, `https://t.me/${config.channelUsername}`)
            .row()
            .switchInlineCurrent('🔎 Try Another Search', ''),
        },
      ];
    } else {
      results = [];
    }

    await ctx
      .answerInlineQuery(results, {
        cache_time: 15,
        is_personal: false,
        next_offset: nextOffset,
      })
      .catch((err) => console.warn('[INLINE] answerInlineQuery error:', err));
  });
}
