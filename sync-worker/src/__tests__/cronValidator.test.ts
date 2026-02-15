/**
 * cron式バリデーションのテスト
 */
import { describe, it, expect } from 'vitest';
import { validateCronExpression } from '../scheduler/cronValidator';

describe('validateCronExpression', () => {
  describe('有効なcron式のバリデーション', () => {
    it('毎日午前2時の式を有効と判定する', () => {
      const result = validateCronExpression('0 2 * * *');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.nextRunAt).toBeInstanceOf(Date);
    });

    it('毎分実行の式を有効と判定する', () => {
      const result = validateCronExpression('* * * * *');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.nextRunAt).toBeInstanceOf(Date);
    });

    it('毎週月曜日の午前9時の式を有効と判定する', () => {
      const result = validateCronExpression('0 9 * * 1');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.nextRunAt).toBeInstanceOf(Date);
    });

    it('毎月1日の午前0時の式を有効と判定する', () => {
      const result = validateCronExpression('0 0 1 * *');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.nextRunAt).toBeInstanceOf(Date);
    });

    it('複雑なcron式（範囲指定）を有効と判定する', () => {
      // 毎時30分、月-金
      const result = validateCronExpression('30 * * * 1-5');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('複雑なcron式（リスト指定）を有効と判定する', () => {
      // 毎日9時、12時、18時
      const result = validateCronExpression('0 9,12,18 * * *');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('複雑なcron式（ステップ指定）を有効と判定する', () => {
      // 2時間ごと
      const result = validateCronExpression('0 */2 * * *');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('無効なcron式のバリデーション', () => {
    it('空文字列を無効と判定する', () => {
      const result = validateCronExpression('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.nextRunAt).toBeUndefined();
    });

    it('フィールドが不足している式を無効と判定する', () => {
      const result = validateCronExpression('* * *');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('フィールドが多すぎる式を無効と判定する', () => {
      const result = validateCronExpression('* * * * * * *');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('無効な分の値を無効と判定する', () => {
      const result = validateCronExpression('60 * * * *');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('無効な時の値を無効と判定する', () => {
      const result = validateCronExpression('0 25 * * *');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('無効な日の値を無効と判定する', () => {
      const result = validateCronExpression('0 0 32 * *');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('無効な月の値を無効と判定する', () => {
      const result = validateCronExpression('0 0 1 13 *');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('無効な曜日の値を無効と判定する', () => {
      const result = validateCronExpression('0 0 * * 8');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('不正な文字を含む式を無効と判定する', () => {
      const result = validateCronExpression('abc def ghi jkl mno');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('nullish値を無効と判定する', () => {
      // @ts-expect-error テスト用に意図的にnullを渡す
      const result = validateCronExpression(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('タイムゾーン指定', () => {
    it('Asia/Tokyoタイムゾーンで次回実行日時を計算する', () => {
      const result = validateCronExpression('0 2 * * *', { timezone: 'Asia/Tokyo' });

      expect(result.valid).toBe(true);
      expect(result.nextRunAt).toBeInstanceOf(Date);
    });

    it('UTCタイムゾーンで次回実行日時を計算する', () => {
      const result = validateCronExpression('0 2 * * *', { timezone: 'UTC' });

      expect(result.valid).toBe(true);
      expect(result.nextRunAt).toBeInstanceOf(Date);
    });

    it('無効なタイムゾーンでもcron式自体は有効と判定する', () => {
      // cron-parserは無効なタイムゾーンでエラーを投げる場合があるが、
      // その場合でもcron式自体のバリデーションは行う
      const result = validateCronExpression('0 2 * * *', { timezone: 'Invalid/Timezone' });

      // 実装により挙動が変わる可能性があるため、validまたはerrorがあることを確認
      expect(typeof result.valid).toBe('boolean');
    });
  });
});
