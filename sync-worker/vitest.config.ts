import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    env: loadEnv('test', process.cwd(), ''),
    globals: true,
    // データベースを使用するテストの競合を避けるため、テストファイルをシーケンシャルに実行
    fileParallelism: false,
    // 各テストファイル内のテストは順次実行
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'dist/',
        'scripts/',
        'src/index.ts',
        'src/cronRunner.ts',
        'src/scheduler/index.ts',
      ],
    },
  },
});
