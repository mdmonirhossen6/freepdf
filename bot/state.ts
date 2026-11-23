import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Chat, User } from 'grammy/types';

import type { BotConfig } from './config.ts';

export interface TrackedUser {
  id: number;
  firstName: string;
  username?: string;
  firstSeen: string;
  lastSeen: string;
  searches: number;
}

export interface TrackedGroup {
  id: number;
  title: string;
  type: string;
  lastSeen: string;
}

export interface PromoConfig {
  enabled: boolean;
  text: string;
  buttonText?: string;
  buttonUrl?: string;
  everyN: number;
}

export interface RuntimeSettings {
  autoForwardDm: boolean;
  forwardDmBotReply: boolean;
  aiEnabled: boolean;
  maintenance: boolean;
  cooldownSeconds: number;
  discussionGroupId: number | null;
}

export interface DmForwardRef {
  userId: number;
  dmMsgId: number;
  userName: string;
  at: number;
}

export interface BotStateSnapshot {
  version: 1;
  updatedAt: string;
  totalSearches: number;
  admins: number[];
  bannedUsers: number[];
  promo: PromoConfig;
  settings: RuntimeSettings;
  users: Record<string, TrackedUser>;
  groups: Record<string, TrackedGroup>;
  dmForwardMap: Record<string, DmForwardRef>;
}

const MAX_DM_FORWARD_REFS = 500;

export class BotStateStore {
  private readonly statePath: string;
  private readonly config: BotConfig;
  private data: BotStateSnapshot;
  private searchPromoCounter = 0;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(config: BotConfig) {
    this.config = config;
    this.statePath = config.statePath;
    this.data = this.defaultSnapshot();
  }

