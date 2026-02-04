export interface SearchResult {
  id: string;
  title: string;
  url: string;
  author: string;
  updatedAt: string;
  source: string;
}

export async function searchDocuments(query: string): Promise<SearchResult[]> {
  // TODO: Implement full-text search with PostgreSQL using query parameter
  console.log('Search query:', query);
  return [];
}
