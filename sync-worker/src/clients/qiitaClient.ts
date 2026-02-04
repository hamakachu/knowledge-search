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
}
