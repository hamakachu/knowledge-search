import { useState } from 'react';
import { SearchResult } from '../types';
import { useAuth } from './useAuth';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
        { credentials: 'include' }
      );

      // 401（未認証）の場合はログアウトしてエラーを設定
      if (response.status === 401) {
        await logout();
        setError('セッションが期限切れです。再度ログインしてください。');
        setResults([]);
        return;
      }

      if (!response.ok) {
        throw new Error('検索に失敗しました');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    query,
    results,
    isLoading,
    error,
    handleSearch,
  };
}
