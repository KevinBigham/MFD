#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = resolve(rootDir, 'apps/web');
const distDir = resolve(webDir, 'dist');
const outDir = resolve(rootDir, '.logs/screenshots/g6-full-route-sweep');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 45_000);

const staticRoutes = [
  '/', '/week-advance', '/watch-list', '/inbox',
  '/roster', '/depth-chart', '/locker-room', '/coaching', '/coaching/tree', '/coaching/relationships',
  '/handshakes', '/training-camp', '/mentors', '/player-development', '/compare', '/rivalries',
  '/contracts', '/cap-lab', '/front-office', '/endorsements',
  '/trades', '/trade-block', '/trade-deadline', '/scouting', '/draft', '/draft-recap',
  '/expansion-draft', '/free-agency', '/fa-targets', '/waivers', '/practice-squad', '/team-needs',
  '/game-day', '/game-plan', '/broadcast', '/presentation', '/play-by-play', '/game-flow',
  '/film-room', '/schedule', '/super-bowl',
  '/standings', '/power-rankings', '/league-pulse', '/league/weather', '/newsroom', '/news',
  '/social', '/commissioner', '/cba', '/league-rules', '/analytics', '/records', '/stat-central',
  '/franchise', '/owner', '/legends', '/franchise/career', '/franchise/book', '/franchise/chronicle',
  '/franchise/scrapbook', '/franchise/hall', '/franchise/trophy-room', '/franchise/eras',
  '/franchise/mvps', '/franchise/playoff-lore', '/franchise/achievements', '/legacy',
  '/legacy/named-games', '/legacy/bloodlines', '/awards', '/season/recap', '/relocate', '/scenarios',
  '/about', '/credits', '/faq', '/dynasty', '/settings',
];

const viewports = [
  { name: 'desktop', width: 1366, height: 900, mobile: false },
  { name: 'sm-480', width: 480, height: 900, mobile: true },
];

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

function commandExists(command) {
  const result = spawnSync('sh', ['-c', 'command -v "$1" >/dev/null 2>&1', 'sh', command], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate) || commandExists(candidate)) return candidate;
  }
  throw new Error('No Chrome/Chromium binary found.');
}

async function getOpenPort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = net.createServer();
    server.once('error', rejectPort);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(() => {
        if (port) resolvePort(port);
        else rejectPort(new Error('Could not allocate a local port.'));
      });
    });
  });
}

async function waitFor(label, condition, ms = timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < ms) {
    try {
      const result = await condition();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await delay(200);
  }
  const suffix = lastError instanceof Error ? ` Last error: ${lastError.message}` : '';
  throw new Error(`Timed out waiting for ${label}.${suffix}`);
}

