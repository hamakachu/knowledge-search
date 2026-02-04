import { useState } from 'react';
import { SearchResult } from '../types';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);

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
