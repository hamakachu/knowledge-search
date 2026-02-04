import { Router } from 'express';
import { searchDocuments } from '../services/searchService';

export const searchRouter = Router();

searchRouter.get('/', async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await searchDocuments(query);
    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
