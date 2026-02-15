/**
 * cron式バリデーション
 */
import parser from 'cron-parser';
import type { CronValidationResult } from './types';

/**
 * cron式バリデーションのオプション
 */
export interface ValidateCronOptions {
  /** タイムゾーン（デフォルト: Asia/Tokyo） */
  timezone?: string;
}

/**
 * cron式をバリデートし、次回実行日時を計算する
 * node-cronは標準的な5フィールドcron式（分 時 日 月 曜日）を使用
 * @param cronExpression cron式（例: "0 2 * * *"）
 * @param options バリデーションオプション
 * @returns バリデーション結果
 */
export function validateCronExpression(
  cronExpression: string,
  options: ValidateCronOptions = {}
): CronValidationResult {
  const { timezone = 'Asia/Tokyo' } = options;

  // nullish値のチェック
  if (cronExpression == null) {
    return {
      valid: false,
      error: 'cron式がnullまたはundefinedです',
    };
  }

  // 空文字列のチェック
  if (typeof cronExpression !== 'string' || cronExpression.trim() === '') {
    return {
      valid: false,
      error: 'cron式が空です',
    };
  }

  // フィールド数のチェック（node-cronは5フィールドを要求）
  const fields = cronExpression.trim().split(/\s+/);
  if (fields.length !== 5) {
    return {
      valid: false,
      error: `cron式は5つのフィールド（分 時 日 月 曜日）が必要です（現在: ${fields.length}フィールド）`,
    };
  }

  try {
    // cron-parserでパース試行
    const interval = parser.parseExpression(cronExpression, {
      tz: timezone,
    });

    // 次回実行日時を取得
    const nextRunAt = interval.next().toDate();

    return {
      valid: true,
      nextRunAt,
    };
  } catch (error) {
    // パースエラーの場合
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      error: `無効なcron式です: ${errorMessage}`,
    };
  }
}
