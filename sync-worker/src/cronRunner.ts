/**
 * cronモードエントリポイント
 * 環境変数 SYNC_CRON_SCHEDULE に基づいて定期的にQiita Team同期を実行
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SyncScheduler } from './scheduler/scheduler';
import { syncQiitaTeamWithTransaction } from './sync-qiita';
import type { SyncJobResult } from './scheduler/types';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートの.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 環境変数からcron設定を取得
const SYNC_CRON_SCHEDULE = process.env.SYNC_CRON_SCHEDULE ?? '0 2 * * *'; // デフォルト: 毎日午前2時
const TZ = process.env.TZ ?? 'Asia/Tokyo';
const SYNC_TIMEOUT_MS = parseInt(process.env.SYNC_TIMEOUT_MS ?? '300000', 10); // デフォルト: 5分

/**
 * SyncResult → SyncJobResult への変換ラッパー
 */
async function syncJob(): Promise<SyncJobResult> {
  const startedAt = new Date();

  try {
    const result = await syncQiitaTeamWithTransaction();

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    return {
      startedAt,
      completedAt,
      success: result.success,
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      errors: result.errors,
      durationMs,
    };
  } catch (error) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      startedAt,
      completedAt,
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [errorMessage],
      durationMs,
    };
  }
}

/**
 * スケジューラーを開始
 */
async function startScheduler(): Promise<void> {
  console.log('======================================');
  console.log('Sync Worker Cron Scheduler');
  console.log('======================================');
  console.log(`cron式: ${SYNC_CRON_SCHEDULE}`);
  console.log(`タイムゾーン: ${TZ}`);
  console.log(`タイムアウト: ${SYNC_TIMEOUT_MS}ms`);
  console.log('======================================');

  const scheduler = new SyncScheduler(
    {
      cronExpression: SYNC_CRON_SCHEDULE,
      timezone: TZ,
      syncTimeoutMs: SYNC_TIMEOUT_MS,
    },
    syncJob
  );

  // ジョブ完了時のログ出力
  scheduler.onJobComplete((result) => {
    console.log('--------------------------------------');
    console.log(`同期ジョブ完了: ${result.success ? '成功' : '失敗'}`);
    console.log(`  開始時刻: ${result.startedAt.toISOString()}`);
    console.log(`  完了時刻: ${result.completedAt.toISOString()}`);
    console.log(`  実行時間: ${result.durationMs}ms`);
    console.log(`  同期件数: ${result.syncedCount}`);
    console.log(`  失敗件数: ${result.failedCount}`);
    if (result.errors.length > 0) {
      console.log(`  エラー: ${result.errors.join(', ')}`);
    }
    console.log('--------------------------------------');

    // 次回実行時刻を表示
    const status = scheduler.getStatus();
    if (status.nextRunAt) {
      console.log(`次回実行予定: ${status.nextRunAt.toISOString()}`);
    }
  });

  // スケジューラー開始
  scheduler.start();
  console.log('スケジューラーを開始しました。');

  const status = scheduler.getStatus();
  if (status.nextRunAt) {
    console.log(`次回実行予定: ${status.nextRunAt.toISOString()}`);
  }

  // SIGTERM / SIGINT でgraceful shutdown
  const handleShutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} を受信しました。graceful shutdown を開始します...`);

    try {
      await scheduler.gracefulStop(30000); // 30秒タイムアウト
      console.log('graceful shutdown 完了');
      process.exit(0);
    } catch (error) {
      console.error('graceful shutdown エラー:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  // プロセスを維持
  console.log('Ctrl+C で停止します。');
}

// エントリポイント
startScheduler().catch((error) => {
  console.error('スケジューラー起動エラー:', error);
  process.exit(1);
});
