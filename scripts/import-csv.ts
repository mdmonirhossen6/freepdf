/**
 * CSV -> snapshot importer.
 *
 * Takes an exported channel index (a CSV of the complete index) and merges only
 * the rows the HTML snapshot does not already have, then rewrites the snapshot
 * in place. Everything else in the file is preserved verbatim, so the snapshot
 * stays the single source of truth that scripts/generate-data.ts reads.
 *
 * Idempotent: run it twice and the second run adds nothing.
 *
 * Usage:
 *   node scripts/import-csv.ts <export.csv> [snapshot.html]
 *   npm run data:import -- <export.csv>
 *
 * The snapshot is only an intermediate. Run `npm run data` afterwards to
 * rebuild lib/generated/resources.ts, the sitemap and the robots file.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SNAPSHOT = resolve(ROOT, 'data', 'source', 'HSCFreePDF_Complete_Index.html');
const SNAPSHOT_CSV = resolve(ROOT, 'data', 'source', 'HSCFreePDF_Complete_Index.csv');

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Fixed label used by the snapshot when a post links to other indexed posts. */
const RELATED_LABEL = 'linked title/file posts';

interface CsvRow {
  id: string;
  date: string;
  dateLabel: string;
  title: string;
  type: string;
  url: string;
  relatedIds: string[];
  filename: string;
}

/** RFC4180-ish parser: quoted fields may contain commas, quotes and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function readCsvRows(csvPath: string): CsvRow[] {
  const text = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ''));
  const header = rows.shift();
  if (!header) throw new Error('CSV is empty');

  const iDate = header.indexOf('date');
  const iTitle = header.indexOf('title');
  const iType = header.indexOf('type');
  const iUrl = header.indexOf('telegram_link');
  const iId = header.indexOf('primary_message_id');
  const iRelated = header.indexOf('related_message_ids');
  const iFile = header.indexOf('filename');
  if (iDate < 0 || iTitle < 0 || iType < 0 || iUrl < 0 || iId < 0) {
    throw new Error(`CSV is missing a required column. Found: ${header.join(', ')}`);
  }

  const out: CsvRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const id = (row[iId] ?? '').trim();
    const url = (row[iUrl] ?? '').trim();
    const date = (row[iDate] ?? '').trim();
    if (!id || !url || seen.has(id)) continue;
    seen.add(id);

    const dateLabel = isoToDateLabel(date);
    if (!dateLabel) {
      console.warn(`  ! skipping ${id}: unrecognised date "${date}"`);
      continue;
    }

    const relatedRaw = (iRelated >= 0 ? (row[iRelated] ?? '') : '').trim();
    out.push({
      id,
      date,
      dateLabel,
      title: (row[iTitle] ?? '').trim(),
      type: (row[iType] ?? 'Other').trim() || 'Other',
      url,
      relatedIds: relatedRaw ? relatedRaw.split(/[,\s]+/).filter(Boolean) : [],
      filename: iFile >= 0 ? (row[iFile] ?? '').trim() : '',
    });
  }
  return out;
}

function buildListItem(row: CsvRow): string {
  // The related span only earns its place when the post links elsewhere.
  const linkedElsewhere = row.relatedIds.some((relatedId) => relatedId !== row.id);
  const related = linkedElsewhere ? `<span class='related'>${RELATED_LABEL}</span>` : '';
  return `<li><a href='${escapeHtml(row.url)}'>${escapeHtml(row.title)}</a><span class='type'>${escapeHtml(row.type)}</span>${related}</li>`;
}

function numericId(id: string): number {
  const value = Number(id);
  return Number.isFinite(value) ? value : 0;
}

/** Newest first within a date group, keeping each existing <li> verbatim. */
function sortItems(items: string[]): string[] {
  const idOf = (item: string): number => {
    const match = /\/(\d+)'/.exec(item);
    return numericId(match?.[1] ?? '0');
  };
  return [...items].sort((a, b) => idOf(b) - idOf(a));
}

function isoToDateLabel(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const monthName = MONTH_NAMES[Number(match[2])];
  if (!monthName) return null;
  return `${Number(match[3])} ${monthName} ${match[1]}`;
}

function dateLabelToIso(label: string): string {
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(label.trim());
  if (!match) return '0000-00-00';
  const month = MONTHS[match[2].toLowerCase()] ?? '00';
  return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
}

