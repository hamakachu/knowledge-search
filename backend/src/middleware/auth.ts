import { Request, Response, NextFunction } from 'express';

// セッション型拡張
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

/**
 * 認証ミドルウェア
 *
 * セッションにuserIdが存在するか確認し、存在しない場合は401エラーを返す
 *
 * @param req - Expressリクエスト
 * @param res - Expressレスポンス
 * @param next - 次のミドルウェア
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
