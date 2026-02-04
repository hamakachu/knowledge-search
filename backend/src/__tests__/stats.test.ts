import { describe, it, expect } from 'vitest';
import { getDocumentStats } from '../services/statsService';

describe('statsService', () => {
  describe('getDocumentStats', () => {
    it('should return統計情報を含むオブジェクトを返す', async () => {
      const stats = await getDocumentStats();

      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('lastUpdated');
      expect(typeof stats.totalDocuments).toBe('number');
      expect(typeof stats.lastUpdated).toBe('string');
    });

    it('should return有効なISO8601形式の日付を返す', async () => {
      const stats = await getDocumentStats();

      // ISO8601形式の日付かチェック
      const date = new Date(stats.lastUpdated);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should returnドキュメント数が0以上の数値を返す', async () => {
      const stats = await getDocumentStats();

      expect(stats.totalDocuments).toBeGreaterThanOrEqual(0);
    });
  });
});
