/**
 * Verification harness for the client search engine.
 * Run: node scripts/verify-search.ts
 */
import { RESOURCES } from '../lib/generated/resources.ts';
import { searchAll } from '../lib/search.ts';

const queries = [
  'ACS Chemistry 2nd Paper',
  'রসায়ন ২য় পত্র',
  'chemistry 2',
  'Varsity K',
  'Medical Biology',
  'Retina Digest',
  'Udvash',
  'Current Affairs',
  'জোবায়ের',
  'আলাল',
  'HSC 27 Chemistry',
  'Engineering Question Bank',
  'মেডিকেল',
  'Engineering',
  'ac chemistry 2',
  'প্রশ্নব্যাংক',
  'কারেন্ট অ্যাফেয়ার্স',
];

console.log('═'.repeat(72));
console.log(`dataset: ${RESOURCES.length} resources | newest: ${RESOURCES[0]?.date} (id ${RESOURCES[0]?.id})`);
console.log('═'.repeat(72));

for (const query of queries) {
  const result = searchAll(RESOURCES, { query, limit: 3 });
  console.log(`\n▶ "${query}"  →  ${result.total} result${result.total === 1 ? '' : 's'}`);
  if (result.didYouMean) console.log(`   did-you-mean: ${result.didYouMean}`);
  for (const item of result.results) {
    console.log(`   [${item.typeLabel}] ${item.title.slice(0, 72)}  ·  id ${item.id}  ·  score ${Math.round(item.score)}`);
  }
  if (result.results.length === 0) console.log('   ✗ NO RESULTS');
}

console.log('\n' + '─'.repeat(72));
console.log('type filters (empty query = entire library):');
for (const type of ['PDF', 'APK', 'Image', 'Text', 'Other'] as const) {
  const r = searchAll(RESOURCES, { query: '', typeFilter: type, limit: 1 });
  console.log(`   ${type.padEnd(6)} → ${r.total}`);
}

console.log('category filters:');
for (const category of ['HSC', 'University Admission', 'Medical', 'Engineering', 'BCS & Jobs', 'Current Affairs', 'General'] as const) {
  const r = searchAll(RESOURCES, { query: '', categoryFilter: category, limit: 1 });
  console.log(`   ${category.padEnd(20)} → ${r.total}`);
}

console.log('\nsort check ("রসায়ন", newest first):');
const newest = searchAll(RESOURCES, { query: 'রসায়ন', sort: 'newest', limit: 3 });
for (const item of newest.results) console.log(`   ${item.date}  ${item.title.slice(0, 60)}`);
console.log('─'.repeat(72));
