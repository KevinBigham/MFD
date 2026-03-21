import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/mr-football-dynasty/',
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime — cached separately, rarely changes
          vendor: ['react', 'react-dom'],
          // All extracted game systems — changes on module swaps
          systems: ['./src/systems/index.js'],
          // Config & theme tokens — changes infrequently
          config: ['./src/config/index.js'],
          // Data files (narrative text, names, templates) — rarely changes
          data: ['./src/data/index.js'],
          // UI vendor libraries — toasts, Radix primitives, etc. (Sprint 9+)
          // Note: lucide-react uses deep imports for tree-shaking, so it's not listed here
          'ui-vendor': ['sonner', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-popover', '@radix-ui/react-tabs', 'motion', '@tanstack/react-table'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
