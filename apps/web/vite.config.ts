import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const root = path.resolve(__dirname, '../..');

export default defineConfig({
  base: '/MFD/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Note: a previous sprint-51 attempt split content-loader + broadcast-commentary
        // + /packages/content/ into a separate `engine-content` chunk to reclaim
        // ~71 KB gzip from the shared engine chunk. That chunking produced a runtime
        // TDZ ("Cannot access '$' before initialization") because the engine barrel
        // re-exports content-loader symbols, creating a cross-chunk circular import
        // that doesn't surface in unit tests or the static build report. Keeping all
        // engine code (including content) in a single `engine` chunk for now.
        manualChunks(id) {
          if (id.includes('/packages/content/')) return 'engine';
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
