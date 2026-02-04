import { describe, it, expect } from 'vitest';
import { searchDocuments } from '../services/searchService';

describe('searchDocuments', () => {
  it('should return empty array for now', async () => {
    const results = await searchDocuments('test');
    expect(results).toEqual([]);
  });
});
