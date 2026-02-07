import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { searchDocuments } from '../services/searchService';
import { query, dbClient } from '../db/client';

describe('searchDocuments', () => {
  beforeAll(async () => {
    // テスト用ドキュメントをupsert（ON CONFLICT句で重複を回避）
    await query(
      `INSERT INTO documents (id, title, body, url, author, source, created_at, updated_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8),
         ($9, $10, $11, $12, $13, $14, $15, $16),
         ($17, $18, $19, $20, $21, $22, $23, $24)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         url = EXCLUDED.url,
         author = EXCLUDED.author,
         updated_at = EXCLUDED.updated_at`,
      [
        'test-1', 'TypeScript テストの書き方', 'Vitestを使ったテストの実装方法', 'https://example.com/search/1', 'user1', 'qiita_team', new Date('2025-01-01'), new Date('2025-01-01'),
        'test-2', 'PostgreSQL 全文検索', 'pg_trgmを使った高速検索の実装', 'https://example.com/search/2', 'user2', 'qiita_team', new Date('2025-01-02'), new Date('2025-01-02'),
        'test-3', 'React フロントエンド開発', 'React HooksとTypeScriptの組み合わせ', 'https://example.com/search/3', 'user3', 'qiita_team', new Date('2025-01-03'), new Date('2025-01-03')
      ]
    );
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    await query('DELETE FROM documents WHERE id LIKE $1', ['test-%']);
    await dbClient.end();
  });

  it('正常系_検索キーワードに一致する記事を返す', async () => {
    const results = await searchDocuments('TypeScript');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('url');
    expect(results[0]).toHaveProperty('author');
    expect(results[0]).toHaveProperty('updatedAt');
    expect(results[0]).toHaveProperty('source');
    expect(results[0].title).toContain('TypeScript');
  });

  it('正常系_大文字小文字を区別せず検索できる', async () => {
    const results = await searchDocuments('typescript');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('TypeScript');
  });

  it('正常系_部分一致検索ができる', async () => {
    const results = await searchDocuments('全文');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.title.includes('全文検索'))).toBe(true);
  });

  it('正常系_検索結果が関連度順にソートされている', async () => {
    const results = await searchDocuments('PostgreSQL');

    expect(results.length).toBeGreaterThan(0);
    // タイトルにPostgreSQLを含む記事が最初に来る
    expect(results[0].title).toContain('PostgreSQL');
  });

  it('正常系_検索結果が100件以内に制限される', async () => {
    const results = await searchDocuments('test');

    expect(results.length).toBeLessThanOrEqual(100);
  });

  it('正常系_一致しないキーワードでは空配列を返す', async () => {
    const results = await searchDocuments('存在しないキーワード12345');

    expect(results).toEqual([]);
  });

  it('エッジケース_空文字列では空配列を返す', async () => {
    const results = await searchDocuments('');

    expect(results).toEqual([]);
  });
});
