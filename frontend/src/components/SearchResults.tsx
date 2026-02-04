import { SearchResult } from '../types';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
}

export function SearchResults({ results, query, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="mt-8 text-center text-gray-600">
        検索中...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-600">
        「{query}」に一致する結果が見つかりませんでした
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-sm text-gray-600 mb-4">
        {results.length}件の結果が見つかりました
      </p>
      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.id}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-semibold text-blue-600 hover:underline"
            >
              {result.title}
            </a>
            <div className="mt-2 text-sm text-gray-600">
              <span className="mr-4">作成者: {result.author}</span>
              <span className="mr-4">更新日: {new Date(result.updatedAt).toLocaleDateString('ja-JP')}</span>
              <span className="px-2 py-1 bg-gray-200 rounded text-xs">{result.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
