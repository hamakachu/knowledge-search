import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import authRouter from '../routes/auth';
import * as authService from '../services/authService';

// authServiceをモック化
vi.mock('../services/authService');

// セッションモックミドルウェア
function createMockSessionMiddleware() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req: any, _res: any, next: any) => {
    req.session = {
      userId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      save: (callback: (err?: any) => void) => callback(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      destroy: (callback: (err?: any) => void) => callback(),
    };
    next();
  };
}

describe('auth routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(createMockSessionMiddleware());
    app.use('/api/auth', authRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('新規ユーザーの場合は登録してセッションを作成する', async () => {
      const mockUser = {
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
        encrypted_qiita_token: 'encrypted:token:data',
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(authService.findUserByUsername).mockResolvedValueOnce(null);
      vi.mocked(authService.createUser).mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          qiitaToken: 'test-token-12345',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
      });

      expect(authService.findUserByUsername).toHaveBeenCalledWith('newuser');
      expect(authService.createUser).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        qiitaToken: 'test-token-12345',
      });
    });

    it('既存ユーザーの場合はトークンを更新してセッションを作成する', async () => {
      const mockUser = {
        id: 1,
        username: 'existinguser',
        email: 'existing@example.com',
        encrypted_qiita_token: 'old:encrypted:token',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedUser = {
        ...mockUser,
        encrypted_qiita_token: 'new:encrypted:token',
      };

      vi.mocked(authService.findUserByUsername).mockResolvedValueOnce(mockUser);
      vi.mocked(authService.updateQiitaToken).mockResolvedValueOnce(updatedUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'existinguser',
          email: 'existing@example.com',
          qiitaToken: 'new-token-67890',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        username: 'existinguser',
        email: 'existing@example.com',
      });

      expect(authService.findUserByUsername).toHaveBeenCalledWith('existinguser');
      expect(authService.updateQiitaToken).toHaveBeenCalledWith(1, 'new-token-67890');
    });

    it('必須フィールドが欠けている場合は400エラーを返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          // emailとqiitaTokenが欠けている
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('認証済みユーザーの情報を返す', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        encrypted_qiita_token: 'encrypted:token:data',
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(authService.findUserById).mockResolvedValueOnce(mockUser);

      // 認証済みアプリを再作成
      const authenticatedApp = express();
      authenticatedApp.use(express.json());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authenticatedApp.use((req, _res, next) => {
        req.session = {
          userId: 1,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          save: (callback: (err?: any) => void) => callback(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          destroy: (callback: (err?: any) => void) => callback(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        next();
      });
      authenticatedApp.use('/api/auth', authRouter);

      const response = await request(authenticatedApp).get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('未認証の場合は401エラーを返す', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('セッションを破棄して成功メッセージを返す', async () => {
      // 認証済みアプリを再作成
      const authenticatedApp = express();
      authenticatedApp.use(express.json());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authenticatedApp.use((req, _res, next) => {
        req.session = {
          userId: 1,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          save: (callback: (err?: any) => void) => callback(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          destroy: (callback: (err?: any) => void) => callback(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        next();
      });
      authenticatedApp.use('/api/auth', authRouter);

      const response = await request(authenticatedApp).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Logged out successfully' });
    });

    it('未認証の場合は401エラーを返す', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});
