const { resolve } = require('node:path');

const webRoot = __dirname;
const previewPort = Number(process.env.MFD_PLAYWRIGHT_PORT ?? 4173);
const previewHost = `http://127.0.0.1:${previewPort}`;
const flaggedEnv = 'VITE_CHIP_ENABLED=true VITE_CHIP_TTS_ENABLED=false VITE_MFD_SHARE_ENABLED=false';

module.exports = {
  testDir: resolve(webRoot, 'e2e'),
  testMatch: '**/*.pw.cjs',
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: `${previewHost}/MFD/`,
    browserName: 'chromium',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: `${flaggedEnv} ./node_modules/.bin/vite build --emptyOutDir && ${flaggedEnv} ./node_modules/.bin/vite preview --host 127.0.0.1 --port ${previewPort}`,
    cwd: webRoot,
    url: `${previewHost}/MFD/`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
};
