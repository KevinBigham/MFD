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
        // Chunk strategy:
        //   engine-content — content-loader + content-schemas + /packages/content/
        //                    (leaf module: only depends on Zod and JSON data files,
        //                    so it never imports back into the engine chunk)
        //   engine          — everything else in @mfd/engine
        //
        // Sprint 51 first attempted this split but ALSO put broadcast-commentary
        // into engine-content. broadcast-commentary depends on revenge-games and
        // relationship-graph (both in engine), and the engine barrel re-exports
        // buildBroadcastCommentary, which created a cross-chunk circular import.
        // At runtime the engine chunk evaluated first, tried to read symbols from
        // engine-content before they were initialized, and the production page
        // crashed with "Cannot access '$' before initialization" — TDZ. Sprint 52
        // moves broadcast-commentary back to the engine chunk: content-loader has
        // no engine-side runtime imports (only `import type` from ../types and
        // Zod from content-schemas), so the dependency graph is one-way:
        // engine -> engine-content. CI smoke test below the bundle gate guards
        // against future TDZ regressions by loading the built page headlessly.
        manualChunks(id) {
          if (
            id.includes('/packages/content/') ||
            id.includes('/packages/engine/src/content-loader.ts') ||
            id.includes('/packages/engine/src/types/content-schemas.ts')
          ) {
            return 'engine-content';
          }
          if (id.includes('/packages/engine/')) return 'engine';
          if (id.includes('/packages/design-system/')) return 'design-system';
          if (
            id.includes('/node_modules/react') ||
            id.includes('/node_modules/react-dom') ||
            id.includes('/node_modules/@tanstack/') ||
            id.includes('/node_modules/zustand') ||
            id.includes('/node_modules/html-to-image')
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
