import express from 'express';
import cors from 'cors';
import { searchRouter } from './routes/search';
import { statsRouter } from './routes/stats';
import authRouter from './routes/auth';
import { sessionMiddleware } from './middleware/session';

export const app = express();

// CORS設定
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true, // Cookie送信を許可
}));

app.use(express.json());

// セッションミドルウェア（認証前に設定）
app.use(sessionMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/stats', statsRouter);

export default app;
