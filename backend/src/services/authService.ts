import { query } from '../db/client';
import { encrypt, decrypt } from '../utils/encryption';

/**
 * ユーザー型定義
 */
export interface User {
  id: number;
  username: string;
  email: string;
  encrypted_qiita_token: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * ユーザー作成パラメータ
 */
export interface CreateUserParams {
  username: string;
  email: string;
  qiitaToken: string;
}

/**
 * 新規ユーザーを作成
 *
 * @param params - ユーザー作成パラメータ
 * @returns 作成されたユーザー
 * @throws {Error} ユーザー名またはメールアドレスが重複している場合
 */
export async function createUser(params: CreateUserParams): Promise<User> {
  const { username, email, qiitaToken } = params;

  // Qiitaトークンを暗号化
  const encryptedToken = encrypt(qiitaToken);

  // DBにINSERT
  const result = await query<User>(
    `INSERT INTO users (username, email, encrypted_qiita_token)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, encrypted_qiita_token, created_at, updated_at`,
    [username, email, encryptedToken]
  );

  return result.rows[0];
}

/**
 * ユーザー名でユーザーを検索
 *
 * @param username - ユーザー名
 * @returns ユーザー（見つからない場合はnull）
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, username, email, encrypted_qiita_token, created_at, updated_at
     FROM users
     WHERE username = $1`,
    [username]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * IDでユーザーを検索
 *
 * @param id - ユーザーID
 * @returns ユーザー（見つからない場合はnull）
 */
export async function findUserById(id: number): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, username, email, encrypted_qiita_token, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * ユーザーのQiitaトークンを更新
 *
 * @param userId - ユーザーID
 * @param newToken - 新しいQiitaトークン（平文）
 * @returns 更新されたユーザー
 * @throws {Error} ユーザーが見つからない場合
 */
export async function updateQiitaToken(userId: number, newToken: string): Promise<User> {
  // 新しいトークンを暗号化
  const encryptedToken = encrypt(newToken);

  // DBをUPDATE
  const result = await query<User>(
    `UPDATE users
     SET encrypted_qiita_token = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, username, email, encrypted_qiita_token, created_at, updated_at`,
    [encryptedToken, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

/**
 * ユーザーIDから復号化されたQiitaトークンを取得
 *
 * @param userId - ユーザーID
 * @returns 復号化されたQiitaトークン（ユーザーが見つからない場合はnull）
 */
export async function getDecryptedQiitaToken(userId: number): Promise<string | null> {
  const user = await findUserById(userId);

  if (!user) {
    return null;
  }

  // 暗号化トークンを復号化
  return decrypt(user.encrypted_qiita_token);
}
