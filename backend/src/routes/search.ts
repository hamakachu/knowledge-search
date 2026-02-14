import { Router } from 'express';
import { hybridSearch, keywordSearch, semanticSearch, ScoredSearchResult } from '../services/searchService';
import { filterByPermissions } from '../services/permissionService';
import { requireAuth } from '../middleware/auth';

export const searchRouter = Router();

/**
 * 有効な検索モードの型定義
 */
type SearchMode = 'hybrid' | 'keyword' | 'semantic';

/**
 * 有効な検索モードのセット
 */
const VALID_SEARCH_MODES: ReadonlySet<string> = new Set(['hybrid', 'keyword', 'semantic']);

/**
 * GET /api/search
 *
 * 検索エンドポイント。modeパラメータによって検索方式を切り替える。
 * - hybrid（デフォルト）: セマンティック検索 + キーワード検索のハイブリッド
 * - keyword: キーワード検索のみ（pg_trgm + ILIKE）
 * - semantic: セマンティック検索のみ（pgvectorコサイン類似度）
 *
 * 全モードで統一されたレスポンス形式（スコア情報を含む）を返す。
 *
 * クエリパラメータ:
 * - q: 検索キーワード（必須）
 * - mode: 検索モード（オプション、"hybrid" | "keyword" | "semantic"、デフォルト: "hybrid"）
 *
 * レスポンス:
 * - 200: { results: ScoredSearchResult[] }
 * - 400: { error: string } - qパラメータ未指定 or 不正なmodeパラメータ
 * - 401: { error: string } - 未認証
 * - 500: { error: string } - 内部エラー
 */
searchRouter.get('/', requireAuth, async (req, res) => {
  try {
    const query = req.query.q as string;
    const modeParam = (req.query.mode as string) || 'hybrid';

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // modeパラメータのバリデーション
    if (!VALID_SEARCH_MODES.has(modeParam)) {
      return res.status(400).json({
        error: `Invalid mode parameter. Must be one of: ${Array.from(VALID_SEARCH_MODES).join(', ')}`,
      });
    }

    const mode = modeParam as SearchMode;

    // ユーザーIDをセッションから取得する
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 検索モードに応じた検索を実行する
    let scoredResults: ScoredSearchResult[];
    if (mode === 'keyword') {
      // キーワード検索のみ（pg_trgm + ILIKEベース、スコア付き）
      scoredResults = await keywordSearch(query);
    } else if (mode === 'semantic') {
      // セマンティック検索のみ（pgvectorコサイン類似度、スコア付き）
      scoredResults = await semanticSearch(query);
    } else {
      // ハイブリッド検索（デフォルト、スコア付き）
      scoredResults = await hybridSearch(query);
    }

    // ユーザーの権限でフィルタリングする
    // filterByPermissionsはScoredSearchResultを受け取り、同じ型で返す
    const filteredResults = await filterByPermissions(userId, scoredResults);

    res.json({ results: filteredResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