class CdpConnection {
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    const client = new CdpConnection(ws);
    await client.opened;
    return client;
  }

  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Set();
    this.opened = new Promise((resolveOpen, rejectOpen) => {
      ws.addEventListener('open', resolveOpen, { once: true });
      ws.addEventListener('error', rejectOpen, { once: true });
    });
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolvePending, rejectPending } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) rejectPending(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ''}`));
        else resolvePending(message.result ?? {});
        return;
      }
      for (const handler of this.handlers) handler(message);
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    const promise = new Promise((resolvePending, rejectPending) => {
      this.pending.set(id, { resolvePending, rejectPending });
    });
    this.ws.send(JSON.stringify(payload));
    return promise;
  }

  onEvent(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  waitForEvent(method, predicate = () => true, sessionId = undefined, ms = timeoutMs) {
    return new Promise((resolveEvent, rejectEvent) => {
      const timer = setTimeout(() => {
        cleanup();
        rejectEvent(new Error(`Timed out waiting for CDP event ${method}.`));
      }, ms);
      const cleanup = this.onEvent((message) => {
        if (message.method !== method) return;
        if (sessionId && message.sessionId !== sessionId) return;
        if (!predicate(message.params ?? {})) return;
        clearTimeout(timer);
        cleanup();
        resolveEvent(message.params ?? {});
      });
    });
  }

  close() {
    return new Promise((resolveClose) => {
      if (!this.ws || this.ws.readyState === 3) {
        resolveClose();
        return;
      }
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolveClose();
      };
      const timer = setTimeout(done, 500);
      timer.unref?.();
      this.ws.addEventListener('close', done, { once: true });
      this.ws.addEventListener('error', done, { once: true });
      try {
        this.ws.close();
      } catch {
        done();
      }
    });
  }
}

async function evaluate(cdp, sessionId, expression, awaitPromise = false) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(details.exception?.description ?? details.exception?.value ?? details.text ?? 'Runtime evaluation failed.');
  }
  return result.result?.value;
}

async function navigate(cdp, sessionId, url) {
  const loadEvent = cdp.waitForEvent('Page.loadEventFired', () => true, sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  await loadEvent;
}

async function pressTab(cdp, sessionId) {
  for (const type of ['keyDown', 'keyUp']) {
    await cdp.send('Input.dispatchKeyEvent', {
      type,
      windowsVirtualKeyCode: 9,
      code: 'Tab',
      key: 'Tab',
    }, sessionId);
  }
  await delay(50);
}

async function setHashRoute(cdp, sessionId, route) {
  await evaluate(cdp, sessionId, `window.location.hash = ${JSON.stringify(`#${route}`)}; true`);
}

async function waitForAppShell(cdp, sessionId) {
  await waitFor('app shell', () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('[data-mfd-app-shell="true"]'))
  `));
}

