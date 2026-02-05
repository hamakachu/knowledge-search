import dotenv from 'dotenv';
import { syncQiitaTeam } from './sync-qiita';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートの.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  console.log('Starting Qiita Team sync...');

  try {
    await syncQiitaTeam();
    console.log('Sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
