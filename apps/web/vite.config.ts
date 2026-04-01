import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const root = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mfd/engine': path.resolve(root, 'packages/engine/src'),
      '@mfd/design-system/tokens': path.resolve(root, 'packages/design-system/tokens/index.css'),
      '@mfd/design-system/components': path.resolve(root, 'packages/design-system/components/index.ts'),
      '@mfd/design-system': path.resolve(root, 'packages/design-system'),
    },
  },
});
