import { query as dbQuery } from '../db/client';
import { generateEmbedding } from '../utils/geminiClient';

/**
 * 検索結果の型定義
 */
export interface SearchResult {
  id: string;
  title: string;
  url: string;
  author: string;
  updatedAt: string;
  source: string;
}

/**
 * スコア付き検索結果の型定義
 * hybridSearch / semanticSearch / keywordSearch で使用する
 */
export interface ScoredSearchResult extends SearchResult {
  score: number;
}

/**
 * セマンティック検索を実行する
 *
 * クエリテキストのエンベディングを生成し、
 * pgvectorのコサイン類似度で上位50件のドキュメントを取得する。
 * エンベディング生成が失敗した場合は空配列を返す（フォールバック用）。
 *
 * @param searchQuery - 検索キーワード
 * @returns スコア付き検索結果の配列
 */
export async function semanticSearch(searchQuery: string): Promise<ScoredSearchResult[]> {
  // 空文字列の場合は空配列を返す
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  try {
    // クエリのエンベディングを生成する
    const embedding = await generateEmbedding(searchQuery);

    // pgvectorのコサイン類似度演算子（<=>）でスコアリング
    // 1 - コサイン距離 = コサイン類似度
    const embeddingStr = `[${embedding.join(',')}]`;
    const sql = `
      SELECT
        id,
        title,
        url,
        author,
        updated_at as "updatedAt",
        source,
        1 - (embedding <=> $1::vector) AS similarity
      FROM documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 50
    `;

    const result = await dbQuery<SearchResult & { similarity: number }>(sql, [embeddingStr]);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      url: row.url,
      author: row.author,
      updatedAt: row.updatedAt,
      source: row.source,
      score: row.similarity,
    }));
  } catch (error) {
    // エンベディング生成やDB検索が失敗した場合は空配列を返す（フォールバック用）
    console.error('セマンティック検索エラー（フォールバックします）:', error);
    return [];
  }
}

/**
 * キーワード検索を実行する
 *
 * pg_trgmのsimilarity関数を使用した関連度スコアリング。
 * ILIKEで大文字小文字を区別しない部分一致検索を行う。
 * 関連度順 + 更新日時順にソートし、上限100件。
 *
 * @param searchQuery - 検索キーワード
 * @returns スコア付き検索結果の配列
 */
export async function keywordSearch(searchQuery: string): Promise<ScoredSearchResult[]> {
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

  // パラメータ化クエリでSQLインジェクション対策
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
      score: row.relevance,
    }));
  } catch (error) {
    console.error('キーワード検索エラー:', error);
    throw new Error('Failed to search documents');
  }
}

/**
 * ハイブリッド検索を実行する
 *
 * セマンティック検索（pgvectorコサイン類似度）とキーワード検索（pg_trgm + ILIKE）を
 * 並列実行し、結果をマージ・スコアリング・重複排除して返す。
 *
 * スコアリング戦略（重み付き加算）:
 * - セマンティック検索のみで一致: semanticScore * 0.6
 * - キーワード検索のみで一致: keywordScore * 0.4
 * - 両方で一致: semanticScore * 0.6 + keywordScore * 0.4（加算ボーナス）
 *
 * エンベディング生成が失敗した場合は、キーワード検索の結果のみを返す（フォールバック）。
 *
 * @param searchQuery - 検索キーワード
 * @returns スコア付き検索結果の配列（スコア降順）
 */
export async function hybridSearch(searchQuery: string): Promise<ScoredSearchResult[]> {
  // 空文字列の場合は空配列を返す
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  // セマンティック検索とキーワード検索を並列実行する
  // semanticSearchはエンベディング生成失敗時に空配列を返すため、Promiseはリジェクトされない
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(searchQuery),
    keywordSearch(searchQuery),
  ]);

  // スコアの重み付け定数
  const SEMANTIC_WEIGHT = 0.6;
  const KEYWORD_WEIGHT = 0.4;

  // ドキュメントIDをキーとしたスコアマップを構築する（重複排除のため）
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();

  // セマンティック検索結果をスコアマップに登録する
  for (const result of semanticResults) {
    const weightedScore = result.score * SEMANTIC_WEIGHT;
    scoreMap.set(result.id, {
      result: {
        id: result.id,
        title: result.title,
        url: result.url,
        author: result.author,
        updatedAt: result.updatedAt,
        source: result.source,
      },
      score: weightedScore,
    });
  }

  // キーワード検索結果をスコアマップにマージする
  for (const result of keywordResults) {
    const weightedScore = result.score * KEYWORD_WEIGHT;
    const existing = scoreMap.get(result.id);
    if (existing) {
      // 両方の検索で一致した場合はスコアを加算する（ボーナス効果）
      scoreMap.set(result.id, {
        result: existing.result,
        score: existing.score + weightedScore,
      });
    } else {
      // キーワード検索のみで一致した場合はそのまま登録する
      scoreMap.set(result.id, {
        result: {
          id: result.id,
          title: result.title,
          url: result.url,
          author: result.author,
          updatedAt: result.updatedAt,
          source: result.source,
        },
        score: weightedScore,
      });
    }
  }

  // スコア降順にソートして返す
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ result, score }) => ({
      ...result,
      score,
    }));
}

/**
 * PostgreSQL全文検索を実行する（後方互換性のため維持）
 *
 * 既存のAPIとの互換性を保つために `keywordSearch` の薄いラッパーとして実装する。
 * スコアフィールドを持たない `SearchResult[]` を返す。
 *
 * @param searchQuery - 検索キーワード
 * @returns 検索結果の配列（スコアフィールドなし）
 */
export async function searchDocuments(searchQuery: string): Promise<SearchResult[]> {
  // 空文字列の場合は空配列を返す
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  // keywordSearchを使い、scoreフィールドを除いて返す（後方互換性のため）
  try {
    const scoredResults = await keywordSearch(searchQuery);
    return scoredResults.map(({ id, title, url, author, updatedAt, source }) => ({
      id,
      title,
      url,
      author,
      updatedAt,
      source,
    }));
  } catch (error) {
    console.error('Search error:', error);
    throw new Error('Failed to search documents');
  }
}
