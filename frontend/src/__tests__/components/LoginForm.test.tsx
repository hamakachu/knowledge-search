import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../../components/LoginForm';
import type { LoginCredentials } from '../../types/auth';

describe('LoginForm', () => {
  it('フォームが正しくレンダリングされる', () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('Qiita Teamトークン')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('入力値が変更できる', () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    const usernameInput = screen.getByLabelText('ユーザー名') as HTMLInputElement;
    const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
    const tokenInput = screen.getByLabelText('Qiita Teamトークン') as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(tokenInput, { target: { value: 'qiita_token_123' } });

    expect(usernameInput.value).toBe('testuser');
    expect(emailInput.value).toBe('test@example.com');
    expect(tokenInput.value).toBe('qiita_token_123');
  });

  it('Qiitaトークンがパスワード形式で表示される', () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    const tokenInput = screen.getByLabelText('Qiita Teamトークン') as HTMLInputElement;
    expect(tokenInput.type).toBe('password');
  });

  it('目アイコンをクリックするとQiitaトークンの表示を切り替えられる', () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    const tokenInput = screen.getByLabelText('Qiita Teamトークン') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /トークンを表示|トークンを非表示/ });

    expect(tokenInput.type).toBe('password');

    fireEvent.click(toggleButton);
    expect(tokenInput.type).toBe('text');

    fireEvent.click(toggleButton);
    expect(tokenInput.type).toBe('password');
  });

  it('バリデーションエラーを表示する_ユーザー名が空', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const tokenInput = screen.getByLabelText('Qiita Teamトークン');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(tokenInput, { target: { value: 'qiita_token_123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('バリデーションエラーを表示する_メールアドレスが空', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    const usernameInput = screen.getByLabelText('ユーザー名');
    const tokenInput = screen.getByLabelText('Qiita Teamトークン');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(tokenInput, { target: { value: 'qiita_token_123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('バリデーションエラーを表示する_メールアドレスの形式が不正', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    const usernameInput = screen.getByLabelText('ユーザー名');
    const emailInput = screen.getByLabelText('メールアドレス');
    const tokenInput = screen.getByLabelText('Qiita Teamトークン');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(tokenInput, { target: { value: 'qiita_token_123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('バリデーションエラーを表示する_Qiitaトークンが空', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    const usernameInput = screen.getByLabelText('ユーザー名');
    const emailInput = screen.getByLabelText('メールアドレス');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Qiita Teamトークンを入力してください')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('正しい値でフォームを送信できる', async () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={null} />);

    const usernameInput = screen.getByLabelText('ユーザー名');
    const emailInput = screen.getByLabelText('メールアドレス');
    const tokenInput = screen.getByLabelText('Qiita Teamトークン');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(tokenInput, { target: { value: 'qiita_token_123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        qiitaToken: 'qiita_token_123',
      } as LoginCredentials);
    });
  });

  it('ローディング中はフォームが無効化される', () => {
    const mockOnSubmit = vi.fn();
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} error={null} />);

    const usernameInput = screen.getByLabelText('ユーザー名') as HTMLInputElement;
    const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
    const tokenInput = screen.getByLabelText('Qiita Teamトークン') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: 'ログイン中...' }) as HTMLButtonElement;

    expect(usernameInput.disabled).toBe(true);
    expect(emailInput.disabled).toBe(true);
    expect(tokenInput.disabled).toBe(true);
    expect(submitButton.disabled).toBe(true);
  });

  it('エラーメッセージが表示される', () => {
    const mockOnSubmit = vi.fn();
    const errorMessage = 'ログインに失敗しました';
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={false} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
