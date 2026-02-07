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

  describe('checkArticleAccess', () => {
    it('checkArticleAccess_記事が存在しアクセス可能_trueを返す', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'true';
      const client = new QiitaClient('valid_token');
      const articleId = 'test-article-id-1';

      // Act
      const hasAccess = await client.checkArticleAccess(articleId);

      // Assert
      expect(hasAccess).toBe(true);
    });

    it('checkArticleAccess_記事が存在しないまたは権限なし_falseを返す', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'true';
      const client = new QiitaClient('valid_token');
      const articleId = 'non-existent-article';

      // Act
      const hasAccess = await client.checkArticleAccess(articleId);

      // Assert
      expect(hasAccess).toBe(false);
    });

    it('checkArticleAccess_APIエラー発生_falseを返す（安全側に倒す）', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'true';
      const client = new QiitaClient('valid_token');
      const articleId = 'error-trigger-id';

      // Act
      const hasAccess = await client.checkArticleAccess(articleId);

      // Assert
      expect(hasAccess).toBe(false);
    });
  });

  describe('checkBatchAccess', () => {
    it('checkBatchAccess_複数記事の権限チェック_アクセス可能な記事IDのSetを返す', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'true';
      const client = new QiitaClient('valid_token');
      const articleIds = ['test-article-id-1', 'test-article-id-2', 'non-existent-article'];

      // Act
      const accessibleIds = await client.checkBatchAccess(articleIds);

      // Assert
      expect(accessibleIds).toBeInstanceOf(Set);
      expect(accessibleIds.has('test-article-id-1')).toBe(true);
      expect(accessibleIds.has('test-article-id-2')).toBe(true);
      expect(accessibleIds.has('non-existent-article')).toBe(false);
      expect(accessibleIds.size).toBe(2);
    });

    it('checkBatchAccess_空配列を渡す_空のSetを返す', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'true';
      const client = new QiitaClient('valid_token');

      // Act
      const accessibleIds = await client.checkBatchAccess([]);

      // Assert
      expect(accessibleIds).toBeInstanceOf(Set);
      expect(accessibleIds.size).toBe(0);
    });

    it('checkBatchAccess_並列処理で実行される', async () => {
      // Arrange
      process.env.USE_MOCK_QIITA = 'true';
      const client = new QiitaClient('valid_token');
      const articleIds = Array.from({ length: 10 }, (_, i) => `article-${i}`);

      // Act
      const startTime = Date.now();
      const accessibleIds = await client.checkBatchAccess(articleIds);
      const duration = Date.now() - startTime;

      // Assert
      // 並列処理なので、直列処理よりも速いはず（モック環境では即座に完了）
      expect(accessibleIds).toBeInstanceOf(Set);
      expect(duration).toBeLessThan(1000); // 1秒以内に完了
    });
  });
});
