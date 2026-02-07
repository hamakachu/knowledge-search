import { useAuthContext } from '../contexts/AuthContext';
import type { AuthContextType } from '../types/auth';

/**
 * 認証機能を使用するためのカスタムフック
 * @returns 認証コンテキストの値
 * @throws {Error} AuthProvider外で使用された場合
 */
export function useAuth(): AuthContextType {
  return useAuthContext();
}
