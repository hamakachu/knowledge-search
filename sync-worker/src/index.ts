import dotenv from 'dotenv';
import { syncQiitaTeamWithTransaction } from './sync-qiita';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートの.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  console.log('Starting Qiita Team sync (Transaction mode)...');

  try {
    const result = await syncQiitaTeamWithTransaction();

    if (result.success) {
      console.log('Sync completed successfully');
      console.log(`  Synced: ${result.syncedCount} articles`);
      if (result.errors.length > 0) {
        console.log(`  Warnings: ${result.errors.length} embedding errors`);
      }
      process.exit(0);
    } else {
      console.error('Sync failed');
      console.error(`  Failed: ${result.failedCount} articles`);
      console.error(`  Errors: ${result.errors.join(', ')}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
