import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import { batchUpsertDocuments } from '../db/documentRepository';
import type { DocumentInput } from '../db/documentRepository';
import { dbClient } from '../db/client';

// 環境変数を読み込む
dotenv.config({ path: '../../.env' });

describe('batchUpsertDocuments', () => {
  // テスト用データの準備
  beforeAll(async () => {
    // テストデータの初期化
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-batch-%']);
  });

  beforeEach(async () => {
    // 各テスト前にテストデータをクリア
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-batch-%']);
  });

  // テスト後のクリーンアップ
  afterAll(async () => {
    await dbClient.query('DELETE FROM documents WHERE id LIKE $1', ['test-batch-%']);
    await dbClient.end();
  });

  it('batchUpsertDocuments_空配列_何もせずに成功する', async () => {
    // Arrange: 空のドキュメント配列
    const documents: DocumentInput[] = [];

    // Act: バッチupsertを実行
    const result = await batchUpsertDocuments(documents);

    // Assert: 成功を返す
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  it('batchUpsertDocuments_複数記事_トランザクションで一括挿入される', async () => {
    // Arrange: 複数の記事を準備
    const documents: DocumentInput[] = [
      {
        id: 'test-batch-1',
        title: 'Batch Test Article 1',
        body: 'Test body content 1',
        url: 'https://example.com/batch-1',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: 'test-batch-2',
        title: 'Batch Test Article 2',
        body: 'Test body content 2',
        url: 'https://example.com/batch-2',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-02T00:00:00Z'),
        updated_at: new Date('2024-01-02T00:00:00Z'),
      },
      {
        id: 'test-batch-3',
        title: 'Batch Test Article 3',
        body: 'Test body content 3',
        url: 'https://example.com/batch-3',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-03T00:00:00Z'),
        updated_at: new Date('2024-01-03T00:00:00Z'),
      },
    ];

    // Act: バッチupsertを実行
    const result = await batchUpsertDocuments(documents);

    // Assert: すべての記事が挿入される
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(3);
    expect(result.failedCount).toBe(0);

    // DBに正しく保存されたことを確認
    const dbResult = await dbClient.query(
      'SELECT * FROM documents WHERE id LIKE $1 ORDER BY id',
      ['test-batch-%']
    );
    expect(dbResult.rows.length).toBe(3);
    expect(dbResult.rows[0].title).toBe('Batch Test Article 1');
    expect(dbResult.rows[1].title).toBe('Batch Test Article 2');
    expect(dbResult.rows[2].title).toBe('Batch Test Article 3');
  });

  it('batchUpsertDocuments_embeddingあり_embeddingも一括保存される', async () => {
    // Arrange: embeddingを含む記事を準備（768次元ベクトル）
    const testEmbedding = Array.from({ length: 768 }, (_, i) => parseFloat((0.001 * (i + 1)).toFixed(6)));
    const documents: DocumentInput[] = [
      {
        id: 'test-batch-emb-1',
        title: 'Embedding Batch Test 1',
        body: 'Test body with embedding 1',
        url: 'https://example.com/batch-emb-1',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
        embedding: testEmbedding,
      },
      {
        id: 'test-batch-emb-2',
        title: 'Embedding Batch Test 2',
        body: 'Test body with embedding 2',
        url: 'https://example.com/batch-emb-2',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-02T00:00:00Z'),
        updated_at: new Date('2024-01-02T00:00:00Z'),
        embedding: testEmbedding,
      },
    ];

    // Act: バッチupsertを実行
    const result = await batchUpsertDocuments(documents);

    // Assert: embeddingも保存される
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(2);

    const dbResult = await dbClient.query(
      'SELECT id, embedding IS NOT NULL as has_embedding FROM documents WHERE id LIKE $1 ORDER BY id',
      ['test-batch-emb-%']
    );
    expect(dbResult.rows.length).toBe(2);
    expect(dbResult.rows[0].has_embedding).toBe(true);
    expect(dbResult.rows[1].has_embedding).toBe(true);
  });

  it('batchUpsertDocuments_既存記事更新_トランザクションで一括更新される', async () => {
    // Arrange: 先に記事を挿入
    const initialDocuments: DocumentInput[] = [
      {
        id: 'test-batch-update-1',
        title: 'Original Title 1',
        body: 'Original body 1',
        url: 'https://example.com/update-1',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: 'test-batch-update-2',
        title: 'Original Title 2',
        body: 'Original body 2',
        url: 'https://example.com/update-2',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-02T00:00:00Z'),
        updated_at: new Date('2024-01-02T00:00:00Z'),
      },
    ];
    await batchUpsertDocuments(initialDocuments);

    // Act: 同じIDで更新内容をupsert
    const updatedDocuments: DocumentInput[] = [
      {
        id: 'test-batch-update-1',
        title: 'Updated Title 1',
        body: 'Updated body 1',
        url: 'https://example.com/update-1',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-10T00:00:00Z'),
      },
      {
        id: 'test-batch-update-2',
        title: 'Updated Title 2',
        body: 'Updated body 2',
        url: 'https://example.com/update-2',
        author: 'test-author',
        source: 'qiita_team',
        created_at: new Date('2024-01-02T00:00:00Z'),
        updated_at: new Date('2024-01-10T00:00:00Z'),
      },
    ];
    const result = await batchUpsertDocuments(updatedDocuments);

    // Assert: 更新が成功
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(2);

    const dbResult = await dbClient.query(
      'SELECT * FROM documents WHERE id LIKE $1 ORDER BY id',
      ['test-batch-update-%']
    );
    expect(dbResult.rows.length).toBe(2); // 重複なし
    expect(dbResult.rows[0].title).toBe('Updated Title 1');
    expect(dbResult.rows[1].title).toBe('Updated Title 2');
  });

  it('batchUpsertDocuments_一部失敗_ロールバックされる', async () => {
    // Arrange: 一部に無効なデータを含む記事
    // (NOT NULL制約違反を発生させるため、titleをnullにする)
    const validDoc: DocumentInput = {
      id: 'test-batch-rollback-1',
      title: 'Valid Article',
      body: 'Valid body',
      url: 'https://example.com/rollback-1',
      author: 'test-author',
      source: 'qiita_team',
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z'),
    };
    const invalidDoc = {
      id: 'test-batch-rollback-2',
      title: null, // NOT NULL制約違反
      body: 'Invalid body',
      url: 'https://example.com/rollback-2',
      author: 'test-author',
      source: 'qiita_team',
      created_at: new Date('2024-01-02T00:00:00Z'),
      updated_at: new Date('2024-01-02T00:00:00Z'),
    } as unknown as DocumentInput;

    const documents = [validDoc, invalidDoc];

    // Act: バッチupsertを実行（エラーが発生するはず）
    const result = await batchUpsertDocuments(documents);

    // Assert: 失敗を返し、ロールバックされる
    expect(result.success).toBe(false);
    expect(result.failedCount).toBeGreaterThan(0);
    expect(result.error).toBeDefined();

    // ロールバックされているので、validDocも保存されていない
    const dbResult = await dbClient.query(
      'SELECT * FROM documents WHERE id LIKE $1',
      ['test-batch-rollback-%']
    );
    expect(dbResult.rows.length).toBe(0);
  });

  it('batchUpsertDocuments_大量データ_バッチサイズで分割処理される', async () => {
    // Arrange: 50件の記事を準備（バッチサイズより多い場合のテスト）
    const documents: DocumentInput[] = Array.from({ length: 50 }, (_, i) => ({
      id: `test-batch-large-${String(i + 1).padStart(3, '0')}`,
      title: `Large Batch Article ${i + 1}`,
      body: `Test body content ${i + 1}`,
      url: `https://example.com/large-${i + 1}`,
      author: 'test-author',
      source: 'qiita_team' as const,
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z'),
    }));

    // Act: バッチupsertを実行
    const result = await batchUpsertDocuments(documents);

    // Assert: すべての記事が挿入される
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(50);

    const dbResult = await dbClient.query(
      'SELECT COUNT(*) as count FROM documents WHERE id LIKE $1',
      ['test-batch-large-%']
    );
    expect(parseInt(dbResult.rows[0].count)).toBe(50);
  });
});
