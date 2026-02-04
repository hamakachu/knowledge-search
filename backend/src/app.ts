import express from 'express';
import cors from 'cors';
import { searchRouter } from './routes/search';
import { statsRouter } from './routes/stats';

export const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/search', searchRouter);
app.use('/api/stats', statsRouter);

export default app;
