import { Router, Request, Response } from 'express';
import { createUser, findUserByUsername, findUserById, updateQiitaToken } from '../services/authService';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/login
 *
 * ユーザーログイン/登録エンドポイント
 *
 * - 新規ユーザーの場合: 登録してセッションを作成
 * - 既存ユーザーの場合: トークンを更新してセッションを作成
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, email, qiitaToken } = req.body;

    // 入力検証
    if (!username || !email || !qiitaToken) {
      res.status(400).json({ error: 'Missing required fields: username, email, qiitaToken' });
      return;
    }

    // テスト環境用: バリデーション緩和
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const isTestUser = username.startsWith('test_') || username.startsWith('demo_');
    const shouldSkipValidation = isDevelopment && isTestUser;

    // テスト環境のテストユーザー以外は厳格なバリデーション
    if (!shouldSkipValidation) {
      // メールアドレス形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Qiitaトークン形式チェック（本番環境のみ）
      if (!isDevelopment && !qiitaToken.startsWith('qiita_')) {
        res.status(400).json({ error: 'Invalid Qiita token format' });
        return;
      }
    }

    // ユーザー検索
    let user = await findUserByUsername(username);

    if (!user) {
      // 新規ユーザーの場合: 登録
      user = await createUser({ username, email, qiitaToken });
    } else {
      // 既存ユーザーの場合: トークン更新
      user = await updateQiitaToken(user.id, qiitaToken);
    }

    // セッションにuserIdを保存
    req.session.userId = user.id;

    // セッションを保存（コールバック対応）
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // レスポンス（トークンは含めない）
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 *
 * 認証済みユーザー情報取得エンドポイント
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!; // requireAuthで確認済み

    const user = await findUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // レスポンス（トークンは含めない）
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 *
 * ログアウトエンドポイント
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    // セッションを破棄
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
