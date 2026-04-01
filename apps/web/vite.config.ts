import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mfd/engine': new URL('../../packages/engine/src', import.meta.url).pathname,
    },
  },
});
