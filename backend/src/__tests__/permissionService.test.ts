import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { filterByPermissions } from '../services/permissionService';
import * as authService from '../services/authService';
import type { SearchResult } from '../services/searchService';

// authServiceをモック化
vi.mock('../services/authService');

// QiitaClientをモック化（動的インポート対応）
const mockCheckBatchAccess = vi.fn();

vi.mock('../../../sync-worker/src/clients/qiitaClient', () => {
  return {
    QiitaClient: vi.fn().mockImplementation(() => ({
      checkBatchAccess: mockCheckBatchAccess,
      fetchArticles: vi.fn(),
      checkArticleAccess: vi.fn()
    }))
  };
});

describe('permissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのモック動作を設定
    mockCheckBatchAccess.mockResolvedValue(new Set(['article-1', 'article-3']));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('filterByPermissions()', () => {
    it('ユーザーのトークンを使用して権限チェックし、アクセス可能な記事のみをフィルタリングする', async () => {
      // Arrange
      const userId = 1;
      const searchResults: SearchResult[] = [
        {
          id: 'article-1',
          title: 'Article 1',
          url: 'https://example.com/1',
          author: 'Author 1',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'qiita'
        },
        {
          id: 'article-2',
          title: 'Article 2',
          url: 'https://example.com/2',
          author: 'Author 2',
          updatedAt: '2024-01-02T00:00:00Z',
          source: 'qiita'
        },
        {
          id: 'article-3',
          title: 'Article 3',
          url: 'https://example.com/3',
          author: 'Author 3',
          updatedAt: '2024-01-03T00:00:00Z',
          source: 'qiita'
        }
      ];

      // authServiceのgetDecryptedQiitaTokenをモック化
      vi.mocked(authService.getDecryptedQiitaToken).mockResolvedValueOnce('test-token-12345');

      // Act
      const filteredResults = await filterByPermissions(userId, searchResults);

      // Assert
      expect(filteredResults).toHaveLength(2);
      expect(filteredResults[0].id).toBe('article-1');
      expect(filteredResults[1].id).toBe('article-3');
      expect(authService.getDecryptedQiitaToken).toHaveBeenCalledWith(userId);
    });

    it('ユーザーが見つからない場合はエラーをスローする', async () => {
      // Arrange
      const userId = 999;
      const searchResults: SearchResult[] = [];

      vi.mocked(authService.getDecryptedQiitaToken).mockResolvedValueOnce(null);

      // Act & Assert
      await expect(filterByPermissions(userId, searchResults)).rejects.toThrow('User not found or token not available');
    });

    it('空の検索結果を渡した場合は空配列を返す', async () => {
      // Arrange
      const userId = 1;
      const searchResults: SearchResult[] = [];

      vi.mocked(authService.getDecryptedQiitaToken).mockResolvedValueOnce('test-token-12345');

      // Act
      const filteredResults = await filterByPermissions(userId, searchResults);

      // Assert
      expect(filteredResults).toHaveLength(0);
    });

    it('すべての記事へのアクセス権限がない場合は空配列を返す', async () => {
      // Arrange
      const userId = 1;
      const searchResults: SearchResult[] = [
        {
          id: 'article-100',
          title: 'Inaccessible Article',
          url: 'https://example.com/100',
          author: 'Author',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'qiita'
        }
      ];

      vi.mocked(authService.getDecryptedQiitaToken).mockResolvedValueOnce('test-token-12345');

      // このテスト専用にモックの戻り値を変更
      mockCheckBatchAccess.mockResolvedValueOnce(new Set<string>());

      // Act
      const filteredResults = await filterByPermissions(userId, searchResults);

      // Assert
      expect(filteredResults).toHaveLength(0);
    });

    it('Qiita APIエラー時は空配列を返す（安全側に倒す）', async () => {
      // Arrange
      const userId = 1;
      const searchResults: SearchResult[] = [
        {
          id: 'article-1',
          title: 'Article 1',
          url: 'https://example.com/1',
          author: 'Author 1',
          updatedAt: '2024-01-01T00:00:00Z',
          source: 'qiita'
        }
      ];

      vi.mocked(authService.getDecryptedQiitaToken).mockResolvedValueOnce('test-token-12345');

      // このテスト専用にモックをエラーにする
      mockCheckBatchAccess.mockRejectedValueOnce(new Error('API Error'));

      // Act
      const filteredResults = await filterByPermissions(userId, searchResults);

      // Assert
      expect(filteredResults).toHaveLength(0);
    });
  });
});
