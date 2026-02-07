import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { searchRouter } from '../routes/search';
import * as searchService from '../services/searchService';
import * as permissionService from '../services/permissionService';

// searchServiceをモック化
vi.mock('../services/searchService');

// permissionServiceをモック化
vi.mock('../services/permissionService');

// セッションモックミドルウェア
function createMockSessionMiddleware(userId?: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req: any, _res: any, next: any) => {
    req.session = {
      userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      save: (callback: (err?: any) => void) => callback(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      destroy: (callback: (err?: any) => void) => callback(),
    };
    next();
  };
}

describe('search routes', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/search', () => {
    it('認証済みユーザーは検索結果を取得でき、権限フィルタリングが適用される', async () => {
      const mockSearchResults = [
        {
          id: '1',
          title: 'TypeScript テスト',
          url: 'https://example.com/1',
          author: 'user1',
          updatedAt: '2025-01-01T00:00:00.000Z',
          source: 'qiita',
        },
        {
          id: '2',
          title: 'TypeScript 応用',
          url: 'https://example.com/2',
          author: 'user2',
          updatedAt: '2025-01-02T00:00:00.000Z',
          source: 'qiita',
        },
      ];

      const mockFilteredResults = [
        {
          id: '1',
          title: 'TypeScript テスト',
          url: 'https://example.com/1',
          author: 'user1',
          updatedAt: '2025-01-01T00:00:00.000Z',
          source: 'qiita',
        },
      ];

      vi.mocked(searchService.searchDocuments).mockResolvedValueOnce(mockSearchResults);
      vi.mocked(permissionService.filterByPermissions).mockResolvedValueOnce(mockFilteredResults);

      // 認証済みアプリを作成
      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1)); // userId=1で認証済み
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ results: mockFilteredResults });
      expect(searchService.searchDocuments).toHaveBeenCalledWith('TypeScript');
      expect(permissionService.filterByPermissions).toHaveBeenCalledWith(1, mockSearchResults);
    });

    it('未認証ユーザーは401エラーを返す', async () => {
      // 未認証アプリを作成
      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware()); // userId未設定
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(searchService.searchDocuments).not.toHaveBeenCalled();
    });

    it('クエリパラメータqが欠けている場合は400エラーを返す', async () => {
      // 認証済みアプリを作成
      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1));
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('権限フィルタリング中にエラーが発生した場合は500エラーを返す', async () => {
      const mockSearchResults = [
        {
          id: '1',
          title: 'TypeScript テスト',
          url: 'https://example.com/1',
          author: 'user1',
          updatedAt: '2025-01-01T00:00:00.000Z',
          source: 'qiita',
        },
      ];

      vi.mocked(searchService.searchDocuments).mockResolvedValueOnce(mockSearchResults);
      vi.mocked(permissionService.filterByPermissions).mockRejectedValueOnce(
        new Error('Permission check failed')
      );

      // 認証済みアプリを作成
      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1));
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
