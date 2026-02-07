import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { SearchPage } from './pages/SearchPage';

/**
 * アプリケーションのルートコンポーネント
 * 認証状態に応じてLoginPageまたはSearchPageを表示する
 */
function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // 認証チェック中はローディング表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証状態に応じて表示を切り替え
  return isAuthenticated ? <SearchPage /> : <LoginPage />;
}

export default App;
