import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import { useAuth } from '../../hooks/useAuth';
import type { LoginCredentials } from '../../types/auth';

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useAuth', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('AuthProviderから認証状態を取得できる', async () => {
    const mockUser = { id: 1, username: 'testuser' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login関数を呼び出せる', async () => {
    const mockUser = { id: 1, username: 'testuser' };
    const credentials: LoginCredentials = {
      username: 'testuser',
      password: 'password123',
      qiitaToken: 'qiita_token_123',
    };

    // 初回: checkAuth（未認証）
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // ログイン実行
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    await act(async () => {
      await result.current.login(credentials);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('logout関数を呼び出せる', async () => {
    const mockUser = { id: 1, username: 'testuser' };

    // 初回: checkAuth（認証済み）
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    const { result } = renderHook(() => useAuth(), {
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

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('checkAuth関数を呼び出せる', async () => {
    const mockUser = { id: 1, username: 'testuser' };

    // 初回: checkAuth（未認証）
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);

    // 手動でcheckAuth実行
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    await act(async () => {
      await result.current.checkAuth();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('AuthProvider外で使用するとエラーになる', () => {
    // エラーをキャッチするためにconsole.errorをモック
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuthContext must be used within an AuthProvider');

    consoleError.mockRestore();
  });
});
