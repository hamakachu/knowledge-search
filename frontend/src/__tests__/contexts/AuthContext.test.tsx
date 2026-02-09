import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../../contexts/AuthContext';
import type { LoginCredentials } from '../../types/auth';

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AuthContext', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態では未認証でloadingがtrue', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('マウント時にcheckAuthが自動実行される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
        credentials: 'include',
      });
    });
  });

  describe('checkAuth', () => {
    it('認証済みユーザー情報を取得できる', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('未認証の場合はuserがnullになる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('サーバーエラー時はuserがnullになる', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('ログイン成功時にユーザー情報を設定する', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      const credentials: LoginCredentials = {
        username: 'testuser',
        email: 'test@example.com',
        qiitaToken: 'qiita_token_123',
      };

      // 初回: checkAuth（未認証）
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // ログイン実行
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('ログイン失敗時にエラーをスローする', async () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        email: 'wrong@example.com',
        qiitaToken: 'qiita_token_123',
      };

      // 初回: checkAuth（未認証）
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // ログイン失敗
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      await expect(
        act(async () => {
          await result.current.login(credentials);
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('ネットワークエラー時にエラーをスローする', async () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        email: 'test@example.com',
        qiitaToken: 'qiita_token_123',
      };

      // 初回: checkAuth（未認証）
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // ネットワークエラー
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        act(async () => {
          await result.current.login(credentials);
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    it('ログアウト成功時にユーザー情報をクリアする', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };

      // 初回: checkAuth（認証済み）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // ログアウト実行
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('ログアウト失敗時でもユーザー情報をクリアする', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };

      // 初回: checkAuth（認証済み）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // ログアウト失敗
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await act(async () => {
        await result.current.logout();
      });

      // ログアウト失敗時でもユーザー情報はクリアされる（安全側）
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('コンテキストプロバイダー外での使用', () => {
    it('AuthProvider外でuseAuthContextを使用するとエラーになる', () => {
      // エラーをキャッチするためにconsole.errorをモック
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext must be used within an AuthProvider');

      consoleError.mockRestore();
    });
  });

  describe('統合テスト: 完全な認証フロー', () => {
    it('未認証 → ログイン → ログアウトの一連の流れが正常に動作する', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      const credentials: LoginCredentials = {
        username: 'testuser',
        email: 'test@example.com',
        qiitaToken: 'qiita_token_123',
      };

      // 1. 初回: checkAuth（未認証）
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);

      // 2. ログイン
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);

      // 3. ログアウト
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});
