import { InputFile, InlineKeyboard, type Bot, type Context } from 'grammy';

import type { PdfAiEngine } from './ai.ts';
import type { BotConfig } from './config.ts';
import type { ResourceStore } from './store.ts';
import type { BotResource, ConversationContext } from './types.ts';

const BUTTON_LABEL_MAX = 46;
const CONTEXT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CONTEXT_ENTRIES = 500;
const BUTTON_DUPE_WINDOW_MS = 20_000;

function truncateLabel(text: string, max = BUTTON_LABEL_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildLinkModeKeyboard(
  bestItem: BotResource | undefined,
  similarItems: BotResource[],
  channelUsername: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (bestItem) {
    kb.url(`📥 Open ${bestItem.type} in @${channelUsername}`, bestItem.telegramUrl).row();
  }
  for (const item of similarItems) {
    kb.url(`${typeEmoji(item)} ${truncateLabel(item.title)}`, item.telegramUrl).row();
  }
  if (!bestItem && similarItems.length === 0) {
    kb.url(`📢 Browse @${channelUsername}`, `https://t.me/${channelUsername}`);
  }
  return kb;
}

function formatLinkResultCard(
  bestItem: BotResource | undefined,
  similarItems: BotResource[],
  replyText: string,
): string {
  const lines: string[] = [];
  if (replyText) {
    lines.push(escapeHtml(replyText));
  }
  if (bestItem) {
    lines.push('');
    lines.push(`${typeEmoji(bestItem)} <b>${escapeHtml(bestItem.title)}</b>`);
    const meta: string[] = [bestItem.category, bestItem.date];
    if (bestItem.filename) meta.unshift(bestItem.filename);
    lines.push(`<code>${escapeHtml(meta.join(' • '))}</code>`);
  }
  if (similarItems.length > 0) {
    lines.push('');
    lines.push(bestItem ? '📚 <b>Similar PDFs (tap to open):</b>' : '📚 <b>Closest PDFs (tap to open):</b>');
  }
  return lines.join('\n').trim();
}

function buildSimilarKeyboard(
  similarItems: BotResource[],
  channelUsername: string,
  primaryId?: string | null,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const item of similarItems) {
    kb.text(`${typeEmoji(item)} ${truncateLabel(item.title)}`, `pdf:${item.id}`).row();
  }
  const channelUrl = primaryId
    ? `https://t.me/${channelUsername}/${primaryId}`
    : `https://t.me/${channelUsername}`;
  kb.url(primaryId ? '🔗 Open in Channel' : `📢 @${channelUsername}`, channelUrl);
  return kb;
}

function isTargetChannel(chat: { id: number; username?: string }, config: BotConfig): boolean {
  if (String(chat.id) === config.channelId) return true;
  if (chat.username && chat.username.toLowerCase() === config.channelUsername.toLowerCase()) {
    return true;
  }
  return false;
}

