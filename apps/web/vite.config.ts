import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const root = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/packages/engine/')) return 'engine';
          if (id.includes('/packages/design-system/')) return 'design-system';
          if (
            id.includes('/node_modules/react') ||
            id.includes('/node_modules/react-dom') ||
            id.includes('/node_modules/@tanstack/') ||
            id.includes('/node_modules/zustand')
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@mfd/engine': path.resolve(root, 'packages/engine/src'),
      '@mfd/design-system/tokens': path.resolve(root, 'packages/design-system/tokens/index.css'),
      '@mfd/design-system/components': path.resolve(root, 'packages/design-system/components/index.ts'),
      '@mfd/design-system': path.resolve(root, 'packages/design-system'),
    },
  },
});
