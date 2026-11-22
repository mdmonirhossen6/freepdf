import { loadConfig } from './config.ts';
import { ResourceStore } from './store.ts';

function main(): void {
  const forceFresh = process.argv.includes('--fresh');
  const config = loadConfig({ requireTelegram: false });
  const store = new ResourceStore(config.indexPath, config.channelUsername);
  const result = store.seedFromRepo({ preserveExisting: !forceFresh });
  const stats = store.getStats();

  console.log('──────────────────────────────────────────────');
  console.log('FreePDF Bot — Zero-DB JSON Index Seed');
  console.log('──────────────────────────────────────────────');
  console.log(`Output file       : ${config.indexPath}`);
  console.log(`Mode              : ${forceFresh ? 'fresh rebuild' : 'merge (preserves live posts)'}`);
  console.log(`Total indexed     : ${stats.total}`);
  console.log(`Total PDFs        : ${stats.pdfCount}`);
  console.log(`Filenames matched : ${result.filenamesMatched}`);
  console.log(`Added from repo   : ${result.addedFromRepo}`);
  console.log(`Newest post       : #${stats.newestId} (${stats.newestDate})`);
  console.log('──────────────────────────────────────────────');
}

main();
