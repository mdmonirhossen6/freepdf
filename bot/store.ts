import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Message } from 'grammy/types';

import { RESOURCES } from '../lib/generated/resources.ts';
import {
  buildDescription,
  cleanTitle,
  conceptTokensFor,
  extractMessageIdFromTitle,
  extractYearTokens,
  genericLabelFor,
  inferCategories,
  isGenericRawTitle,
  normalizeText,
  tokenize,
  typeBucketFor,
} from '../lib/text.ts';
import type { ResourceCategory } from '../lib/types.ts';
import { REPO_ROOT } from './config.ts';
import type { BotResource, IndexSnapshot } from './types.ts';

const CSV_PATH = resolve(REPO_ROOT, 'data', 'source', 'HSCFreePDF_Complete_Index.csv');

interface CsvRowData {
  id: string;
  date: string;
  title: string;
  type: string;
  telegramUrl: string;
  filename?: string;
}

/** Minimal RFC-4180 CSV parser reading full rows from HSCFreePDF_Complete_Index.csv. */
function parseCsvRows(csvPath: string): Map<string, CsvRowData> {
  const map = new Map<string, CsvRowData>();
  if (!existsSync(csvPath)) return map;

  const text = readFileSync(csvPath, 'utf8');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      continue;
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length < 2) return map;
  const header = rows[0].map((col) => col.trim().toLowerCase());
  const idIdx = header.indexOf('primary_message_id');
  const dateIdx = header.indexOf('date');
  const titleIdx = header.indexOf('title');
  const typeIdx = header.indexOf('type');
  const linkIdx = header.indexOf('telegram_link');
  const fileIdx = header.indexOf('filename');
  if (idIdx < 0) return map;

  for (let i = 1; i < rows.length; i += 1) {
    const cols = rows[i];
    const id = (cols[idIdx] ?? '').trim();
    if (!id) continue;
    map.set(id, {
      id,
      date: (dateIdx >= 0 ? cols[dateIdx] : '')?.trim() || '',
      title: (titleIdx >= 0 ? cols[titleIdx] : '')?.trim() || '',
      type: (typeIdx >= 0 ? cols[typeIdx] : '')?.trim() || 'Other',
      telegramUrl: (linkIdx >= 0 ? cols[linkIdx] : '')?.trim() || '',
      filename: (fileIdx >= 0 ? cols[fileIdx] : '')?.trim() || undefined,
    });
  }

  return map;
}

function filenameToTokens(filename: string | undefined): string[] {
  if (!filename) return [];
  const withoutExt = filename.replace(/\.(pdf|apk|docx?|pptx?|zip|rar)$/i, '');
  const normalized = normalizeText(withoutExt);
  if (!normalized) return [];
  const tokens = tokenize(normalized);
  return [...tokens, ...conceptTokensFor(normalized, tokens)];
}

