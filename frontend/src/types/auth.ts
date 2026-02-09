/**
 * 認証関連の型定義
 */

/**
 * ユーザー情報
 */
export interface User {
  id: number;
  username: string;
  email: string;
}

/**
 * ログイン認証情報
 */
export interface LoginCredentials {
  username: string;
  email: string;
  qiitaToken: string;
}

/**
 * 認証コンテキストの型
 */
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
