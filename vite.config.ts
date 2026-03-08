import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import electron from 'vite-plugin-electron/simple';

const aliases = {
  '@backend': path.resolve(__dirname, 'src/backend'),
  '@db': path.resolve(__dirname, 'src/db'),
  '@main': path.resolve(__dirname, 'src/main'),
  '@preload': path.resolve(__dirname, 'src/preload'),
  '@renderer': path.resolve(__dirname, 'src/renderer'),
  '@shared': path.resolve(__dirname, 'src/shared'),
};

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main/index.ts',
        vite: {
          resolve: {
            alias: aliases,
          },
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'src/preload/index.ts'),
        vite: {
          resolve: {
            alias: aliases,
          },
          build: {
            outDir: 'dist-electron/preload',
          },
        },
      },
    }),
  ],
  resolve: {
    alias: aliases,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
  },
});
