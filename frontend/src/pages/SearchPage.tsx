import { SearchBox } from '../components/SearchBox';
import { SearchResults } from '../components/SearchResults';
import { DocumentStats } from '../components/DocumentStats';
import { UserMenu } from '../components/UserMenu';
import { useSearch } from '../hooks/useSearch';

/**
 * 検索ページコンポーネント
 * ログイン済みユーザーが閲覧できる検索画面
 */
export function SearchPage() {
  const { query, results, isLoading, error, handleSearch } = useSearch();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー：タイトルとユーザーメニュー */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Groovy Knowledge Search
          </h1>
          <UserMenu />
        </div>

        <div className="mb-6">
          <DocumentStats />
        </div>

        <SearchBox onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {query && (
          <SearchResults results={results} query={query} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}
