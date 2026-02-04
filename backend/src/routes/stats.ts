import { Router } from 'express';
import { getDocumentStats } from '../services/statsService';

export const statsRouter = Router();

statsRouter.get('/', async (_req, res) => {
  try {
    const stats = await getDocumentStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
