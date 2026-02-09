import dotenv from 'dotenv';

// 環境変数を最初にロード（他のimportより前に実行）
dotenv.config();

import { app } from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export { app };
