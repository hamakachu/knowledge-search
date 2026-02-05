import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import { syncQiitaTeam } from '../sync-qiita';
import { dbClient } from '../db/client';

// 環境変数を読み込む
dotenv.config({ path: '../../.env' });

describe('syncQiitaTeam', () => {
  // テスト用データの準備
  beforeAll(async () => {
    // テストデータの初期化
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-sync-%']);
  });

  beforeEach(async () => {
    // 各テスト前にテストデータをクリア
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-sync-%']);
  });

  // テスト後のクリーンアップ
  afterAll(async () => {
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-sync-%']);
    await dbClient.end();
  });

  it('syncQiitaTeam_正常系_記事がDBにupsertされる', async () => {
    // Arrange: 環境変数でモックデータを使用するように設定
    process.env.USE_MOCK_QIITA = 'true';

    // Act: syncQiitaTeam()を実行
    await syncQiitaTeam();

    // Assert: フィクスチャデータがDBに保存されることを確認
    const result = await dbClient.query(
      'SELECT * FROM documents WHERE source = $1',
      ['qiita_team']
    );

    // フィクスチャデータには3件の記事が含まれているはず
    expect(result.rows.length).toBeGreaterThanOrEqual(3);

    // 最初の記事の内容を確認
    const firstArticle = result.rows.find(row => row.id === 'a1b2c3d4e5f6g7h8i9j0');
    expect(firstArticle).toBeDefined();
    if (firstArticle) {
      expect(firstArticle.title).toBe('TypeScriptで型安全なAPI設計を学ぶ');
      expect(firstArticle.author).toBe('user001');
      expect(firstArticle.source).toBe('qiita_team');
    }
  });
});
