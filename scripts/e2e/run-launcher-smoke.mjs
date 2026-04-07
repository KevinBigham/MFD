import fs from 'node:fs';
import path from 'node:path';

import { parseE2ESmokeArgs } from './cli.mjs';
import { waitForCondition } from './dom-wait.mjs';
import {
  buildE2EReport,
  createE2ECheck,
  summarizeE2EChecks,
  validateE2EReport,
  writeE2EReport,
} from './report-schema.mjs';
import { buildRouteSeedMatrix } from './route-seed.mjs';
import { captureFailureScreenshot } from './screenshot-on-failure.mjs';
import { SELECTOR_MAP } from './selector-map.mjs';
import { buildE2ESummaryMarkdown, writeE2ESummary } from './summary.mjs';
import { resolveModeRouting } from '../../src/app/mode-routing.js';

function readText(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function readBundleText(distDir) {
  var assetsDir = path.resolve(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return '';
  var files = fs.readdirSync(assetsDir).filter(function (file) { return file.endsWith('.js'); });
  return files.map(function (file) {
    return readText(path.resolve(assetsDir, file));
  }).join('\n');
}

function hasAllTokens(text, tokens) {
  return (tokens || []).every(function (token) {
    return String(text).indexOf(token) >= 0;
  });
}

async function maybeLoadPlaywright(disabled) {
  if (disabled) return null;
  try {
    return await import('playwright');
  } catch (err) {
    return null;
  }
}

async function runBrowserChecksOnce(baseUrl, timeoutMs, noBrowser) {
  var checks = [];
  var playwright = await maybeLoadPlaywright(!!noBrowser);
  if (!baseUrl) {
    checks.push(createE2ECheck('browser suite executed', true, 'base URL not provided; browser checks skipped', {
      skipped: true,
    }));
    return checks;
  }
  if (!playwright || !playwright.chromium) {
    checks.push(createE2ECheck('browser suite executed', true, 'playwright not installed; browser checks skipped', {
      skipped: true,
    }));
    return checks;
  }

  var browser = await playwright.chromium.launch({ headless: true });
  var context = await browser.newContext();
  var page = await context.newPage();

  try {
    var start = Date.now();
    await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    var boot = await waitForCondition(async function () {
      var content = await page.content();
      return content.indexOf('Play Now') >= 0 && content.indexOf('Module Status') >= 0;
    }, { timeoutMs: timeoutMs, intervalMs: 50 });
    checks.push(createE2ECheck('launcher boot smoke', boot.ok, boot.ok ? 'launcher rendered mode tabs' : 'mode tabs not found', {
      durationMs: Date.now() - start,
    }));

    await page.goto(baseUrl + '/?mode=play', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    var playSelected = await page.getAttribute('#tab-play', 'aria-selected');
    checks.push(createE2ECheck('?mode=play resolves play tab', playSelected === 'true', 'tab-play aria-selected=' + String(playSelected), {}));

    await page.goto(baseUrl + '/?mode=status', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    var statusSelected = await page.getAttribute('#tab-status', 'aria-selected');
    checks.push(createE2ECheck('?mode=status resolves status tab', statusSelected === 'true', 'tab-status aria-selected=' + String(statusSelected), {}));

    await page.goto(baseUrl + '/#play', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    var hashPlaySelected = await page.getAttribute('#tab-play', 'aria-selected');
    checks.push(createE2ECheck('hash fallback #play', hashPlaySelected === 'true', 'tab-play aria-selected=' + String(hashPlaySelected), {}));

    await page.goto(baseUrl + '/?mode=status', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.click('#tab-play');
    var forcedModeSelected = await page.getAttribute('#tab-status', 'aria-selected');
    checks.push(createE2ECheck('forced mode lock keeps status selected', forcedModeSelected === 'true', 'tab-status aria-selected=' + String(forcedModeSelected), {}));

    await page.goto(baseUrl + '/?mode=play', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    var hasOpenDirect = await page.locator('text=' + SELECTOR_MAP.playOpenDirect).count();
    checks.push(createE2ECheck('open-direct link visible', hasOpenDirect > 0, 'open-direct count=' + hasOpenDirect, {}));

    await page.goto(baseUrl + '/?mode=play', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    var hasTablist = await page.locator('[role="tablist"]').count();
    checks.push(createE2ECheck('tablist accessibility semantics', hasTablist > 0, 'tablist count=' + hasTablist, {}));

    await page.goto(baseUrl + '/?mode=play', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.focus('#tab-play');
    await page.keyboard.press('ArrowRight');
    var keyboardSelected = await page.getAttribute('#tab-status', 'aria-selected');
    checks.push(createE2ECheck('keyboard tab movement', keyboardSelected === 'true', 'tab-status aria-selected=' + String(keyboardSelected), {}));
  } catch (err) {
    var shot = await captureFailureScreenshot(page, 'dist/e2e-artifacts', 'launcher-smoke-failure');
    checks.push(createE2ECheck('browser suite runtime', false, (err && err.message ? err.message : String(err)) + (shot.path ? ' (screenshot: ' + shot.path + ')' : ''), {}));
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  return checks;
}

async function runBrowserChecksWithRetry(baseUrl, timeoutMs, retries, noBrowser) {
  var attempts = Number(retries || 1);
  if (attempts < 1) attempts = 1;

  var merged = [];
  for (var i = 0; i < attempts; i += 1) {
    var checks = await runBrowserChecksOnce(baseUrl, timeoutMs, noBrowser);
    var hasFail = checks.some(function (item) {
      return !item.pass && !item.skipped;
    });
    if (!hasFail) {
      checks.push(createE2ECheck('browser retry wrapper', true, 'completed in ' + (i + 1) + ' attempt(s)', {
        durationMs: i + 1,
      }));
      return checks;
    }
    merged = checks;
  }

  merged.push(createE2ECheck('browser retry wrapper', false, 'failed after ' + attempts + ' attempt(s)', {
    durationMs: attempts,
  }));
  return merged;
}

export async function runLauncherE2ESmoke(distDir, options) {
  var opts = options || {};
  var dist = path.resolve(distDir || 'dist');
  var checks = [];

  var indexPath = path.resolve(dist, 'index.html');
  var topNavPath = path.resolve(process.cwd(), 'src/app/top-nav.jsx');
  var playScreenPath = path.resolve(process.cwd(), 'src/app/play-screen.jsx');
  var statusScreenPath = path.resolve(process.cwd(), 'src/app/status-screen.jsx');
  var launcherCopyPath = path.resolve(process.cwd(), 'src/app/launcher-copy.js');

  checks.push(createE2ECheck('dist index exists', fs.existsSync(indexPath), indexPath, {}));

  var indexText = readText(indexPath);
  checks.push(createE2ECheck('dist index has root mount', indexText.indexOf('id="root"') >= 0, 'index root div present', {}));

  var bundleText = readBundleText(dist);
  checks.push(createE2ECheck('launcher labels present in bundle', hasAllTokens(bundleText, ['Play Now', 'Module Status', 'legacy/index.html']), 'bundle token scan', {}));

  checks.push(createE2ECheck('status labels byte-stable', hasAllTokens(readText(launcherCopyPath), ['Runtime Validation', 'Phase 1 Summary', 'Extracted Module Status']), 'launcher-copy source token scan', {}));
  checks.push(createE2ECheck('play screen has retry and direct-open text', hasAllTokens(readText(launcherCopyPath), ['Retry Launch', 'Open legacy directly']), 'launcher-copy source token scan', {}));
  checks.push(createE2ECheck('top-nav has tablist role and keyboard handler', hasAllTokens(readText(topNavPath), ['role="tablist"', 'onKeyDown']), 'top-nav source token scan', {}));

  var matrix = buildRouteSeedMatrix(opts.baseUrl || 'http://127.0.0.1:4173');
  var queryPlay = resolveModeRouting({ query: '?mode=play', hash: '#status', storageValue: 'status', defaultMode: 'status' });
  checks.push(createE2ECheck('query mode precedence', queryPlay.mode === 'play' && queryPlay.forcedMode === 'play', 'mode=' + queryPlay.mode + ', forced=' + queryPlay.forcedMode, {}));

  var hashFallback = resolveModeRouting({ query: '', hash: '#play', storageValue: 'status', defaultMode: 'status' });
  checks.push(createE2ECheck('hash fallback precedence', hashFallback.mode === 'play' && hashFallback.forcedMode === 'play', 'mode=' + hashFallback.mode + ', forced=' + hashFallback.forcedMode, {}));

  var storageFallback = resolveModeRouting({ query: '', hash: '', storageValue: 'play', defaultMode: 'status' });
  checks.push(createE2ECheck('storage fallback precedence', storageFallback.mode === 'play' && !storageFallback.forcedMode, 'mode=' + storageFallback.mode + ', forced=' + storageFallback.forcedMode, {}));

  var malformedCoercion = resolveModeRouting({ query: '?mode=broken', hash: '#also-broken', storageValue: 'status', defaultMode: 'status' });
  checks.push(createE2ECheck('malformed mode coercion', malformedCoercion.mode === 'status', 'mode=' + malformedCoercion.mode, {}));

  checks.push(createE2ECheck('route seed matrix generated', matrix.length >= 8, 'seed count=' + matrix.length, {}));

  checks.push(createE2ECheck('missing assets warning is non-blocking text present', readText(playScreenPath).indexOf(SELECTOR_MAP.missingAssetsBanner) >= 0, 'warning copy present', {}));

  var bundleHasSaveSlot = bundleText.indexOf('Save Slot') >= 0 || bundleText.indexOf('save slot') >= 0;
  checks.push(createE2ECheck('save slots panel smoke or skip marker', bundleHasSaveSlot, bundleHasSaveSlot ? 'save slot panel text found' : 'save slots panel not present in this build', {
    skipped: !bundleHasSaveSlot,
  }));

  checks.push(createE2ECheck('recovery CTA visibility smoke', readText(launcherCopyPath).indexOf('recoveryHint') >= 0 && readText(launcherCopyPath).indexOf('Retry Launch') >= 0, 'retry + recovery hint present', {}));
  checks.push(createE2ECheck('status fallback path smoke', readText(playScreenPath).indexOf('does not block status mode') >= 0, 'status fallback copy present', {}));
  checks.push(createE2ECheck('playability warning capture smoke', readText(playScreenPath).indexOf('Playability Check Warning') >= 0, 'warning title present', {}));

  var browserChecks = await runBrowserChecksWithRetry(
    opts.baseUrl || '',
    Number(opts.timeoutMs || 7000),
    Number(opts.retries || 1),
    !!opts.noBrowser
  );
  browserChecks.forEach(function (check) { checks.push(check); });

  var summary = summarizeE2EChecks(checks);
  var report = buildE2EReport({
    generatedAt: new Date().toISOString(),
    ok: summary.failed === 0,
    distDir: dist,
    baseUrl: opts.baseUrl || '',
    checks: checks,
    summary: summary,
  });

  var schema = validateE2EReport(report);
  if (!schema.ok) {
    report.ok = false;
    report.checks.push(createE2ECheck('report schema validation', false, schema.errors.join('; '), {}));
    report.summary = summarizeE2EChecks(report.checks);
  }

  return report;
}

export async function runLauncherE2ESmokeWithArtifacts(distDir, options) {
  var opts = options || {};
  var report = await runLauncherE2ESmoke(distDir, opts);
  var reportPath = writeE2EReport(opts.reportPath || 'dist/e2e-launcher-report.json', report);
  var summaryMarkdown = buildE2ESummaryMarkdown(report);
  var summaryPath = writeE2ESummary(opts.summaryPath || 'dist/e2e-launcher-summary.md', summaryMarkdown);
  return {
    report: report,
    reportPath: reportPath,
    summaryPath: summaryPath,
  };
}

async function main() {
  var args = parseE2ESmokeArgs(process.argv.slice(2));
  var out = await runLauncherE2ESmokeWithArtifacts(args.distDir, args);
  console.log('[e2e-launcher] report: ' + out.reportPath);
  console.log('[e2e-launcher] summary: ' + out.summaryPath);
  if (!out.report.ok) {
    console.error('[e2e-launcher] failing checks:');
    out.report.checks.filter(function (item) { return !item.pass && !item.skipped; }).forEach(function (item) {
      console.error(' - ' + item.name + ': ' + item.detail);
    });
    process.exit(1);
  }
  console.log('[e2e-launcher] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
