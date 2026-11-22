import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '..');

// Load .env.local first (if present), then .env without overriding already-set vars.
for (const filename of ['.env.local', '.env']) {
  const envPath = resolve(REPO_ROOT, filename);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

export type DeliveryMode = 'link' | 'copy';

export interface BotConfig {
  telegramBotToken: string;
  geminiApiKey: string;
  geminiModel: string;
  channelId: string;
  channelUsername: string;
  deliveryMode: DeliveryMode;
  autoIndex: boolean;
  discussionGroupId: number | null;
  autoForwardDm: boolean;
  forwardDmBotReply: boolean;
  allowedGroupIds: Set<number>;
  adminUserIds: Set<number>;
  backupChatId: string | null;
  indexPath: string;
  cooldownSeconds: number;
  maxSimilarButtons: number;
  port: number;
  autoDeleteSeconds: number;
}

function parseIdSet(raw: string | undefined): Set<number> {
  const out = new Set<number>();
  if (!raw) return out;
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const num = Number(trimmed);
    if (Number.isSafeInteger(num)) out.add(num);
  }
  return out;
}

function normalizeChannelId(raw: string | undefined): string {
  const value = (raw ?? '@hscfreepdf').trim();
  if (!value) return '@hscfreepdf';
  if (/^-?\d+$/.test(value)) return value;
  return value.startsWith('@') ? value : `@${value}`;
}

function deriveChannelUsername(channelId: string, explicitUsername: string | undefined): string {
  const cleanExplicit = (explicitUsername ?? '').trim().replace(/^@/, '');
  if (cleanExplicit) return cleanExplicit;
  if (channelId.startsWith('@')) return channelId.slice(1);
  return 'hscfreepdf';
}

export function loadConfig(options: { requireTelegram?: boolean } = {}): BotConfig {
  const requireTelegram = options.requireTelegram ?? true;
  const telegramBotToken = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();

  if (requireTelegram && !telegramBotToken) {
    throw new Error(
      'Missing TELEGRAM_BOT_TOKEN. Copy .env.example to .env and add your BotFather token.',
    );
  }

  const channelId = normalizeChannelId(process.env.CHANNEL_ID);
  const channelUsername = deriveChannelUsername(channelId, process.env.CHANNEL_USERNAME);
  const defaultIndexPath = resolve(REPO_ROOT, 'bot', 'data', 'index.json');
  const indexPath = process.env.INDEX_PATH?.trim()
    ? resolve(REPO_ROOT, process.env.INDEX_PATH.trim())
    : defaultIndexPath;

  const parsedCooldown = Number(process.env.COOLDOWN_SECONDS);
  const cooldownSeconds =
    Number.isFinite(parsedCooldown) && parsedCooldown >= 0 ? parsedCooldown : 5;

  const parsedMaxSimilar = Number(process.env.MAX_SIMILAR_BUTTONS);
  const maxSimilarButtons =
    Number.isFinite(parsedMaxSimilar) && parsedMaxSimilar >= 1 && parsedMaxSimilar <= 8
      ? Math.floor(parsedMaxSimilar)
      : 5;

  const parsedPort = Number(process.env.PORT);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? Math.floor(parsedPort) : 3847;

  const parsedAutoDelete = Number(process.env.AUTO_DELETE_SECONDS);
  const autoDeleteSeconds =
    Number.isFinite(parsedAutoDelete) && parsedAutoDelete > 0 ? Math.floor(parsedAutoDelete) : 0;

  const rawDelivery = (process.env.DELIVERY_MODE ?? 'link').trim().toLowerCase();
  const deliveryMode: DeliveryMode = rawDelivery === 'copy' ? 'copy' : 'link';
  const autoIndex = (process.env.AUTO_INDEX ?? 'false').trim().toLowerCase() === 'true';

  const parsedDiscussionId = Number(process.env.DISCUSSION_GROUP_ID?.trim());
  const discussionGroupId =
    process.env.DISCUSSION_GROUP_ID?.trim() && Number.isSafeInteger(parsedDiscussionId)
      ? parsedDiscussionId
      : null;
  const autoForwardDm = (process.env.AUTO_FORWARD_DM ?? 'true').trim().toLowerCase() !== 'false';
  const forwardDmBotReply =
    (process.env.FORWARD_DM_BOT_REPLY ?? 'true').trim().toLowerCase() !== 'false';

  return {
    telegramBotToken,
    geminiApiKey: (process.env.GEMINI_API_KEY ?? '').trim(),
    geminiModel:
      (process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite').trim() || 'gemini-3.5-flash-lite',
    channelId,
    channelUsername,
    deliveryMode,
    autoIndex,
    discussionGroupId,
    autoForwardDm,
    forwardDmBotReply,
    allowedGroupIds: parseIdSet(process.env.ALLOWED_GROUP_IDS),
    adminUserIds: parseIdSet(process.env.ADMIN_USER_IDS),
    backupChatId: process.env.BACKUP_CHAT_ID?.trim() || null,
    indexPath,
    cooldownSeconds,
    maxSimilarButtons,
    port,
    autoDeleteSeconds,
  };
}
