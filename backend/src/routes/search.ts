import { Router } from 'express';
import { hybridSearch, searchDocuments } from '../services/searchService';
import { filterByPermissions } from '../services/permissionService';
import { requireAuth } from '../middleware/auth';

export const searchRouter = Router();

/**
 * GET /api/search
 *
 * ハイブリッド検索エンドポイント。
 * セマンティック検索（pgvectorコサイン類似度）とキーワード検索（pg_trgm + ILIKE）を
 * 組み合わせた検索を実行し、権限フィルタリング済みの結果を返す。
 *
 * クエリパラメータ:
 * - q: 検索キーワード（必須）
 * - mode: 検索モード（オプション、"hybrid" | "keyword" | "semantic"、デフォルト: "hybrid"）
 *
 * レスポンス:
 * - 200: { results: SearchResult[] }
 * - 400: { error: string } - qパラメータ未指定
 * - 401: { error: string } - 未認証
 * - 500: { error: string } - 内部エラー
 */
searchRouter.get('/', requireAuth, async (req, res) => {
  try {
    const query = req.query.q as string;
    const mode = (req.query.mode as string) || 'hybrid';

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // ユーザーIDをセッションから取得する
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 検索モードに応じた検索を実行する
    let searchResults;
    if (mode === 'keyword') {
      // キーワード検索のみ（レガシーモード）
      searchResults = await searchDocuments(query);
    } else {
      // ハイブリッド検索（デフォルト）
      const scoredResults = await hybridSearch(query);
      // hybridSearchはScoredSearchResultを返すが、permissionServiceはSearchResultを期待するため変換する
      searchResults = scoredResults.map(({ id, title, url, author, updatedAt, source }) => ({
        id,
        title,
        url,
        author,
        updatedAt,
        source,
      }));
    }

    // ユーザーの権限でフィルタリングする
    const filteredResults = await filterByPermissions(userId, searchResults);

    res.json({ results: filteredResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
