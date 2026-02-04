import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

export default defineConfig({
  plugins: [
    ...VitePluginNode({
      adapter: 'express',
      appPath: './src/index.ts',
      exportName: 'app',
      tsCompiler: 'esbuild',
    }),
  ],
  build: {
    target: 'esnext',
    outDir: 'dist',
    ssr: true,
    rollupOptions: {
      input: './src/index.ts',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__tests__/', 'dist/'],
    },
  },
});
