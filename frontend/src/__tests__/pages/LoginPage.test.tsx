import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../../pages/LoginPage';
import { AuthProvider } from '../../contexts/AuthContext';

// fetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LoginPage', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // 初回: checkAuth（未認証）
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
  });

  it('タイトルとサブタイトルが表示される', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Groovy Knowledge Search' })).toBeInTheDocument();
    });
    expect(screen.getByText('ログイン', { selector: 'p' })).toBeInTheDocument();
  });

  it('LoginFormコンポーネントがレンダリングされる', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('Qiita Teamトークン')).toBeInTheDocument();
  });

  it('フォーム送信でログイン処理が実行される', async () => {
    const mockUser = { id: 1, username: 'testuser' };

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText('ユーザー名');
    const emailInput = screen.getByLabelText('メールアドレス');
    const tokenInput = screen.getByLabelText('Qiita Teamトークン');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(tokenInput, { target: { value: 'qiita_token_123' } });

    // ログイン成功
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: 'testuser',
            password: 'test@example.com',
            qiitaToken: 'qiita_token_123',
          }),
        })
      );
    });
  });

  it('ログイン失敗時にエラーメッセージが表示される', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText('ユーザー名');
    const emailInput = screen.getByLabelText('メールアドレス');
    const tokenInput = screen.getByLabelText('Qiita Teamトークン');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(tokenInput, { target: { value: 'invalid_token' } });

    // ログイン失敗
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'ログインに失敗しました' }),
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ログインに失敗しました')).toBeInTheDocument();
    });
  });

  it('bg-gray-50背景が適用されている', async () => {
    const { container } = render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    });

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain('bg-gray-50');
  });

  it('中央配置されている', async () => {
    const { container } = render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    });

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain('flex');
    expect(mainDiv.className).toContain('items-center');
    expect(mainDiv.className).toContain('justify-center');
  });
});
