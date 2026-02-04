import { SearchBox } from './components/SearchBox';
import { SearchResults } from './components/SearchResults';
import { DocumentStats } from './components/DocumentStats';
import { useSearch } from './hooks/useSearch';

function App() {
  const { query, results, isLoading, error, handleSearch } = useSearch();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Groovy Knowledge Search
        </h1>

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

export default App;
