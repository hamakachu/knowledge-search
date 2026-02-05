import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import { upsertDocument } from '../db/documentRepository';
import type { DocumentInput } from '../db/documentRepository';
import { dbClient } from '../db/client';

// 環境変数を読み込む
dotenv.config({ path: '../../.env' });

describe('documentRepository', () => {
  // テスト用データの準備
  beforeAll(async () => {
    // テストデータの初期化
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-repo-%']);
  });

  beforeEach(async () => {
    // 各テスト前にテストデータをクリア
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-repo-%']);
  });

  // テスト後のクリーンアップ
  afterAll(async () => {
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-repo-%']);
    await dbClient.end();
  });

  describe('upsertDocument', () => {
    it('upsertDocument_新規記事_正常に挿入される', async () => {
      // Arrange: 新規記事データを準備
      const newDocument: DocumentInput = {
        id: 'test-repo-1',
        title: 'Test Article 1',
        body: 'Test body content',
        url: 'https://example.com/test-1',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      };

      // Act: upsertを実行
      await upsertDocument(newDocument);

      // Assert: DBに正しく保存されたことを確認
      const result = await dbClient.query(
        'SELECT * FROM documents WHERE id = $1',
        ['test-repo-1']
      );

      expect(result.rows.length).toBe(1);
      const savedDoc = result.rows[0];
      expect(savedDoc.id).toBe('test-repo-1');
      expect(savedDoc.title).toBe('Test Article 1');
      expect(savedDoc.body).toBe('Test body content');
      expect(savedDoc.url).toBe('https://example.com/test-1');
      expect(savedDoc.author).toBe('test-author');
      expect(savedDoc.source).toBe('qiita_team');
    });

    it('upsertDocument_既存記事_正常に更新される', async () => {
      // Arrange: 既存記事を先に挿入
      const originalDocument: DocumentInput = {
        id: 'test-repo-2',
        title: 'Original Title',
        body: 'Original body',
        url: 'https://example.com/test-2',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      };
      await upsertDocument(originalDocument);

      // Act: 同じIDで異なる内容をupsert
      const updatedDocument: DocumentInput = {
        id: 'test-repo-2',
        title: 'Updated Title',
        body: 'Updated body',
        url: 'https://example.com/test-2',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-02T00:00:00Z'),
      };
      await upsertDocument(updatedDocument);

      // Assert: 更新されたことを確認
      const result = await dbClient.query(
        'SELECT * FROM documents WHERE id = $1',
        ['test-repo-2']
      );

      expect(result.rows.length).toBe(1); // 1件のみ存在（重複していない）
      const savedDoc = result.rows[0];
      expect(savedDoc.title).toBe('Updated Title');
      expect(savedDoc.body).toBe('Updated body');
      expect(new Date(savedDoc.updated_at).toISOString()).toBe('2024-01-02T00:00:00.000Z');
    });

    it('upsertDocument_DB接続エラー_例外をスローする', async () => {
      // Arrange: 不正なデータ（NOT NULL制約違反）
      const invalidDocument = {
        id: 'test-repo-3',
        title: null, // titleはNOT NULL制約
        body: 'Test body',
        url: 'https://example.com/test-3',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      } as unknown as DocumentInput;

      // Act & Assert: 例外がスローされることを確認
      await expect(upsertDocument(invalidDocument)).rejects.toThrow();
    });
  });
});
