import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { dbClient } from '../db/client';

const PgSession = connectPgSimple(session);

/**
 * セッションミドルウェアの設定
 *
 * - PostgreSQLバックエンドストレージ使用
 * - Secure cookies（HTTPS環境）
 * - HttpOnly cookies（XSS対策）
 * - SameSite=Lax（CSRF対策）
 * - 7日間の有効期限
 */
export const sessionMiddleware = session({
  store: new PgSession({
    pool: dbClient,
    tableName: 'session',
    createTableIfMissing: false, // マイグレーションで作成済み
  }),
  secret: process.env.SESSION_SECRET || 'development-secret-please-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS環境でのみSecure
    httpOnly: true, // XSS対策
    sameSite: 'lax', // CSRF対策
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
  },
});