async function waitForRouteSettled(cdp, sessionId, route, viewport) {
  const lastMetrics = { value: null };
  try {
    return await waitFor(`settled route ${route} at ${viewport.name}`, async () => {
      const metrics = await readRouteMetrics(cdp, sessionId, route, viewport.name);
      lastMetrics.value = metrics;
      const overflowTolerance = viewport.width <= 500 ? 12 : 20;
      return metrics.mainExists
        && !metrics.blankRoot
        && !metrics.loadingFallbackVisible
        && !metrics.technicalTimeoutVisible
        && metrics.bodyTextLength >= 120
        && metrics.mainTextLength >= 80
        && metrics.mainRect
        && metrics.mainRect.width >= Math.min(320, Math.max(260, viewport.width - 32))
        && metrics.mainRect.height >= 120
        && metrics.pageOverflowX <= overflowTolerance
        && metrics.visibleMainSignals.length > 0
        ? metrics
        : false;
    });
  } catch (err) {
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLast metrics:\n${JSON.stringify(lastMetrics.value, null, 2)}`);
  }
}

function safeName(route) {
  return route === '/'
    ? 'root'
    : route.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function captureScreenshot(cdp, sessionId, viewportName, index, route) {
  const filename = `${String(index).padStart(3, '0')}-${viewportName}-${safeName(route)}.png`;
  const outFile = join(outDir, filename);
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  }, sessionId);
  writeFileSync(outFile, Buffer.from(screenshot.data, 'base64'));
  return outFile;
}

async function readRouteMetrics(cdp, sessionId, route, viewportName) {
  return evaluate(cdp, sessionId, `
    (() => {
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0
          && rect.height > 0
          && rect.bottom > 0
          && rect.right > 0
          && rect.top < window.innerHeight
          && rect.left < window.innerWidth
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || '1') > 0.01;
      };
      const textOf = (node) => (node instanceof HTMLElement ? (node.innerText ?? node.textContent ?? '') : '')
        .replace(/\\s+/g, ' ')
        .trim();
      const main = document.querySelector('[data-mfd-main-content="true"]');
      const mainRect = main instanceof HTMLElement ? main.getBoundingClientRect() : null;
      const docWidth = Math.max(document.documentElement?.scrollWidth ?? 0, document.body?.scrollWidth ?? 0);
      const bodyText = textOf(document.body);
      const mainText = textOf(main);
      const mainNodes = main instanceof HTMLElement
        ? [...main.querySelectorAll('section, article, [role="status"], [role="alert"], h1, h2, h3, button, input, select, textarea, [data-spotlight-target], [data-testid], [class*="Panel"], [class*="Card"]')]
        : [];
      const focusables = main instanceof HTMLElement
        ? [...main.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
          .filter(visible)
        : [];
      const tinyInteractive = focusables
        .map((node) => ({ node, rect: node.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width < 14 || rect.height < 14)
        .slice(0, 8)
        .map(({ node, rect }) => ({
          tag: node.tagName,
          text: textOf(node).slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }));
      let focusCheck = { focusableCount: focusables.length, firstFocused: true, firstLabel: null, afterTabLabel: null };
      if (focusables[0] instanceof HTMLElement) {
        focusables[0].focus();
        const first = document.activeElement;
        focusCheck = {
          focusableCount: focusables.length,
          firstFocused: first === focusables[0],
          firstLabel: textOf(focusables[0]).slice(0, 80) || focusables[0].getAttribute('aria-label') || focusables[0].tagName,
          afterTabLabel: null,
        };
      }
      return {
        route: ${JSON.stringify(route)},
        viewportName: ${JSON.stringify(viewportName)},
        href: window.location.href,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        docWidth,
        pageOverflowX: Math.max(0, Math.round(docWidth - window.innerWidth)),
        bodyTextLength: bodyText.length,
        mainExists: main instanceof HTMLElement,
        mainTextLength: mainText.length,
        mainRect: mainRect ? {
          top: Math.round(mainRect.top),
          left: Math.round(mainRect.left),
          width: Math.round(mainRect.width),
          height: Math.round(mainRect.height),
          bottom: Math.round(mainRect.bottom),
        } : null,
        loadingFallbackVisible: Boolean(document.querySelector('[data-mfd-route-loading="true"]')),
        technicalTimeoutVisible: bodyText.includes('Technical Timeout') || bodyText.includes('unrecoverable render error'),
        blankRoot: !document.querySelector('#root > *'),
        visibleMainSignals: mainNodes
          .filter((node) => visible(node) && textOf(node).length >= 2)
          .slice(0, 8)
          .map((node) => ({ tag: node.tagName, text: textOf(node).slice(0, 100), role: node.getAttribute('role') })),
        focusCheck,
        tinyInteractive,
      };
    })()
  `);
}

async function readActiveFocusLabel(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return null;
      const rect = active.getBoundingClientRect();
      return {
        tag: active.tagName,
        text: (active.innerText ?? active.textContent ?? active.getAttribute('aria-label') ?? '').replace(/\\s+/g, ' ').trim().slice(0, 100),
        visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0,
      };
    })()
  `);
}

async function runRoute(cdp, sessionId, route, viewport, index, browserEvents) {
  const eventStart = browserEvents.length;
  await setHashRoute(cdp, sessionId, route);
  let metrics = await waitForRouteSettled(cdp, sessionId, route, viewport);
  await pressTab(cdp, sessionId);
  const afterTab = await readActiveFocusLabel(cdp, sessionId);
  metrics = { ...metrics, focusCheck: { ...metrics.focusCheck, afterTabLabel: afterTab } };
  if (metrics.focusCheck.focusableCount > 0 && !metrics.focusCheck.firstFocused) {
    throw new Error(`First focusable could not receive focus on ${route} at ${viewport.name}: ${JSON.stringify(metrics.focusCheck)}`);
  }
  const screenshotPath = await captureScreenshot(cdp, sessionId, viewport.name, index, route);
  await delay(100);
  const newErrors = browserEvents.slice(eventStart).filter((entry) => entry.level === 'error');
  if (newErrors.length > 0) {
    throw new Error(`Browser errors on ${route} at ${viewport.name}:\n${newErrors.map((entry) => `${entry.kind}: ${entry.text}`).join('\n')}`);
  }
  return { ...metrics, screenshot: screenshotPath.replace(`${rootDir}/`, '') };
}

async function discoverDynamicPlayerRoutes(cdp, sessionId, viewport) {
  await setHashRoute(cdp, sessionId, '/roster');
  await waitForRouteSettled(cdp, sessionId, '/roster', viewport);
  const profileRoute = await evaluate(cdp, sessionId, `
    (() => {
      const button = [...document.querySelectorAll('[data-mfd-main-content="true"] button')]
        .find((candidate) => /^Open\\s+/.test(candidate.getAttribute('title') ?? ''));
      if (!(button instanceof HTMLButtonElement)) return null;
      button.click();
      return true;
    })()
  `);
  if (!profileRoute) return [];
  await waitFor('dynamic player profile hash', () => evaluate(cdp, sessionId, `
    window.location.hash.startsWith('#/player/') && !window.location.hash.endsWith('/timeline')
  `));
  const profile = await evaluate(cdp, sessionId, `decodeURIComponent(window.location.hash.slice(1))`);
  await waitForRouteSettled(cdp, sessionId, profile, viewport);
  return [profile, `${profile}/timeline`];
}

async function main() {
  if (!existsSync(distDir)) throw new Error('apps/web/dist missing. Build @mfd/web before running the sweep.');
  if (typeof fetch !== 'function' || typeof WebSocket !== 'function') {
    throw new Error('This sweep requires a Node runtime with built-in fetch and WebSocket support.');
  }

  mkdirSync(outDir, { recursive: true });
  const previewPort = Number(process.env.SMOKE_PORT ?? await getOpenPort());
  const cdpPort = Number(process.env.SMOKE_CDP_PORT ?? await getOpenPort());
  const baseUrl = `http://127.0.0.1:${previewPort}/MFD/`;
  const userDataDir = mkdtempSync(join(tmpdir(), 'mfd-g6-visual-sweep-'));
  const children = [];
  let cdp = null;

  const cleanupChild = (child) => new Promise((resolveCleanup) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolveCleanup();
    child.once('exit', resolveCleanup);
    child.stdout?.destroy();
    child.stderr?.destroy();
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      resolveCleanup();
    }, 1200).unref?.();
  });

  try {
    let previewLog = '';
    const preview = spawn('./node_modules/.bin/vite', ['preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], {
      cwd: webDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(preview);
    preview.stdout.on('data', (chunk) => { previewLog += chunk.toString(); });
    preview.stderr.on('data', (chunk) => { previewLog += chunk.toString(); });
    await waitFor('preview server', async () => {
      if (preview.exitCode !== null) throw new Error(`preview exited with ${preview.exitCode}\n${previewLog}`);
      const response = await fetch(baseUrl).catch(() => null);
      return response?.ok;
    });

    let chromeLog = '';
    const chrome = spawn(findChrome(), [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(chrome);
    chrome.stdout.on('data', (chunk) => { chromeLog += chunk.toString(); });
    chrome.stderr.on('data', (chunk) => { chromeLog += chunk.toString(); });
    const version = await waitFor('Chrome CDP endpoint', async () => {
      if (chrome.exitCode !== null) throw new Error(`chrome exited with ${chrome.exitCode}\n${chromeLog}`);
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).catch(() => null);
      return response?.ok ? response.json() : null;
    });

    cdp = await CdpConnection.connect(version.webSocketDebuggerUrl);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const browserEvents = [];
    let currentRoute = 'bootstrap';
    cdp.onEvent((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === 'Runtime.exceptionThrown') {
        browserEvents.push({
          route: currentRoute,
          level: 'error',
          kind: 'exception',
          text: message.params?.exceptionDetails?.exception?.description ?? message.params?.exceptionDetails?.text ?? 'Runtime exception',
        });
      }
      if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params?.type)) {
        browserEvents.push({
          route: currentRoute,
          level: message.params.type === 'error' ? 'error' : 'warning',
          kind: 'console',
          text: (message.params.args ?? []).map((arg) => arg.value ?? arg.description).filter(Boolean).join(' '),
        });
      }
      if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params?.entry?.level)) {
        browserEvents.push({
          route: currentRoute,
          level: message.params.entry.level,
          kind: 'log',
          text: message.params.entry.text,
        });
      }
    });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Log.enable', {}, sessionId);
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    }, sessionId);

    currentRoute = 'launch';
    await navigate(cdp, sessionId, baseUrl);
    await evaluate(cdp, sessionId, `(
      async () => {
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem('mfd-boot-seen', '1');
        await new Promise((resolveDelete) => {
          const request = indexedDB.deleteDatabase('mfd');
          request.onsuccess = () => resolveDelete();
          request.onerror = () => resolveDelete();
          request.onblocked = () => resolveDelete();
        });
        return true;
      }
    )()`, true);
    await navigate(cdp, sessionId, baseUrl);
    await waitFor('Launch Demo Scenario button', () => evaluate(cdp, sessionId, `
      (() => {
        const button = [...document.querySelectorAll('button')]
          .find((candidate) => candidate.textContent?.includes('Launch Demo Scenario'));
        if (!button) return false;
        button.click();
        return true;
      })()
    `));
    await waitForAppShell(cdp, sessionId);

    const results = [];
    let dynamicRoutes = [];
    for (const viewport of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      }, sessionId);
      await delay(250);
      if (dynamicRoutes.length === 0) {
        currentRoute = `discover-dynamic-${viewport.name}`;
        dynamicRoutes = await discoverDynamicPlayerRoutes(cdp, sessionId, viewport);
      }
      const routeList = [...staticRoutes, ...dynamicRoutes];
      for (const [index, route] of routeList.entries()) {
        currentRoute = `${viewport.name}:${route}`;
        console.log(`[${viewport.name}] ${index + 1}/${routeList.length} ${route}`);
        const result = await runRoute(cdp, sessionId, route, viewport, index + 1, browserEvents);
        results.push(result);
      }
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      staticRoutes: staticRoutes.length,
      dynamicRoutes,
      registeredRouteCoverage: {
        currentRegisteredRoutes: 81,
        coveredRoutes: staticRoutes.length + dynamicRoutes.length,
        excludedRoutes: dynamicRoutes.length === 2 ? [] : ['/player/$playerId', '/player/$playerId/timeline'],
      },
      screenshots: results.length,
      viewports,
      reducedMotionEmulated: true,
      browserErrorCount: browserEvents.filter((entry) => entry.level === 'error').length,
      browserWarningCount: browserEvents.filter((entry) => entry.level === 'warning').length,
      maxPageOverflowX: Math.max(...results.map((entry) => entry.pageOverflowX)),
      minMainTextLength: Math.min(...results.map((entry) => entry.mainTextLength)),
      routesWithZeroFocusableElements: results
        .filter((entry) => entry.focusCheck.focusableCount === 0)
        .map((entry) => `${entry.viewportName}:${entry.route}`),
      routesWithTinyInteractive: results
        .filter((entry) => entry.tinyInteractive.length > 0)
        .map((entry) => ({ route: entry.route, viewport: entry.viewportName, tinyInteractive: entry.tinyInteractive })),
      browserEvents,
      results,
    };

    const summaryPath = join(outDir, 'summary.json');
    writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`Wrote ${results.length} screenshots and summary to ${outDir}`);
    console.log(`Coverage: ${summary.registeredRouteCoverage.coveredRoutes}/${summary.registeredRouteCoverage.currentRegisteredRoutes}; max overflow ${summary.maxPageOverflowX}px; errors ${summary.browserErrorCount}; warnings ${summary.browserWarningCount}.`);
    if (summary.browserErrorCount > 0) throw new Error(`Browser errors captured during sweep. See ${summaryPath}`);
  } finally {
    if (cdp) await cdp.close();
    await Promise.all(children.map(cleanupChild));
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
