import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Playtest integration tests run multiple full seasons and take 10-30s on CI.
    // 'forks' pool avoids the vitest-worker IPC 'onTaskUpdate' timeout that fires
    // when long synchronous tests starve the default threads-pool RPC channel.
    pool: 'forks',
    testTimeout: 45_000,
    hookTimeout: 45_000,
    teardownTimeout: 45_000,
  },
});
