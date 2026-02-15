import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import { syncQiitaTeam } from '../sync-qiita';
import { dbClient } from '../db/client';

// 環境変数を読み込む
dotenv.config({ path: '../../.env' });

// geminiClientモジュールをモックする
// vi.mockはホイストされるためファクトリ内では外部変数を参照できない
// そのため、ファクトリ内で768次元のモックベクトルを生成する
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
 * test-sync-%パターン と フィクスチャ記事ID の両方を削除する
 */
async function clearTestData(): Promise<void> {
  await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-sync-%']);
  for (const id of FIXTURE_ARTICLE_IDS) {
    await dbClient.query('DELETE FROM documents WHERE id = $1', [id]);
  }
  // URLでも削除（unique_source_url制約対策）
  await dbClient.query(
    'DELETE FROM documents WHERE url LIKE $1',
    ['https://example.qiita.com/items/%']
  );
}

describe('syncQiitaTeam', () => {
  // テスト用データの準備
  beforeAll(async () => {
    // テストデータの初期化
    await clearTestData();
  });

  beforeEach(async () => {
    // 各テスト前にテストデータをクリア（フィクスチャ記事IDも含む）
    await clearTestData();
    // モックをリセット
    vi.clearAllMocks();
    // デフォルトのモック実装を再設定（768次元ベクトル）
    vi.mocked(geminiClient.generateEmbedding).mockResolvedValue(mockEmbedding768);
  });

  // テスト後のクリーンアップ
  afterAll(async () => {
    await clearTestData();
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

  it('syncQiitaTeam_エンベディング生成_記事ごとにgenerateEmbeddingが呼ばれる', async () => {
    // Arrange: モックQiitaデータと、generateEmbeddingのモックを準備（768次元ベクトル）
    process.env.USE_MOCK_QIITA = 'true';
    vi.mocked(geminiClient.generateEmbedding).mockResolvedValue(mockEmbedding768);

    // Act: syncQiitaTeam()を実行
    await syncQiitaTeam();

    // Assert: フィクスチャの記事3件分、generateEmbeddingが呼ばれることを確認
    expect(geminiClient.generateEmbedding).toHaveBeenCalled();
    // フィクスチャには3件の記事があるので、3回呼ばれるはず
    expect(geminiClient.generateEmbedding).toHaveBeenCalledTimes(3);
  });

  it('syncQiitaTeam_エンベディング保存_生成されたembeddingがDBに保存される', async () => {
    // Arrange: モックQiitaデータと特定のembeddingを返すモックを準備（768次元ベクトル）
    process.env.USE_MOCK_QIITA = 'true';
    vi.mocked(geminiClient.generateEmbedding).mockResolvedValue(mockEmbedding768);

    // Act: syncQiitaTeam()を実行
    await syncQiitaTeam();

    // Assert: DBにembeddingが保存されたことを確認（フィクスチャ記事IDでフィルタ）
    const result = await dbClient.query(
      'SELECT id, embedding IS NOT NULL as has_embedding FROM documents WHERE id = ANY($1)',
      [FIXTURE_ARTICLE_IDS]
    );

    expect(result.rows.length).toBe(3);
    // すべての記事にembeddingが保存されていることを確認
    for (const row of result.rows) {
      expect(row.has_embedding).toBe(true);
    }
  });

  it('syncQiitaTeam_エンベディング生成失敗_記事同期は継続する', async () => {
    // Arrange: generateEmbeddingがエラーをスローするモックを設定
    process.env.USE_MOCK_QIITA = 'true';
    vi.mocked(geminiClient.generateEmbedding).mockRejectedValue(
      new Error('Gemini API エラー')
    );

    // Act: syncQiitaTeam()を実行（エラーが発生しても例外をスローしないことを確認）
    await expect(syncQiitaTeam()).resolves.not.toThrow();

    // Assert: エンベディング生成が失敗しても、記事自体はDBに保存されることを確認
    const result = await dbClient.query(
      'SELECT id, embedding FROM documents WHERE source = $1',
      ['qiita_team']
    );

    // 記事はDBに保存されている（3件以上）
    expect(result.rows.length).toBeGreaterThanOrEqual(3);
    // embeddingはNULL（生成失敗のため）
    for (const row of result.rows) {
      expect(row.embedding).toBeNull();
    }
  });
});
