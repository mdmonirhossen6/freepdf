import type { Resource } from '../lib/types.ts';

export interface BotResource extends Resource {
  /** Original Telegram document filename, when available (e.g. from CSV or channel_post). */
  filename?: string;
  /** Telegram file_id captured from live channel_post updates (optional). */
  fileId?: string;
}

export interface IndexSnapshot {
  version: 1;
  channel: string;
  updatedAt: string;
  resources: BotResource[];
}

export interface AiQueryPlan {
  isPdfRequest: boolean;
  searchQueries: string[];
  preferPdfOnly: boolean;
  language: 'bn' | 'en' | 'banglish';
  chatReply?: string;
}

export interface AiSearchDecision {
  isPdfRequest: boolean;
  bestMatchId: string | null;
  similarIds: string[];
  replyText: string;
  usedAi: boolean;
  candidatesChecked: number;
  expandedQueries: string[];
}

export interface ConversationContext {
  userQuery: string;
  bestMatchId: string | null;
  bestMatchTitle: string | null;
  similarTitles: string[];
  timestamp: number;
}