export function registerHandlers(
  bot: Bot,
  config: BotConfig,
  store: ResourceStore,
  ai: PdfAiEngine,
): void {
  const userCooldowns = new Map<number, number>();
  const recentButtonSends = new Map<string, number>();
  const replyContexts = new Map<string, ConversationContext>();
  let backupTimer: NodeJS.Timeout | null = null;

  const isGroupAllowed = (chatId: number, chatType: string): boolean => {
    if (chatType === 'private') return true;
    if (config.allowedGroupIds.size === 0) return true;
    return config.allowedGroupIds.has(chatId);
  };

  const checkCooldown = (userId: number | undefined): number => {
    if (!userId || config.cooldownSeconds <= 0) return 0;
    if (config.adminUserIds.has(userId)) return 0;
    const now = Date.now();
    const prev = userCooldowns.get(userId) ?? 0;
    const elapsedMs = now - prev;
    const waitMs = config.cooldownSeconds * 1000 - elapsedMs;
    if (waitMs > 0) return Math.ceil(waitMs / 1000);

    userCooldowns.set(userId, now);
    if (userCooldowns.size > 2000) {
      for (const [uid, ts] of userCooldowns) {
        if (now - ts > 60_000) userCooldowns.delete(uid);
      }
    }
    return 0;
  };

  const saveReplyContext = (chatId: number, botMessageId: number, context: ConversationContext) => {
    replyContexts.set(`${chatId}:${botMessageId}`, context);
    if (replyContexts.size > MAX_CONTEXT_ENTRIES) {
      const now = Date.now();
      for (const [key, entry] of replyContexts) {
        if (now - entry.timestamp > CONTEXT_TTL_MS) {
          replyContexts.delete(key);
        }
      }
      // If still above cap, drop oldest entry.
      if (replyContexts.size > MAX_CONTEXT_ENTRIES) {
        const firstKey = replyContexts.keys().next().value;
        if (firstKey) replyContexts.delete(firstKey);
      }
    }
  };

  const getReplyContext = (chatId: number, replyToMessageId?: number): ConversationContext | undefined => {
    if (!replyToMessageId) return undefined;
    const key = `${chatId}:${replyToMessageId}`;
    const found = replyContexts.get(key);
    if (!found) return undefined;
    if (Date.now() - found.timestamp > CONTEXT_TTL_MS) {
      replyContexts.delete(key);
      return undefined;
    }
    return found;
  };

  const scheduleAutoDelete = (chatId: number, messageId: number) => {
    if (config.autoDeleteSeconds <= 0) return;
    setTimeout(() => {
      bot.api.deleteMessage(chatId, messageId).catch(() => {});
    }, config.autoDeleteSeconds * 1000);
  };

  const scheduleIndexBackup = () => {
    if (!config.backupChatId) return;
    if (backupTimer) clearTimeout(backupTimer);
    backupTimer = setTimeout(async () => {
      backupTimer = null;
      try {
        const stats = store.getStats();
        await bot.api.sendDocument(
          config.backupChatId!,
          new InputFile(store.getIndexPath(), 'index.json'),
          {
            caption: `Auto-backup @${config.channelUsername} | Total: ${stats.total} (PDFs: ${stats.pdfCount})`,
          },
        );
        console.log('[BACKUP] Uploaded index.json backup to BACKUP_CHAT_ID');
      } catch (err) {
        console.error('[BACKUP] Failed to upload index backup:', err);
      }
    }, 60_000);
  };

  const forwardDmToDiscussionGroup = async (ctx: Context): Promise<number | null> => {
    if (!config.autoForwardDm || !config.discussionGroupId) return null;
    if (ctx.chat?.type !== 'private' || !ctx.message) return null;

    const dmChatId = ctx.chat.id;
    const msgId = ctx.message.message_id;

    try {
      const forwarded = await ctx.api.forwardMessage(config.discussionGroupId, dmChatId, msgId);
      console.log(
        `[FORWARD] DM from ${ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name ?? dmChatId} -> discussion group ${config.discussionGroupId} (msg #${forwarded.message_id})`,
      );
      return forwarded.message_id;
    } catch (err) {
      console.warn('[FORWARD] forwardMessage failed, trying text relay:', err);
      const text = ctx.message.text?.trim();
      if (!text) return null;
      const sender = ctx.from
        ? `${ctx.from.first_name}${ctx.from.last_name ? ` ${ctx.from.last_name}` : ''}${ctx.from.username ? ` (@${ctx.from.username})` : ''}`
        : `User ${dmChatId}`;
      try {
        const relayed = await ctx.api.sendMessage(
          config.discussionGroupId,
          `💬 <b>Message to Bot from ${escapeHtml(sender)}:</b>\n${escapeHtml(text)}`,
          { parse_mode: 'HTML' },
        );
        return relayed.message_id;
      } catch (relayErr) {
        console.error('[FORWARD] Could not forward DM to discussion group:', relayErr);
        return null;
      }
    }
  };

  const handleSearch = async (
    ctx: Context,
    query: string,
    replyContext?: ConversationContext,
  ): Promise<void> => {
    const chat = ctx.chat;
    const msg = ctx.message;
    if (!chat || !msg) return;
    if (!isGroupAllowed(chat.id, chat.type)) return;

    const trimmed = query.trim();
    if (!trimmed) {
      await ctx.reply(
        'কোন বই বা PDF খুঁজছো? এভাবে লেখো:\n• `/pdf তপন স্যার পদার্থবিজ্ঞান ২য় পত্র`\n• `/pdf hazari chemistry 1st paper dagano`\n• `/pdf udvash varsity question bank`',
        { parse_mode: 'Markdown', reply_parameters: { message_id: msg.message_id } },
      );
      return;
    }

    const waitSec = checkCooldown(ctx.from?.id);
    if (waitSec > 0) {
      const warn = await ctx.reply(`একটু অপেক্ষা করো (${waitSec} সেকেন্ড পর আবার চেষ্টা করো)।`, {
        reply_parameters: { message_id: msg.message_id },
      });
      setTimeout(() => {
        bot.api.deleteMessage(chat.id, warn.message_id).catch(() => {});
      }, 4000);
      return;
    }

    // Auto-forward private DM messages to the linked discussion group when enabled.
    const forwardedGroupMsgId =
      chat.type === 'private' ? await forwardDmToDiscussionGroup(ctx) : null;

    await ctx.api.sendChatAction(chat.id, 'typing').catch(() => {});

    const decision = await ai.search(trimmed, store.getAll(), replyContext);

    if (!decision.isPdfRequest) {
      const sent = await ctx.reply(decision.replyText, {
        reply_parameters: { message_id: msg.message_id },
      });
      scheduleAutoDelete(chat.id, sent.message_id);

      if (config.forwardDmBotReply && config.discussionGroupId && forwardedGroupMsgId) {
        await ctx.api
          .sendMessage(config.discussionGroupId, decision.replyText, {
            reply_parameters: { message_id: forwardedGroupMsgId },
          })
          .catch((err) => console.warn('[FORWARD] Could not mirror AI reply to group:', err));
      }
      return;
    }

    const bestItem = decision.bestMatchId ? store.get(decision.bestMatchId) : undefined;
    const similarItems = decision.similarIds
      .map((id) => store.get(id))
      .filter((item): item is BotResource => Boolean(item));

    const newContext: ConversationContext = {
      userQuery: trimmed,
      bestMatchId: bestItem?.id ?? null,
      bestMatchTitle: bestItem?.title ?? null,
      similarTitles: similarItems.map((s) => s.title),
      timestamp: Date.now(),
    };

    if (bestItem) {
      // Link mode (works with zero channel admin rights — uses your CSV index directly!).
      // If a cached Telegram fileId exists for this item, send the file directly anyway.
      if (config.deliveryMode === 'link' && !bestItem.fileId) {
        const keyboard = buildLinkModeKeyboard(bestItem, similarItems, config.channelUsername);
        const card = formatLinkResultCard(bestItem, similarItems, decision.replyText);
        const sent = await ctx.reply(card, {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
          reply_parameters: { message_id: msg.message_id },
          reply_markup: keyboard,
        });
        saveReplyContext(chat.id, sent.message_id, newContext);
        scheduleAutoDelete(chat.id, sent.message_id);

        if (config.forwardDmBotReply && config.discussionGroupId && forwardedGroupMsgId) {
          const mirrored = await ctx.api
            .sendMessage(config.discussionGroupId, card, {
              parse_mode: 'HTML',
              link_preview_options: { is_disabled: true },
              reply_parameters: { message_id: forwardedGroupMsgId },
              reply_markup: keyboard,
            })
            .catch((err) => {
              console.warn('[FORWARD] Could not mirror reply to group:', err);
              return null;
            });
          if (mirrored) {
            saveReplyContext(config.discussionGroupId, mirrored.message_id, newContext);
          }
        }
        return;
      }

      await ctx.api.sendChatAction(chat.id, 'upload_document').catch(() => {});

      if (bestItem.fileId) {
        const keyboard = buildLinkModeKeyboard(undefined, similarItems, config.channelUsername);
        try {
          const sentDoc = await ctx.api.sendDocument(chat.id, bestItem.fileId, {
            caption: `${decision.replyText}\n\n📄 ${bestItem.title}`,
            reply_parameters: { message_id: msg.message_id },
            reply_markup: keyboard,
          });
          saveReplyContext(chat.id, sentDoc.message_id, newContext);
          scheduleAutoDelete(chat.id, sentDoc.message_id);
          return;
        } catch (err) {
          console.warn(`[SEND] Cached fileId failed for #${bestItem.id}, falling back:`, err);
        }
      }

      const keyboard = buildSimilarKeyboard(similarItems, config.channelUsername, bestItem.id);

      try {
        const copied = await ctx.api.copyMessage(chat.id, config.channelId, Number(bestItem.id), {
          reply_parameters: { message_id: msg.message_id },
          reply_markup: keyboard,
        });
        saveReplyContext(chat.id, copied.message_id, newContext);
        scheduleAutoDelete(chat.id, copied.message_id);
        return;
      } catch (err) {
        console.error(`[SEND] copyMessage failed for #${bestItem.id}:`, err);
        // Fallback: share clean link card + 1-tap similar buttons if bot is not channel admin.
        const fallbackKb = buildLinkModeKeyboard(bestItem, similarItems, config.channelUsername);
        const card = formatLinkResultCard(bestItem, similarItems, decision.replyText);
        const sent = await ctx.reply(card, {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
          reply_parameters: { message_id: msg.message_id },
          reply_markup: fallbackKb,
        });
        saveReplyContext(chat.id, sent.message_id, newContext);
        scheduleAutoDelete(chat.id, sent.message_id);
        return;
      }
    }

    // No exact match — reply with AI guidance + inline buttons for similar PDFs (if any).
    const keyboard =
      config.deliveryMode === 'link'
        ? buildLinkModeKeyboard(undefined, similarItems, config.channelUsername)
        : similarItems.length > 0
          ? buildSimilarKeyboard(similarItems, config.channelUsername)
          : new InlineKeyboard().url(
              `📢 Browse @${config.channelUsername}`,
              `https://t.me/${config.channelUsername}`,
            );

    const textBody =
      config.deliveryMode === 'link'
        ? formatLinkResultCard(undefined, similarItems, decision.replyText)
        : decision.replyText;

    const sent = await ctx.reply(textBody, {
      ...(config.deliveryMode === 'link' ? { parse_mode: 'HTML' as const } : {}),
      link_preview_options: { is_disabled: true },
      reply_parameters: { message_id: msg.message_id },
      reply_markup: keyboard,
    });
    saveReplyContext(chat.id, sent.message_id, newContext);
    scheduleAutoDelete(chat.id, sent.message_id);

    if (config.forwardDmBotReply && config.discussionGroupId && forwardedGroupMsgId) {
      const mirrored = await ctx.api
        .sendMessage(config.discussionGroupId, textBody, {
          ...(config.deliveryMode === 'link' ? { parse_mode: 'HTML' as const } : {}),
          link_preview_options: { is_disabled: true },
          reply_parameters: { message_id: forwardedGroupMsgId },
          reply_markup: keyboard,
        })
        .catch((err) => {
          console.warn('[FORWARD] Could not mirror AI result to group:', err);
          return null;
        });
      if (mirrored) {
        saveReplyContext(config.discussionGroupId, mirrored.message_id, newContext);
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Channel auto-indexing (enabled only when AUTO_INDEX=true)          */
  /* ------------------------------------------------------------------ */
  bot.on(['channel_post', 'edited_channel_post'], async (ctx) => {
    if (!config.autoIndex) return;
    const post = ctx.channelPost ?? ctx.editedChannelPost;
    if (!post) return;
    if (!isTargetChannel(post.chat, config)) return;

    const indexed = store.upsertFromTelegramMessage(post);
    if (!indexed) return;

    const stats = store.getStats();
    const action = ctx.editedChannelPost ? 'UPDATE' : 'NEW';
    console.log(
      `[INDEX:${action}] #${indexed.id} [${indexed.typeLabel}] ${indexed.title.slice(0, 70)} (total=${stats.total}, pdfs=${stats.pdfCount})`,
    );
    scheduleIndexBackup();
  });

  /* ------------------------------------------------------------------ */
  /* Commands                                                            */
  /* ------------------------------------------------------------------ */
  bot.command('start', async (ctx) => {
    if (!isGroupAllowed(ctx.chat.id, ctx.chat.type)) return;
    const stats = store.getStats();
    const botUser = ctx.me.username;
    await ctx.reply(
      `আসসালামু আলাইকুম! আমি @${config.channelUsername} এর AI PDF Search Bot।\n\n` +
        `📚 চ্যানেলে বর্তমানে *${stats.pdfCount}টি PDF* (মোট ${stats.total}টি পোস্ট) ইনডেক্স করা আছে।\n\n` +
        `*যেভাবে খুঁজবে:*\n` +
        `• গ্রুপে: \`/pdf বইয়ের নাম\` অথবা \`@${botUser} বইয়ের নাম\`\n` +
        `• ফলো-আপ: বটের মেসেজে Reply করে বলো (যেমন: _"১ম পত্রটা দাও"_)\n` +
        `• ইনবক্সে: সরাসরি বইয়ের নাম লিখে পাঠাও!`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('help', async (ctx) => {
    if (!isGroupAllowed(ctx.chat.id, ctx.chat.type)) return;
    const botUser = ctx.me.username;
    await ctx.reply(
      `*PDF খোঁজার উদাহরণ:*\n` +
        `• \`/pdf topon sir physics 2nd paper\`\n` +
        `• \`/pdf হাজারী স্যার রসায়ন ১ম পত্র দাগানো বই\`\n` +
        `• \`/pdf udvash engineering question bank\`\n` +
        `• \`@${botUser} medical gk digest 2026\`\n\n` +
        `বট সবচেয়ে ভালো মিল থাকা PDF সরাসরি পাঠাবে এবং নিচে কাছাকাছি (Similar) PDF গুলোর বাটন দেবে।`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.command(['pdf', 'search'], async (ctx) => {
    const query = ctx.match ?? '';
    const replyContext = getReplyContext(ctx.chat.id, ctx.message?.reply_to_message?.message_id);
    await handleSearch(ctx, query, replyContext);
  });

  bot.command('stats', async (ctx) => {
    if (!isGroupAllowed(ctx.chat.id, ctx.chat.type)) return;
    const stats = store.getStats();
    await ctx.reply(
      `📊 *Bot Status (@${config.channelUsername})*\n` +
        `• Indexed Posts: ${stats.total}\n` +
        `• PDFs: ${stats.pdfCount}\n` +
        `• Latest Post: #${stats.newestId} (${stats.newestDate})\n` +
        `• AI Engine: ${ai.isEnabled() ? `Gemini (${config.geminiModel})` : 'Local Fallback'}\n` +
        `• Mode: ${config.deliveryMode === 'copy' ? 'Direct Copy (Channel Admin)' : 'CSV Index + 1-Tap Channel Links'}\n` +
        `• DM Auto-Forward: ${config.autoForwardDm && config.discussionGroupId ? `ON → ${config.discussionGroupId}` : 'OFF'}\n` +
        `• Realtime Auto-Index: ${config.autoIndex ? 'ON' : 'OFF (CSV snapshot)'}`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('exportindex', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !config.adminUserIds.has(userId)) {
      return;
    }
    const stats = store.getStats();
    await ctx.replyWithDocument(new InputFile(store.getIndexPath(), 'index.json'), {
      caption: `Index export | Total: ${stats.total} | PDFs: ${stats.pdfCount} | Updated: ${stats.updatedAt}`,
    });
  });

  /* ------------------------------------------------------------------ */
  /* Similar PDF inline button clicks                                    */
  /* ------------------------------------------------------------------ */
  bot.callbackQuery(/^pdf:(\d+)$/, async (ctx) => {
    const id = ctx.match[1];
    const chat = ctx.chat;
    if (!chat) {
      await ctx.answerCallbackQuery({ text: 'Chat unavailable.' });
      return;
    }

    const resource = store.get(id);
    if (!resource) {
      await ctx.answerCallbackQuery({ text: 'PDF টি ইনডেক্সে পাওয়া যায়নি।', show_alert: true });
      return;
    }

    const dupeKey = `${chat.id}:${id}`;
    const now = Date.now();
    const lastSent = recentButtonSends.get(dupeKey) ?? 0;
    if (now - lastSent < BUTTON_DUPE_WINDOW_MS) {
      await ctx.answerCallbackQuery({ text: 'এই PDF টি একটু আগেই পাঠানো হয়েছে!' });
      return;
    }
    recentButtonSends.set(dupeKey, now);
    if (recentButtonSends.size > 1000) {
      for (const [k, ts] of recentButtonSends) {
        if (now - ts > BUTTON_DUPE_WINDOW_MS * 2) recentButtonSends.delete(k);
      }
    }

    await ctx.answerCallbackQuery({ text: `পাঠানো হচ্ছে: ${truncateLabel(resource.title, 35)}` });

    const replyToId = ctx.callbackQuery.message?.message_id;
    const kb = new InlineKeyboard().url('🔗 Open in Channel', resource.telegramUrl);

    try {
      const copied = await ctx.api.copyMessage(chat.id, config.channelId, Number(resource.id), {
        ...(replyToId ? { reply_parameters: { message_id: replyToId } } : {}),
        reply_markup: kb,
      });
      saveReplyContext(chat.id, copied.message_id, {
        userQuery: resource.title,
        bestMatchId: resource.id,
        bestMatchTitle: resource.title,
        similarTitles: [],
        timestamp: Date.now(),
      });
      scheduleAutoDelete(chat.id, copied.message_id);
    } catch (err) {
      console.error(`[CALLBACK] copyMessage failed for #${resource.id}:`, err);
      await ctx.reply(`🔗 ${resource.title}\n${resource.telegramUrl}`, {
        ...(replyToId ? { reply_parameters: { message_id: replyToId } } : {}),
      });
    }
  });

  /* ------------------------------------------------------------------ */
  /* Group @mention, reply-to-bot, and Private DM text messages          */
  /* ------------------------------------------------------------------ */
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text || text.startsWith('/')) return;

    const chat = ctx.chat;
    if (!isGroupAllowed(chat.id, chat.type)) return;

    // Private DM: treat every plain message as a search query.
    if (chat.type === 'private') {
      const replyContext = getReplyContext(chat.id, ctx.message.reply_to_message?.message_id);
      await handleSearch(ctx, text, replyContext);
      return;
    }

    // Group / Supergroup: trigger ONLY on explicit @mention or reply to this bot.
    const botUsername = ctx.me.username;
    const mentionRegex = new RegExp(`@${botUsername}\\b`, 'i');
    const isMentioned = mentionRegex.test(text);
    const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.me.id;

    if (!isMentioned && !isReplyToBot) {
      return;
    }

    const cleanedQuery = isMentioned ? text.replace(mentionRegex, '').trim() : text;
    const replyContext = isReplyToBot
      ? getReplyContext(chat.id, ctx.message.reply_to_message?.message_id)
      : undefined;

    await handleSearch(ctx, cleanedQuery, replyContext);
  });
}