/** Match the snapshot's own escaping (observed: &, <, >, " — never an apostrophe). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function main(): void {
  const csvArg = process.argv[2];
  if (!csvArg) {
    console.error('Usage: node scripts/import-csv.ts <export.csv> [snapshot.html]');
    process.exit(1);
  }

  const csvPath = resolve(process.cwd(), csvArg);
  const snapshotPath = process.argv[3] ? resolve(process.cwd(), process.argv[3]) : SNAPSHOT;
  if (!existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);
  if (!existsSync(snapshotPath)) throw new Error(`Snapshot not found: ${snapshotPath}`);

  const csvRows = readCsvRows(csvPath);
  let html = readFileSync(snapshotPath, 'utf8');
  const newline = html.includes('\r\n') ? '\r\n' : '\n';

  // Every message id the snapshot already carries.
  const existingIds = new Set<string>();
  const hrefRe = /<li><a href='([^']*)'/g;
  let hrefMatch: RegExpExecArray | null;
  while ((hrefMatch = hrefRe.exec(html)) !== null) {
    const idMatch = /(\d+)\/?$/.exec(hrefMatch[1]);
    if (idMatch) existingIds.add(idMatch[1]);
  }

  const fresh = csvRows.filter((row) => !existingIds.has(row.id));
  if (fresh.length === 0) {
    console.log(`Snapshot already up to date: ${existingIds.size} entries, nothing to add.`);
    return;
  }

  const byDate = new Map<string, CsvRow[]>();
  for (const row of fresh) {
    const list = byDate.get(row.dateLabel);
    if (list) list.push(row);
    else byDate.set(row.dateLabel, [row]);
  }

  const existingDates = new Set<string>();
  const dateRe = /<div class='date'>([^<]+)<\/div>/g;
  let dateMatch: RegExpExecArray | null;
  while ((dateMatch = dateRe.exec(html)) !== null) existingDates.add(dateMatch[1]);

  // Newest date first, whatever order the export came in.
  const labels = [...byDate.keys()].sort((a, b) => dateLabelToIso(b).localeCompare(dateLabelToIso(a)));
  const newGroupLabels = labels.filter((label) => !existingDates.has(label));
  const reusedLabels = labels.filter((label) => existingDates.has(label));

  const firstGroupAt = html.indexOf("<div class='date'>");
  if (firstGroupAt < 0) throw new Error('Snapshot has no date groups');

  let added = 0;

  // 1. Brand-new date groups go above the current first group.
  let insertAt = firstGroupAt;
  for (const label of newGroupLabels) {
    const items = sortItems(byDate.get(label)!.map(buildListItem));
    const block = `<div class='date'>${label}</div><ol>${newline}${items.join(newline)}${newline}</ol>${newline}`;
    html = html.slice(0, insertAt) + block + html.slice(insertAt);
    insertAt += block.length;
    added += items.length;
    console.log(`  + ${label}: ${items.length} new row(s) [new date group]`);
  }

  // 2. Rows for a date group we already have are merged into that group.
  for (const label of reusedLabels) {
    const anchor = `<div class='date'>${label}</div><ol>`;
    const anchorAt = html.indexOf(anchor);
    if (anchorAt < 0) throw new Error(`Could not locate group ${label}`);
    const listStart = anchorAt + anchor.length;
    const listEnd = html.indexOf('</ol>', listStart);
    if (listEnd < 0) throw new Error(`Unterminated <ol> for group ${label}`);

    const inner = html.slice(listStart, listEnd);
    const existingItems = inner.match(/<li>[\s\S]*?<\/li>/g) ?? [];
    const incoming = byDate.get(label)!.map(buildListItem);
    const merged = sortItems([...existingItems, ...incoming]);
    const eol = inner.includes('\r\n') ? '\r\n' : '\n';

    html = html.slice(0, listStart) + eol + merged.join(eol) + eol + html.slice(listEnd);
    added += incoming.length;
    console.log(`  + ${label}: ${incoming.length} new row(s) merged into the existing group`);
  }

  // 3. Keep the snapshot's own header count honest.
  const total = existingIds.size + added;
  html = html.replace(/Total resources: \d+/, `Total resources: ${total}`);

  writeFileSync(snapshotPath, html, 'utf8');
  if (csvPath !== SNAPSHOT_CSV) copyFileSync(csvPath, SNAPSHOT_CSV);

  console.log('-'.repeat(46));
  console.log(`added        : ${added}`);
  console.log(`snapshot now : ${total} entries`);
  console.log(`archived CSV : data/source/${SNAPSHOT_CSV.split(/[\\/]/).pop()}`);
  console.log('next         : npm run data && npm run build');
}

main();

