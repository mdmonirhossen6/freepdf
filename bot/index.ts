import dns from 'node:dns';
import { createServer } from 'node:http';
import { Bot } from 'grammy';

// Prevents Windows / ISP IPv6 hangs when connecting to api.telegram.org.
dns.setDefaultResultOrder('ipv4first');

import { PdfAiEngine } from './ai.ts';
import { loadConfig } from './config.ts';
import { registerHandlers } from './handlers.ts';
import { ResourceStore } from './store.ts';

async function main(): Promise<void> {
  const config = loadConfig({ requireTelegram: true });
  const store = new ResourceStore(config.indexPath, config.channelUsername);
  const { seeded, stats } = store.init();

  console.log('──────────────────────────────────────────────');
  console.log(`FreePDF AI Bot — @${config.channelUsername}`);
  console.log('──────────────────────────────────────────────');
  console.log(`Index path : ${config.indexPath} (${seeded ? 'freshly seeded' : 'loaded'})`);
  console.log(`Resources  : ${stats.total} total (${stats.pdfCount} PDFs) | latest #${stats.newestId} (${stats.newestDate})`);
  console.log(`AI Engine  : ${config.geminiApiKey ? `Gemini (${config.geminiModel})` : 'DISABLED (using local fallback)'}`);
  console.log(`Delivery   : ${config.deliveryMode} | Realtime auto-index: ${config.autoIndex ? 'ON' : 'OFF (CSV snapshot)'}`);
  console.log(
    `Groups     : ${config.allowedGroupIds.size > 0 ? [...config.allowedGroupIds].join(', ') : 'All groups allowed'}`,
  );

  const ai = new PdfAiEngine(config);
  const bot = new Bot(config.telegramBotToken);

  // Auto-discover linked discussion group ID from the channel if not explicitly set in .env.
  if (config.autoForwardDm && !config.discussionGroupId) {
    try {
      const channelInfo = await bot.api.getChat(config.channelId);
      if ('linked_chat_id' in channelInfo && typeof channelInfo.linked_chat_id === 'number') {
        config.discussionGroupId = channelInfo.linked_chat_id;
        console.log(`Discussion : Auto-detected linked group ${config.discussionGroupId}`);
      }
    } catch (err) {
      console.warn('[BOT] Could not auto-detect linked discussion group:', err);
    }
  } else if (config.autoForwardDm && config.discussionGroupId) {
    console.log(`Discussion : Auto-forwarding DM text -> ${config.discussionGroupId}`);
  }

  bot.catch((err) => {
    console.error(`[BOT ERROR] update ${err.ctx.update.update_id}:`, err.error);
  });

  registerHandlers(bot, config, store, ai);

  // Register convenient slash commands in Telegram's command menu.
  await bot.api
    .setMyCommands([
      { command: 'pdf', description: 'Search & get a PDF (e.g. /pdf physics 2nd paper)' },
      { command: 'search', description: 'Search PDFs in the channel' },
      { command: 'stats', description: 'Show indexed PDF count & bot status' },
      { command: 'help', description: 'How to search for PDFs' },
    ])
    .catch((err) => console.warn('[BOT] setMyCommands warning:', err));

  // Lightweight HTTP health endpoint for Render / Railway / Koyeb / VPS monitoring.
  const server = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const current = store.getStats();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          channel: config.channelUsername,
          ai: ai.isEnabled() ? config.geminiModel : 'local-fallback',
          ...current,
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end('Not Found');
  });

  server.on('error', (err) => {
    console.warn(`[HEALTH] Could not bind port ${config.port} (${err.message}) — bot will still run normally.`);
  });
  server.listen(config.port, () => {
    console.log(`Health HTTP: http://127.0.0.1:${config.port}/health`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n[BOT] Received ${signal}, shutting down gracefully...`);
    server.close();
    bot.stop();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  await bot.start({
    allowed_updates: ['message', 'callback_query', 'channel_post', 'edited_channel_post'],
    onStart: (botInfo) => {
      console.log(`[BOT] Live as @${botInfo.username} (id=${botInfo.id})`);
      console.log('──────────────────────────────────────────────');
    },
  });
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
