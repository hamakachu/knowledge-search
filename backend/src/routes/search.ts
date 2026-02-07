import { Router } from 'express';
import { searchDocuments } from '../services/searchService';
import { filterByPermissions } from '../services/permissionService';
import { requireAuth } from '../middleware/auth';

export const searchRouter = Router();

searchRouter.get('/', requireAuth, async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // 1. PostgreSQL全文検索で候補記事を抽出
    const searchResults = await searchDocuments(query);

    // 2. ユーザーの権限でフィルタリング
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const filteredResults = await filterByPermissions(userId, searchResults);

    res.json({ results: filteredResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