  private defaultSnapshot(): BotStateSnapshot {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      totalSearches: 0,
      admins: [],
      bannedUsers: [],
      promo: {
        enabled: Boolean(this.config.defaultPromoText),
        text: this.config.defaultPromoText ?? '',
        buttonText: this.config.defaultPromoButtonText,
        buttonUrl: this.config.defaultPromoButtonUrl,
        everyN: 1,
      },
      settings: {
        autoForwardDm: this.config.autoForwardDm,
        forwardDmBotReply: this.config.forwardDmBotReply,
        aiEnabled: true,
        maintenance: false,
        cooldownSeconds: this.config.cooldownSeconds,
        discussionGroupId: this.config.discussionGroupId,
      },
      users: {},
      groups: {},
      dmForwardMap: {},
    };
  }

  init(): void {
    if (!existsSync(this.statePath)) {
      this.saveNow();
      return;
    }

    try {
      const parsed = JSON.parse(readFileSync(this.statePath, 'utf8')) as Partial<BotStateSnapshot>;
      const defaults = this.defaultSnapshot();
      this.data = {
        version: 1,
        updatedAt: parsed.updatedAt ?? defaults.updatedAt,
        totalSearches: typeof parsed.totalSearches === 'number' ? parsed.totalSearches : 0,
        admins: Array.isArray(parsed.admins)
          ? parsed.admins.filter((n) => Number.isSafeInteger(n))
          : [],
        bannedUsers: Array.isArray(parsed.bannedUsers)
          ? parsed.bannedUsers.filter((n) => Number.isSafeInteger(n))
          : [],
        promo: {
          ...defaults.promo,
          ...(parsed.promo ?? {}),
          everyN: Math.max(1, Math.floor(parsed.promo?.everyN ?? defaults.promo.everyN)),
        },
        settings: {
          ...defaults.settings,
          ...(parsed.settings ?? {}),
        },
        users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
        groups: parsed.groups && typeof parsed.groups === 'object' ? parsed.groups : {},
        dmForwardMap:
          parsed.dmForwardMap && typeof parsed.dmForwardMap === 'object'
            ? parsed.dmForwardMap
            : {},
      };
    } catch (err) {
      console.warn('[STATE] Failed to load state.json, starting fresh:', err);
      this.data = this.defaultSnapshot();
      this.saveNow();
    }
  }

  getStatePath(): string {
    return this.statePath;
  }

  /* ------------------------------------------------------------------ */
  /* Roles & Moderation                                                 */
  /* ------------------------------------------------------------------ */

  isUltraAdmin(userId?: number): boolean {
    if (!userId) return false;
    return this.config.ultraAdminIds.has(userId);
  }

  isAdmin(userId?: number): boolean {
    if (!userId) return false;
    if (this.isUltraAdmin(userId)) return true;
    if (this.config.adminUserIds.has(userId)) return true;
    return this.data.admins.includes(userId);
  }

  isBanned(userId?: number): boolean {
    if (!userId) return false;
    if (this.isAdmin(userId)) return false;
    return this.data.bannedUsers.includes(userId);
  }

  getUltraAdminIds(): number[] {
    return Array.from(this.config.ultraAdminIds);
  }

  getAllAdminIds(): number[] {
    return Array.from(
      new Set([...this.config.ultraAdminIds, ...this.config.adminUserIds, ...this.data.admins]),
    );
  }

  getDynamicAdminIds(): number[] {
    return [...this.data.admins];
  }

  addAdmin(userId: number): boolean {
    if (this.isAdmin(userId)) return false;
    this.data.admins.push(userId);
    // Unban automatically if promoted.
    this.data.bannedUsers = this.data.bannedUsers.filter((id) => id !== userId);
    this.saveNow();
    return true;
  }

  removeAdmin(userId: number): 'removed' | 'ultra_protected' | 'env_protected' | 'not_found' {
    if (this.isUltraAdmin(userId)) return 'ultra_protected';
    if (this.config.adminUserIds.has(userId) && !this.data.admins.includes(userId)) {
      return 'env_protected';
    }
    const before = this.data.admins.length;
    this.data.admins = this.data.admins.filter((id) => id !== userId);
    if (this.data.admins.length === before) return 'not_found';
    this.saveNow();
    return 'removed';
  }

  banUser(userId: number): 'banned' | 'protected' | 'already' {
    if (this.isAdmin(userId)) return 'protected';
    if (this.data.bannedUsers.includes(userId)) return 'already';
    this.data.bannedUsers.push(userId);
    this.saveNow();
    return 'banned';
  }

  unbanUser(userId: number): boolean {
    const before = this.data.bannedUsers.length;
    this.data.bannedUsers = this.data.bannedUsers.filter((id) => id !== userId);
    if (this.data.bannedUsers.length === before) return false;
    this.saveNow();
    return true;
  }

  getBannedUserIds(): number[] {
    return [...this.data.bannedUsers];
  }

  /* ------------------------------------------------------------------ */
  /* Runtime Settings                                                   */
  /* ------------------------------------------------------------------ */

  getSettings(): RuntimeSettings {
    return this.data.settings;
  }

  updateSettings(patch: Partial<RuntimeSettings>): RuntimeSettings {
    this.data.settings = { ...this.data.settings, ...patch };
    this.saveNow();
    return this.data.settings;
  }

  /* ------------------------------------------------------------------ */
  /* Promotion Banner                                                   */
  /* ------------------------------------------------------------------ */

  getPromo(): PromoConfig {
    return this.data.promo;
  }

  setPromo(promo: Partial<PromoConfig>): PromoConfig {
    this.data.promo = {
      ...this.data.promo,
      ...promo,
      everyN: Math.max(1, Math.floor(promo.everyN ?? this.data.promo.everyN ?? 1)),
    };
    this.saveNow();
    return this.data.promo;
  }

  clearPromo(): void {
    this.data.promo = {
      enabled: false,
      text: '',
      buttonText: undefined,
      buttonUrl: undefined,
      everyN: this.data.promo.everyN || 1,
    };
    this.saveNow();
  }

  /** Returns the active promo if enabled and due for this search turn. */
  consumePromoIfDue(): PromoConfig | null {
    const promo = this.data.promo;
    if (!promo.enabled || !promo.text.trim()) return null;
    this.searchPromoCounter += 1;
    const freq = Math.max(1, promo.everyN || 1);
    if (this.searchPromoCounter % freq !== 0) return null;
    return promo;
  }

  /* ------------------------------------------------------------------ */
  /* Users, Groups & DM-Forward Tracking                                */
  /* ------------------------------------------------------------------ */

  trackUser(user: User | undefined, options: { isDm?: boolean; isSearch?: boolean } = {}): void {
    if (!user || user.is_bot) return;
    const key = String(user.id);
    const now = new Date().toISOString();
    const existing = this.data.users[key];
    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'User';

    if (existing) {
      existing.firstName = displayName;
      existing.username = user.username || existing.username;
      existing.lastSeen = now;
      if (options.isSearch) existing.searches += 1;
    } else if (options.isDm || options.isSearch) {
      this.data.users[key] = {
        id: user.id,
        firstName: displayName,
        username: user.username,
        firstSeen: now,
        lastSeen: now,
        searches: options.isSearch ? 1 : 0,
      };
    }

    if (options.isSearch) {
      this.data.totalSearches += 1;
    }

    this.scheduleSave();
  }

  trackGroup(chat: Chat | undefined): void {
    if (!chat || chat.type === 'private' || chat.type === 'channel') return;
    const key = String(chat.id);
    const title = 'title' in chat && chat.title ? chat.title : `Group ${chat.id}`;
    this.data.groups[key] = {
      id: chat.id,
      title,
      type: chat.type,
      lastSeen: new Date().toISOString(),
    };
    this.scheduleSave();
  }

  recordDmForward(groupMsgId: number, userId: number, dmMsgId: number, userName: string): void {
    this.data.dmForwardMap[String(groupMsgId)] = {
      userId,
      dmMsgId,
      userName,
      at: Date.now(),
    };
    const keys = Object.keys(this.data.dmForwardMap);
    if (keys.length > MAX_DM_FORWARD_REFS) {
      keys
        .sort((a, b) => (this.data.dmForwardMap[a]?.at ?? 0) - (this.data.dmForwardMap[b]?.at ?? 0))
        .slice(0, keys.length - MAX_DM_FORWARD_REFS)
        .forEach((k) => {
          delete this.data.dmForwardMap[k];
        });
    }
    this.scheduleSave();
  }

  getDmForwardRef(groupMsgId: number): DmForwardRef | undefined {
    return this.data.dmForwardMap[String(groupMsgId)];
  }

  getTrackedUsers(): TrackedUser[] {
    return Object.values(this.data.users).sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
  }

  getTrackedGroups(): TrackedGroup[] {
    return Object.values(this.data.groups).sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
  }

  getSummary() {
    return {
      totalUsers: Object.keys(this.data.users).length,
      totalGroups: Object.keys(this.data.groups).length,
      totalSearches: this.data.totalSearches,
      totalAdmins: this.getAllAdminIds().length,
      bannedCount: this.data.bannedUsers.length,
      promoEnabled: this.data.promo.enabled && Boolean(this.data.promo.text.trim()),
      settings: this.data.settings,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Atomic Persistence                                                 */
  /* ------------------------------------------------------------------ */

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 1500);
  }

  saveNow(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.data.updatedAt = new Date().toISOString();
    mkdirSync(dirname(this.statePath), { recursive: true });
    const tmpPath = `${this.statePath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
    renameSync(tmpPath, this.statePath);
  }
}
