import fetch from 'node-fetch';

export interface QiitaArticle {
  id: string;
  title: string;
  url: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
  };
  body: string;
}

export class QiitaClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = 'https://qiita.com/api/v2';
  }

  async fetchArticles(page = 1, perPage = 100): Promise<QiitaArticle[]> {
    // 環境変数でモック/実API切り替え
    if (process.env.USE_MOCK_QIITA === 'true') {
      // フィクスチャデータを返す
      const fixtureData = await import('../__fixtures__/qiita-articles.json');
      return fixtureData.default as QiitaArticle[];
    }

    // 実際のAPI呼び出し
    const url = `${this.baseUrl}/items?page=${page}&per_page=${perPage}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Qiita API error: ${response.statusText}`);
    }

    return await response.json() as QiitaArticle[];
  }

  /**
   * 単一記事のアクセス権限をチェック
   *
   * @param articleId - チェック対象の記事ID
   * @returns アクセス可能な場合true、権限なしまたはエラー時はfalse
   */
  async checkArticleAccess(articleId: string): Promise<boolean> {
    try {
      // 環境変数でモック/実API切り替え
      if (process.env.USE_MOCK_QIITA === 'true') {
        // モック: アクセス可能な記事リストをフィクスチャから取得
        const accessData = await import('../__fixtures__/qiita-article-access.json');
        const accessibleArticles = accessData.default.accessibleArticles as string[];
        return accessibleArticles.includes(articleId);
      }

      // 実際のAPI呼び出し: GET /items/:id
      const url = `${this.baseUrl}/items/${articleId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      // 200 OK → アクセス可能
      if (response.ok) {
        return true;
      }

      // 404 → 権限なし（または記事が存在しない）
      if (response.status === 404) {
        return false;
      }

      // その他のエラー → 安全側に倒す（アクセス拒否）
      console.error(`Qiita API error for article ${articleId}: ${response.status} ${response.statusText}`);
      return false;
    } catch (error) {
      // ネットワークエラー等 → 安全側に倒す（アクセス拒否）
      console.error(`Error checking access for article ${articleId}:`, error);
      return false;
    }
  }

  /**
   * 複数記事のアクセス権限を並列チェック
   *
   * @param articleIds - チェック対象の記事ID配列
   * @returns アクセス可能な記事IDのSet
   */
  async checkBatchAccess(articleIds: string[]): Promise<Set<string>> {
    // 空配列の場合は空のSetを返す
    if (articleIds.length === 0) {
      return new Set<string>();
    }

    // Promise.allで並列実行
    const accessChecks = await Promise.all(
      articleIds.map(async (id) => {
        const hasAccess = await this.checkArticleAccess(id);
        return { id, hasAccess };
      })
    );

    // アクセス可能な記事IDのみをSetに追加
    const accessibleIds = new Set<string>();
    for (const { id, hasAccess } of accessChecks) {
      if (hasAccess) {
        accessibleIds.add(id);
      }
    }

    return accessibleIds;
  }
}
