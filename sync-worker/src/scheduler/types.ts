/**
 * スケジューラー関連の型定義
 */

/**
 * スケジューラーの設定
 */
export interface SchedulerConfig {
  /** cron式（例: "0 2 * * *" = 毎日午前2時） */
  cronExpression: string;
  /** タイムゾーン（デフォルト: Asia/Tokyo） */
  timezone?: string;
  /** 同期処理のタイムアウト（ミリ秒）*/
  syncTimeoutMs?: number;
}

/**
 * スケジューラーの状態
 */
export type SchedulerState = 'idle' | 'running' | 'stopping' | 'stopped';

/**
 * スケジューラーのステータス情報
 */
export interface SchedulerStatus {
  /** 現在の状態 */
  state: SchedulerState;
  /** 最後の実行日時 */
  lastRunAt: Date | null;
  /** 最後の実行結果 */
  lastRunResult: 'success' | 'failure' | null;
  /** 次回の実行予定日時 */
  nextRunAt: Date | null;
  /** 実行回数 */
  runCount: number;
  /** エラー回数 */
  errorCount: number;
}

/**
 * 同期ジョブの実行結果
 */
export interface SyncJobResult {
  /** 開始日時 */
  startedAt: Date;
  /** 完了日時 */
  completedAt: Date;
  /** 成功したかどうか */
  success: boolean;
  /** 同期されたドキュメント数 */
  syncedCount: number;
  /** 失敗したドキュメント数 */
  failedCount: number;
  /** エラーメッセージの配列 */
  errors: string[];
  /** 実行時間（ミリ秒） */
  durationMs: number;
}

/**
 * cron式のバリデーション結果
 */
export interface CronValidationResult {
  /** 有効かどうか */
  valid: boolean;
  /** エラーメッセージ（無効な場合） */
  error?: string;
  /** 次回実行日時（有効な場合） */
  nextRunAt?: Date;
}
