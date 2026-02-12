import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../../hooks/useSearch';

// グローバルfetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// useAuthのモック
const mockLogout = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useSearch', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockLogout.mockClear();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: mockLogout,
      checkAuth: vi.fn(),
    });
  });

  describe('初期状態_デフォルト値を返す', () => {
    it('初期状態でqueryが空文字列である', () => {
      const { result } = renderHook(() => useSearch());
      expect(result.current.query).toBe('');
    });

    it('初期状態でresultsが空配列である', () => {
      const { result } = renderHook(() => useSearch());
      expect(result.current.results).toEqual([]);
    });

    it('初期状態でisLoadingがfalseである', () => {
      const { result } = renderHook(() => useSearch());
      expect(result.current.isLoading).toBe(false);
    });

    it('初期状態でerrorがnullである', () => {
      const { result } = renderHook(() => useSearch());
      expect(result.current.error).toBeNull();
    });
  });

  describe('handleSearch_credentialsを付与してAPIを呼び出す', () => {
    it('検索リクエストにcredentials_includeが付与される', async () => {
      // 正常なレスポンスをモック
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.handleSearch('テストクエリ');
      });

      // fetchが呼ばれたことを確認
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // credentials: 'include' が付与されていることを確認
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/search');
      // クエリはURLエンコードされる
      expect(url).toContain(encodeURIComponent('テストクエリ'));
      expect(options).toMatchObject({ credentials: 'include' });
    });

    it('正常な検索結果が取得できる', async () => {
      const mockResults = [
        {
          id: '1',
          title: 'テスト記事',
          url: 'https://example.com/1',
          author: 'testuser',
          updatedAt: '2024-01-01',
          source: 'qiita',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: mockResults }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.handleSearch('テスト');
      });

      expect(result.current.results).toEqual(mockResults);
      expect(result.current.error).toBeNull();
    });

    it('検索中はisLoadingがtrueになる', async () => {
      // fetchが完了するまで待機するPromiseを作成
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useSearch());

      // handleSearchを開始（awaitしない）
      act(() => {
        result.current.handleSearch('テスト');
      });

      // 即時にisLoadingがtrueであることを確認
      expect(result.current.isLoading).toBe(true);

      // Promiseを解決してクリーンアップ
      await act(async () => {
        resolvePromise!({
          ok: true,
          status: 200,
          json: async () => ({ results: [] }),
        });
        await pendingPromise;
      });
    });
  });

  describe('handleSearch_401レスポンス時にログアウトしてリダイレクトする', () => {
    it('401レスポンス時にlogoutが呼ばれる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.handleSearch('テスト');
      });

      // logoutが呼ばれていることを確認
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('401レスポンス時にエラーメッセージがセッション期限切れになる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.handleSearch('テスト');
      });

      // 401時のエラーメッセージが設定されることを確認
      expect(result.current.error).toBe('セッションが期限切れです。再度ログインしてください。');
    });

    it('401以外のエラー時はlogoutが呼ばれない', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.handleSearch('テスト');
      });

      // logoutが呼ばれていないことを確認
      expect(mockLogout).not.toHaveBeenCalled();
      expect(result.current.error).toBe('検索に失敗しました');
    });
  });

  describe('handleSearch_ネットワークエラーを適切に処理する', () => {
    it('ネットワークエラー時に適切なエラーメッセージが設定される', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.handleSearch('テスト');
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.results).toEqual([]);
    });

    it('不明なエラー時に汎用エラーメッセージが設定される', async () => {
      mockFetch.mockRejectedValueOnce('予期しないエラー');

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.handleSearch('テスト');
      });

      expect(result.current.error).toBe('予期しないエラーが発生しました');
    });
  });

  describe('handleSearch_クエリが正しくエンコードされる', () => {
    it('クエリが正しくURLエンコードされる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      });

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.handleSearch('React TypeScript');
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('React%20TypeScript');
    });
  });
});
