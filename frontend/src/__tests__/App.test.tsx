import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import App from '../App';

// グローバルfetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// AuthProviderでラップするヘルパー関数
const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('App - ルーティング統合', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('認証状態_未認証の場合LoginPageを表示する', () => {
    it('認証チェックで401が返った場合にLoginPageが表示される', async () => {
      // 認証チェック（/api/auth/me）が401を返す
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      renderWithAuth(<App />);

      // ローディングが終わり、LoginPageが表示される（LoginFormのユーザー名ラベルで確認）
      await waitFor(() => {
        expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
      });
    });

    it('認証チェックでエラーが発生した場合にLoginPageが表示される', async () => {
      // 認証チェック（/api/auth/me）がエラーを返す
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithAuth(<App />);

      // ローディングが終わり、LoginPageが表示される（LoginFormのユーザー名ラベルで確認）
      await waitFor(() => {
        expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
      });
    });
  });

  describe('認証状態_認証済みの場合SearchPageを表示する', () => {
    it('認証済みの場合にSearchPageが表示される', async () => {
      // 認証チェック（/api/auth/me）が成功を返す
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
          },
        }),
      });

      // DocumentStats APIのモック（SearchPage内で呼ばれる）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalDocuments: 10 }),
      });

      renderWithAuth(<App />);

      // ローディングが終わり、SearchPageが表示される
      await waitFor(() => {
        expect(screen.getByText('Groovy Knowledge Search')).toBeInTheDocument();
      });

      // UserMenuが表示される
      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });
    });
  });

  describe('ローディング状態_認証チェック中にローディング表示する', () => {
    it('認証チェック中はローディング表示が出る', () => {
      // 認証チェック（/api/auth/me）が解決しないPromiseを返す
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderWithAuth(<App />);

      // ローディング表示が出る
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });
  });
});
