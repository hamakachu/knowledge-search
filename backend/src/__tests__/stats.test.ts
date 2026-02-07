import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDocumentStats } from '../services/statsService';
import { dbClient } from '../db/client';

describe('statsService', () => {
  // テスト用データの準備
  beforeAll(async () => {
    // テスト用のドキュメントをupsert（ON CONFLICT句で重複を回避）
    await dbClient.query(`
      INSERT INTO documents (id, title, body, url, author, source, created_at, updated_at)
      VALUES
        ('stats-test-1', 'Test Document 1', 'Body 1', 'https://example.com/stats/1', 'Author 1', 'qiita_team', '2024-01-01T00:00:00Z', '2024-01-10T00:00:00Z'),
        ('stats-test-2', 'Test Document 2', 'Body 2', 'https://example.com/stats/2', 'Author 2', 'qiita_team', '2024-01-02T00:00:00Z', '2024-01-15T00:00:00Z'),
        ('stats-test-3', 'Test Document 3', 'Body 3', 'https://example.com/stats/3', 'Author 3', 'qiita_team', '2024-01-03T00:00:00Z', '2024-01-20T00:00:00Z')
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        url = EXCLUDED.url,
        author = EXCLUDED.author,
        updated_at = EXCLUDED.updated_at
    `);
  });

  // テスト後のクリーンアップ
  afterAll(async () => {
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['stats-test-%']);
    await dbClient.end();
  });

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

      // lastUpdatedがnullでない場合、ISO8601形式の日付かチェック
      if (stats.lastUpdated !== null) {
        const date = new Date(stats.lastUpdated);
        expect(date.toString()).not.toBe('Invalid Date');
      }
    });

    it('should returnドキュメント数が0以上の数値を返す', async () => {
      const stats = await getDocumentStats();

      expect(stats.totalDocuments).toBeGreaterThanOrEqual(0);
    });

    it('should returnデータベースから実際の統計情報を取得する', async () => {
      const stats = await getDocumentStats();

      // テストデータを3件挿入しているので、totalDocumentsは3以上
      expect(stats.totalDocuments).toBeGreaterThanOrEqual(3);

      // lastUpdatedは存在する（具体的な日時は他のテストデータの影響を受ける可能性があるため、存在チェックのみ）
      expect(stats.lastUpdated).not.toBeNull();
      if (stats.lastUpdated !== null) {
        const lastUpdatedDate = new Date(stats.lastUpdated);
        expect(lastUpdatedDate.toString()).not.toBe('Invalid Date');
      }
    });

    it('should returnデータベースが空の場合は0とnullを返す', async () => {
      // 一時的にテーブルをクリア
      await dbClient.query('DELETE FROM documents');

      const stats = await getDocumentStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.lastUpdated).toBeNull();

      // テストデータを戻す
      await dbClient.query(`
        INSERT INTO documents (id, title, body, url, author, source, created_at, updated_at)
        VALUES
          ('stats-test-1', 'Test Document 1', 'Body 1', 'https://example.com/stats/1', 'Author 1', 'qiita_team', '2024-01-01T00:00:00Z', '2024-01-10T00:00:00Z'),
          ('stats-test-2', 'Test Document 2', 'Body 2', 'https://example.com/stats/2', 'Author 2', 'qiita_team', '2024-01-02T00:00:00Z', '2024-01-15T00:00:00Z'),
          ('stats-test-3', 'Test Document 3', 'Body 3', 'https://example.com/stats/3', 'Author 3', 'qiita_team', '2024-01-03T00:00:00Z', '2024-01-20T00:00:00Z')
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          url = EXCLUDED.url,
          author = EXCLUDED.author,
          updated_at = EXCLUDED.updated_at
      `);
    });
  });
});
