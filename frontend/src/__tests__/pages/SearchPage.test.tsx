import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SearchPage } from '../../pages/SearchPage';
import * as useAuthModule from '../../hooks/useAuth';

// グローバルfetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SearchPage', () => {
  beforeEach(() => {
    mockFetch.mockClear();

    // useAuthフックをモック（認証済み状態）
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        username: 'testuser',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    });
  });

  describe('表示内容_タイトルとUserMenuを表示する', () => {
    it('タイトルが表示される', () => {
      // DocumentStats APIのモック（このテストで必要）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalDocuments: 10 }),
      });

      render(<SearchPage />);
      expect(screen.getByText('Groovy Knowledge Search')).toBeInTheDocument();
    });

    it('UserMenuが表示される', () => {
      // DocumentStats APIのモック（このテストで必要）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalDocuments: 10 }),
      });

      render(<SearchPage />);

      // UserMenuのユーザー名が表示される
      expect(screen.getByText('testuser')).toBeInTheDocument();

      // ログアウトボタンが表示される
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });
  });

  describe('表示内容_DocumentStatsとSearchBoxを表示する', () => {
    it('DocumentStatsが表示される', async () => {
      // DocumentStats APIのモック（このテストで必要）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalDocuments: 10 }),
      });

      render(<SearchPage />);

      // 非同期処理の完了を待つ
      await waitFor(() => {
        expect(screen.getByText('総ドキュメント数')).toBeInTheDocument();
      });
    });

    it('SearchBoxが表示される', () => {
      // DocumentStats APIのモック（このテストで必要）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalDocuments: 10 }),
      });

      render(<SearchPage />);
      expect(screen.getByPlaceholderText('キーワードを入力...')).toBeInTheDocument();
    });
  });
});
