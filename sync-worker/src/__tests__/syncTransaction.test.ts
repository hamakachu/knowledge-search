import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import { syncQiitaTeamWithTransaction, SyncResult } from '../sync-qiita';
import { dbClient } from '../db/client';

// 環境変数を読み込む
dotenv.config({ path: '../../.env' });

// geminiClientモジュールをモックする
vi.mock('../clients/geminiClient', () => ({
  generateEmbedding: vi.fn(),
}));

// geminiClientモジュールのインポート（モック確認用）
import * as geminiClient from '../clients/geminiClient';

// pgvectorのvector(768)型に合わせた768次元テスト用ベクトル
const mockEmbedding768 = Array.from({ length: 768 }, (_, i) => parseFloat((0.001 * (i + 1)).toFixed(6)));

// フィクスチャのqiita記事IDリスト
const FIXTURE_ARTICLE_IDS = ['a1b2c3d4e5f6g7h8i9j0', 'b2c3d4e5f6g7h8i9j0k1', 'c3d4e5f6g7h8i9j0k1l2'];

/**
 * テスト用データをクリアする
 * フィクスチャ記事IDとURLの両方で削除する
 */
async function clearTestData(): Promise<void> {
  await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-tx-%']);
  // フィクスチャ記事のIDとURLで削除
  for (const id of FIXTURE_ARTICLE_IDS) {
    await dbClient.query('DELETE FROM documents WHERE id = $1', [id]);
  }
  // URLでも削除（unique_source_url制約対策）
  await dbClient.query(
    'DELETE FROM documents WHERE url LIKE $1',
    ['https://example.qiita.com/items/%']
  );
}

describe('syncQiitaTeamWithTransaction', () => {
  beforeAll(async () => {
    await clearTestData();
  });

  beforeEach(async () => {
    await clearTestData();
    vi.clearAllMocks();
    vi.mocked(geminiClient.generateEmbedding).mockResolvedValue(mockEmbedding768);
  });

  afterAll(async () => {
    await clearTestData();
    await dbClient.end();
  });

  it('syncQiitaTeamWithTransaction_正常系_トランザクションで記事がupsertされる', async () => {
    // Arrange: モックデータを使用
    process.env.USE_MOCK_QIITA = 'true';

    // Act: トランザクション付きsyncを実行
    const result: SyncResult = await syncQiitaTeamWithTransaction();

    // Assert: 成功を返し、記事がDBに保存される
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(3);
    expect(result.failedCount).toBe(0);

    const dbResult = await dbClient.query(
      'SELECT * FROM documents WHERE source = $1',
      ['qiita_team']
    );
    expect(dbResult.rows.length).toBeGreaterThanOrEqual(3);
  });

  it('syncQiitaTeamWithTransaction_エンベディング生成_バッチ処理で実行される', async () => {
    // Arrange: モックデータを使用
    process.env.USE_MOCK_QIITA = 'true';
    vi.mocked(geminiClient.generateEmbedding).mockResolvedValue(mockEmbedding768);

    // Act: トランザクション付きsyncを実行
    const result = await syncQiitaTeamWithTransaction();

    // Assert: フィクスチャの記事3件分、generateEmbeddingが呼ばれる
    expect(result.success).toBe(true);
    expect(geminiClient.generateEmbedding).toHaveBeenCalledTimes(3);
  });

  it('syncQiitaTeamWithTransaction_エンベディング失敗_記事同期は継続する', async () => {
    // Arrange: generateEmbeddingがエラーをスローするモック
    process.env.USE_MOCK_QIITA = 'true';
    vi.mocked(geminiClient.generateEmbedding).mockRejectedValue(
      new Error('Gemini API エラー')
    );

    // Act: トランザクション付きsyncを実行（エラーが発生しても完了する）
    const result = await syncQiitaTeamWithTransaction();

    // Assert: 成功を返し、embeddingなしで保存される
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(3);

    const dbResult = await dbClient.query(
      'SELECT id, embedding FROM documents WHERE source = $1',
      ['qiita_team']
    );
    expect(dbResult.rows.length).toBeGreaterThanOrEqual(3);
    // embeddingはNULL
    for (const row of dbResult.rows) {
      expect(row.embedding).toBeNull();
    }
  });

  it('syncQiitaTeamWithTransaction_結果にログ情報が含まれる', async () => {
    // Arrange
    process.env.USE_MOCK_QIITA = 'true';
    vi.mocked(geminiClient.generateEmbedding).mockResolvedValue(mockEmbedding768);

    // Act
    const result = await syncQiitaTeamWithTransaction();

    // Assert: 結果にログ情報が含まれる
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBeGreaterThanOrEqual(0);
    expect(result.failedCount).toBeGreaterThanOrEqual(0);
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('syncQiitaTeamWithTransaction_部分的エンベディング失敗_エラー情報が含まれる', async () => {
    // Arrange: 最初の呼び出しのみ成功、以降は失敗
    process.env.USE_MOCK_QIITA = 'true';
    vi.mocked(geminiClient.generateEmbedding)
      .mockResolvedValueOnce(mockEmbedding768)
      .mockRejectedValueOnce(new Error('Gemini API エラー 1'))
      .mockRejectedValueOnce(new Error('Gemini API エラー 2'));

    // Act
    const result = await syncQiitaTeamWithTransaction();

    // Assert: 記事同期は成功、エラー情報が含まれる
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(3);
    // エンベディング生成エラーがログに含まれる
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
