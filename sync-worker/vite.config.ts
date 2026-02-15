import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist',
    ssr: true,
    rollupOptions: {
      input: {
        index: './src/index.ts',
        cronRunner: './src/cronRunner.ts',
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
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