function filenameToFallbackTitle(filename: string): string {
  return filename
    .replace(/\.(pdf|apk|docx?|pptx?|zip|rar)$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sortResources(list: BotResource[]): BotResource[] {
  return list.sort((a, b) => {
    if (a.date === b.date) return Number(b.id) - Number(a.id);
    return a.date < b.date ? 1 : -1;
  });
}

function detectSourceType(msg: Message): { sourceType: string; filename?: string; fileId?: string } {
  if (msg.document) {
    const filename = msg.document.file_name?.trim() || undefined;
    const mime = (msg.document.mime_type ?? '').toLowerCase();
    const fileId = msg.document.file_id;
    if (mime === 'application/pdf' || (filename && /\.pdf$/i.test(filename))) {
      return { sourceType: 'PDF', filename, fileId };
    }
    if (
      mime === 'application/vnd.android.package-archive' ||
      (filename && /\.apk$/i.test(filename))
    ) {
      return { sourceType: 'APK', filename, fileId };
    }
    return { sourceType: 'File', filename, fileId };
  }
  if (msg.photo && msg.photo.length > 0) {
    return { sourceType: 'Image' };
  }
  if (msg.video) {
    return { sourceType: 'Video', filename: msg.video.file_name?.trim() || undefined };
  }
  if (msg.audio) {
    return { sourceType: 'Audio', filename: msg.audio.file_name?.trim() || undefined };
  }
  if (msg.text) {
    return { sourceType: 'Text' };
  }
  return { sourceType: 'Media' };
}

export interface StoreStats {
  total: number;
  pdfCount: number;
  newestDate: string;
  newestId: string;
  updatedAt: string;
}

export class ResourceStore {
  private readonly indexPath: string;
  private readonly channelUsername: string;
  private byId = new Map<string, BotResource>();
  private list: BotResource[] = [];
  private updatedAt = new Date().toISOString();

  constructor(indexPath: string, channelUsername: string) {
    this.indexPath = indexPath;
    this.channelUsername = channelUsername;
  }

  /** Loads index.json if present, or seeds it from the repo's built-in dataset. */
  init(): { seeded: boolean; stats: StoreStats } {
    if (existsSync(this.indexPath)) {
      try {
        const raw = readFileSync(this.indexPath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<IndexSnapshot>;
        if (Array.isArray(parsed.resources) && parsed.resources.length > 0) {
          this.updatedAt = parsed.updatedAt ?? new Date().toISOString();
          this.setResources(parsed.resources);
          return { seeded: false, stats: this.getStats() };
        }
      } catch (err) {
        console.warn('[STORE] Failed to parse existing index.json, re-seeding:', err);
      }
    }

    this.seedFromRepo({ preserveExisting: false });
    return { seeded: true, stats: this.getStats() };
  }

  /** Seeds index.json from lib/generated/resources.ts + HSCFreePDF_Complete_Index.csv. */
  seedFromRepo(options: { preserveExisting?: boolean } = {}): {
    total: number;
    filenamesMatched: number;
    addedFromRepo: number;
  } {
    const preserveExisting = options.preserveExisting ?? true;
    const csvRows = parseCsvRows(CSV_PATH);
    let filenamesMatched = 0;
    let addedFromRepo = 0;

    if (!preserveExisting) {
      this.byId.clear();
    } else if (this.byId.size === 0 && existsSync(this.indexPath)) {
      try {
        const parsed = JSON.parse(readFileSync(this.indexPath, 'utf8')) as Partial<IndexSnapshot>;
        if (Array.isArray(parsed.resources)) {
          for (const item of parsed.resources) this.byId.set(item.id, item);
        }
      } catch {
        // Ignore corrupt file during merge seed.
      }
    }

    for (const base of RESOURCES) {
      const filename = csvRows.get(base.id)?.filename;
      if (filename) filenamesMatched += 1;

      const existing = this.byId.get(base.id);
      if (existing && preserveExisting) {
        // Enrich filename if missing, without overwriting live-edited posts.
        if (filename && !existing.filename) {
          existing.filename = filename;
          existing.searchTokens = Array.from(
            new Set([...existing.searchTokens, ...filenameToTokens(filename)]),
          );
        }
        continue;
      }

      const searchTokens = filename
        ? Array.from(new Set([...base.searchTokens, ...filenameToTokens(filename)]))
        : [...base.searchTokens];

      const years = filename
        ? Array.from(new Set([...base.years, ...extractYearTokens(normalizeText(filename))]))
        : [...base.years];

      const enriched: BotResource = {
        ...base,
        filename,
        searchTokens,
        years,
      };
      this.byId.set(enriched.id, enriched);
      addedFromRepo += 1;
    }

    // Also ingest any newer rows directly from HSCFreePDF_Complete_Index.csv
    // so dropping an updated CSV and running `npm run bot:seed` works immediately.
    for (const csv of csvRows.values()) {
      if (this.byId.has(csv.id)) continue;
      const sourceType = csv.type || (csv.filename && /\.pdf$/i.test(csv.filename) ? 'PDF' : 'Other');
      const type = typeBucketFor(sourceType);
      const rawTitle = csv.title || (csv.filename ? filenameToFallbackTitle(csv.filename) : '');
      const generic = !rawTitle || isGenericRawTitle(rawTitle);
      const cleaned = generic ? '' : cleanTitle(rawTitle).title;
      const title =
        cleaned || (csv.filename ? filenameToFallbackTitle(csv.filename) : genericLabelFor(sourceType));
      const normalizedTitle = normalizeText(title);
      const categories = inferCategories(title, type);
      const titleTokens = tokenize(normalizedTitle);
      const searchTokens = Array.from(
        new Set([
          ...titleTokens,
          ...conceptTokensFor(normalizedTitle, titleTokens),
          ...tokenize(normalizeText(sourceType)),
          ...filenameToTokens(csv.filename),
        ]),
      );
      const years = extractYearTokens(normalizeText(`${rawTitle} ${title} ${csv.filename ?? ''}`));
      if (csv.filename) filenamesMatched += 1;

      this.byId.set(csv.id, {
        id: csv.id,
        title,
        rawTitle: rawTitle || title,
        normalizedTitle,
        date: csv.date || new Date().toISOString().slice(0, 10),
        type,
        typeLabel: sourceType,
        category: categories[0] as ResourceCategory,
        categories,
        telegramUrl: csv.telegramUrl || `https://t.me/${this.channelUsername}/${csv.id}`,
        description: generic ? '' : buildDescription(rawTitle, normalizedTitle),
        searchTokens,
        years,
        genericTitle: generic && !csv.filename,
        derivedFromId: null,
        filename: csv.filename,
      });
      addedFromRepo += 1;
    }

    this.rebuildList();
    this.save();
    return { total: this.list.length, filenamesMatched, addedFromRepo };
  }

  /** Indexes a live channel_post or edited_channel_post without any database. */
  upsertFromTelegramMessage(msg: Message): BotResource | null {
    const { sourceType, filename, fileId } = detectSourceType(msg);
    const captionOrText = (msg.caption ?? msg.text ?? '').trim();

    // Ignore empty service messages with neither text/caption nor document/photo.
    if (!captionOrText && !filename && sourceType === 'Media') {
      return null;
    }

    const id = String(msg.message_id);
    const date = new Date(msg.date * 1000).toISOString().slice(0, 10);
    const telegramUrl = `https://t.me/${this.channelUsername}/${id}`;
    const type = typeBucketFor(sourceType);
    const rawTitle = captionOrText || (filename ? filenameToFallbackTitle(filename) : '');

    let title = '';
    let genericTitle = false;
    let derivedFromId: string | null = null;

    if (!rawTitle || isGenericRawTitle(rawTitle)) {
      if (filename) {
        title = filenameToFallbackTitle(filename);
        genericTitle = title.length < 3;
      } else {
        const linkedId = extractMessageIdFromTitle(rawTitle);
        const linked = linkedId && linkedId !== id ? this.byId.get(linkedId) : undefined;
        if (linked && linked.title && !linked.genericTitle) {
          title = linked.title;
          derivedFromId = linkedId;
          genericTitle = true;
        } else {
          title = genericLabelFor(sourceType);
          genericTitle = true;
        }
      }
    } else {
      const cleaned = cleanTitle(rawTitle).title;
      title = cleaned || (filename ? filenameToFallbackTitle(filename) : genericLabelFor(sourceType));
      genericTitle = !cleaned && !filename;
    }

    const normalizedTitle = normalizeText(title);
    const categories = inferCategories(title, type);
    const titleTokens = tokenize(normalizedTitle);
    const searchTokens = Array.from(
      new Set([
        ...titleTokens,
        ...conceptTokensFor(normalizedTitle, titleTokens),
        ...tokenize(normalizeText(sourceType)),
        ...filenameToTokens(filename),
      ]),
    );
    const years = extractYearTokens(normalizeText(`${rawTitle} ${title} ${filename ?? ''}`));

    const resource: BotResource = {
      id,
      title,
      rawTitle: rawTitle || title,
      normalizedTitle,
      date,
      type,
      typeLabel: sourceType,
      category: categories[0] as ResourceCategory,
      categories,
      telegramUrl,
      description: genericTitle ? '' : buildDescription(rawTitle, normalizedTitle),
      searchTokens,
      years,
      genericTitle,
      derivedFromId,
      filename,
      fileId,
    };

    this.byId.set(id, resource);
    this.rebuildList();
    this.save();
    return resource;
  }

  /** Allows Ultra Admin to manually index a channel post live without redeploying. */
  addManualResource(id: string, rawTitle: string, sourceType = 'PDF'): BotResource {
    const cleanId = id.trim();
    const date = new Date().toISOString().slice(0, 10);
    const type = typeBucketFor(sourceType);
    const cleaned = cleanTitle(rawTitle).title || rawTitle.trim();
    const normalizedTitle = normalizeText(cleaned);
    const categories = inferCategories(cleaned, type);
    const titleTokens = tokenize(normalizedTitle);
    const searchTokens = Array.from(
      new Set([
        ...titleTokens,
        ...conceptTokensFor(normalizedTitle, titleTokens),
        ...tokenize(normalizeText(sourceType)),
      ]),
    );

    const resource: BotResource = {
      id: cleanId,
      title: cleaned,
      rawTitle: rawTitle.trim(),
      normalizedTitle,
      date,
      type,
      typeLabel: sourceType,
      category: categories[0] as ResourceCategory,
      categories,
      telegramUrl: `https://t.me/${this.channelUsername}/${cleanId}`,
      description: buildDescription(rawTitle, normalizedTitle),
      searchTokens,
      years: extractYearTokens(normalizeText(rawTitle)),
      genericTitle: false,
      derivedFromId: null,
    };

    this.byId.set(cleanId, resource);
    this.rebuildList();
    this.save();
    return resource;
  }

  /** Removes a post from the live index (Ultra Admin). */
  deleteById(id: string): boolean {
    if (!this.byId.delete(id.trim())) return false;
    this.rebuildList();
    this.save();
    return true;
  }

  get(id: string): BotResource | undefined {
    return this.byId.get(id);
  }

  getAll(): BotResource[] {
    return this.list;
  }

  getIndexPath(): string {
    return this.indexPath;
  }

  getStats(): StoreStats {
    let pdfCount = 0;
    for (const item of this.list) {
      if (item.type === 'PDF') pdfCount += 1;
    }
    return {
      total: this.list.length,
      pdfCount,
      newestDate: this.list[0]?.date ?? 'N/A',
      newestId: this.list[0]?.id ?? '0',
      updatedAt: this.updatedAt,
    };
  }

  private setResources(resources: BotResource[]): void {
    this.byId.clear();
    for (const item of resources) {
      this.byId.set(item.id, item);
    }
    this.rebuildList();
  }

  private rebuildList(): void {
    this.list = sortResources(Array.from(this.byId.values()));
  }

  /** Atomic write: writes to .tmp first then renames so crashes never corrupt index.json. */
  save(): void {
    this.updatedAt = new Date().toISOString();
    const payload: IndexSnapshot = {
      version: 1,
      channel: this.channelUsername,
      updatedAt: this.updatedAt,
      resources: this.list,
    };
    mkdirSync(dirname(this.indexPath), { recursive: true });
    const tmpPath = `${this.indexPath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(payload), 'utf8');
    renameSync(tmpPath, this.indexPath);
  }
}
