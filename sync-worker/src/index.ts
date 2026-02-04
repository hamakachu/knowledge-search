import dotenv from 'dotenv';
import { syncQiitaTeam } from './sync-qiita';

dotenv.config();

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
