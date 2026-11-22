import { PdfAiEngine } from './ai.ts';
import { loadConfig } from './config.ts';
import { ResourceStore } from './store.ts';

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(' ').trim() || 'topon sir physics 2nd paper dagano';
  const config = loadConfig({ requireTelegram: false });
  const store = new ResourceStore(config.indexPath, config.channelUsername);
  const { stats } = store.init();
  const ai = new PdfAiEngine(config);

  console.log('═'.repeat(68));
  console.log(`Query  : "${query}"`);
  console.log(`Index  : ${stats.total} posts (${stats.pdfCount} PDFs)`);
  console.log(`Engine : ${ai.isEnabled() ? `Gemini (${config.geminiModel})` : 'Local Fallback (no GEMINI_API_KEY)'}`);
  console.log('═'.repeat(68));

  const started = Date.now();
  const result = await ai.search(query, store.getAll());
  const elapsed = Date.now() - started;

  console.log(`Time       : ${elapsed}ms | Used AI: ${result.usedAi} | Candidates: ${result.candidatesChecked}`);
  if (result.expandedQueries.length > 0) {
    console.log(`Queries    : ${result.expandedQueries.join('  |  ')}`);
  }
  console.log(`Reply text : ${result.replyText}`);

  if (result.bestMatchId) {
    const best = store.get(result.bestMatchId);
    console.log(`\n✅ BEST MATCH [#${result.bestMatchId}] (${best?.typeLabel})`);
    console.log(`   Title : ${best?.title}`);
    if (best?.filename) console.log(`   File  : ${best.filename}`);
    console.log(`   Link  : ${best?.telegramUrl}`);
  } else {
    console.log('\n⚠️  No exact match selected.');
  }

  if (result.similarIds.length > 0) {
    console.log(`\n📚 SIMILAR PDFs (${result.similarIds.length}):`);
    for (const id of result.similarIds) {
      const item = store.get(id);
      if (!item) continue;
      console.log(`   • [#${item.id}] [${item.typeLabel}] ${item.title}`);
    }
  }
  console.log('═'.repeat(68));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
