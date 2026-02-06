import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';

// セッション型拡張
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

describe('authミドルウェア', () => {
  describe('requireAuth()', () => {
    it('セッションにuserIdがある場合は次の処理に進む', () => {
      const req = {
        session: {
          userId: 1,
        },
      } as Request;

      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(); // エラーなしで呼ばれる
    });

    it('セッションにuserIdがない場合は401エラーを返す', () => {
      const req = {
        session: {},
      } as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as unknown as NextFunction;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('セッションが存在しない場合は401エラーを返す', () => {
      const req = {} as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as unknown as NextFunction;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
