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

// モック検索結果（スコア付き）
const mockScoredResults = [
  {
    id: '1',
    title: 'TypeScript テスト',
    url: 'https://example.com/1',
    author: 'user1',
    updatedAt: '2025-01-01T00:00:00.000Z',
    source: 'qiita',
    score: 0.95,
  },
  {
    id: '2',
    title: 'TypeScript 応用',
    url: 'https://example.com/2',
    author: 'user2',
    updatedAt: '2025-01-02T00:00:00.000Z',
    source: 'qiita',
    score: 0.85,
  },
];

// モックフィルタ後の結果（スコア付き）
const mockFilteredScoredResults = [
  {
    id: '1',
    title: 'TypeScript テスト',
    url: 'https://example.com/1',
    author: 'user1',
    updatedAt: '2025-01-01T00:00:00.000Z',
    source: 'qiita',
    score: 0.95,
  },
];

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
    it('認証済みユーザーはデフォルト（mode未指定）でハイブリッド検索を実行できる', async () => {
      vi.mocked(searchService.hybridSearch).mockResolvedValueOnce(mockScoredResults);
      vi.mocked(permissionService.filterByPermissions).mockResolvedValueOnce(mockFilteredScoredResults);

      // 認証済みアプリを作成
      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1)); // userId=1で認証済み
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ results: mockFilteredScoredResults });
      // hybridSearchが呼ばれることを確認（ルートはデフォルトでhybrid検索を使用）
      expect(searchService.hybridSearch).toHaveBeenCalledWith('TypeScript');
    });

    it('modeパラメータがhybridの場合はハイブリッド検索を使用する', async () => {
      vi.mocked(searchService.hybridSearch).mockResolvedValueOnce(mockScoredResults);
      vi.mocked(permissionService.filterByPermissions).mockResolvedValueOnce(mockFilteredScoredResults);

      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1));
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript&mode=hybrid');

      expect(response.status).toBe(200);
      expect(searchService.hybridSearch).toHaveBeenCalledWith('TypeScript');
      expect(searchService.keywordSearch).not.toHaveBeenCalled();
      expect(searchService.semanticSearch).not.toHaveBeenCalled();
    });

    it('modeパラメータがkeywordの場合はキーワード検索を使用する', async () => {
      vi.mocked(searchService.keywordSearch).mockResolvedValueOnce(mockScoredResults);
      vi.mocked(permissionService.filterByPermissions).mockResolvedValueOnce(mockFilteredScoredResults);

      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1));
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript&mode=keyword');

      expect(response.status).toBe(200);
      expect(searchService.keywordSearch).toHaveBeenCalledWith('TypeScript');
      expect(searchService.hybridSearch).not.toHaveBeenCalled();
      expect(searchService.semanticSearch).not.toHaveBeenCalled();
    });

    it('modeパラメータがsemanticの場合はセマンティック検索を使用する', async () => {
      vi.mocked(searchService.semanticSearch).mockResolvedValueOnce(mockScoredResults);
      vi.mocked(permissionService.filterByPermissions).mockResolvedValueOnce(mockFilteredScoredResults);

      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1));
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript&mode=semantic');

      expect(response.status).toBe(200);
      expect(searchService.semanticSearch).toHaveBeenCalledWith('TypeScript');
      expect(searchService.hybridSearch).not.toHaveBeenCalled();
      expect(searchService.keywordSearch).not.toHaveBeenCalled();
    });

    it('不正なmodeパラメータの場合は400エラーを返す', async () => {
      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1));
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript&mode=invalid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(searchService.hybridSearch).not.toHaveBeenCalled();
      expect(searchService.keywordSearch).not.toHaveBeenCalled();
      expect(searchService.semanticSearch).not.toHaveBeenCalled();
    });

    it('レスポンスにスコア情報が含まれる', async () => {
      vi.mocked(searchService.hybridSearch).mockResolvedValueOnce(mockScoredResults);
      vi.mocked(permissionService.filterByPermissions).mockResolvedValueOnce(mockFilteredScoredResults);

      app = express();
      app.use(express.json());
      app.use(createMockSessionMiddleware(1));
      app.use('/api/search', searchRouter);

      const response = await request(app).get('/api/search?q=TypeScript');

      expect(response.status).toBe(200);
      // スコア情報がレスポンスに含まれることを確認
      expect(response.body.results[0]).toHaveProperty('score');
      expect(response.body.results[0].score).toBe(0.95);
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
      expect(searchService.hybridSearch).not.toHaveBeenCalled();
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
      vi.mocked(searchService.hybridSearch).mockResolvedValueOnce(mockScoredResults);
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
