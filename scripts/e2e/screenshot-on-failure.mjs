import fs from 'node:fs';
import path from 'node:path';

function sanitizeName(name) {
  return String(name || 'failure').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'failure';
}

export async function captureFailureScreenshot(page, outDir, label) {
  if (!page || typeof page.screenshot !== 'function') {
    return {
      ok: false,
      skipped: true,
      path: '',
      reason: 'page screenshot API unavailable',
    };
  }

  var dir = path.resolve(outDir || 'dist/e2e-artifacts');
  fs.mkdirSync(dir, { recursive: true });
  var filename = sanitizeName(label) + '.png';
  var outPath = path.resolve(dir, filename);

  try {
    await page.screenshot({ path: outPath, fullPage: true });
    return {
      ok: true,
      skipped: false,
      path: outPath,
      reason: '',
    };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      path: outPath,
      reason: err && err.message ? err.message : String(err),
    };
  }
}
