import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';

/**
 * pgvector拡張の動作確認テスト
 *
 * テストシナリオ:
 * 1. pgvector拡張が有効化されている
 * 2. documentsテーブルにembeddingカラムが存在する
 * 3. embeddingカラムの型がvector(768)である
 * 4. idx_documents_embeddingインデックスが作成されている
 */

describe('pgvector_拡張の動作確認', () => {
  let pool: Pool;

  beforeAll(() => {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/groovy_knowledge_search';
    pool = new Pool({
      connectionString: databaseUrl,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('pgvector拡張が有効化されている', async () => {
    // pgvector拡張が存在するか確認
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) AS extension_exists;
    `);

    expect(result.rows[0].extension_exists).toBe(true);
  });

  it('documentsテーブルにembeddingカラムが存在する', async () => {
    // embeddingカラムの存在確認
    const result = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name = 'embedding';
    `);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].column_name).toBe('embedding');
  });

  it('embeddingカラムの型がvector型である', async () => {
    // vector型の確認（USER-DEFINEDとして認識される）
    const result = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name = 'embedding';
    `);

    expect(result.rows[0].data_type).toBe('USER-DEFINED');
    expect(result.rows[0].udt_name).toBe('vector');
  });

  it('idx_documents_embeddingインデックスが作成されている', async () => {
    // インデックスの存在確認
    const result = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'documents'
        AND indexname = 'idx_documents_embedding';
    `);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].indexname).toBe('idx_documents_embedding');
  });

  it('インデックスのタイプがivfflatである', async () => {
    // インデックスタイプの確認
    const result = await pool.query(`
      SELECT
        i.relname AS indexname,
        am.amname AS indextype
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      WHERE t.relname = 'documents'
        AND i.relname = 'idx_documents_embedding';
    `);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].indextype).toBe('ivfflat');
  });

  it('ベクトル類似度検索が正常に動作する', async () => {
    // テスト用のベクトルデータを挿入
    const testVector = Array(768).fill(0.1).join(',');
    await pool.query(`
      INSERT INTO documents (id, title, body, url, author, source, created_at, updated_at, embedding)
      VALUES (
        'test-pgvector-1',
        'テスト記事1',
        'テスト本文1',
        'https://example.com/test1',
        'test_author',
        'test_source',
        NOW(),
        NOW(),
        '[${testVector}]'
      )
      ON CONFLICT (id) DO UPDATE
      SET embedding = EXCLUDED.embedding;
    `);

    // 類似度検索を実行（コサイン類似度）
    const searchVector = Array(768).fill(0.1).join(',');
    const result = await pool.query(`
      SELECT
        id,
        title,
        1 - (embedding <=> '[${searchVector}]') AS similarity
      FROM documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> '[${searchVector}]'
      LIMIT 1;
    `);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].id).toBe('test-pgvector-1');
    expect(result.rows[0].similarity).toBeGreaterThan(0.99); // ほぼ完全一致

    // テストデータをクリーンアップ
    await pool.query(`DELETE FROM documents WHERE id = 'test-pgvector-1';`);
  });
});
