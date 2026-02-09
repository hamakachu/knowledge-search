import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserMenu } from '../../components/UserMenu';
import type { User } from '../../types/auth';

// モックユーザー
const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
};

// useAuthのモック
vi.mock('../../hooks/useAuth');

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ログインしていない場合は何も表示しない', async () => {
    const { useAuth } = await import('../../hooks/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    });

    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('ログインしている場合はユーザー名を表示する', async () => {
    const { useAuth } = await import('../../hooks/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    });

    render(<UserMenu />);
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
  });

  it('ログアウトボタンが表示される', async () => {
    const { useAuth } = await import('../../hooks/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    });

    render(<UserMenu />);
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });

  it('ログアウトボタンをクリックするとlogoutが呼ばれる', async () => {
    const mockLogoutFn = vi.fn();
    const { useAuth } = await import('../../hooks/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: mockLogoutFn,
      checkAuth: vi.fn(),
    });

    render(<UserMenu />);

    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButton);

    expect(mockLogoutFn).toHaveBeenCalledTimes(1);
  });

  it('ユーザーアイコンが表示される', async () => {
    const { useAuth } = await import('../../hooks/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    });

    render(<UserMenu />);

    // aria-labelでアイコンを確認
    const userIcon = screen.getByLabelText('ユーザーアイコン');
    expect(userIcon).toBeInTheDocument();
  });

  it('青色のスタイルが適用されている', async () => {
    const { useAuth } = await import('../../hooks/useAuth');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    });

    render(<UserMenu />);

    const logoutButton = screen.getByRole('button', { name: 'ログアウト' });

    // bg-blue-600クラスが適用されていることを確認
    expect(logoutButton.className).toContain('bg-blue-600');
  });
});
