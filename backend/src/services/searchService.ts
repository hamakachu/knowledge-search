import { query as dbQuery } from '../db/client';

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  author: string;
  updatedAt: string;
  source: string;
}

/**
 * PostgreSQL全文検索を実行
 *
 * pg_trgmのsimilarity関数を使用した関連度スコアリング
 * ILIKEで大文字小文字を区別しない検索
 * 関連度順 + 更新日時順にソート
 * 上限100件
 *
 * @param searchQuery - 検索キーワード
 * @returns 検索結果の配列
 */
export async function searchDocuments(searchQuery: string): Promise<SearchResult[]> {
  // 空文字列の場合は空配列を返す
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  const sql = `
    SELECT
      id,
      title,
      url,
      author,
      updated_at as "updatedAt",
      source,
      similarity(title, $1) + similarity(body, $1) as relevance
    FROM documents
    WHERE
      title ILIKE $2 OR body ILIKE $2
    ORDER BY relevance DESC, updated_at DESC
    LIMIT 100
  `;

  const searchPattern = `%${searchQuery}%`;

  try {
    const result = await dbQuery<SearchResult & { relevance: number }>(sql, [searchQuery, searchPattern]);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      url: row.url,
      author: row.author,
      updatedAt: row.updatedAt,
      source: row.source,
    }));
  } catch (error) {
    console.error('Search error:', error);
    throw new Error('Failed to search documents');
  }
}
