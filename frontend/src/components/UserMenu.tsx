import { useAuth } from '../hooks/useAuth';

/**
 * ユーザーメニューコンポーネント
 * ログイン中のユーザー名を表示し、ログアウト機能を提供する
 * 画面右上に配置される想定
 */
export function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();

  // 未認証の場合は何も表示しない
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex items-center gap-3">
      {/* ユーザー情報表示 */}
      <div className="flex items-center gap-2">
        <svg
          className="w-8 h-8 text-gray-600"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="ユーザーアイコン"
          role="img"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-gray-700 font-medium">{user.username}</span>
      </div>

      {/* ログアウトボタン（既存のスタイルと統一: 青色） */}
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        ログアウト
      </button>
    </div>
  );
}
