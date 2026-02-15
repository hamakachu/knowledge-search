/**
 * スケジューラーのテスト
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncScheduler } from '../scheduler/scheduler';
import type { SchedulerConfig, SyncJobResult } from '../scheduler/types';

// モックの同期関数
const mockSyncFunction = vi.fn<[], Promise<SyncJobResult>>();

// デフォルトの成功結果
const mockSuccessResult: SyncJobResult = {
  startedAt: new Date(),
  completedAt: new Date(),
  success: true,
  syncedCount: 10,
  failedCount: 0,
  errors: [],
  durationMs: 1000,
};

// デフォルトの失敗結果
const mockFailureResult: SyncJobResult = {
  startedAt: new Date(),
  completedAt: new Date(),
  success: false,
  syncedCount: 0,
  failedCount: 5,
  errors: ['Sync failed'],
  durationMs: 500,
};

describe('SyncScheduler', () => {
  let scheduler: SyncScheduler;
  const defaultConfig: SchedulerConfig = {
    cronExpression: '0 2 * * *',
    timezone: 'Asia/Tokyo',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockSyncFunction.mockReset();
    mockSyncFunction.mockResolvedValue(mockSuccessResult);
  });

  afterEach(() => {
    if (scheduler) {
      scheduler.stop();
    }
    vi.useRealTimers();
  });

  describe('インスタンス生成', () => {
    it('SyncScheduler_有効なcron式でインスタンスを生成できる', () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);

      expect(scheduler).toBeInstanceOf(SyncScheduler);
    });

    it('SyncScheduler_無効なcron式でエラーをスローする', () => {
      const invalidConfig: SchedulerConfig = {
        cronExpression: 'invalid',
        timezone: 'Asia/Tokyo',
      };

      expect(() => new SyncScheduler(invalidConfig, mockSyncFunction)).toThrow();
    });

    it('SyncScheduler_空のcron式でエラーをスローする', () => {
      const emptyConfig: SchedulerConfig = {
        cronExpression: '',
        timezone: 'Asia/Tokyo',
      };

      expect(() => new SyncScheduler(emptyConfig, mockSyncFunction)).toThrow();
    });

    it('SyncScheduler_環境変数からのcron式を受け付ける', () => {
      const envConfig: SchedulerConfig = {
        cronExpression: '*/5 * * * *', // 5分ごと
        timezone: 'UTC',
      };

      scheduler = new SyncScheduler(envConfig, mockSyncFunction);
      expect(scheduler).toBeInstanceOf(SyncScheduler);
    });
  });

  describe('getStatus', () => {
    it('getStatus_初期状態はidleである', () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);

      const status = scheduler.getStatus();

      expect(status.state).toBe('idle');
      expect(status.lastRunAt).toBeNull();
      expect(status.lastRunResult).toBeNull();
      expect(status.nextRunAt).toBeInstanceOf(Date);
      expect(status.runCount).toBe(0);
      expect(status.errorCount).toBe(0);
    });

    it('getStatus_start後はrunningになる', () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);

      scheduler.start();
      const status = scheduler.getStatus();

      expect(status.state).toBe('running');
    });

    it('getStatus_stop後はstoppedになる', () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      scheduler.stop();
      const status = scheduler.getStatus();

      expect(status.state).toBe('stopped');
    });
  });

  describe('start/stop', () => {
    it('start_スケジュールを開始できる', () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);

      const started = scheduler.start();

      expect(started).toBe(true);
      expect(scheduler.getStatus().state).toBe('running');
    });

    it('start_すでに開始中の場合はfalseを返す', () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      const startedAgain = scheduler.start();

      expect(startedAgain).toBe(false);
    });

    it('stop_スケジュールを停止できる', () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      const stopped = scheduler.stop();

      expect(stopped).toBe(true);
      expect(scheduler.getStatus().state).toBe('stopped');
    });

    it('stop_すでに停止中の場合はfalseを返す', () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);

      const stopped = scheduler.stop();

      expect(stopped).toBe(false);
    });
  });

  describe('重複実行防止', () => {
    it('runNow_実行中は新規実行をスキップする', async () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      // 1つ目の実行を開始（遅延させる）
      mockSyncFunction.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return mockSuccessResult;
      });

      // 最初の実行を開始
      const firstRun = scheduler.runNow();

      // 100ms待機
      vi.advanceTimersByTime(100);

      // 2つ目の実行を試みる
      const secondRun = scheduler.runNow();

      // 2つ目はスキップされるべき
      expect(await secondRun).toBeNull();

      // 最初の実行を完了させる
      vi.advanceTimersByTime(1000);
      const firstResult = await firstRun;
      expect(firstResult).not.toBeNull();
    });

    it('isJobRunning_実行中はtrueを返す', async () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      // 遅延させる
      mockSyncFunction.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return mockSuccessResult;
      });

      const runPromise = scheduler.runNow();

      // 実行中
      vi.advanceTimersByTime(100);
      expect(scheduler.isJobRunning()).toBe(true);

      // 完了を待つ
      vi.advanceTimersByTime(1000);
      await runPromise;
      expect(scheduler.isJobRunning()).toBe(false);
    });
  });

  describe('runNow', () => {
    it('runNow_即時実行できる', async () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      const result = await scheduler.runNow();

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(mockSyncFunction).toHaveBeenCalledTimes(1);
    });

    it('runNow_成功時にステータスが更新される', async () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      await scheduler.runNow();

      const status = scheduler.getStatus();
      expect(status.lastRunAt).toBeInstanceOf(Date);
      expect(status.lastRunResult).toBe('success');
      expect(status.runCount).toBe(1);
      expect(status.errorCount).toBe(0);
    });

    it('runNow_失敗時にステータスが更新される', async () => {
      mockSyncFunction.mockResolvedValueOnce(mockFailureResult);
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      await scheduler.runNow();

      const status = scheduler.getStatus();
      expect(status.lastRunResult).toBe('failure');
      expect(status.runCount).toBe(1);
      expect(status.errorCount).toBe(1);
    });

    it('runNow_例外発生時もエラーカウントが増える', async () => {
      mockSyncFunction.mockRejectedValueOnce(new Error('Unexpected error'));
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      const result = await scheduler.runNow();

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(scheduler.getStatus().errorCount).toBe(1);
    });

    it('runNow_停止中は実行できない', async () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      // start()を呼ばない

      const result = await scheduler.runNow();

      expect(result).toBeNull();
      expect(mockSyncFunction).not.toHaveBeenCalled();
    });
  });

  describe('graceful shutdown', () => {
    it('gracefulStop_すでに停止中の場合は即座に返る', async () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();
      scheduler.stop(); // 先にstopで停止

      // gracefulStopを呼ぶ
      await scheduler.gracefulStop();

      expect(scheduler.getStatus().state).toBe('stopped');
    });

    it('gracefulStop_実行中ジョブがない場合は即座に停止', async () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      // 実行中ジョブなしでgracefulStop
      await scheduler.gracefulStop();

      expect(scheduler.getStatus().state).toBe('stopped');
    });

    it('stop_実行中のジョブ完了を待つ', async () => {
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.start();

      // 遅延させる
      let resolveJob: () => void;
      const jobPromise = new Promise<void>((resolve) => {
        resolveJob = resolve;
      });
      mockSyncFunction.mockImplementationOnce(async () => {
        await jobPromise;
        return mockSuccessResult;
      });

      // ジョブを開始
      const runPromise = scheduler.runNow();
      vi.advanceTimersByTime(100);

      // 停止要求（ジョブ完了待ち）
      expect(scheduler.getStatus().state).toBe('running');
      const stopPromise = scheduler.gracefulStop();

      // ステータスはstoppingになる
      expect(scheduler.getStatus().state).toBe('stopping');

      // ジョブを完了させる
      resolveJob!();
      await runPromise;

      // gracefulStopが完了
      await stopPromise;

      // 最終的にstopped
      expect(scheduler.getStatus().state).toBe('stopped');
    });

    it('gracefulStop_タイムアウト後に強制停止', async () => {
      const configWithTimeout: SchedulerConfig = {
        cronExpression: '0 2 * * *',
        timezone: 'Asia/Tokyo',
        syncTimeoutMs: 1000, // 1秒
      };
      scheduler = new SyncScheduler(configWithTimeout, mockSyncFunction);
      scheduler.start();

      // 非常に長いジョブをシミュレート
      mockSyncFunction.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10秒
        return mockSuccessResult;
      });

      // ジョブを開始
      scheduler.runNow();
      vi.advanceTimersByTime(100);

      // graceful stopを開始（1秒でタイムアウト）
      const stopPromise = scheduler.gracefulStop(1000);

      // タイムアウトまで待つ
      vi.advanceTimersByTime(1100);

      await stopPromise;

      // 強制停止された
      expect(scheduler.getStatus().state).toBe('stopped');
    });
  });

  describe('onJobComplete コールバック', () => {
    it('onJobComplete_成功時にコールバックが呼ばれる', async () => {
      const callback = vi.fn();
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.onJobComplete(callback);
      scheduler.start();

      await scheduler.runNow();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it('onJobComplete_失敗時にもコールバックが呼ばれる', async () => {
      mockSyncFunction.mockResolvedValueOnce(mockFailureResult);
      const callback = vi.fn();
      scheduler = new SyncScheduler(defaultConfig, mockSyncFunction);
      scheduler.onJobComplete(callback);
      scheduler.start();

      await scheduler.runNow();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });
  });
});
