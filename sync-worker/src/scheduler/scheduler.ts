/**
 * スケジューラーのコアロジック
 */
import cron, { ScheduledTask } from 'node-cron';
import { validateCronExpression } from './cronValidator';
import type {
  SchedulerConfig,
  SchedulerState,
  SchedulerStatus,
  SyncJobResult,
} from './types';

/**
 * 同期関数の型
 */
export type SyncFunction = () => Promise<SyncJobResult>;

/**
 * ジョブ完了時のコールバック型
 */
export type OnJobCompleteCallback = (result: SyncJobResult) => void;

/**
 * 同期スケジューラー
 * cron式に基づいて同期処理を定期実行する
 */
export class SyncScheduler {
  private config: SchedulerConfig;
  private syncFunction: SyncFunction;
  private task: ScheduledTask | null = null;
  private state: SchedulerState = 'idle';
  private lastRunAt: Date | null = null;
  private lastRunResult: 'success' | 'failure' | null = null;
  private runCount = 0;
  private errorCount = 0;
  private isRunning = false;
  private currentJobPromise: Promise<SyncJobResult | null> | null = null;
  private onJobCompleteCallbacks: OnJobCompleteCallback[] = [];

  /**
   * コンストラクタ
   * @param config スケジューラー設定
   * @param syncFunction 同期処理の関数
   */
  constructor(config: SchedulerConfig, syncFunction: SyncFunction) {
    // cron式をバリデート
    const validation = validateCronExpression(config.cronExpression, {
      timezone: config.timezone,
    });

    if (!validation.valid) {
      throw new Error(`無効なcron式: ${validation.error}`);
    }

    this.config = config;
    this.syncFunction = syncFunction;
  }

  /**
   * 現在のステータスを取得
   */
  getStatus(): SchedulerStatus {
    return {
      state: this.state,
      lastRunAt: this.lastRunAt,
      lastRunResult: this.lastRunResult,
      nextRunAt: this.getNextRunAt(),
      runCount: this.runCount,
      errorCount: this.errorCount,
    };
  }

  /**
   * 次回実行日時を取得
   */
  private getNextRunAt(): Date | null {
    if (this.state === 'stopped') {
      return null;
    }

    const validation = validateCronExpression(this.config.cronExpression, {
      timezone: this.config.timezone,
    });

    return validation.nextRunAt ?? null;
  }

  /**
   * スケジュールを開始
   * @returns 開始成功したかどうか
   */
  start(): boolean {
    if (this.state === 'running') {
      return false;
    }

    const timezone = this.config.timezone ?? 'Asia/Tokyo';

    this.task = cron.schedule(
      this.config.cronExpression,
      () => {
        // 非同期処理を起動するが、node-cronのコールバックは同期関数
        this.runNow().catch((error) => {
          console.error('スケジュールされた同期処理でエラー:', error);
        });
      },
      {
        timezone,
        scheduled: true,
      }
    );

    this.state = 'running';
    return true;
  }

  /**
   * スケジュールを停止
   * @returns 停止成功したかどうか
   */
  stop(): boolean {
    if (this.state === 'idle' || this.state === 'stopped') {
      return false;
    }

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.state = 'stopped';
    return true;
  }

  /**
   * graceful shutdown
   * 実行中のジョブがあれば完了を待ってから停止
   * @param timeoutMs タイムアウト時間（ミリ秒）
   */
  async gracefulStop(timeoutMs?: number): Promise<void> {
    if (this.state === 'stopped') {
      return;
    }

    // 新規スケジュールを停止
    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    // 実行中のジョブがなければ即停止
    if (!this.isRunning || !this.currentJobPromise) {
      this.state = 'stopped';
      return;
    }

    // 実行中のジョブがあれば待機
    this.state = 'stopping';

    const timeout = timeoutMs ?? this.config.syncTimeoutMs ?? 60000;

    try {
      // タイムアウト付きで待機
      await Promise.race([
        this.currentJobPromise,
        new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error('graceful shutdown タイムアウト'));
          }, timeout);
        }),
      ]);
    } catch (error) {
      console.error('graceful shutdown:', error);
    }

    this.state = 'stopped';
  }

  /**
   * ジョブが実行中かどうか
   */
  isJobRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 即時実行
   * @returns 実行結果（実行できなかった場合はnull）
   */
  async runNow(): Promise<SyncJobResult | null> {
    // 停止中または未開始は実行不可
    if (this.state !== 'running' && this.state !== 'stopping') {
      return null;
    }

    // 重複実行防止
    if (this.isRunning) {
      console.log('すでに同期処理が実行中です。スキップします。');
      return null;
    }

    this.isRunning = true;

    this.currentJobPromise = this.executeJob();

    try {
      const result = await this.currentJobPromise;
      return result;
    } finally {
      this.isRunning = false;
      this.currentJobPromise = null;
    }
  }

  /**
   * ジョブを実行
   */
  private async executeJob(): Promise<SyncJobResult> {
    const startedAt = new Date();

    try {
      const result = await this.syncFunction();

      this.lastRunAt = startedAt;
      this.runCount++;

      if (result.success) {
        this.lastRunResult = 'success';
      } else {
        this.lastRunResult = 'failure';
        this.errorCount++;
      }

      // コールバックを呼び出す
      this.notifyJobComplete(result);

      return result;
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      const errorMessage = error instanceof Error ? error.message : String(error);

      const failureResult: SyncJobResult = {
        startedAt,
        completedAt,
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [errorMessage],
        durationMs,
      };

      this.lastRunAt = startedAt;
      this.lastRunResult = 'failure';
      this.runCount++;
      this.errorCount++;

      // コールバックを呼び出す
      this.notifyJobComplete(failureResult);

      return failureResult;
    }
  }

  /**
   * ジョブ完了時のコールバックを登録
   * @param callback コールバック関数
   */
  onJobComplete(callback: OnJobCompleteCallback): void {
    this.onJobCompleteCallbacks.push(callback);
  }

  /**
   * コールバックを呼び出す
   */
  private notifyJobComplete(result: SyncJobResult): void {
    for (const callback of this.onJobCompleteCallbacks) {
      try {
        callback(result);
      } catch (error) {
        console.error('ジョブ完了コールバックでエラー:', error);
      }
    }
  }
}
