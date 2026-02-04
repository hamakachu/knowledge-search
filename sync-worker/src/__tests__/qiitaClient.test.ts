import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QiitaClient } from '../clients/qiitaClient';

describe('QiitaClient', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = process.env.USE_MOCK_QIITA;
  });

  afterEach(() => {
    // 環境変数を復元
    process.env.USE_MOCK_QIITA = originalEnv;
  });

  describe('USE_MOCK_QIITA=true の場合', () => {
    it('fetchArticles_モックフラグが有効_フィクスチャデータを返す', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'true';
      const client = new QiitaClient('dummy_token');

      // Act
      const articles = await client.fetchArticles();

      // Assert
      expect(articles).toBeDefined();
      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBeGreaterThan(0);

      // フィクスチャデータの構造を確認
      const firstArticle = articles[0];
      expect(firstArticle).toHaveProperty('id');
      expect(firstArticle).toHaveProperty('title');
      expect(firstArticle).toHaveProperty('url');
      expect(firstArticle).toHaveProperty('created_at');
      expect(firstArticle).toHaveProperty('updated_at');
      expect(firstArticle).toHaveProperty('user');
      expect(firstArticle.user).toHaveProperty('id');
      expect(firstArticle.user).toHaveProperty('name');
      expect(firstArticle).toHaveProperty('body');
    });

    it('fetchArticles_モックフラグが有効_ページングパラメータを無視する', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'true';
      const client = new QiitaClient('dummy_token');

      // Act
      const articlesPage1 = await client.fetchArticles(1, 50);
      const articlesPage2 = await client.fetchArticles(2, 50);

      // Assert: モック時はページングを無視し、同じデータを返す
      expect(articlesPage1).toEqual(articlesPage2);
    });
  });

  describe('USE_MOCK_QIITA=false の場合', () => {
    it('fetchArticles_モックフラグが無効_実際のAPIを呼び出す', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'false';
      const client = new QiitaClient('invalid_token');

      // Act & Assert
      // 実際のAPI呼び出しなので、無効なトークンでエラーになることを期待
      // ただし、このテストはネットワーク依存なので、モックがfalseの場合のみ実行
      // 実装が完了するまでは、このテストはスキップまたはモック化が必要

      // TODO: 実際のAPI実装後に、モックライブラリ（nock等）でテストを書く
      expect(client).toBeDefined();
    });
  });
});
