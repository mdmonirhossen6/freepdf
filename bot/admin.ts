import { InlineKeyboard, InputFile, type Bot, type Context } from 'grammy';

import type { PdfAiEngine } from './ai.ts';
import type { BotConfig } from './config.ts';
import type { BotStateStore } from './state.ts';
import type { ResourceStore } from './store.ts';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parses optional button syntax:
 *   "Main message text | Button Label | https://example.com"
 */
function parseTextAndButton(raw: string): {
  text: string;
  buttonText?: string;
  buttonUrl?: string;
} {
  const parts = raw.split('|').map((p) => p.trim());
  if (parts.length >= 3) {
    const maybeUrl = parts[parts.length - 1];
    const maybeLabel = parts[parts.length - 2];
    if (/^https?:\/\/\S+$/i.test(maybeUrl) && maybeLabel.length > 0) {
      return {
        text: parts.slice(0, -2).join(' | ').trim(),
        buttonText: maybeLabel,
        buttonUrl: maybeUrl,
      };
    }
  }
  return { text: raw.trim() };
}

function parseTargetUserId(ctx: Context, arg: string): number | null {
  const trimmed = arg.trim();
  if (/^\d+$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  const repliedUser = ctx.message?.reply_to_message?.from;
  if (repliedUser && !repliedUser.is_bot) return repliedUser.id;
  return null;
}

function buildAdminPanel(
  userId: number,
  config: BotConfig,
  store: ResourceStore,
  state: BotStateStore,
  ai: PdfAiEngine,
): { text: string; keyboard: InlineKeyboard } {
  const isUltra = state.isUltraAdmin(userId);
  const storeStats = store.getStats();
  const summary = state.getSummary();
  const s = summary.settings;
  const promo = state.getPromo();

  const roleBadge = isUltra ? '👑 <b>ULTRA ADMIN</b>' : '🛡 <b>ADMIN</b>';
  const promoStatus =
    promo.enabled && promo.text
      ? `ON (every ${promo.everyN} search${promo.everyN > 1 ? 'es' : ''})`
      : 'OFF';

  const lines = [
    `${roleBadge} — <b>Control Panel (@${escapeHtml(config.channelUsername)})</b>`,
    '',
    `📚 <b>Index:</b> ${storeStats.total} posts (${storeStats.pdfCount} PDFs) | latest #${storeStats.newestId}`,
    `👥 <b>Tracked Users:</b> ${summary.totalUsers} DM users | ${summary.totalGroups} groups`,
    `🔎 <b>Total Searches:</b> ${summary.totalSearches}`,
    `👮 <b>Admins:</b> ${summary.totalAdmins} | 🚫 <b>Banned:</b> ${summary.bannedCount}`,
    '',
    `⚙️ <b>Live Settings:</b>`,
    `• Gemini AI: ${s.aiEnabled && ai.isEnabled() ? `ON (${escapeHtml(config.geminiModel)})` : 'OFF (Local Search)'}`,
    `• DM Auto-Forward: ${s.autoForwardDm ? 'ON' : 'OFF'} → <code>${s.discussionGroupId ?? 'unset'}</code>`,
    `• Mirror AI Reply to Group: ${s.forwardDmBotReply ? 'ON' : 'OFF'}`,
    `• Auto-Promo Banner: ${promoStatus}`,
    `• Cooldown: ${s.cooldownSeconds}s | Maintenance: ${s.maintenance ? 'ON' : 'OFF'}`,
  ];

  const kb = new InlineKeyboard()
    .text('🔄 Refresh', 'adm:refresh')
    .text('📖 All Commands', 'adm:cmds')
    .row();

  if (promo.enabled && promo.text) {
    kb.text('🎁 Preview Promo', 'adm:view_promo').text('🗑 Clear Promo', 'adm:clear_promo').row();
  } else {
    kb.text('🎁 How to Set Promo', 'adm:view_promo').row();
  }

  if (isUltra) {
    kb.text(`🔁 DM Forward: ${s.autoForwardDm ? 'ON' : 'OFF'}`, 'adm:toggle_forward')
      .text(`💬 AI Mirror: ${s.forwardDmBotReply ? 'ON' : 'OFF'}`, 'adm:toggle_botreply')
      .row()
      .text(`🤖 Gemini AI: ${s.aiEnabled ? 'ON' : 'OFF'}`, 'adm:toggle_ai')
      .text(`🛠 Maint: ${s.maintenance ? 'ON' : 'OFF'}`, 'adm:toggle_maint')
      .row()
      .text('💾 Export Backups', 'adm:export');
  }

  return { text: lines.join('\n'), keyboard: kb };
}

function buildCommandsCheatSheet(isUltra: boolean): string {
  const adminCmds = [
    '<b>🛡 Admin Commands (Messaging & Promotions):</b>',
    '• <code>/admin</code> — Open interactive control panel',
    '• <code>/send &lt;text&gt;</code> — Send message to Discussion Group (or reply to any photo/PDF/post with <code>/send</code>)',
    '• <code>/sendto &lt;chat_id&gt; &lt;text&gt;</code> — Send message/media to a specific user or group ID',
    '• <code>/reply &lt;text&gt;</code> — Reply to a forwarded DM in the Discussion Group to message that user back',
    '• <code>/promo &lt;text&gt; | Button | https://url</code> — Send promotion to Discussion Group (or reply to photo/banner with <code>/promo</code>)',
    '• <code>/pinpromo &lt;text&gt;</code> — Send promotion to Discussion Group AND pin it',
    '• <code>/promoall &lt;text&gt;</code> — Send promotion to Discussion Group + ALL DM users',
    '• <code>/setpromo &lt;text&gt; | Button | https://url</code> — Attach auto-promo footer to search results',
    '• <code>/setpromofreq &lt;N&gt;</code> — Show auto-promo every N searches (default: 1)',
    '• <code>/viewpromo</code> / <code>/clearpromo</code> — Preview or disable auto-promo',
    '• <code>/users</code> — View recent users & usage stats',
  ];

  if (!isUltra) return adminCmds.join('\n');

  const ultraCmds = [
    '',
    '<b>👑 Ultra Admin Exclusive Commands:</b>',
    '• <code>/broadcast &lt;text&gt;</code> — Broadcast message/media (or reply to media) to ALL DM users',
    '• <code>/broadcastall &lt;text&gt;</code> — Broadcast to Discussion Group + ALL DM users',
    '• <code>/addadmin &lt;user_id&gt;</code> (or reply) — Promote user to Admin',
    '• <code>/removeadmin &lt;user_id&gt;</code> (or reply) — Remove Admin',
    '• <code>/admins</code> — List all Ultra Admins & Admins',
    '• <code>/ban &lt;user_id&gt;</code> / <code>/unban &lt;user_id&gt;</code> / <code>/banned</code> — Ban management',
    '• <code>/toggleforward</code> / <code>/togglebotreply</code> / <code>/toggleai</code> — Live toggles',
    '• <code>/maintenance on|off</code> — Pause bot for non-admins',
    '• <code>/setcooldown &lt;sec&gt;</code> — Change search cooldown',
    '• <code>/setgroup [chat_id]</code> — Change Discussion Group ID',
    '• <code>/addpdf &lt;msg_id&gt; | &lt;title&gt;</code> — Add a channel post to search index live',
    '• <code>/delpdf &lt;msg_id&gt;</code> — Remove a post from search index live',
    '• <code>/reseed</code> — Re-seed index from CSV snapshot',
    '• <code>/exportindex</code> / <code>/exportstate</code> — Download JSON backups',
  ];

  return [...adminCmds, ...ultraCmds].join('\n');
}

export function registerAdminHandlers(
  bot: Bot,
  config: BotConfig,
  store: ResourceStore,
  state: BotStateStore,
  ai: PdfAiEngine,
): void {
  const requireAdmin = async (ctx: Context): Promise<boolean> => {
    if (state.isAdmin(ctx.from?.id)) return true;
    await ctx.reply('⛔ Admin access required.').catch(() => {});
    return false;
  };

  const requireUltraAdmin = async (ctx: Context): Promise<boolean> => {
    if (state.isUltraAdmin(ctx.from?.id)) return true;
    await ctx.reply('⛔ Ultra Admin access required.').catch(() => {});
    return false;
  };

  /** Sends either a replied message (via copyMessage) or parsed text (+ optional button) to targetChatId. */
  const dispatchPayload = async (
    ctx: Context,
    targetChatId: number,
    rawArgs: string,
    options: { isPromo?: boolean; pin?: boolean } = {},
  ): Promise<number> => {
    const replyMsg = ctx.message?.reply_to_message;
    const { text, buttonText, buttonUrl } = parseTextAndButton(rawArgs);
    const replyMarkup =
      buttonText && buttonUrl ? new InlineKeyboard().url(buttonText, buttonUrl) : undefined;

    let sentMessageId: number;

    if (replyMsg && ctx.chat) {
      const copied = await ctx.api.copyMessage(targetChatId, ctx.chat.id, replyMsg.message_id, {
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      sentMessageId = copied.message_id;
    } else {
      if (!text) {
        throw new Error('EMPTY_PAYLOAD');
      }
      const body = options.isPromo ? `📣 <b>Announcement / Promotion</b>\n\n${escapeHtml(text)}` : text;
      const sent = await ctx.api.sendMessage(targetChatId, body, {
        ...(options.isPromo ? { parse_mode: 'HTML' as const } : {}),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      sentMessageId = sent.message_id;
    }

    if (options.pin) {
      await ctx.api.pinChatMessage(targetChatId, sentMessageId).catch((err) => {
        console.warn('[ADMIN] Could not pin message:', err);
      });
    }

    return sentMessageId;
  };

  /** Safe rate-limited broadcast to tracked DM users (+ optional discussion group). */
  const runBroadcast = async (
    ctx: Context,
    rawArgs: string,
    options: { includeGroup: boolean; isPromo?: boolean },
  ): Promise<void> => {
    const replyMsg = ctx.message?.reply_to_message;
    const { text } = parseTextAndButton(rawArgs);
    if (!replyMsg && !text) {
      await ctx.reply(
        'Usage: `/broadcast <message>` (optionally add `| Button | https://url`) or **reply** to any photo/PDF/post with `/broadcast`.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const users = state.getTrackedUsers().filter((u) => !state.isBanned(u.id));
    const groupId = options.includeGroup ? state.getSettings().discussionGroupId : null;
    const totalTargets = users.length + (groupId ? 1 : 0);

    if (totalTargets === 0) {
      await ctx.reply('No tracked DM users or Discussion Group found yet.');
      return;
    }

    const statusMsg = await ctx.reply(`⏳ Sending to ${totalTargets} target(s)...`);

    let sent = 0;
    let failed = 0;
    let groupSent = false;

    if (groupId) {
      try {
        await dispatchPayload(ctx, groupId, rawArgs, { isPromo: options.isPromo });
        sent += 1;
        groupSent = true;
      } catch (err) {
        console.warn('[BROADCAST] Failed sending to group:', err);
        failed += 1;
      }
      await sleep(60);
    }

    for (const user of users) {
      try {
        await dispatchPayload(ctx, user.id, rawArgs, { isPromo: options.isPromo });
        sent += 1;
      } catch {
        failed += 1;
      }
      await sleep(55); // ~18 msgs/sec — safely below Telegram's 30 msgs/sec global limit.
    }

    const summary = [
      `✅ <b>${options.isPromo ? 'Promotion' : 'Broadcast'} Complete</b>`,
      `• Sent: <b>${sent}</b> / ${totalTargets}`,
      `• Failed / Blocked: <b>${failed}</b>`,
      ...(options.includeGroup ? [`• Discussion Group: ${groupSent ? '✅ Sent' : '❌ Failed'}`] : []),
    ].join('\n');

    await ctx.api
      .editMessageText(ctx.chat!.id, statusMsg.message_id, summary, { parse_mode: 'HTML' })
      .catch(async () => {
        await ctx.reply(summary, { parse_mode: 'HTML' });
      });
  };

  /* ------------------------------------------------------------------ */
  /* Admin Panel & Inline Callbacks                                     */
  /* ------------------------------------------------------------------ */

  bot.command('admin', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const panel = buildAdminPanel(ctx.from!.id, config, store, state, ai);
    await ctx.reply(panel.text, {
      parse_mode: 'HTML',
      reply_markup: panel.keyboard,
    });
  });

  bot.callbackQuery(/^adm:(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const userId = ctx.from?.id;
    if (!userId || !state.isAdmin(userId)) {
      await ctx.answerCallbackQuery({ text: '⛔ Admin only.', show_alert: true });
      return;
    }

    const ultraActions = new Set([
      'toggle_forward',
      'toggle_botreply',
      'toggle_ai',
      'toggle_maint',
      'export',
    ]);
    if (ultraActions.has(action) && !state.isUltraAdmin(userId)) {
      await ctx.answerCallbackQuery({ text: '⛔ Ultra Admin only.', show_alert: true });
      return;
    }

    const s = state.getSettings();
    let toast = 'Updated!';

    if (action === 'toggle_forward') {
      state.updateSettings({ autoForwardDm: !s.autoForwardDm });
      toast = `DM Auto-Forward: ${!s.autoForwardDm ? 'ON' : 'OFF'}`;
    } else if (action === 'toggle_botreply') {
      state.updateSettings({ forwardDmBotReply: !s.forwardDmBotReply });
      toast = `AI Reply Mirror: ${!s.forwardDmBotReply ? 'ON' : 'OFF'}`;
    } else if (action === 'toggle_ai') {
      state.updateSettings({ aiEnabled: !s.aiEnabled });
      toast = `Gemini AI: ${!s.aiEnabled ? 'ON' : 'OFF'}`;
    } else if (action === 'toggle_maint') {
      state.updateSettings({ maintenance: !s.maintenance });
      toast = `Maintenance Mode: ${!s.maintenance ? 'ON' : 'OFF'}`;
    } else if (action === 'clear_promo') {
      state.clearPromo();
      toast = 'Auto-promo cleared!';
    } else if (action === 'cmds') {
      await ctx.answerCallbackQuery({ text: 'Sending command list...' });
      await ctx.reply(buildCommandsCheatSheet(state.isUltraAdmin(userId)), { parse_mode: 'HTML' });
      return;
    } else if (action === 'view_promo') {
      await ctx.answerCallbackQuery();
      const promo = state.getPromo();
      if (!promo.enabled || !promo.text) {
        await ctx.reply(
          'No active auto-promo.\nSet one with:\n<code>/setpromo Download Prostuti App! | Open App | https://prostuti.bd</code>',
          { parse_mode: 'HTML' },
        );
      } else {
        const kb =
          promo.buttonText && promo.buttonUrl
            ? new InlineKeyboard().url(promo.buttonText, promo.buttonUrl)
            : undefined;
        await ctx.reply(
          `🎁 <b>Active Auto-Promo</b> (every ${promo.everyN} search${promo.everyN > 1 ? 'es' : ''}):\n\n${escapeHtml(promo.text)}`,
          { parse_mode: 'HTML', ...(kb ? { reply_markup: kb } : {}) },
        );
      }
      return;
    } else if (action === 'export') {
      await ctx.answerCallbackQuery({ text: 'Sending backups...' });
      await ctx.replyWithDocument(new InputFile(store.getIndexPath(), 'index.json'), {
        caption: `index.json backup (${store.getStats().total} posts)`,
      });
      await ctx.replyWithDocument(new InputFile(state.getStatePath(), 'state.json'), {
        caption: `state.json backup (${state.getSummary().totalUsers} users)`,
      });
      return;
    } else if (action === 'refresh') {
      toast = 'Refreshed!';
    }

    await ctx.answerCallbackQuery({ text: toast });
    const panel = buildAdminPanel(userId, config, store, state, ai);
    await ctx
      .editMessageText(panel.text, {
        parse_mode: 'HTML',
        reply_markup: panel.keyboard,
      })
      .catch(() => {});
  });

  /* ------------------------------------------------------------------ */
  /* Admin Messaging & Promotions                                       */
  /* ------------------------------------------------------------------ */

  bot.command('send', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const targetGroupId = state.getSettings().discussionGroupId;
    if (!targetGroupId) {
      await ctx.reply('⚠️ No Discussion Group set. Run `/setgroup <chat_id>` first.', {
        parse_mode: 'Markdown',
      });
      return;
    }

    try {
      const sentId = await dispatchPayload(ctx, targetGroupId, ctx.match ?? '');
      await ctx.reply(`✅ Sent to Discussion Group (<code>${targetGroupId}</code>, msg #${sentId}).`, {
        parse_mode: 'HTML',
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'EMPTY_PAYLOAD') {
        await ctx.reply(
          'Usage: `/send Your message here` (optional: `| Button | https://url`), or **reply** to any photo/PDF/message with `/send`.',
          { parse_mode: 'Markdown' },
        );
        return;
      }
      console.error('[ADMIN:/send]', err);
      await ctx.reply(`❌ Failed to send: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  bot.command('sendto', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const raw = (ctx.match ?? '').trim();
    const match = /^(-?\d+)(?:\s+([\s\S]+))?$/.exec(raw);
    if (!match) {
      await ctx.reply(
        'Usage: `/sendto <user_or_group_id> <message>` (or reply to media with `/sendto <chat_id>`).',
        { parse_mode: 'Markdown' },
      );
      return;
    }
    const targetId = Number(match[1]);
    const payload = (match[2] ?? '').trim();

    try {
      const sentId = await dispatchPayload(ctx, targetId, payload);
      await ctx.reply(`✅ Delivered to <code>${targetId}</code> (msg #${sentId}).`, {
        parse_mode: 'HTML',
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'EMPTY_PAYLOAD') {
        await ctx.reply('Include a message or reply to a media/message when using `/sendto`.', {
          parse_mode: 'Markdown',
        });
        return;
      }
      await ctx.reply(`❌ Could not send to ${targetId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  bot.command('reply', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const replyToId = ctx.message?.reply_to_message?.message_id;
    const text = (ctx.match ?? '').trim();
    if (!replyToId || !text) {
      await ctx.reply(
        'Reply to a user’s forwarded DM message in the Discussion Group with `/reply Your answer here`.',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const ref = state.getDmForwardRef(replyToId);
    if (!ref) {
      await ctx.reply('⚠️ Could not find the original DM user for that message.');
      return;
    }

    try {
      await ctx.api.sendMessage(ref.userId, `💬 <b>Admin Reply:</b>\n${escapeHtml(text)}`, {
        parse_mode: 'HTML',
        reply_parameters: { message_id: ref.dmMsgId },
      });
      await ctx.reply(`✅ Sent reply directly to ${escapeHtml(ref.userName)} in DM.`, {
        parse_mode: 'HTML',
        reply_parameters: { message_id: ctx.message!.message_id },
      });
    } catch (err) {
      await ctx.reply(`❌ Could not DM user (${ref.userId}): ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  bot.command(['promo', 'pinpromo'], async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const targetGroupId = state.getSettings().discussionGroupId;
    if (!targetGroupId) {
      await ctx.reply('⚠️ No Discussion Group set. Run `/setgroup <chat_id>` first.', {
        parse_mode: 'Markdown',
      });
      return;
    }
    const shouldPin = ctx.message?.text?.startsWith('/pinpromo') ?? false;

    try {
      const sentId = await dispatchPayload(ctx, targetGroupId, ctx.match ?? '', {
        isPromo: true,
        pin: shouldPin,
      });
      await ctx.reply(
        `✅ Promotion ${shouldPin ? 'sent & pinned' : 'sent'} in Discussion Group (msg #${sentId}).`,
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'EMPTY_PAYLOAD') {
        await ctx.reply(
          'Usage:\n`/promo Your promo text | Button Name | https://link`\nOr **reply** to a photo/banner/post with `/promo` (or `/pinpromo` to also pin it).',
          { parse_mode: 'Markdown' },
        );
        return;
      }
      await ctx.reply(`❌ Failed to send promo: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  bot.command('promoall', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    await runBroadcast(ctx, ctx.match ?? '', { includeGroup: true, isPromo: true });
  });

  bot.command('setpromo', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const raw = (ctx.match ?? '').trim();
    if (!raw) {
      await ctx.reply(
        'Usage:\n<code>/setpromo Download Prostuti App for HSC &amp; Admission! | Get App | https://prostuti.bd</code>\n(The button part after <code>|</code> is optional.)',
        { parse_mode: 'HTML' },
      );
      return;
    }
    const parsed = parseTextAndButton(raw);
    if (!parsed.text) {
      await ctx.reply('Please provide promotion text before the `|` button.', {
        parse_mode: 'Markdown',
      });
      return;
    }
    const updated = state.setPromo({
      enabled: true,
      text: parsed.text,
      buttonText: parsed.buttonText,
      buttonUrl: parsed.buttonUrl,
    });
    const kb =
      updated.buttonText && updated.buttonUrl
        ? new InlineKeyboard().url(updated.buttonText, updated.buttonUrl)
        : undefined;
    await ctx.reply(
      `✅ <b>Auto-Promo Enabled</b> (every ${updated.everyN} search${updated.everyN > 1 ? 'es' : ''}):\n\n${escapeHtml(updated.text)}`,
      { parse_mode: 'HTML', ...(kb ? { reply_markup: kb } : {}) },
    );
  });

  bot.command('setpromofreq', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const n = Number((ctx.match ?? '').trim());
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      await ctx.reply('Usage: `/setpromofreq <1-50>` (e.g. `1` = every search, `3` = every 3rd search).', {
        parse_mode: 'Markdown',
      });
      return;
    }
    state.setPromo({ everyN: n });
    await ctx.reply(`✅ Auto-promo frequency set to every **${n}** search${n > 1 ? 'es' : ''}.`, {
      parse_mode: 'Markdown',
    });
  });

  bot.command('viewpromo', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const promo = state.getPromo();
    if (!promo.enabled || !promo.text) {
      await ctx.reply('No active auto-promo. Set one with `/setpromo <text> | Button | https://url`.', {
        parse_mode: 'Markdown',
      });
      return;
    }
    const kb =
      promo.buttonText && promo.buttonUrl
        ? new InlineKeyboard().url(promo.buttonText, promo.buttonUrl)
        : undefined;
    await ctx.reply(
      `🎁 <b>Active Auto-Promo</b> (every ${promo.everyN} search${promo.everyN > 1 ? 'es' : ''}):\n\n${escapeHtml(promo.text)}`,
      { parse_mode: 'HTML', ...(kb ? { reply_markup: kb } : {}) },
    );
  });

  bot.command('clearpromo', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    state.clearPromo();
    await ctx.reply('✅ Auto-promo banner disabled and cleared.');
  });

  bot.command('users', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const users = state.getTrackedUsers();
    const groups = state.getTrackedGroups();
    const summary = state.getSummary();
    const recent = users.slice(0, 12).map((u, idx) => {
      const handle = u.username ? `@${u.username}` : 'no username';
      return `${idx + 1}. ${escapeHtml(u.firstName)} (${handle}) — <code>${u.id}</code> (${u.searches} searches)`;
    });
    const groupLines = groups
      .slice(0, 5)
      .map((g) => `• ${escapeHtml(g.title)} — <code>${g.id}</code>`);

    const msg = [
      `👥 <b>Users:</b> ${summary.totalUsers} | <b>Groups:</b> ${summary.totalGroups} | <b>Searches:</b> ${summary.totalSearches}`,
      '',
      '<b>Recent Users:</b>',
      ...(recent.length > 0 ? recent : ['No users tracked yet.']),
      ...(groupLines.length > 0 ? ['', '<b>Known Groups:</b>', ...groupLines] : []),
    ].join('\n');

    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  /* ------------------------------------------------------------------ */
  /* Ultra Admin Exclusive Commands (Full Control)                      */
  /* ------------------------------------------------------------------ */

  bot.command('broadcast', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    await runBroadcast(ctx, ctx.match ?? '', { includeGroup: false, isPromo: false });
  });

  bot.command('broadcastall', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    await runBroadcast(ctx, ctx.match ?? '', { includeGroup: true, isPromo: false });
  });

  bot.command('addadmin', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const targetId = parseTargetUserId(ctx, ctx.match ?? '');
    if (!targetId) {
      await ctx.reply('Usage: `/addadmin <user_id>` or reply to a user’s message with `/addadmin`.', {
        parse_mode: 'Markdown',
      });
      return;
    }
    const added = state.addAdmin(targetId);
    await ctx.reply(
      added
        ? `✅ User <code>${targetId}</code> promoted to <b>Admin</b>.`
        : `ℹ️ User <code>${targetId}</code> is already an Admin.`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('removeadmin', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const targetId = parseTargetUserId(ctx, ctx.match ?? '');
    if (!targetId) {
      await ctx.reply('Usage: `/removeadmin <user_id>` or reply to a user’s message with `/removeadmin`.', {
        parse_mode: 'Markdown',
      });
      return;
    }
    const result = state.removeAdmin(targetId);
    const messages = {
      removed: `✅ User <code>${targetId}</code> removed from Admins.`,
      ultra_protected: `⛔ Cannot remove Ultra Admin <code>${targetId}</code>.`,
      env_protected: `⚠️ User <code>${targetId}</code> is configured in <code>ADMIN_USER_IDS</code> env var — remove them there.`,
      not_found: `ℹ️ User <code>${targetId}</code> is not a dynamic Admin.`,
    };
    await ctx.reply(messages[result], { parse_mode: 'HTML' });
  });

  bot.command('admins', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const ultras = state.getUltraAdminIds().map((id) => `• <code>${id}</code>`);
    const envAdmins = Array.from(config.adminUserIds)
      .filter((id) => !state.isUltraAdmin(id))
      .map((id) => `• <code>${id}</code> (env)`);
    const dynAdmins = state
      .getDynamicAdminIds()
      .filter((id) => !state.isUltraAdmin(id))
      .map((id) => `• <code>${id}</code>`);
    const allAdmins = [...envAdmins, ...dynAdmins];

    await ctx.reply(
      [
        '👑 <b>Ultra Admins:</b>',
        ...(ultras.length > 0 ? ultras : ['(none)']),
        '',
        '🛡 <b>Admins:</b>',
        ...(allAdmins.length > 0 ? allAdmins : ['(none yet — use /addadmin <user_id>)']),
      ].join('\n'),
      { parse_mode: 'HTML' },
    );
  });

  bot.command('ban', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const targetId = parseTargetUserId(ctx, ctx.match ?? '');
    if (!targetId) {
      await ctx.reply('Usage: `/ban <user_id>` or reply to a user’s message with `/ban`.', {
        parse_mode: 'Markdown',
      });
      return;
    }
    const res = state.banUser(targetId);
    const messages = {
      banned: `🚫 User <code>${targetId}</code> banned from using the bot.`,
      protected: `⛔ Cannot ban an Admin/Ultra Admin (<code>${targetId}</code>).`,
      already: `ℹ️ User <code>${targetId}</code> is already banned.`,
    };
    await ctx.reply(messages[res], { parse_mode: 'HTML' });
  });

  bot.command('unban', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const targetId = parseTargetUserId(ctx, ctx.match ?? '');
    if (!targetId) {
      await ctx.reply('Usage: `/unban <user_id>` or reply to a user’s message with `/unban`.', {
        parse_mode: 'Markdown',
      });
      return;
    }
    const removed = state.unbanUser(targetId);
    await ctx.reply(
      removed
        ? `✅ User <code>${targetId}</code> unbanned.`
        : `ℹ️ User <code>${targetId}</code> was not banned.`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('banned', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const list = state.getBannedUserIds();
    await ctx.reply(
      list.length > 0
        ? `🚫 <b>Banned Users (${list.length}):</b>\n${list.map((id) => `• <code>${id}</code>`).join('\n')}`
        : '✅ No banned users.',
      { parse_mode: 'HTML' },
    );
  });

  bot.command('toggleforward', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const next = !state.getSettings().autoForwardDm;
    state.updateSettings({ autoForwardDm: next });
    await ctx.reply(`🔁 DM Auto-Forward is now **${next ? 'ON' : 'OFF'}**.`, {
      parse_mode: 'Markdown',
    });
  });

  bot.command('togglebotreply', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const next = !state.getSettings().forwardDmBotReply;
    state.updateSettings({ forwardDmBotReply: next });
    await ctx.reply(`💬 Mirror AI Reply to Discussion Group is now **${next ? 'ON' : 'OFF'}**.`, {
      parse_mode: 'Markdown',
    });
  });

  bot.command('toggleai', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const next = !state.getSettings().aiEnabled;
    state.updateSettings({ aiEnabled: next });
    await ctx.reply(
      `🤖 Gemini AI is now **${next ? 'ON' : 'OFF (Local Search Mode)'}**.`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('maintenance', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const arg = (ctx.match ?? '').trim().toLowerCase();
    const current = state.getSettings().maintenance;
    const next = arg === 'on' ? true : arg === 'off' ? false : !current;
    state.updateSettings({ maintenance: next });
    await ctx.reply(
      `🛠 Maintenance Mode is now **${next ? 'ON (non-admins paused)' : 'OFF (live for everyone)'}**.`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('setcooldown', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const sec = Number((ctx.match ?? '').trim());
    if (!Number.isInteger(sec) || sec < 0 || sec > 300) {
      await ctx.reply('Usage: `/setcooldown <0-300>` (seconds).', { parse_mode: 'Markdown' });
      return;
    }
    state.updateSettings({ cooldownSeconds: sec });
    await ctx.reply(`⏱ User search cooldown set to **${sec}s**.`, { parse_mode: 'Markdown' });
  });

  bot.command('setgroup', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const raw = (ctx.match ?? '').trim();
    let targetId: number | null = null;
    if (/^-?\d+$/.test(raw)) {
      targetId = Number(raw);
    } else if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      targetId = ctx.chat.id;
    }
    if (!targetId) {
      await ctx.reply('Run `/setgroup` inside your Discussion Group, or pass `/setgroup -100...`.', {
        parse_mode: 'Markdown',
      });
      return;
    }
    state.updateSettings({ discussionGroupId: targetId });
    await ctx.reply(`✅ Discussion Group set to <code>${targetId}</code>.`, {
      parse_mode: 'HTML',
    });
  });

  bot.command('addpdf', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const raw = (ctx.match ?? '').trim();
    const pipeIdx = raw.indexOf('|');
    if (pipeIdx < 1) {
      await ctx.reply(
        'Usage: `/addpdf <channel_message_id> | <Book Title>`\nExample: `/addpdf 2025 | হাজারী স্যার রসায়ন ২য় পত্র ২০২৭`',
        { parse_mode: 'Markdown' },
      );
      return;
    }
    const id = raw.slice(0, pipeIdx).trim();
    const title = raw.slice(pipeIdx + 1).trim();
    if (!/^\d+$/.test(id) || title.length < 3) {
      await ctx.reply('Provide a valid numeric channel message ID and a book title.');
      return;
    }
    const added = store.addManualResource(id, title, 'PDF');
    await ctx.reply(
      `✅ Added to index:\n📄 <b>${escapeHtml(added.title)}</b>\n🔗 ${escapeHtml(added.telegramUrl)}`,
      { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
    );
  });

  bot.command('delpdf', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const id = (ctx.match ?? '').trim();
    if (!/^\d+$/.test(id)) {
      await ctx.reply('Usage: `/delpdf <channel_message_id>`', { parse_mode: 'Markdown' });
      return;
    }
    const removed = store.deleteById(id);
    await ctx.reply(
      removed
        ? `🗑 Removed post <code>#${id}</code> from the live index.`
        : `ℹ️ Post <code>#${id}</code> was not found in the index.`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('reseed', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const res = store.seedFromRepo({ preserveExisting: true });
    await ctx.reply(
      `✅ Re-seeded from CSV!\n• Total indexed: <b>${res.total}</b>\n• Added new rows: <b>${res.addedFromRepo}</b>`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('exportindex', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    const stats = store.getStats();
    await ctx.replyWithDocument(new InputFile(store.getIndexPath(), 'index.json'), {
      caption: `Index export | Total: ${stats.total} | PDFs: ${stats.pdfCount} | Updated: ${stats.updatedAt}`,
    });
  });

  bot.command('exportstate', async (ctx) => {
    if (!(await requireUltraAdmin(ctx))) return;
    state.saveNow();
    const summary = state.getSummary();
    await ctx.replyWithDocument(new InputFile(state.getStatePath(), 'state.json'), {
      caption: `State export | Users: ${summary.totalUsers} | Searches: ${summary.totalSearches} | Admins: ${summary.totalAdmins}`,
    });
  });
}
