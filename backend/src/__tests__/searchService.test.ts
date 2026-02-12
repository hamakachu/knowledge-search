import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// geminiClientをモック化（外部API依存を排除）
vi.mock('../utils/geminiClient', () => ({
  generateEmbedding: vi.fn(),
}));

// dbQueryをモック化（DB依存を排除）
vi.mock('../db/client', () => ({
  query: vi.fn(),
}));

import * as geminiClient from '../utils/geminiClient';
import * as dbClient from '../db/client';

/**
 * ハイブリッド検索サービスのユニットテスト
 *
 * テスト対象:
 * - semanticSearch: pgvectorコサイン類似度検索
 * - keywordSearch: PostgreSQL全文検索（ILIKEベース）
 * - hybridSearch: セマンティック + キーワード検索の統合（マージ・スコアリング・重複排除）
 * - searchDocuments: 後方互換性維持のキーワード検索
 */
describe('searchService', () => {
  const mockDbQuery = vi.mocked(dbClient.query);
  const mockGenerateEmbedding = vi.mocked(geminiClient.generateEmbedding);

  // モックエンベディング（768次元）
  const mockEmbedding = Array(768).fill(0.1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ========================================
  // semanticSearch のテスト
  // ========================================
  describe('semanticSearch', () => {
    it('semanticSearch_正常なクエリ_pgvectorコサイン類似度でドキュメントを返す', async () => {
      // Arrange: エンベディング生成とDB検索をモック
      mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'doc-1',
            title: 'TypeScript 型システム入門',
            url: 'https://example.com/1',
            author: 'user1',
            updatedAt: '2025-01-01T00:00:00.000Z',
            source: 'qiita_team',
            similarity: 0.95,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Act
      const { semanticSearch } = await import('../services/searchService');
      const results = await semanticSearch('TypeScript');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc-1');
      expect(results[0].score).toBeCloseTo(0.95);
      expect(mockGenerateEmbedding).toHaveBeenCalledWith('TypeScript');
    });

    it('semanticSearch_空文字列_空配列を返す', async () => {
      // Act
      const { semanticSearch } = await import('../services/searchService');
      const results = await semanticSearch('');

      // Assert
      expect(results).toEqual([]);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it('semanticSearch_エンベディング生成失敗_空配列を返す', async () => {
      // Arrange: エンベディング生成が失敗する
      mockGenerateEmbedding.mockRejectedValueOnce(new Error('Gemini API error'));

      // Act
      const { semanticSearch } = await import('../services/searchService');
      const results = await semanticSearch('TypeScript');

      // Assert: エラー時は空配列を返す（フォールバック）
      expect(results).toEqual([]);
    });
  });

  // ========================================
  // keywordSearch のテスト
  // ========================================
  describe('keywordSearch', () => {
    it('keywordSearch_正常なクエリ_キーワード一致するドキュメントを返す', async () => {
      // Arrange
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'doc-2',
            title: 'TypeScript と React の統合',
            url: 'https://example.com/2',
            author: 'user2',
            updatedAt: '2025-01-02T00:00:00.000Z',
            source: 'qiita_team',
            relevance: 0.8,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Act
      const { keywordSearch } = await import('../services/searchService');
      const results = await keywordSearch('TypeScript');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc-2');
      expect(results[0].score).toBeCloseTo(0.8);
    });

    it('keywordSearch_空文字列_空配列を返す', async () => {
      // Act
      const { keywordSearch } = await import('../services/searchService');
      const results = await keywordSearch('');

      // Assert
      expect(results).toEqual([]);
      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // hybridSearch のテスト
  // hybridSearch は semanticSearch と keywordSearch を並列呼び出しするため、
  // DBクエリの順序を制御するためにシリアル実行に変更したテスト戦略を使用する
  // ========================================
  describe('hybridSearch', () => {
    it('hybridSearch_正常なクエリ_セマンティックとキーワードの結果をマージして返す', async () => {
      // Arrange: エンベディング生成をモック
      mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);

      // Promise.allでsemantic→keywordの順に実行される
      // semanticSearch: generateEmbedding(await) → dbQuery
      // keywordSearch: 即座にdbQuery
      // 実行順: keywordのdbQuery → semanticのdbQuery
      // よって: 1番目のモック = keyword用、2番目のモック = semantic用
      mockDbQuery
        // キーワード検索のDBクエリ（keywordSearchが先にawaitする）
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'doc-2',
              title: 'TypeScript と React の統合',
              url: 'https://example.com/2',
              author: 'user2',
              updatedAt: '2025-01-02T00:00:00.000Z',
              source: 'qiita_team',
              relevance: 0.8,
            },
            {
              id: 'doc-3',
              title: 'React Hooks の使い方',
              url: 'https://example.com/3',
              author: 'user3',
              updatedAt: '2025-01-03T00:00:00.000Z',
              source: 'qiita_team',
              relevance: 0.6,
            },
          ],
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        // セマンティック検索のDBクエリ（generateEmbedding完了後）
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'doc-1',
              title: 'TypeScript 型システム入門',
              url: 'https://example.com/1',
              author: 'user1',
              updatedAt: '2025-01-01T00:00:00.000Z',
              source: 'qiita_team',
              similarity: 0.95,
            },
            {
              id: 'doc-2',
              title: 'TypeScript と React の統合',
              url: 'https://example.com/2',
              author: 'user2',
              updatedAt: '2025-01-02T00:00:00.000Z',
              source: 'qiita_team',
              similarity: 0.85,
            },
          ],
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      // Act
      const { hybridSearch } = await import('../services/searchService');
      const results = await hybridSearch('TypeScript');

      // Assert: 3件（doc-1, doc-2, doc-3）が返る（doc-2は重複排除）
      expect(results).toHaveLength(3);
      const ids = results.map(r => r.id);
      expect(ids).toContain('doc-1');
      expect(ids).toContain('doc-2');
      expect(ids).toContain('doc-3');
    });

    it('hybridSearch_重複するドキュメント_1件のみ返す', async () => {
      // Arrange: 両方の検索で同じドキュメントが返る
      mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);

      // keyword先 → semantic後の順でモック
      mockDbQuery
        .mockResolvedValueOnce({
          // キーワード検索: doc-1のみ
          rows: [
            {
              id: 'doc-1',
              title: 'TypeScript 型システム入門',
              url: 'https://example.com/1',
              author: 'user1',
              updatedAt: '2025-01-01T00:00:00.000Z',
              source: 'qiita_team',
              relevance: 0.8,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // セマンティック検索: doc-1のみ（重複）
          rows: [
            {
              id: 'doc-1',
              title: 'TypeScript 型システム入門',
              url: 'https://example.com/1',
              author: 'user1',
              updatedAt: '2025-01-01T00:00:00.000Z',
              source: 'qiita_team',
              similarity: 0.9,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      // Act
      const { hybridSearch } = await import('../services/searchService');
      const results = await hybridSearch('TypeScript');

      // Assert: 重複排除されて1件のみ
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc-1');
    });

    it('hybridSearch_スコアリング_セマンティックとキーワード両方で一致したドキュメントは高スコアになる', async () => {
      // Arrange: doc-2が両方の検索で返る
      mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);

      // keyword先 → semantic後の順でモック
      mockDbQuery
        .mockResolvedValueOnce({
          // キーワード検索: doc-2のみ
          rows: [
            {
              id: 'doc-2',
              title: 'TypeScript と React の統合',
              url: 'https://example.com/2',
              author: 'user2',
              updatedAt: '2025-01-02T00:00:00.000Z',
              source: 'qiita_team',
              relevance: 0.8,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // セマンティック検索: doc-1とdoc-2
          rows: [
            {
              id: 'doc-1',
              title: 'TypeScript 型システム入門',
              url: 'https://example.com/1',
              author: 'user1',
              updatedAt: '2025-01-01T00:00:00.000Z',
              source: 'qiita_team',
              similarity: 0.5,
            },
            {
              id: 'doc-2',
              title: 'TypeScript と React の統合',
              url: 'https://example.com/2',
              author: 'user2',
              updatedAt: '2025-01-02T00:00:00.000Z',
              source: 'qiita_team',
              similarity: 0.7,
            },
          ],
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      // Act
      const { hybridSearch } = await import('../services/searchService');
      const results = await hybridSearch('TypeScript');

      // Assert: doc-2がdoc-1より高いスコアを持つ（両方で一致）
      // doc-2: 0.7 * 0.6 + 0.8 * 0.4 = 0.42 + 0.32 = 0.74
      // doc-1: 0.5 * 0.6 = 0.30
      const doc1 = results.find(r => r.id === 'doc-1');
      const doc2 = results.find(r => r.id === 'doc-2');
      expect(doc1).toBeDefined();
      expect(doc2).toBeDefined();
      expect(doc2!.score).toBeGreaterThan(doc1!.score);
    });

    it('hybridSearch_結果がスコア降順にソートされている', async () => {
      // Arrange
      mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);

      // keyword先 → semantic後の順でモック
      mockDbQuery
        .mockResolvedValueOnce({
          // キーワード検索
          rows: [
            {
              id: 'doc-2',
              title: 'TypeScript と React の統合',
              url: 'https://example.com/2',
              author: 'user2',
              updatedAt: '2025-01-02T00:00:00.000Z',
              source: 'qiita_team',
              relevance: 0.8,
            },
            {
              id: 'doc-3',
              title: 'React Hooks の使い方',
              url: 'https://example.com/3',
              author: 'user3',
              updatedAt: '2025-01-03T00:00:00.000Z',
              source: 'qiita_team',
              relevance: 0.6,
            },
          ],
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // セマンティック検索
          rows: [
            {
              id: 'doc-1',
              title: 'TypeScript 型システム入門',
              url: 'https://example.com/1',
              author: 'user1',
              updatedAt: '2025-01-01T00:00:00.000Z',
              source: 'qiita_team',
              similarity: 0.95,
            },
            {
              id: 'doc-2',
              title: 'TypeScript と React の統合',
              url: 'https://example.com/2',
              author: 'user2',
              updatedAt: '2025-01-02T00:00:00.000Z',
              source: 'qiita_team',
              similarity: 0.85,
            },
          ],
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      // Act
      const { hybridSearch } = await import('../services/searchService');
      const results = await hybridSearch('TypeScript');

      // Assert: スコア降順
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('hybridSearch_エンベディング生成失敗_キーワード検索にフォールバックする', async () => {
      // Arrange: エンベディング生成が失敗する
      mockGenerateEmbedding.mockRejectedValueOnce(new Error('Gemini API error'));

      // キーワード検索は成功する
      // エンベディング生成失敗時、semanticSearchは空配列を返すためDBは呼ばれない
      // hybridSearchでkeywordSearchのDBが1回呼ばれる
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'doc-2',
            title: 'TypeScript と React の統合',
            url: 'https://example.com/2',
            author: 'user2',
            updatedAt: '2025-01-02T00:00:00.000Z',
            source: 'qiita_team',
            relevance: 0.8,
          },
          {
            id: 'doc-3',
            title: 'React Hooks の使い方',
            url: 'https://example.com/3',
            author: 'user3',
            updatedAt: '2025-01-03T00:00:00.000Z',
            source: 'qiita_team',
            relevance: 0.6,
          },
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Act
      const { hybridSearch } = await import('../services/searchService');
      const results = await hybridSearch('TypeScript');

      // Assert: キーワード検索の結果のみが返る
      expect(results).toHaveLength(2);
      const ids = results.map(r => r.id);
      expect(ids).toContain('doc-2');
      expect(ids).toContain('doc-3');
    });

    it('hybridSearch_空文字列_空配列を返す', async () => {
      // Act
      const { hybridSearch } = await import('../services/searchService');
      const results = await hybridSearch('');

      // Assert
      expect(results).toEqual([]);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it('hybridSearch_セマンティック検索のみで結果がある場合_その結果を返す', async () => {
      // Arrange: セマンティック検索で結果あり、キーワード検索で結果なし
      mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);

      // keyword先（結果なし） → semantic後（結果あり）の順でモック
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'doc-1',
              title: 'TypeScript 型システム入門',
              url: 'https://example.com/1',
              author: 'user1',
              updatedAt: '2025-01-01T00:00:00.000Z',
              source: 'qiita_team',
              similarity: 0.9,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      // Act
      const { hybridSearch } = await import('../services/searchService');
      const results = await hybridSearch('TypeScript');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc-1');
    });

    it('hybridSearch_キーワード検索のみで結果がある場合_その結果を返す', async () => {
      // Arrange: セマンティック検索で結果なし、キーワード検索で結果あり
      mockGenerateEmbedding.mockResolvedValueOnce(mockEmbedding);

      // keyword先（結果あり） → semantic後（結果なし）の順でモック
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'doc-3',
              title: 'React Hooks の使い方',
              url: 'https://example.com/3',
              author: 'user3',
              updatedAt: '2025-01-03T00:00:00.000Z',
              source: 'qiita_team',
              relevance: 0.7,
            },
          ],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      // Act
      const { hybridSearch } = await import('../services/searchService');
      const results = await hybridSearch('TypeScript');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('doc-3');
    });
  });

  // ========================================
  // searchDocuments（後方互換性）のテスト
  // ========================================
  describe('searchDocuments（後方互換性）', () => {
    it('searchDocuments_正常なクエリ_キーワード検索の結果を返す', async () => {
      // Arrange
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'doc-1',
            title: 'TypeScript 型システム入門',
            url: 'https://example.com/1',
            author: 'user1',
            updatedAt: '2025-01-01T00:00:00.000Z',
            source: 'qiita_team',
            relevance: 0.9,
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Act
      const { searchDocuments } = await import('../services/searchService');
      const results = await searchDocuments('TypeScript');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('url');
      expect(results[0]).toHaveProperty('author');
      expect(results[0]).toHaveProperty('updatedAt');
      expect(results[0]).toHaveProperty('source');
      // searchDocumentsはscoreフィールドを持たない（後方互換性のため）
      expect(results[0]).not.toHaveProperty('score');
    });

    it('searchDocuments_空文字列_空配列を返す', async () => {
      // Act
      const { searchDocuments } = await import('../services/searchService');
      const results = await searchDocuments('');

      // Assert
      expect(results).toEqual([]);
      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });
});
