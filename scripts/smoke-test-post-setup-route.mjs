#!/usr/bin/env node
/**
 * Post-setup route smoke for the production build.
 *
 * This complements smoke-test-built-page.sh. The built-page smoke proves the
 * app boots at deploy URLs; this script clicks the convention demo and then
 * loads one or more real post-setup routes through the hash router.
 *
 * Requires a built apps/web/dist artifact. Run:
 *   VITE_CHIP_ENABLED=true pnpm --filter @mfd/web build
 *   node scripts/smoke-test-post-setup-route.mjs
 *
 * Optional route checks:
 *   SMOKE_POST_SETUP_ROUTE=/coaching SMOKE_POST_SETUP_TEXT="Position Coach Report" node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_POST_SETUP_ROUTES_JSON='[{"route":"/league/weather","text":"Forecast Source"},{"route":"/roster","text":"Roster Sources"}]' node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_ADVANCE_WEEK=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CARTRIDGE_ROUND_TRIP=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CARTRIDGE_FILE_ROUND_TRIP=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_LOCAL_SAVE_SLOT_ROUND_TRIP=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_POST_IMPORT_ROUTE_SMOKE=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_POST_IMPORT_HARD_RELOAD=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_NEW_DYNASTY_SETUP_ENTRY=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_FULL_SETUP_COMPLETE=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CONTRACT_RESTRUCTURE=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CONTRACT_BACKLOAD=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CONTRACT_CUTS=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CONTRACT_NEGOTIATIONS=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CAP_LAB_BATCH=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_TRADE_COUNTER_BLOCK=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_WAIVER_PRACTICE_SQUAD=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_FREE_AGENCY_SIGNINGS=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_ROSTER_DEPTH_TRAINING=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_WEEKLY_PREP=1 node scripts/smoke-test-post-setup-route.mjs
 *     Stages a high-stakes week when available and verifies Call Your Shot copy before simming.
 *   SMOKE_DRAFT_SCOUTING=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_DRAFT_WAR_ROOM_TRADE=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_STAFF_FACILITY_MEDICAL=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CHIP_MUTE=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CHIP_RECEIPT_RESPECT=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CHIP_MONDAY_BEAT_CHAIN=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_CHIP_FOCUS_REDUCED_MOTION=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_G6_CORE_UX=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_G6_STATE_FEEDBACK=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_G6_FOCUS_SWEEP=1 node scripts/smoke-test-post-setup-route.mjs
 *   SMOKE_G6_VISUAL_SWEEP=1 node scripts/smoke-test-post-setup-route.mjs
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = resolve(rootDir, 'apps/web');
const distDir = resolve(webDir, 'dist');
const pnpmBin = process.env.PNPM_BIN ?? 'pnpm';

function parsePositiveInt(raw, fallback) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function parseSmokeTimeoutMs(env = process.env) {
  return parsePositiveInt(env.SMOKE_TIMEOUT_MS, 30_000);
}

export function parseSmokePreviewTimeoutMs(env = process.env) {
  return parsePositiveInt(env.SMOKE_PREVIEW_TIMEOUT_MS, Math.max(parseSmokeTimeoutMs(env), 30_000));
}

export function isTransientBrowserInfrastructureError(entry) {
  return entry?.source === 'network'
    && entry?.level === 'error'
    && entry?.text === 'Failed to load resource: net::ERR_CERT_VERIFIER_CHANGED';
}

const timeoutMs = parseSmokeTimeoutMs(process.env);
const previewTimeoutMs = parseSmokePreviewTimeoutMs(process.env);

const defaultRouteCheck = Object.freeze({
  route: '/league/weather',
  text: 'Forecast Source',
});

const defaultPostImportRouteCheck = Object.freeze({
  route: '/contracts',
  text: 'Contract Sources',
});

const g6CoreUxRouteChecks = Object.freeze([
  { route: '/', text: 'Living Week' },
  { route: '/roster', text: 'Roster Sources' },
  { route: '/depth-chart', text: 'Depth Chart Sources' },
  { route: '/game-plan', text: 'Weekly Prep Sources' },
  { route: '/contracts', text: 'Contract Sources' },
  { route: '/cap-lab', text: 'Cap Lab Sources' },
  { route: '/front-office', text: 'Contract Tool Sources' },
  { route: '/trades', text: 'Trade Center Sources' },
  { route: '/waivers', text: 'Waiver Wire' },
  { route: '/practice-squad', text: 'Practice Squad Slots' },
  { route: '/free-agency', text: 'Free Agency Sources' },
  { route: '/scouting', text: 'Scouting Sources' },
  { route: '/draft', text: 'Draft Board Sources' },
  { route: '/settings', text: 'Operations Source' },
  { route: '/dynasty', text: 'Portable Backup' },
]);

const g6FocusSweepRouteChecks = Object.freeze([
  { route: '/', text: 'Living Week' },
  { route: '/roster', text: 'Roster Sources' },
  { route: '/contracts', text: 'Contract Sources' },
  { route: '/trades', text: 'Trade Center Sources' },
  { route: '/game-plan', text: 'Weekly Prep Sources' },
  { route: '/scouting', text: 'Scouting Sources' },
  { route: '/settings', text: 'Operations Source' },
  { route: '/dynasty', text: 'Portable Backup' },
]);

const g6VisualSweepRouteChecks = Object.freeze([
  { route: '/', text: 'Living Week' },
  { route: '/week-advance', text: 'Advance Week' },
  { route: '/roster', text: 'Roster Sources' },
  { route: '/depth-chart', text: 'Depth Chart Sources' },
  { route: '/locker-room', text: 'Locker Room' },
  { route: '/coaching', text: 'Coaching' },
  { route: '/training-camp', text: 'Training Camp' },
  { route: '/mentors', text: 'Alumni Mentors' },
  { route: '/contracts', text: 'Contract Sources' },
  { route: '/cap-lab', text: 'Cap Lab Sources' },
  { route: '/front-office', text: 'Contract Tool Sources' },
  { route: '/trades', text: 'Trade Center Sources' },
  { route: '/trade-block', text: 'Trade Block' },
  { route: '/team-needs', text: 'Team Needs' },
  { route: '/scouting', text: 'Scouting Sources' },
  { route: '/draft', text: 'Draft Board Sources' },
  { route: '/free-agency', text: 'Free Agency Sources' },
  { route: '/fa-targets', text: 'FA Target' },
  { route: '/waivers', text: 'Waiver Wire' },
  { route: '/practice-squad', text: 'Practice Squad Slots' },
  { route: '/game-plan', text: 'Weekly Prep Sources' },
  { route: '/game-day', text: 'Game Day' },
  { route: '/broadcast', text: 'Game Broadcast' },
  { route: '/presentation', text: 'Broadcast Presentation' },
  { route: '/play-by-play', text: 'Play By Play' },
  { route: '/game-flow', text: 'Game Flow' },
  { route: '/film-room', text: 'Film Room' },
  { route: '/schedule', text: 'Schedule' },
  { route: '/standings', text: 'Standings' },
  { route: '/power-rankings', text: 'Power Rankings' },
  { route: '/league-pulse', text: 'League Pulse' },
  { route: '/newsroom', text: 'Newsroom' },
  { route: '/news', text: 'News' },
  { route: '/social', text: 'Social' },
  { route: '/commissioner', text: 'Commissioner' },
  { route: '/cba', text: 'CBA Sources' },
  { route: '/league-rules', text: 'Rule Registry Sources' },
  { route: '/analytics', text: 'Analytics' },
  { route: '/records', text: 'Record Book' },
  { route: '/stat-central', text: 'Stat Central' },
  { route: '/franchise', text: 'Franchise Sources' },
  { route: '/owner', text: 'Owner' },
  { route: '/legends', text: 'Franchise Legends' },
  { route: '/legacy', text: 'Legacy' },
  { route: '/awards', text: 'Awards' },
  { route: '/scenarios', text: 'Scenario' },
  { route: '/dynasty', text: 'Portable Backup' },
  { route: '/settings', text: 'Operations Source' },
]);

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

function fail(message, details = '') {
  console.error(`FAIL: ${message}`);
  if (details) console.error(details);
  process.exit(1);
}

function commandExists(command) {
  const result = spawnSync('sh', ['-c', 'command -v "$1" >/dev/null 2>&1', 'sh', command], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function normalizeRouteCheck(entry, index) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`route check ${index + 1} must be an object with route and text fields.`);
  }

  const route = typeof entry.route === 'string' ? entry.route.trim() : '';
  const text = typeof entry.text === 'string' ? entry.text.trim() : '';

  if (!route.startsWith('/')) {
    throw new Error(`route check ${index + 1} route must be a non-empty hash path starting with "/".`);
  }
  if (!text) {
    throw new Error(`route check ${index + 1} text must be a non-empty string.`);
  }

  return { route, text };
}

export function parsePostSetupRouteChecks(env = process.env) {
  const rawMatrix = env.SMOKE_POST_SETUP_ROUTES_JSON?.trim();

  if (rawMatrix) {
    let parsed;
    try {
      parsed = JSON.parse(rawMatrix);
    } catch (err) {
      throw new Error(`SMOKE_POST_SETUP_ROUTES_JSON must be valid JSON. ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('SMOKE_POST_SETUP_ROUTES_JSON must be a non-empty array of route/text objects.');
    }

    return parsed.map((entry, index) => normalizeRouteCheck(entry, index));
  }

  if (shouldRunG6CoreUxSmoke(env)) {
    return g6CoreUxRouteChecks.map((entry, index) => normalizeRouteCheck(entry, index));
  }

  return [
    normalizeRouteCheck({
      route: env.SMOKE_POST_SETUP_ROUTE ?? defaultRouteCheck.route,
      text: env.SMOKE_POST_SETUP_TEXT ?? defaultRouteCheck.text,
    }, 0),
  ];
}

export function parsePostImportRouteCheck(env = process.env) {
  const rawFlag = env.SMOKE_POST_IMPORT_ROUTE_SMOKE?.trim().toLowerCase() ?? '';
  const rawHardReload = env.SMOKE_POST_IMPORT_HARD_RELOAD?.trim().toLowerCase() ?? '';
  const enabled = rawFlag === '1'
    || rawFlag === 'true'
    || rawFlag === 'yes'
    || rawHardReload === '1'
    || rawHardReload === 'true'
    || rawHardReload === 'yes'
    || Boolean(env.SMOKE_POST_IMPORT_ROUTE?.trim() || env.SMOKE_POST_IMPORT_TEXT?.trim());

  if (!enabled) return null;

  return normalizeRouteCheck({
    route: env.SMOKE_POST_IMPORT_ROUTE ?? defaultPostImportRouteCheck.route,
    text: env.SMOKE_POST_IMPORT_TEXT ?? defaultPostImportRouteCheck.text,
  }, 0);
}

export function shouldRunAdvanceWeekSmoke(env = process.env) {
  const raw = env.SMOKE_ADVANCE_WEEK?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunCartridgeRoundTripSmoke(env = process.env) {
  const raw = env.SMOKE_CARTRIDGE_ROUND_TRIP?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunCartridgeFileRoundTripSmoke(env = process.env) {
  const raw = env.SMOKE_CARTRIDGE_FILE_ROUND_TRIP?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunLocalSaveSlotRoundTripSmoke(env = process.env) {
  const raw = env.SMOKE_LOCAL_SAVE_SLOT_ROUND_TRIP?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunNewDynastySetupEntrySmoke(env = process.env) {
  const raw = env.SMOKE_NEW_DYNASTY_SETUP_ENTRY?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunFullSetupCompleteSmoke(env = process.env) {
  const raw = env.SMOKE_FULL_SETUP_COMPLETE?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunContractRestructureSmoke(env = process.env) {
  const raw = env.SMOKE_CONTRACT_RESTRUCTURE?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunContractBackloadSmoke(env = process.env) {
  const raw = env.SMOKE_CONTRACT_BACKLOAD?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunContractCutsSmoke(env = process.env) {
  const raw = env.SMOKE_CONTRACT_CUTS?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunContractNegotiationsSmoke(env = process.env) {
  const raw = env.SMOKE_CONTRACT_NEGOTIATIONS?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunCapLabBatchSmoke(env = process.env) {
  const raw = env.SMOKE_CAP_LAB_BATCH?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunTradeCounterBlockSmoke(env = process.env) {
  const raw = env.SMOKE_TRADE_COUNTER_BLOCK?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunWaiverPracticeSquadSmoke(env = process.env) {
  const raw = env.SMOKE_WAIVER_PRACTICE_SQUAD?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunFreeAgencySigningsSmoke(env = process.env) {
  const raw = env.SMOKE_FREE_AGENCY_SIGNINGS?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunRosterDepthTrainingSmoke(env = process.env) {
  const raw = env.SMOKE_ROSTER_DEPTH_TRAINING?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunWeeklyPrepSmoke(env = process.env) {
  const raw = env.SMOKE_WEEKLY_PREP?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunDraftScoutingSmoke(env = process.env) {
  const raw = env.SMOKE_DRAFT_SCOUTING?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunDraftWarRoomTradeSmoke(env = process.env) {
  const raw = env.SMOKE_DRAFT_WAR_ROOM_TRADE?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunStaffFacilityMedicalSmoke(env = process.env) {
  const raw = env.SMOKE_STAFF_FACILITY_MEDICAL?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunChipMuteSmoke(env = process.env) {
  const raw = env.SMOKE_CHIP_MUTE?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunChipReceiptRespectSmoke(env = process.env) {
  const raw = env.SMOKE_CHIP_RECEIPT_RESPECT?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunChipAskSummarySmoke(env = process.env) {
  const raw = env.SMOKE_CHIP_ASK_SUMMARY?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunChipMondayBeatChainSmoke(env = process.env) {
  const raw = env.SMOKE_CHIP_MONDAY_BEAT_CHAIN?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunChipFocusReducedMotionSmoke(env = process.env) {
  const raw = env.SMOKE_CHIP_FOCUS_REDUCED_MOTION?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunG6CoreUxSmoke(env = process.env) {
  const raw = env.SMOKE_G6_CORE_UX?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunG6StateFeedbackSmoke(env = process.env) {
  const raw = env.SMOKE_G6_STATE_FEEDBACK?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunG6FocusSweepSmoke(env = process.env) {
  const raw = env.SMOKE_G6_FOCUS_SWEEP?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunG6VisualSweepSmoke(env = process.env) {
  const raw = env.SMOKE_G6_VISUAL_SWEEP?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function shouldRunPostImportHardReloadSmoke(env = process.env) {
  const raw = env.SMOKE_POST_IMPORT_HARD_RELOAD?.trim().toLowerCase() ?? '';
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function parseSmokeViewport(env = process.env) {
  const rawWidth = env.SMOKE_VIEWPORT_WIDTH?.trim() ?? '';
  const rawHeight = env.SMOKE_VIEWPORT_HEIGHT?.trim() ?? '';
  if (!rawWidth && !rawHeight) return null;
  if (!rawWidth || !rawHeight) {
    throw new Error('SMOKE_VIEWPORT_WIDTH and SMOKE_VIEWPORT_HEIGHT must be provided together.');
  }

  const width = Number(rawWidth);
  const height = Number(rawHeight);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 480) {
    throw new Error('SMOKE_VIEWPORT_WIDTH/HEIGHT must be integer CSS pixels at least 320x480.');
  }

  return {
    width,
    height,
    mobile: width <= 600,
  };
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate) || commandExists(candidate)) return candidate;
  }

  fail('no Chrome / Chromium binary found. Install google-chrome or set CHROME_BIN.');
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

function createPreviewCommand(port) {
  const viteBin = resolve(webDir, 'node_modules/.bin/vite');
  if (existsSync(viteBin)) {
    return {
      command: './node_modules/.bin/vite',
      args: ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      cwd: webDir,
    };
  }

  if (commandExists(pnpmBin)) {
    return {
      command: pnpmBin,
      args: ['--filter', '@mfd/web', 'preview', '--port', String(port), '--strictPort'],
      cwd: rootDir,
    };
  }

  fail('pnpm is unavailable and apps/web/node_modules/.bin/vite was not found.');
}

function formatPreviewStartFailure(err, command, previewLog) {
  const message = err instanceof Error ? err.message : String(err);
  const output = previewLog.trim() || '(no preview output captured)';
  return [
    message,
    `Preview command: ${command.command} ${command.args.join(' ')}`,
    'Preview output:',
    output,
  ].join('\n');
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
        if (message.error) {
          rejectPending(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ''}`));
        } else {
          resolvePending(message.result ?? {});
        }
        return;
      }

      for (const handler of this.handlers) {
        handler(message);
      }
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
    const description = details.exception?.description ?? details.exception?.value ?? details.text;
    throw new Error(description ?? 'Runtime evaluation failed.');
  }

  return result.result?.value;
}

async function navigate(cdp, sessionId, url) {
  const loadEvent = cdp.waitForEvent('Page.loadEventFired', () => true, sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  await loadEvent;
}

async function pressKey(cdp, sessionId, key, modifiers = {}) {
  const keyMap = {
    Enter: { windowsVirtualKeyCode: 13, code: 'Enter', key: 'Enter' },
    Space: { windowsVirtualKeyCode: 32, code: 'Space', key: ' ' },
    Tab: { windowsVirtualKeyCode: 9, code: 'Tab', key: 'Tab' },
    Escape: { windowsVirtualKeyCode: 27, code: 'Escape', key: 'Escape' },
  };
  const params = keyMap[key];
  if (!params) throw new Error(`Unsupported key for smoke: ${key}`);
  const modifierMask = (modifiers.altKey ? 1 : 0)
    | (modifiers.ctrlKey ? 2 : 0)
    | (modifiers.metaKey ? 4 : 0)
    | (modifiers.shiftKey ? 8 : 0);

  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    ...params,
    modifiers: modifierMask,
    altKey: Boolean(modifiers.altKey),
    ctrlKey: Boolean(modifiers.ctrlKey),
    metaKey: Boolean(modifiers.metaKey),
    shiftKey: Boolean(modifiers.shiftKey),
  }, sessionId);
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    ...params,
    modifiers: modifierMask,
    altKey: Boolean(modifiers.altKey),
    ctrlKey: Boolean(modifiers.ctrlKey),
    metaKey: Boolean(modifiers.metaKey),
    shiftKey: Boolean(modifiers.shiftKey),
  }, sessionId);
  await delay(80);
}

async function setHashRoute(cdp, sessionId, route) {
  await evaluate(cdp, sessionId, `window.location.hash = ${JSON.stringify(`#${route}`)}; true`);
}

async function waitForBodyText(cdp, sessionId, text, label = `body text "${text}"`) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (document.body?.innerText ?? '').toLowerCase().includes(${JSON.stringify(text.toLowerCase())})
    `));
  } catch (err) {
    const currentUrl = await evaluate(cdp, sessionId, 'window.location.href');
    const bodyText = await evaluate(cdp, sessionId, 'document.body?.innerText?.slice(0, 2000) ?? ""');
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nCurrent URL: ${currentUrl}\nBody text head:\n${bodyText}`);
  }
}

async function assertBodyTextAbsent(cdp, sessionId, text, label = `body text absent "${text}"`) {
  const bodyText = await evaluate(cdp, sessionId, 'document.body?.innerText ?? ""');
  if (bodyText.toLowerCase().includes(text.toLowerCase())) {
    const currentUrl = await evaluate(cdp, sessionId, 'window.location.href');
    throw new Error(`${label} failed: found "${text}".\nCurrent URL: ${currentUrl}\nBody text head:\n${bodyText.slice(0, 2000)}`);
  }
}

async function waitForSetupForecastLabels(cdp, sessionId) {
  const expected = ['Week 1 Plan', 'Scheme Fit', 'Team Morale', 'Cap Space', 'Owner Patience'];
  const retired = ['Week 1 Readiness', 'Scheme Cohesion', 'Culture Stability', 'Cap Flexibility'];

  try {
    await waitFor('plain setup forecast card labels', () => evaluate(cdp, sessionId, `
      (() => {
        const labels = [...document.querySelectorAll('[data-mfd-setup-forecast-card-label]')]
          .map((node) => (node.textContent ?? '').replace(/\\s+/g, ' ').trim());
        if (${JSON.stringify(expected)}.some((label) => !labels.includes(label))) return false;
        if (${JSON.stringify(retired)}.some((label) => labels.includes(label))) return false;
        return labels;
      })()
    `));
  } catch (err) {
    const currentUrl = await evaluate(cdp, sessionId, 'window.location.href');
    const labels = await evaluate(cdp, sessionId, `
      [...document.querySelectorAll('[data-mfd-setup-forecast-card-label]')]
        .map((node) => (node.textContent ?? '').replace(/\\s+/g, ' ').trim())
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nCurrent URL: ${currentUrl}\nSetup forecast labels:\n${JSON.stringify(labels)}`);
  }
}

async function waitForSetupCapPlanChoices(cdp, sessionId) {
  const expected = ['Protect Future Cap', 'Restructure One Contract', 'Restructure Multiple Contracts'];
  const retired = [
    'Protect the Future',
    'Balanced Pressure Release',
    'Aggressive Cap Push',
    'future flexibility',
    'mortgaging future flexibility',
  ];

  try {
    await waitFor('plain setup cap plan choices', () => evaluate(cdp, sessionId, `
      (() => {
        const text = document.querySelector('[data-mfd-setup-content="true"]')?.innerText ?? '';
        if (${JSON.stringify(expected)}.some((label) => !text.includes(label))) return false;
        if (${JSON.stringify(retired)}.some((label) => text.includes(label))) return false;
        return true;
      })()
    `));
  } catch (err) {
    const currentUrl = await evaluate(cdp, sessionId, 'window.location.href');
    const bodyText = await evaluate(cdp, sessionId, 'document.body?.innerText?.slice(0, 2000) ?? ""');
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nCurrent URL: ${currentUrl}\nBody text head:\n${bodyText}`);
  }
}

async function waitForSetupHeaderText(cdp, sessionId, text, label = `setup header text "${text}"`) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (document.querySelector('[data-mfd-setup-header="true"]')?.innerText ?? '')
        .toLowerCase()
        .includes(${JSON.stringify(text.toLowerCase())})
    `));
  } catch (err) {
    const headerText = await evaluate(cdp, sessionId, `document.querySelector('[data-mfd-setup-header="true"]')?.innerText ?? ''`);
    const bodyText = await evaluate(cdp, sessionId, 'document.body?.innerText?.slice(0, 2000) ?? ""');
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nSetup header:\n${headerText}\nBody text head:\n${bodyText}`);
  }
}

async function waitForSetupShell(cdp, sessionId, label = 'setup shell') {
  await waitFor(label, () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('[data-mfd-setup-header="true"]'))
      && Boolean(document.querySelector('[data-mfd-setup-content="true"]'))
      && Boolean(document.querySelector('[data-mfd-setup-stepper="true"]'))
  `));
}

async function waitForSetupChipContextRowReadableBeforeScroll(cdp, sessionId, kind, label) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const width = window.innerWidth || document.documentElement.clientWidth;
        if (width < 641 || width > 1180) return true;

        const kind = ${JSON.stringify(kind)};
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
          .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === kind);
        if (!(setupContent instanceof HTMLElement) || !(commandBar instanceof HTMLElement) || !(row instanceof HTMLElement)) return false;

        setupContent.scrollTop = 0;

        const rowRect = row.getBoundingClientRect();
        const commandRect = commandBar.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const bottomLimit = Math.min(commandRect.top, viewportHeight);
        const rowText = (row.innerText ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
        const details = document.querySelector('[data-chip-host-context-details="true"]');
        if (width >= 641 && width <= 768 && details instanceof HTMLElement) {
          const detailsStyle = getComputedStyle(details);
          const detailsRect = details.getBoundingClientRect();
          const detailsScrollRange = Math.max(0, details.scrollHeight - details.clientHeight);
          const pageScrollRange = Math.max(0, setupContent.scrollHeight - setupContent.clientHeight);
          const pageCarriesChip = detailsStyle.maxHeight === 'none'
            && detailsStyle.overflowY === 'visible'
            && detailsScrollRange <= 2
            && pageScrollRange >= 44;
          if (pageCarriesChip) return true;
        }
        if (width >= 641 && width <= 768 && viewportHeight < 820 && details instanceof HTMLElement) {
          const detailsStyle = getComputedStyle(details);
          const detailsRect = details.getBoundingClientRect();
          const detailsScrollRange = Math.max(0, details.scrollHeight - details.clientHeight);
          const maxHeight = Number.parseFloat(detailsStyle.maxHeight);
          const scrollPaddingBottom = Number.parseFloat(detailsStyle.scrollPaddingBottom);
          const shortViewportScrollerIsClear = detailsStyle.overflowY === 'auto'
            && detailsScrollRange >= 44
            && Number.isFinite(maxHeight)
            && maxHeight <= 220
            && Number.isFinite(scrollPaddingBottom)
            && scrollPaddingBottom >= 120
            && detailsRect.top >= 0
            && detailsRect.bottom <= bottomLimit - 12;
          if (shortViewportScrollerIsClear) return true;
        }

        return row.offsetParent !== null
          && rowRect.height >= 24
          && rowRect.top >= 0
          && rowRect.bottom <= bottomLimit - 24
          && rowText.includes(kind);
      })()
    `));
  } catch (err) {
    const geometry = await evaluate(cdp, sessionId, `
      (() => {
        const kind = ${JSON.stringify(kind)};
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const details = document.querySelector('[data-chip-host-context-details="true"]');
        const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
          .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === kind);
        const rectFor = (node) => {
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            height: Math.round(rect.height),
            scrollTop: Math.round(node.scrollTop),
            scrollHeight: Math.round(node.scrollHeight),
            clientHeight: Math.round(node.clientHeight),
            maxHeight: style.maxHeight,
            overflowY: style.overflowY,
            paddingBottom: style.paddingBottom,
            scrollPaddingBottom: style.scrollPaddingBottom,
            text: (node.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 240),
          };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          setupContent: rectFor(setupContent),
          commandBar: rectFor(commandBar),
          details: rectFor(details),
          row: rectFor(row),
        };
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nSetup Chip before-scroll geometry:\n${JSON.stringify(geometry, null, 2)}`);
  }
}

async function waitForSetupChipContextRowVisibleAboveCommandBar(cdp, sessionId, kind, label) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const kind = ${JSON.stringify(kind)};
        const content = document.querySelector('[data-mfd-setup-content="true"]');
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
          .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === kind);
        if (!(content instanceof HTMLElement) || !(commandBar instanceof HTMLElement) || !(row instanceof HTMLElement)) return false;

        content.scrollTop = content.scrollHeight;
        row.scrollIntoView({ block: 'end', inline: 'nearest' });

        const rowRect = row.getBoundingClientRect();
        const commandRect = commandBar.getBoundingClientRect();
        const bottomLimit = Math.min(commandRect.top, window.innerHeight || document.documentElement.clientHeight);
        const rowText = (row.innerText ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();

        return row.offsetParent !== null
          && rowRect.height >= 24
          && rowRect.top >= 0
          && rowRect.bottom <= bottomLimit - 44
          && rowText.includes(kind);
      })()
    `));
  } catch (err) {
    const geometry = await evaluate(cdp, sessionId, `
      (() => {
        const kind = ${JSON.stringify(kind)};
        const content = document.querySelector('[data-mfd-setup-content="true"]');
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
          .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === kind);
        const rectFor = (node) => {
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          return {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            scrollTop: Math.round(node.scrollTop),
            scrollHeight: Math.round(node.scrollHeight),
            clientHeight: Math.round(node.clientHeight),
            display: getComputedStyle(node).display,
            visibility: getComputedStyle(node).visibility,
            opacity: getComputedStyle(node).opacity,
            text: (node.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 240),
          };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          content: rectFor(content),
          commandBar: rectFor(commandBar),
          row: rectFor(row),
          rows: [...document.querySelectorAll('[data-chip-host-context-kind]')]
            .map((candidate) => ({
              kind: candidate.getAttribute('data-chip-host-context-kind'),
              text: (candidate.textContent ?? '').replace(/\\s+/g, ' ').trim(),
            })),
        };
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nSetup Chip row geometry:\n${JSON.stringify(geometry, null, 2)}`);
  }
}

async function waitForSetupChipContextRowPostScrollClearance(cdp, sessionId, kind, label) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const kind = ${JSON.stringify(kind)};
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
          .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === kind);
        if (!(setupContent instanceof HTMLElement) || !(commandBar instanceof HTMLElement) || !(row instanceof HTMLElement)) return false;

        setupContent.scrollTop = 0;
        row.scrollIntoView({ block: 'end', inline: 'nearest' });
        const focusedScrollTop = setupContent.scrollTop;
        const maxScrollTop = Math.max(0, setupContent.scrollHeight - setupContent.clientHeight);

        const rowRect = row.getBoundingClientRect();
        const commandRect = commandBar.getBoundingClientRect();
        const bottomLimit = Math.min(commandRect.top, window.innerHeight || document.documentElement.clientHeight);
        const postRowClearance = bottomLimit - rowRect.bottom;
        const scrollPastRowRange = maxScrollTop - focusedScrollTop;

        return row.offsetParent !== null
          && setupContent.scrollHeight > setupContent.clientHeight
          && rowRect.height >= 24
          && rowRect.top >= 0
          && postRowClearance >= 88
          && scrollPastRowRange >= 96;
      })()
    `));
  } catch (err) {
    const geometry = await evaluate(cdp, sessionId, `
      (() => {
        const kind = ${JSON.stringify(kind)};
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
          .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === kind);
        let focusedScrollTop = null;
        let maxScrollTop = null;
        let scrollPastRowRange = null;
        if (setupContent instanceof HTMLElement && row instanceof HTMLElement) {
          setupContent.scrollTop = 0;
          row.scrollIntoView({ block: 'end', inline: 'nearest' });
          focusedScrollTop = Math.round(setupContent.scrollTop);
          maxScrollTop = Math.round(Math.max(0, setupContent.scrollHeight - setupContent.clientHeight));
          scrollPastRowRange = maxScrollTop - focusedScrollTop;
        }
        const rectFor = (node) => {
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          return {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            height: Math.round(rect.height),
            scrollTop: Math.round(node.scrollTop),
            scrollHeight: Math.round(node.scrollHeight),
            clientHeight: Math.round(node.clientHeight),
            text: (node.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 240),
          };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          focusedScrollTop,
          maxScrollTop,
          scrollPastRowRange,
          setupContent: rectFor(setupContent),
          commandBar: rectFor(commandBar),
          row: rectFor(row),
        };
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nSetup Chip post-row clearance geometry:\n${JSON.stringify(geometry, null, 2)}`);
  }
}

async function waitForSetupChipContextUsesReachableScroll(cdp, sessionId, label) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        const details = document.querySelector('[data-chip-host-context-details="true"]');
        if (!(setupContent instanceof HTMLElement) || !(details instanceof HTMLElement)) return false;
        if ((window.innerWidth || document.documentElement.clientWidth) > 780) return true;

        const detailsStyle = getComputedStyle(details);
        const detailsScrollRange = Math.max(0, details.scrollHeight - details.clientHeight);
        const pageScrollRange = Math.max(0, setupContent.scrollHeight - setupContent.clientHeight);
        const pageCarriesChip = detailsStyle.maxHeight === 'none'
          && detailsStyle.overflowY === 'visible'
          && detailsScrollRange <= 2
          && pageScrollRange >= 44;
        const detailsCarryChip = detailsStyle.overflowY === 'auto'
          && detailsScrollRange >= 44
          && Number.parseFloat(detailsStyle.maxHeight) >= 120
          && Number.parseFloat(detailsStyle.scrollPaddingBottom) >= 120;
        return pageCarriesChip || detailsCarryChip;
      })()
    `));
  } catch (err) {
    const geometry = await evaluate(cdp, sessionId, `
      (() => {
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        const details = document.querySelector('[data-chip-host-context-details="true"]');
        const rectFor = (node) => {
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            height: Math.round(rect.height),
            scrollTop: Math.round(node.scrollTop),
            scrollHeight: Math.round(node.scrollHeight),
            clientHeight: Math.round(node.clientHeight),
            maxHeight: style.maxHeight,
            overflowY: style.overflowY,
            paddingBottom: style.paddingBottom,
            scrollPaddingBottom: style.scrollPaddingBottom,
            text: (node.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 240),
          };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          setupContent: rectFor(setupContent),
          details: rectFor(details),
        };
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nSetup Chip reachable-scroll geometry:\n${JSON.stringify(geometry, null, 2)}`);
  }
}

async function waitForSetupChipControlVisibleAboveCommandBar(cdp, sessionId, text, label) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const text = ${JSON.stringify(text.toLowerCase())};
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const control = [...document.querySelectorAll('[data-chip-host-controls="true"] button')]
          .find((candidate) => (candidate.textContent ?? '').replace(/\\s+/g, ' ').trim().toLowerCase().includes(text));
        if (!(commandBar instanceof HTMLElement) || !(control instanceof HTMLElement)) return false;

        control.scrollIntoView({ block: 'center', inline: 'nearest' });
        const controlRect = control.getBoundingClientRect();
        const commandRect = commandBar.getBoundingClientRect();
        const bottomLimit = Math.min(commandRect.top, window.innerHeight || document.documentElement.clientHeight);

        return control.offsetParent !== null
          && controlRect.height >= 24
          && controlRect.top >= 0
          && controlRect.bottom <= bottomLimit - 6;
      })()
    `));
  } catch (err) {
    const geometry = await evaluate(cdp, sessionId, `
      (() => {
        const text = ${JSON.stringify(text.toLowerCase())};
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const control = [...document.querySelectorAll('[data-chip-host-controls="true"] button')]
          .find((candidate) => (candidate.textContent ?? '').replace(/\\s+/g, ' ').trim().toLowerCase().includes(text));
        const rectFor = (node) => {
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            scrollTop: Math.round(node.scrollTop),
            scrollHeight: Math.round(node.scrollHeight),
            clientHeight: Math.round(node.clientHeight),
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            text: (node.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 240),
          };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          commandBar: rectFor(commandBar),
          control: rectFor(control),
          controls: [...document.querySelectorAll('[data-chip-host-controls="true"] button')]
            .map((candidate) => (candidate.textContent ?? '').replace(/\\s+/g, ' ').trim()),
        };
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nSetup Chip control geometry:\n${JSON.stringify(geometry, null, 2)}`);
  }
}

async function waitForSetupAGMHireCommandReachableByWheel(cdp, sessionId, label) {
  const target = await waitFor(`${label} scroll target`, () => evaluate(cdp, sessionId, `
    (() => {
      const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
      const commandBar = document.querySelector('.mfd-setup-command-bar');
      const chipHost = document.querySelector('[data-chip-host="true"]');
      const hireCommand = document.querySelector('[data-mfd-agm-hire-command="true"] button');
      if (!(setupContent instanceof HTMLElement) || !(commandBar instanceof HTMLElement) || !(chipHost instanceof HTMLElement) || !(hireCommand instanceof HTMLElement)) return null;

      setupContent.scrollTop = 0;
      const contentRect = setupContent.getBoundingClientRect();
      const commandRect = commandBar.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const x = Math.round(Math.max(12, Math.min(contentRect.left + contentRect.width / 2, window.innerWidth - 12)));
      const yLimit = Math.min(commandRect.top - 24, viewportHeight - 24);
      const y = Math.round(Math.max(contentRect.top + 24, Math.min(contentRect.top + contentRect.height / 2, yLimit)));

      return {
        x,
        y,
        text: (hireCommand.innerText ?? hireCommand.textContent ?? '').replace(/\\s+/g, ' ').trim(),
      };
    })()
  `));

  const hireCommandVisible = () => evaluate(cdp, sessionId, `
    (() => {
      const commandBar = document.querySelector('.mfd-setup-command-bar');
      const hireCommand = document.querySelector('[data-mfd-agm-hire-command="true"] button');
      if (!(commandBar instanceof HTMLElement) || !(hireCommand instanceof HTMLElement)) return false;

      const commandRect = commandBar.getBoundingClientRect();
      const hireRect = hireCommand.getBoundingClientRect();
      const bottomLimit = Math.min(commandRect.top, window.innerHeight || document.documentElement.clientHeight);
      const widthLimit = window.innerWidth || document.documentElement.clientWidth;
      const hireText = (hireCommand.innerText ?? hireCommand.textContent ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();

      return hireCommand.offsetParent !== null
        && hireText.includes('make this your agm')
        && hireRect.width >= 40
        && hireRect.height >= 32
        && hireRect.left >= -12
        && hireRect.right <= widthLimit + 12
        && hireRect.top >= 0
        && hireRect.bottom <= bottomLimit - 6;
    })()
  `);

  const scrollRange = await evaluate(cdp, sessionId, `
    (() => {
      const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
      if (!(setupContent instanceof HTMLElement)) return 0;
      return Math.max(0, setupContent.scrollHeight - setupContent.clientHeight);
    })()
  `);

  for (let scrollTop = 0; scrollTop <= scrollRange; scrollTop += 80) {
    await evaluate(cdp, sessionId, `
      (() => {
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        if (setupContent instanceof HTMLElement) setupContent.scrollTop = ${scrollTop};
        return true;
      })()
    `);
    await delay(16);
    if (await hireCommandVisible()) return;
  }

  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y }, sessionId);
  for (let index = 0; index < 32; index += 1) {
    if (await hireCommandVisible()) return;
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: target.x,
      y: target.y,
      deltaX: 0,
      deltaY: 120,
    }, sessionId);
    await delay(60);
  }

  try {
    await waitFor(label, hireCommandVisible, 1_000);
  } catch (err) {
    const geometry = await evaluate(cdp, sessionId, `
      (() => {
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        const railAddon = document.querySelector('.mfd-agm-stage__rail-addon');
        const chipHost = document.querySelector('[data-chip-host="true"]');
        const hireCommand = document.querySelector('[data-mfd-agm-hire-command="true"] button');
        const rectFor = (node) => {
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            scrollTop: Math.round(node.scrollTop),
            scrollHeight: Math.round(node.scrollHeight),
            clientHeight: Math.round(node.clientHeight),
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            text: (node.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 240),
          };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          setupContent: rectFor(setupContent),
          railAddon: rectFor(railAddon),
          chipHost: rectFor(chipHost),
          commandBar: rectFor(commandBar),
          hireCommand: rectFor(hireCommand),
        };
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nSetup AGM hire command geometry:\n${JSON.stringify(geometry, null, 2)}`);
  }
}

async function waitForSetupChipContextRowReachableByWheel(cdp, sessionId, kind, label) {
  const target = await waitFor(`${label} scroll target`, () => evaluate(cdp, sessionId, `
    (() => {
      const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
      const commandBar = document.querySelector('.mfd-setup-command-bar');
      const chipHost = document.querySelector('[data-chip-host="true"]');
      const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
        .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === ${JSON.stringify(kind)});
      if (!(setupContent instanceof HTMLElement) || !(commandBar instanceof HTMLElement) || !(chipHost instanceof HTMLElement) || !(row instanceof HTMLElement)) return null;

      setupContent.scrollTop = 0;
      const scrollables = [
        document.querySelector('.mfd-agm-stage__rail-addon'),
        chipHost,
        document.querySelector('[data-chip-host-context-details="true"]'),
      ];
      for (const node of scrollables) {
        if (node instanceof HTMLElement) node.scrollTop = 0;
      }

      const hostRect = chipHost.getBoundingClientRect();
      const commandRect = commandBar.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const x = Math.round(Math.max(12, Math.min(hostRect.left + hostRect.width / 2, window.innerWidth - 12)));
      const yLimit = Math.min(commandRect.top - 24, viewportHeight - 24);
      const y = Math.round(Math.max(24, Math.min(hostRect.bottom - 24, yLimit)));
      return {
        x,
        y,
        rowText: (row.innerText ?? '').replace(/\\s+/g, ' ').trim(),
      };
    })()
  `));

  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y }, sessionId);
  const rowIsReadable = () => evaluate(cdp, sessionId, `
    (() => {
      const commandBar = document.querySelector('.mfd-setup-command-bar');
      const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
        .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === ${JSON.stringify(kind)});
      if (!(commandBar instanceof HTMLElement) || !(row instanceof HTMLElement)) return false;

      const rowRect = row.getBoundingClientRect();
      const commandRect = commandBar.getBoundingClientRect();
      const bottomLimit = Math.min(commandRect.top, window.innerHeight || document.documentElement.clientHeight);
      return row.offsetParent !== null
        && rowRect.height >= 24
        && rowRect.top >= 0
        && rowRect.bottom <= bottomLimit - 44;
    })()
  `);

  for (let index = 0; index < 12; index += 1) {
    if (await rowIsReadable()) return;
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: target.x,
      y: target.y,
      deltaX: 0,
      deltaY: 260,
    }, sessionId);
    await delay(60);
  }

  try {
    await waitFor(label, rowIsReadable, 1_000);
  } catch (err) {
    const geometry = await evaluate(cdp, sessionId, `
      (() => {
        const commandBar = document.querySelector('.mfd-setup-command-bar');
        const setupContent = document.querySelector('[data-mfd-setup-content="true"]');
        const chipHost = document.querySelector('[data-chip-host="true"]');
        const row = [...document.querySelectorAll('[data-chip-host-context-kind]')]
          .find((candidate) => candidate.getAttribute('data-chip-host-context-kind') === ${JSON.stringify(kind)});
        const rectFor = (node) => {
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          return {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            height: Math.round(rect.height),
            scrollTop: Math.round(node.scrollTop),
            scrollHeight: Math.round(node.scrollHeight),
            clientHeight: Math.round(node.clientHeight),
            text: (node.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 240),
          };
        };
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          setupContent: rectFor(setupContent),
          chipHost: rectFor(chipHost),
          commandBar: rectFor(commandBar),
          row: rectFor(row),
        };
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nSetup Chip wheel-scroll geometry:\n${JSON.stringify(geometry, null, 2)}`);
  }
}

async function waitForSetupShellAfterStartDynasty(cdp, sessionId) {
  const firstScreen = await waitFor('setup shell or Chip intro after Start Dynasty', () => evaluate(cdp, sessionId, `
    (() => {
      const hasSetupShell = Boolean(document.querySelector('[data-mfd-setup-header="true"]'))
        && Boolean(document.querySelector('[data-mfd-setup-content="true"]'))
        && Boolean(document.querySelector('[data-mfd-setup-stepper="true"]'));
      if (hasSetupShell) return 'setup-shell';
      const bodyText = (document.body?.innerText ?? '').toLowerCase();
      const hasChipIntro = bodyText.includes("i'm chip")
        && [...document.querySelectorAll('button')]
          .some((button) => button.textContent?.includes('Start Setup'));
      return hasChipIntro ? 'chip-intro' : false;
    })()
  `));

  if (firstScreen === 'chip-intro') {
    await waitForBodyText(cdp, sessionId, 'separate Must Do, Recommended, and Optional work', 'Chip intro Must Do/Recommended/Optional copy');
    await waitForBodyText(cdp, sessionId, 'roster, cap space, owner patience, or the next game', 'Chip intro consequence copy');
    await clickButtonContaining(cdp, sessionId, 'Start Setup', 'clickable Chip intro Start Setup button');
  }

  await waitForSetupShell(cdp, sessionId, 'setup shell after Start Dynasty');
}

async function clickButtonContaining(cdp, sessionId, text, label = `clickable ${text} button`) {
  return waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const match = [...document.querySelectorAll('button')]
        .find((button) => !button.disabled && (button.textContent ?? '').includes(${JSON.stringify(text)}));
      if (!match) return false;
      match.click();
      return true;
    })()
  `));
}

async function clickButtonWithExactText(cdp, sessionId, text, label = `clickable ${text} button`) {
  return waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const expected = ${JSON.stringify(text.trim().toLowerCase())};
      const buttons = [...document.querySelectorAll('button')]
        .filter((button) => !button.disabled);
      const textFor = (button) => (button.textContent ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
      const match = buttons.find((button) => textFor(button) === expected)
        ?? buttons.find((button) => textFor(button).includes(expected));
      if (!match) return false;
      match.click();
      return true;
    })()
  `));
}

async function clickButtonSelectorWithMouse(cdp, sessionId, selector, label = `clickable ${selector} button`) {
  const target = await waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const match = document.querySelector(${JSON.stringify(selector)});
      if (!(match instanceof HTMLButtonElement) || match.disabled) return null;
      match.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = match.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        text: (match.textContent ?? '').replace(/\\s+/g, ' ').trim(),
      };
    })()
  `));

  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y }, sessionId);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 }, sessionId);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', clickCount: 1 }, sessionId);
  return target.text;
}

async function clickButtonNearText(cdp, sessionId, buttonText, nearbyText, label = `clickable ${buttonText} button near ${nearbyText}`) {
  return waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const expectedButton = ${JSON.stringify(buttonText.trim().toLowerCase())};
      const expectedNearby = ${JSON.stringify(nearbyText.trim().toLowerCase())};
      const buttons = [...document.querySelectorAll('button')]
        .filter((button) => !button.disabled)
        .filter((button) => (button.textContent ?? '').replace(/\\s+/g, ' ').trim().toLowerCase() === expectedButton);

      for (const button of buttons) {
        let node = button;
        for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
          const text = (node.innerText ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
          if (text.includes(expectedNearby)) {
            button.scrollIntoView({ block: 'center', inline: 'center' });
            button.click();
            return true;
          }
        }
      }
      return false;
    })()
  `));
}

async function clickSetupPrimaryAction(cdp, sessionId, label) {
  const clickedLabel = await waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const button = document.querySelector('button[data-mfd-primary-action="true"]');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return '';
      const label = (button.textContent ?? '').replace(/\\s+/g, ' ').trim();
      button.click();
      return label;
    })()
  `));

  console.log(`Clicked setup primary action: ${clickedLabel}`);
  await delay(900);
  return clickedLabel;
}

async function isSetupPrimaryActionEnabled(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (() => {
      const button = document.querySelector('button[data-mfd-primary-action="true"]');
      return button instanceof HTMLButtonElement && !button.disabled;
    })()
  `);
}

async function clickSetupSpotlightTarget(cdp, sessionId, targetId, label) {
  await waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const target = document.querySelector(${JSON.stringify(`[data-spotlight-target="${targetId}"]`)});
      if (!(target instanceof HTMLElement)) return false;
      if (target instanceof HTMLButtonElement && target.disabled) return false;
      target.click();
      return true;
    })()
  `));

  await delay(200);
}

async function waitForSetupPrimaryOrSchemeTarget(cdp, sessionId) {
  return waitFor('enabled scheme primary action or scheme selection target', () => evaluate(cdp, sessionId, `
    (() => {
      const primary = document.querySelector('button[data-mfd-primary-action="true"]');
      if (primary instanceof HTMLButtonElement && !primary.disabled) return 'primary';
      const target = document.querySelector('[data-spotlight-target="wizard.scheme.confirm"]');
      if (target instanceof HTMLElement) return 'target';
      return '';
    })()
  `));
}

async function clickCurrentSetupSchemeTarget(cdp, sessionId) {
  const clickedLabel = await waitFor('current scheme selection target', () => evaluate(cdp, sessionId, `
    (() => {
      const target = document.querySelector('[data-spotlight-target="wizard.scheme.confirm"]');
      if (!(target instanceof HTMLElement)) return '';
      const label = (target.textContent ?? '').replace(/\\s+/g, ' ').trim();
      target.click();
      return label;
    })()
  `));

  console.log(`Clicked setup scheme target: ${clickedLabel}`);
  await delay(350);
}

async function stubClipboardCapture(cdp, sessionId) {
  await evaluate(cdp, sessionId, `
    (() => {
      const clipboard = {
        writeText: async (text) => {
          window.__MFD_SMOKE_CLIPBOARD_TEXT = String(text);
          return undefined;
        },
      };

      try {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: clipboard,
        });
      } catch {
        Object.defineProperty(Navigator.prototype, 'clipboard', {
          configurable: true,
          get: () => clipboard,
        });
      }

      return true;
    })()
  `);
}

async function stubDownloadCapture(cdp, sessionId) {
  await evaluate(cdp, sessionId, `
    (() => {
      window.__MFD_SMOKE_DOWNLOAD_BLOB = null;
      window.__MFD_SMOKE_DOWNLOAD_NAME = '';
      window.__MFD_SMOKE_DOWNLOAD_TEXT = '';

      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: (blob) => {
          window.__MFD_SMOKE_DOWNLOAD_BLOB = blob;
          return 'blob:mfd-smoke-download';
        },
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: () => undefined,
      });
      Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
        configurable: true,
        value: function smokeAnchorClick() {
          window.__MFD_SMOKE_DOWNLOAD_NAME = this.download || '';
        },
      });

      return true;
    })()
  `);
}

async function runAdvanceWeekSmoke(cdp, sessionId, baseUrl) {
  const route = '/week-advance';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running week-advance workflow smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Advance Week Uses', 'week-advance source panel');

  const beforeText = await evaluate(cdp, sessionId, 'document.body?.innerText ?? ""');
  if (/Prepare Game Plan/i.test(beforeText)) {
    throw new Error('Week-advance smoke reached the game-plan gate instead of an advance button.');
  }

  const clickedLabel = await waitFor('clickable week-advance action button', () => evaluate(cdp, sessionId, `
    (() => {
      const candidates = [...document.querySelectorAll('button')]
        .filter((button) => !button.disabled)
        .map((button) => ({ button, text: (button.textContent ?? '').replace(/\\s+/g, ' ').trim() }))
        .filter(({ text }) => /Advance (To Week|Anyway|Playoffs|To Next Draft Pick)|Begin Regular Season|Open Free Agency|Resolve FA Round|Finalize Preseason/.test(text));
      const match = candidates[0];
      if (!match) return '';
      match.button.click();
      return match.text;
    })()
  `));

  console.log(`Clicked week-advance action: ${clickedLabel}`);
  const outcome = await waitFor('week-advance workflow result', () => evaluate(cdp, sessionId, `
    (() => {
      const body = document.body?.innerText ?? '';
      if (document.querySelector('[data-halftime-chip-host="true"]')) return 'halftime';
      if (body.includes('Post-Week Command Deck')
        || body.includes('Press Conference')
        || body.includes('Trade Deadline')
        || /(^|\\n)WEEK 15(\\n|$)/.test(body)
        || body.includes('WK 15')) return 'advanced';
      return '';
    })()
  `));

  if (outcome === 'halftime') {
    console.log('Resolving halftime decision with Stick for smoke determinism...');
    await clickButtonContaining(cdp, sessionId, 'Stick', 'clickable halftime Stick button');
    await waitFor('week-advance committed after halftime decision', () => evaluate(cdp, sessionId, `
      (() => {
        const body = document.body?.innerText ?? '';
        return !document.querySelector('[data-halftime-chip-host="true"]')
          && (body.includes('Post-Week Command Deck')
            || body.includes('Press Conference')
            || body.includes('Trade Deadline')
            || /(^|\\n)WEEK 15(\\n|$)/.test(body)
            || body.includes('WK 15'));
      })()
    `));
  }
}

async function runPostImportRouteCheck(cdp, sessionId, baseUrl, routeCheck, options = {}) {
  if (!routeCheck) return;

  const routeUrl = `${baseUrl}#${routeCheck.route}`;

  console.log(`Running post-import route smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, routeCheck.route);
  await waitForBodyText(cdp, sessionId, routeCheck.text, `post-import route text "${routeCheck.text}"`);
  await waitForBodyText(cdp, sessionId, 'Week 14', 'post-import route retained imported week 14 state');
  await waitFor(`non-empty root after post-import ${routeCheck.route} route navigation`, () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('#root > *'))
  `));

  if (options.hardReload) {
    console.log(`Hard-reloading post-import route at ${routeUrl}...`);
    const loadEvent = cdp.waitForEvent('Page.loadEventFired', () => true, sessionId);
    await cdp.send('Page.reload', { ignoreCache: true }, sessionId);
    await loadEvent;
    await waitForBodyText(cdp, sessionId, 'Continue Latest Autosave', 'launch-screen continue action after post-import hard reload');
    await clickButtonContaining(cdp, sessionId, 'Continue Latest Autosave', 'clickable Continue Latest Autosave button after post-import hard reload');
    await waitFor('post-import app shell after hard-reload continue', () => evaluate(cdp, sessionId, `
      Boolean(document.querySelector('[data-mfd-app-shell="true"]'))
    `));
    await setHashRoute(cdp, sessionId, routeCheck.route);
    await waitForBodyText(cdp, sessionId, routeCheck.text, `post-import hard-reload route text "${routeCheck.text}"`);
    await waitForBodyText(cdp, sessionId, 'Week 14', 'post-import hard reload retained imported week 14 state');
    await waitFor(`non-empty root after post-import ${routeCheck.route} hard reload`, () => evaluate(cdp, sessionId, `
      Boolean(document.querySelector('#root > *'))
    `));
  }
}

async function runCartridgeRoundTripSmoke(cdp, sessionId, baseUrl, postImportRouteCheck = null, postImportOptions = {}) {
  const route = '/dynasty';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running cartridge round-trip smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Portable Backup', 'dynasty portable backup panel');
  await waitForBodyText(cdp, sessionId, 'Week 14', 'export source week 14 state');

  await stubClipboardCapture(cdp, sessionId);
  await clickButtonContaining(cdp, sessionId, 'Advanced: Copy .mfd', 'clickable Advanced: Copy .mfd button');

  const capturedLength = await waitFor('captured cartridge export text', () => evaluate(cdp, sessionId, `
    typeof window.__MFD_SMOKE_CLIPBOARD_TEXT === 'string'
      ? window.__MFD_SMOKE_CLIPBOARD_TEXT.length
      : 0
  `));
  if (capturedLength < 100) {
    throw new Error(`Captured cartridge text was unexpectedly short: ${capturedLength} bytes.`);
  }

  const hasSavePayload = await evaluate(cdp, sessionId, `
    window.__MFD_SMOKE_CLIPBOARD_TEXT.includes('"save"')
  `);
  if (!hasSavePayload) {
    throw new Error('Captured cartridge text did not include a save payload.');
  }

  await runAdvanceWeekSmoke(cdp, sessionId, baseUrl);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Portable Backup', 'dynasty portable backup panel after advance');
  await waitForBodyText(cdp, sessionId, 'Week 15', 'pre-import week 15 state');

  await evaluate(cdp, sessionId, `
    (() => {
      const input = document.querySelector('#dynasty-backup-import');
      if (!input) throw new Error('Backup import textarea missing.');
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) throw new Error('Textarea value setter missing.');
      setter.call(input, window.__MFD_SMOKE_CLIPBOARD_TEXT);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `);
  await clickButtonContaining(cdp, sessionId, 'Import .mfd Only', 'clickable Import .mfd Only button');
  await waitForBodyText(cdp, sessionId, 'Imported dynasty loaded', 'import success status');
  await waitForBodyText(cdp, sessionId, 'Week 14', 'import restored exported week 14 state');
  await runPostImportRouteCheck(cdp, sessionId, baseUrl, postImportRouteCheck, postImportOptions);
}

async function runCartridgeFileRoundTripSmoke(cdp, sessionId, baseUrl, postImportRouteCheck = null, postImportOptions = {}) {
  const route = '/dynasty';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running cartridge file round-trip smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Portable Backup', 'dynasty portable backup panel');
  await waitForBodyText(cdp, sessionId, 'Week 14', 'download source week 14 state');

  await stubDownloadCapture(cdp, sessionId);
  await clickButtonContaining(cdp, sessionId, 'Advanced: Download .mfd', 'clickable Advanced: Download .mfd button');
  await waitForBodyText(cdp, sessionId, 'downloaded', 'download success status');

  const downloadLength = await waitFor('captured .mfd download blob', () => evaluate(cdp, sessionId, `
    window.__MFD_SMOKE_DOWNLOAD_BLOB instanceof Blob
      && typeof window.__MFD_SMOKE_DOWNLOAD_NAME === 'string'
      && window.__MFD_SMOKE_DOWNLOAD_NAME.endsWith('.mfd')
      ? window.__MFD_SMOKE_DOWNLOAD_BLOB.size
      : 0
  `));
  if (downloadLength < 100) {
    throw new Error(`Captured .mfd download was unexpectedly short: ${downloadLength} bytes.`);
  }

  await evaluate(cdp, sessionId, `
    (async () => {
      window.__MFD_SMOKE_DOWNLOAD_TEXT = await window.__MFD_SMOKE_DOWNLOAD_BLOB.text();
      return window.__MFD_SMOKE_DOWNLOAD_TEXT.length;
    })()
  `, true);

  const hasSavePayload = await evaluate(cdp, sessionId, `
    window.__MFD_SMOKE_DOWNLOAD_TEXT.includes('"save"')
  `);
  if (!hasSavePayload) {
    throw new Error('Captured .mfd download did not include a save payload.');
  }

  await runAdvanceWeekSmoke(cdp, sessionId, baseUrl);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Portable Backup', 'dynasty portable backup panel after advance');
  await waitForBodyText(cdp, sessionId, 'Week 15', 'pre-file-import week 15 state');

  await evaluate(cdp, sessionId, `
    (() => {
      const input = document.querySelector('input[type="file"][accept*=".mfd"]');
      if (!input) throw new Error('Backup file input missing.');
      const text = window.__MFD_SMOKE_DOWNLOAD_TEXT;
      const fileName = window.__MFD_SMOKE_DOWNLOAD_NAME || 'mfd-smoke.mfd';
      const transfer = new DataTransfer();
      transfer.items.add(new File([text], fileName, { type: 'application/json' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);
  await waitForBodyText(cdp, sessionId, 'Imported dynasty loaded', 'file import success status');
  await waitForBodyText(cdp, sessionId, 'Week 14', 'file import restored exported week 14 state');
  await runPostImportRouteCheck(cdp, sessionId, baseUrl, postImportRouteCheck, postImportOptions);
}

async function runLocalSaveSlotRoundTripSmoke(cdp, sessionId, baseUrl) {
  const route = '/dynasty';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running local save-slot round-trip smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Local Save Slots', 'dynasty local save slots panel');
  await waitForBodyText(cdp, sessionId, 'Week 14', 'manual save source week 14 state');

  await clickButtonContaining(cdp, sessionId, 'Create Save Slot', 'clickable Create Save Slot button');
  await waitForBodyText(cdp, sessionId, 'Manual save slot created', 'manual save success status');
  await waitFor('manual Week 14 save slot row', () => evaluate(cdp, sessionId, `
    [...document.querySelectorAll('tr')]
      .some((row) => /MANUAL/.test(row.innerText ?? '') && /W14/.test(row.innerText ?? ''))
  `));

  await runAdvanceWeekSmoke(cdp, sessionId, baseUrl);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Local Save Slots', 'dynasty local save slots panel after advance');
  await waitForBodyText(cdp, sessionId, 'Week 15', 'pre-load week 15 state');

  await waitFor('selectable manual Week 14 save slot row', () => evaluate(cdp, sessionId, `
    (() => {
      const row = [...document.querySelectorAll('tr')]
        .find((candidate) => /MANUAL/.test(candidate.innerText ?? '') && /W14/.test(candidate.innerText ?? ''));
      if (!row) return false;
      row.click();
      return true;
    })()
  `));
  await clickButtonContaining(cdp, sessionId, 'Load Selected', 'clickable Load Selected button');
  await clickButtonWithExactText(cdp, sessionId, 'Load', 'clickable confirm Load button');
  await waitForBodyText(cdp, sessionId, 'Save slot loaded', 'save slot load status');
  await waitForBodyText(cdp, sessionId, 'Week 14', 'manual save slot restored week 14 state');
}

async function fillTextareaValue(cdp, sessionId, selector, value, label) {
  await waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!(input instanceof HTMLTextAreaElement)) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (!setter) return false;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `));
}

async function runG6StateFeedbackSmoke(cdp, sessionId, baseUrl) {
  const loadingRoute = '/film-room';
  const loadingUrl = `${baseUrl}#${loadingRoute}`;
  const dynastyRoute = '/dynasty';
  const dynastyUrl = `${baseUrl}#${dynastyRoute}`;

  console.log(`Running G6 state-feedback smoke at ${loadingUrl} and ${dynastyUrl}...`);

  await cdp.send('Network.enable', {}, sessionId);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 1000,
    downloadThroughput: 2 * 1024,
    uploadThroughput: 2 * 1024,
  }, sessionId);
  await setHashRoute(cdp, sessionId, loadingRoute);
  await waitFor('accessible lazy-route loading state', () => evaluate(cdp, sessionId, `
    (() => {
      const loading = document.querySelector('[data-mfd-route-loading="true"][role="status"][aria-live="polite"][aria-busy="true"]');
      return Boolean(loading && (loading.innerText ?? '').toLowerCase().includes('loading film room'));
    })()
  `));
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: 50 * 1024 * 1024,
    uploadThroughput: 50 * 1024 * 1024,
  }, sessionId);

  await waitForBodyText(cdp, sessionId, 'This screen will populate once data is available.', 'Film Room empty-state subtitle');
  await waitForBodyText(cdp, sessionId, 'WHY: No postgame coaching report is available yet.', 'Film Room empty-state reason');
  await waitForBodyText(cdp, sessionId, 'NEXT STEP: Set your game plan, then advance a game week to generate film.', 'Film Room empty-state next step');
  await waitFor('accessible Film Room empty state', () => evaluate(cdp, sessionId, `
    (() => {
      const status = document.querySelector('[role="status"][aria-live="polite"]');
      return Boolean(status && (status.innerText ?? '').includes('WHY: No postgame coaching report is available yet.'));
    })()
  `));

  await setHashRoute(cdp, sessionId, dynastyRoute);
  await waitForBodyText(cdp, sessionId, 'Portable Backup', 'dynasty save/load route');
  await fillTextareaValue(
    cdp,
    sessionId,
    '#dynasty-backup-import',
    'not a valid mfd cartridge',
    'editable dynasty backup import textarea',
  );
  await clickButtonContaining(cdp, sessionId, 'Import .mfd Only', 'clickable Import .mfd Only button for invalid backup');
  await waitForBodyText(cdp, sessionId, 'That file does not look like a valid MFD save', 'invalid import error message');
  await waitForBodyText(cdp, sessionId, 'Your current dynasty was not changed', 'invalid import save-safe consequence');
  await waitFor('accessible dynasty import error alert', () => evaluate(cdp, sessionId, `
    (() => {
      const alert = document.querySelector('[role="alert"][aria-live="assertive"]');
      return Boolean(alert && (alert.innerText ?? '').includes('That file does not look like a valid MFD save'));
    })()
  `));

  await clickButtonContaining(cdp, sessionId, 'Create Save Slot', 'clickable Create Save Slot button for success status');
  await waitForBodyText(cdp, sessionId, 'Manual save slot created', 'manual save success status');
  await waitFor('accessible manual save success status', () => evaluate(cdp, sessionId, `
    [...document.querySelectorAll('[role="status"][aria-live="polite"]')]
      .some((status) => (status.innerText ?? '').includes('Manual save slot created'))
  `));
}

async function readFocusSummary(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (() => {
      const active = document.activeElement;
      const main = document.querySelector('[data-mfd-main-content="true"]');
      const rect = active instanceof HTMLElement ? active.getBoundingClientRect() : null;
      return JSON.stringify({
        href: window.location.href,
        activeTag: active?.tagName ?? null,
        activeText: active instanceof HTMLElement ? (active.innerText ?? active.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 120) : null,
        activeAriaLabel: active instanceof HTMLElement ? active.getAttribute('aria-label') : null,
        activeRole: active instanceof HTMLElement ? active.getAttribute('role') : null,
        activeDataNav: active instanceof HTMLElement ? active.getAttribute('data-nav') : null,
        activeTabIndex: active instanceof HTMLElement ? active.getAttribute('tabindex') : null,
        activeInsideMain: Boolean(active && main?.contains(active)),
        activeIsMain: active === main,
        width: rect?.width ?? null,
        height: rect?.height ?? null,
      });
    })()
  `);
}

async function waitForRouteMainFocus(cdp, sessionId, route) {
  try {
    await waitFor(`main content focus after ${route}`, () => evaluate(cdp, sessionId, `
      document.activeElement === document.querySelector('[data-mfd-main-content="true"][tabindex="-1"]')
    `));
  } catch (err) {
    const summary = await readFocusSummary(cdp, sessionId);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nFocus summary: ${summary}`);
  }
}

async function waitForInRouteTabFocus(cdp, sessionId, route) {
  try {
    await waitFor(`in-route keyboard focus after ${route}`, () => evaluate(cdp, sessionId, `
      (() => {
        const main = document.querySelector('[data-mfd-main-content="true"]');
        const active = document.activeElement;
        if (!(main instanceof HTMLElement) || !(active instanceof HTMLElement) || active === main || !main.contains(active)) {
          return false;
        }
        const focusable = active.matches('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"], [tabindex]:not([tabindex="-1"])');
        const rect = active.getBoundingClientRect();
        const style = getComputedStyle(active);
        return focusable
          && rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden';
      })()
    `));
  } catch (err) {
    const summary = await readFocusSummary(cdp, sessionId);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nFocus summary: ${summary}`);
  }
}

async function runG6FocusSweepSmoke(cdp, sessionId, baseUrl) {
  console.log(`Running G6 route focus sweep from ${baseUrl}...`);

  for (const routeCheck of g6FocusSweepRouteChecks) {
    const routeUrl = `${baseUrl}#${routeCheck.route}`;
    console.log(`Checking keyboard focus at ${routeUrl}...`);
    await setHashRoute(cdp, sessionId, routeCheck.route);
    await waitForBodyText(cdp, sessionId, routeCheck.text, `focus route text "${routeCheck.text}"`);
    await waitForRouteMainFocus(cdp, sessionId, routeCheck.route);
    await pressKey(cdp, sessionId, 'Tab');
    await waitForInRouteTabFocus(cdp, sessionId, routeCheck.route);
  }

  await setHashRoute(cdp, sessionId, '/roster');
  await waitForBodyText(cdp, sessionId, 'Roster Sources', 'focus sweep roster route before command deck');
  await waitForRouteMainFocus(cdp, sessionId, '/roster');
  await pressKey(cdp, sessionId, 'Tab', { shiftKey: true });
  await waitFor('keyboard focus on Cmd Deck button from main content', () => evaluate(cdp, sessionId, `
    (() => {
      const active = document.activeElement;
      return active instanceof HTMLButtonElement
        && (active.innerText ?? '').replace(/\\s+/g, ' ').trim().toLowerCase().includes('cmd deck');
    })()
  `));
  await pressKey(cdp, sessionId, 'Enter');
  const openedWithEnter = await waitFor('command palette opened by Enter', () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('[cmdk-root]'))
  `), 2000).then(() => true).catch(() => false);
  if (!openedWithEnter) {
    await pressKey(cdp, sessionId, 'Space');
  }
  await waitFor('keyboard-opened command palette with focused input', () => evaluate(cdp, sessionId, `
    (() => {
      const root = document.querySelector('[cmdk-root]');
      const input = document.querySelector('[cmdk-input]');
      return Boolean(root && input instanceof HTMLInputElement && document.activeElement === input);
    })()
  `));
}

async function readRouteVisualMetrics(cdp, sessionId) {
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
      const docWidth = Math.max(
        document.documentElement?.scrollWidth ?? 0,
        document.body?.scrollWidth ?? 0,
      );
      const bodyText = textOf(document.body);
      const mainText = textOf(main);
      const visibleMainSignals = main instanceof HTMLElement
        ? [...main.querySelectorAll('section, article, [role="status"], [role="alert"], h1, h2, h3, button, input, select, textarea, [data-spotlight-target], [data-testid], [class*="Panel"], [class*="Card"]')]
          .filter((node) => visible(node) && textOf(node).length >= 2)
          .slice(0, 8)
          .map((node) => ({
            tag: node.tagName,
            text: textOf(node).slice(0, 80),
            role: node.getAttribute('role'),
          }))
        : [];
      const visibleInteractive = main instanceof HTMLElement
        ? [...main.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"]')]
          .filter(visible)
          .slice(0, 8)
          .map((node) => ({
            tag: node.tagName,
            text: textOf(node).slice(0, 80),
            role: node.getAttribute('role'),
          }))
        : [];
      const tinyInteractive = main instanceof HTMLElement
        ? [...main.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"]')]
          .filter(visible)
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return { node, rect };
          })
          .filter(({ rect }) => rect.width < 24 || rect.height < 20)
          .slice(0, 6)
          .map(({ node, rect }) => ({
            tag: node.tagName,
            text: textOf(node).slice(0, 80),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }))
        : [];

      return {
        href: window.location.href,
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
        visibleMainSignals,
        visibleInteractive,
        tinyInteractive,
      };
    })()
  `);
}

function isRouteVisualHealthy(metrics) {
  if (!metrics || typeof metrics !== 'object') return false;
  const overflowTolerance = metrics.viewport?.width <= 500 ? 12 : 20;
  return metrics.mainExists
    && !metrics.blankRoot
    && !metrics.loadingFallbackVisible
    && !metrics.technicalTimeoutVisible
    && metrics.bodyTextLength >= 120
    && metrics.mainTextLength >= 80
    && metrics.mainRect
    && metrics.mainRect.width >= Math.min(320, Math.max(260, (metrics.viewport?.width ?? 320) - 32))
    && metrics.mainRect.height >= 120
    && metrics.pageOverflowX <= overflowTolerance
    && Array.isArray(metrics.visibleMainSignals)
    && metrics.visibleMainSignals.length > 0
    && Array.isArray(metrics.tinyInteractive)
    && metrics.tinyInteractive.length === 0;
}

async function waitForRouteVisualHealth(cdp, sessionId, routeCheck) {
  try {
    return await waitFor(`visual health for ${routeCheck.route}`, async () => {
      const metrics = await readRouteVisualMetrics(cdp, sessionId);
      return isRouteVisualHealthy(metrics) ? metrics : false;
    }, timeoutMs);
  } catch (err) {
    const metrics = await readRouteVisualMetrics(cdp, sessionId).catch((metricsErr) => ({
      ok: false,
      reason: metricsErr instanceof Error ? metricsErr.message : String(metricsErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nVisual metrics for ${routeCheck.route}:\n${JSON.stringify(metrics, null, 2)}`);
  }
}

async function runG6VisualSweepSmoke(cdp, sessionId, baseUrl) {
  console.log(`Running G6 visual/playability sweep across ${g6VisualSweepRouteChecks.length} routes from ${baseUrl}...`);

  const summary = {
    checkedRoutes: 0,
    minMainTextLength: Number.POSITIVE_INFINITY,
    minVisibleSignals: Number.POSITIVE_INFINITY,
    maxPageOverflowX: 0,
  };

  for (const routeCheck of g6VisualSweepRouteChecks) {
    const routeUrl = `${baseUrl}#${routeCheck.route}`;
    console.log(`Checking visual health at ${routeUrl}...`);
    await setHashRoute(cdp, sessionId, routeCheck.route);
    await waitForBodyText(cdp, sessionId, routeCheck.text, `visual route text "${routeCheck.text}"`);
    const metrics = await waitForRouteVisualHealth(cdp, sessionId, routeCheck);
    summary.checkedRoutes += 1;
    summary.minMainTextLength = Math.min(summary.minMainTextLength, metrics.mainTextLength);
    summary.minVisibleSignals = Math.min(summary.minVisibleSignals, metrics.visibleMainSignals.length);
    summary.maxPageOverflowX = Math.max(summary.maxPageOverflowX, metrics.pageOverflowX);
  }

  console.log(
    `G6 visual sweep covered ${summary.checkedRoutes} routes; `
      + `min main text ${summary.minMainTextLength}; `
      + `min visible signals ${summary.minVisibleSignals}; `
      + `max horizontal overflow ${summary.maxPageOverflowX}px.`,
  );
}

async function runNewDynastySetupEntrySmoke(cdp, sessionId, baseUrl) {
  console.log(`Running new-dynasty setup entry smoke at ${baseUrl}...`);
  await waitForBodyText(cdp, sessionId, 'Select Franchise', 'new-dynasty franchise selector');
  await waitForBodyText(cdp, sessionId, 'Full GM', 'new-dynasty full GM option');
  await clickButtonContaining(cdp, sessionId, 'Full GM', 'clickable Full GM onboarding option');
  await clickButtonContaining(cdp, sessionId, 'Start Full GM', 'clickable Start Full GM button');
  await waitForSetupShellAfterStartDynasty(cdp, sessionId);
  await waitForBodyText(cdp, sessionId, 'YOUR FIRST DAY', 'setup header copy');
  await waitForSetupHeaderText(
    cdp,
    sessionId,
    "Choose Chip's first setup priority: cap space, starter jobs, staff plan, or owner patience",
    'setup Assistant GM phase subtitle',
  );
  await waitForBodyText(cdp, sessionId, 'FIRST FRONT OFFICE CALL', 'setup cold-open copy');
  await waitForBodyText(cdp, sessionId, 'Choice Consequences', 'setup Chip consequences copy');
  await waitForBodyText(cdp, sessionId, 'Must Do: hire the Assistant GM. This sets my first setup priority: cap space, starter and backup roles, the Week 1 game plan, or owner patience.', 'setup Chip must-do hire instruction');
  await waitForBodyText(cdp, sessionId, 'choose the advisor promise that matches the biggest Week 1 danger', 'setup Chip advisor-consequence guidance');
  await waitForBodyText(cdp, sessionId, 'hire the Assistant GM whose promise matches the first Week 1 danger to track.', 'setup Chip next-decision danger');
  await waitForBodyText(cdp, sessionId, 'choose cap-first and I keep money warnings up front; starter jobs and the coach responsible for Week 1 still need fixing before kickoff.', 'setup Chip first-hire consequence');
  await assertBodyTextAbsent(cdp, sessionId, 'my first warnings skip', 'setup Chip first-hire avoids stale warning-order phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'Week 1 consequence I should track first', 'setup Chip avoids generic next-decision consequence phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'first Week 1 consequence to control', 'setup Chip avoids abstract first-consequence phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'bigger consequence', 'setup Chip avoids bigger-consequence phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'carry the bigger consequence', 'setup Chip avoids carry-the-bigger-consequence phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'coach play calls', 'setup Chip avoids coach-play-call shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'play-call owner', 'setup Chip avoids play-call-owner shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'Pick who watches cap', 'setup phase subtitle avoids vague watches-cap wording');
  await assertBodyTextAbsent(cdp, sessionId, 'right-hand man', 'setup Chip intro avoids soft right-hand-man copy');
  await assertBodyTextAbsent(cdp, sessionId, 'occasional advice', 'setup Chip intro avoids filler advice copy');
  await assertBodyTextAbsent(cdp, sessionId, 'owner read', 'setup Chip cold-open avoids owner-read jargon');
  await assertBodyTextAbsent(cdp, sessionId, 'opener context', 'setup Chip cold-open avoids opener-context jargon');
  await assertBodyTextAbsent(cdp, sessionId, 'first risk, and forecast', 'setup cold-open avoids vague first-risk forecast shorthand');
  await waitForSetupChipContextRowReachableByWheel(cdp, sessionId, 'where', 'setup cold-open Chip Where row reachable by wheel scroll');
  await waitForSetupChipContextRowVisibleAboveCommandBar(cdp, sessionId, 'where', 'setup cold-open Chip Where row visible above setup action bar');
  await waitForSetupChipContextRowPostScrollClearance(cdp, sessionId, 'where', 'setup Chip context row keeps post-row scroll clearance');
  await waitForSetupChipContextUsesReachableScroll(cdp, sessionId, 'setup cold-open Chip consequences use reachable scroll');
  await waitForSetupChipControlVisibleAboveCommandBar(cdp, sessionId, 'not now Chip!', 'setup cold-open Chip not-now control visible above setup action bar');
  await clickButtonSelectorWithMouse(
    cdp,
    sessionId,
    '[data-chip-host-controls="true"] button[data-mfd-button-accent="cyan"]',
    'setup Chip not-now dismissal',
  );
  await waitForBodyText(cdp, sessionId, 'Ask Chip', 'setup Ask Chip recovery handle');
  await assertBodyTextAbsent(cdp, sessionId, 'Choice Consequences', 'setup Chip rail hidden after not-now dismissal');
  await clickButtonContaining(cdp, sessionId, 'Ask Chip', 'setup Ask Chip restore');
  await waitForBodyText(cdp, sessionId, 'Choice Consequences', 'setup Chip consequences restored');
  await waitForBodyText(cdp, sessionId, 'choose cap-first and I keep money warnings up front; starter jobs and the coach responsible for Week 1 still need fixing before kickoff.', 'setup Chip restored first-hire consequence');
  await assertBodyTextAbsent(cdp, sessionId, 'my first warnings skip', 'restored setup Chip first-hire avoids stale warning-order phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'first Week 1 consequence to control', 'restored setup Chip avoids abstract first-consequence phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'bigger consequence', 'restored setup Chip avoids bigger-consequence phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'carry the bigger consequence', 'restored setup Chip avoids carry-the-bigger-consequence phrasing');
  await assertBodyTextAbsent(cdp, sessionId, 'coach play calls', 'restored setup Chip avoids coach-play-call shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'play-call owner', 'restored setup Chip avoids play-call-owner shorthand');
  await waitForBodyText(cdp, sessionId, 'choose the advisor promise that matches the biggest Week 1 danger', 'setup Chip restored advisor-consequence guidance');
  await waitForBodyText(cdp, sessionId, 'DECISION UP NEXT', 'setup next-decision copy');

  for (let index = 0; index < 6; index += 1) {
    const readyForAgm = await evaluate(cdp, sessionId, `
      (document.body?.innerText ?? '').includes('MAKE THIS YOUR AGM')
    `);
    if (readyForAgm) break;
    await clickSetupPrimaryAction(cdp, sessionId, `cold-open primary action ${index + 1}`);
  }

  await waitForBodyText(cdp, sessionId, 'MAKE THIS YOUR AGM', 'AGM hire command after cold open');
  await waitForSetupChipContextRowReadableBeforeScroll(cdp, sessionId, 'where', 'AGM chooser Chip Where row readable before narrow-tablet scroll');
  await waitForSetupChipContextRowReachableByWheel(cdp, sessionId, 'where', 'AGM chooser Chip Where row reachable by wheel scroll');
  await waitForSetupChipContextRowVisibleAboveCommandBar(cdp, sessionId, 'where', 'AGM chooser Chip Where row visible above setup action bar');
  await waitForSetupChipContextRowPostScrollClearance(cdp, sessionId, 'where', 'AGM chooser Chip context row keeps post-row scroll clearance');
  await waitForSetupChipContextUsesReachableScroll(cdp, sessionId, 'AGM chooser Chip consequences use reachable scroll');
  await waitForSetupChipControlVisibleAboveCommandBar(cdp, sessionId, 'not now Chip!', 'AGM chooser Chip not-now control visible above setup action bar');
  await waitForSetupAGMHireCommandReachableByWheel(cdp, sessionId, 'AGM chooser hire command reachable after Chip guidance');
  await waitForBodyText(cdp, sessionId, 'Candidate Spotlight', 'AGM candidate spotlight after cold open');
  await waitFor('plain AGM chooser danger and advisor labels', () => evaluate(cdp, sessionId, `
    (() => {
      const text = document.body?.innerText ?? '';
      const normalized = text.toLowerCase();
      return normalized.includes('first week 1 danger')
        && normalized.includes('cap space')
        && normalized.includes('defense calls')
        && normalized.includes('roster roles')
        && normalized.includes('recommended for this danger')
        && !/cap management|player whisperer|personnel|recommended for this crisis|recommended for this consequence|biggest week 1 consequence/i.test(text);
    })()
  `));
  await assertBodyTextAbsent(cdp, sessionId, 'Forecast Board', 'AGM chooser avoids old setup forecast rail');
  await assertBodyTextAbsent(cdp, sessionId, 'Setup Decision Impact', 'AGM chooser avoids setup decision rail');
  await assertBodyTextAbsent(cdp, sessionId, 'Week 1 Readiness', 'AGM chooser lets Chip summarize Week 1 danger');
  await assertBodyTextAbsent(cdp, sessionId, 'Scheme Cohesion', 'AGM chooser avoids scheme metric before scheme choice');
  await assertBodyTextAbsent(cdp, sessionId, 'Day 1 Decision Ledger', 'setup avoids ledger jargon on AGM chooser');
}

async function runNewDynastyFullSetupSmoke(cdp, sessionId, baseUrl) {
  console.log(`Running full new-dynasty setup completion smoke at ${baseUrl}...`);
  await waitForBodyText(cdp, sessionId, 'Select Franchise', 'new-dynasty franchise selector');
  await waitForBodyText(cdp, sessionId, 'Full GM', 'new-dynasty full GM option');
  await clickButtonContaining(cdp, sessionId, 'Full GM', 'clickable Full GM onboarding option');
  await clickButtonContaining(cdp, sessionId, 'Start Full GM', 'clickable Start Full GM button');
  await waitForSetupShellAfterStartDynasty(cdp, sessionId);

  for (let index = 0; index < 6; index += 1) {
    const readyForAgm = await evaluate(cdp, sessionId, `
      (document.body?.innerText ?? '').includes('MAKE THIS YOUR AGM')
    `);
    if (readyForAgm) break;
    await clickSetupPrimaryAction(cdp, sessionId, `cold-open primary action ${index + 1}`);
  }

  await waitForBodyText(cdp, sessionId, 'MAKE THIS YOUR AGM', 'AGM hire command after cold open');
  await clickSetupSpotlightTarget(cdp, sessionId, 'wizard.agm-hire.confirm', 'AGM hire spotlight command');
  await waitForBodyText(cdp, sessionId, 'SELECTED FOR SETUP', 'selected AGM confirmation');
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from AGM setup phase');

  await waitForSetupHeaderText(cdp, sessionId, 'FRANCHISE INTEL', 'franchise intel phase');
  await waitForSetupHeaderText(
    cdp,
    sessionId,
    'Open Intel for owner patience, injuries, cap space, and Week 1 matchup threats',
    'franchise intel phase subtitle',
  );
  await assertBodyTextAbsent(cdp, sessionId, 'Open owner, roster, cap', 'franchise intel avoids vague header shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'opener threats', 'franchise intel avoids vague opener-threat shorthand');
  await waitFor('plain franchise intel action labels', () => evaluate(cdp, sessionId, `
    (() => {
      const text = document.body?.innerText ?? '';
      return text.includes('OPEN TO CONTINUE')
        && /FIX BEFORE WEEK 1|WATCH BEFORE WEEK 1|ON TRACK FOR WEEK 1/.test(text)
        && !/High Alert|Watchlist|Open this Intel card to unlock Next/i.test(text);
    })()
  `));
  await clickSetupSpotlightTarget(cdp, sessionId, 'wizard.intel-briefing.confirm', 'required pressure-card drilldown');
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from franchise intel phase');

  await waitForSetupHeaderText(cdp, sessionId, 'MEET THE ROSTER', 'meet roster phase');
  await waitFor('meet roster setup consequence', () => evaluate(cdp, sessionId, `
    (() => {
      const text = document.body?.innerText ?? '';
      return [
        'Name roster roles and scheme calls before Week 1',
        'Fix unresolved roster, Week 1 game-plan, or cap choices before Week 1',
        'Fix unresolved roster, Week 1 game-plan, and cap choices before kickoff',
        'Preview every unresolved setup choice before the first month',
      ].some((copy) => text.includes(copy));
    })()
  `));
  await assertBodyTextAbsent(cdp, sessionId, 'thin backup', 'meet roster avoids thin-backup shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'thinnest starter', 'meet roster avoids thinnest-starter shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'cannot survive an injury', 'meet roster avoids survive-injury shorthand');
  await waitForSetupForecastLabels(cdp, sessionId);
  await waitForBodyText(cdp, sessionId, 'Setup Consequences', 'setup consequences panel title');
  await assertBodyTextAbsent(cdp, sessionId, 'Setup Forecast', 'setup consequences panel avoids forecast jargon');
  await waitFor('setup forecast concrete consequence copy', () => evaluate(cdp, sessionId, `
    (() => {
      const text = document.body?.innerText ?? '';
      return [
        'protection, coverage, or run-defense assignments',
        'blocked injury replacement',
        'opener depends on matching opponent pressure, coverage, and run-defense needs',
      ].some((copy) => text.includes(copy));
    })()
  `));
  await assertBodyTextAbsent(cdp, sessionId, 'wrong pairings cost the opener', 'setup forecast avoids pairing shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'wrong starter, call, or cap tradeoff', 'setup forecast avoids generic tradeoff shorthand');
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from meet roster phase');

  await waitForSetupHeaderText(cdp, sessionId, 'HIRE HEAD COACH', 'hire coach phase');
  await waitForBodyText(cdp, sessionId, 'Choose the coach whose scheme and teaching match current starters', 'coach phase assignment-fit instruction');
  await waitForBodyText(cdp, sessionId, 'coach-player gaps create Week 1 missed assignments', 'coach phase assignment consequence');
  await waitForBodyText(cdp, sessionId, 'Mistake Chance', 'plain candidate mistake-chance badge');
  await waitForBodyText(cdp, sessionId, 'WHAT CAN GO WRONG', 'plain candidate consequence warning label');
  await waitForBodyText(cdp, sessionId, 'HAS COST', 'plain candidate has-cost recommendation label');
  await waitForBodyText(cdp, sessionId, 'Fourth-down and clock rules assigned before Week 1', 'coach card concrete fourth-down consequence copy');
  await waitForBodyText(cdp, sessionId, 'Scouting tasks must stay secondary or Game Plan calls stay unset by Week 1', 'coach card concrete Week 1 call consequence copy');
  await assertBodyTextAbsent(cdp, sessionId, 'TRADEOFF', 'coach cards avoid abstract tradeoff badge');
  await assertBodyTextAbsent(cdp, sessionId, 'RISKS', 'coach cards avoid generic risks heading');
  await assertBodyTextAbsent(cdp, sessionId, 'Risk -', 'coach cards avoid generic risk badge');
  await assertBodyTextAbsent(cdp, sessionId, 'Risk +', 'coach cards avoid generic risk badge');
  await assertBodyTextAbsent(cdp, sessionId, 'hire the coach this roster can run right now', 'coach phase avoids can-run shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'Play calls current starters cannot run', 'coach phase avoids cannot-run shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'Scheme Cohesion', 'coach cards avoid scheme-cohesion label');
  await assertBodyTextAbsent(cdp, sessionId, 'WK1 ', 'coach cards avoid Week 1 abbreviation');
  await assertBodyTextAbsent(cdp, sessionId, 'VOL ', 'coach cards avoid volatility abbreviation');
  await assertBodyTextAbsent(cdp, sessionId, 'Situational discipline', 'coach cards avoid discipline shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'Fundamentals', 'coach cards avoid fundamentals shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'Fast practice tempo', 'coach cards avoid practice-tempo shorthand');
  await clickSetupSpotlightTarget(cdp, sessionId, 'wizard.coach-hire.confirm', 'coach hire spotlight command');
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from hire coach phase');

  await waitForSetupHeaderText(cdp, sessionId, 'HIRE SCOUTING DIRECTOR', 'hire scout phase');
  await waitForBodyText(cdp, sessionId, 'Wasted-pick warnings before draft day', 'scout card concrete wasted-pick consequence copy');
  await waitForBodyText(cdp, sessionId, 'Slow injury and testing reports leave medical limits unresolved before picks', 'scout card concrete medical-limit consequence copy');
  await assertBodyTextAbsent(cdp, sessionId, 'Process calibration', 'scout cards avoid process-calibration shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'Clear pick-risk discipline', 'scout cards avoid pick-risk discipline shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'Verified measurables', 'scout cards avoid measurables shorthand');
  await clickSetupSpotlightTarget(cdp, sessionId, 'wizard.scout-hire.confirm', 'scout hire spotlight command');
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from hire scout phase');

  await waitForSetupHeaderText(cdp, sessionId, 'PICK SCHEMES', 'scheme phase');
  await waitForBodyText(cdp, sessionId, 'Choose Week 1 calls that avoid unassigned starter jobs', 'scheme phase starter-protection instruction');
  await waitForBodyText(cdp, sessionId, 'late scheme changes create missed assignments before Week 1', 'scheme phase assignment consequence');
  await waitFor('plain scheme recommendation labels', () => evaluate(cdp, sessionId, `
    (() => {
      const text = document.body?.innerText ?? '';
      return text.includes('RECOMMENDED')
        && !/\\bREC\\b/.test(text);
    })()
  `));
  await assertBodyTextAbsent(cdp, sessionId, 'choose schemes the roster can run now', 'scheme phase avoids can-run shorthand');
  for (let index = 0; index < 4; index += 1) {
    const schemeState = await waitForSetupPrimaryOrSchemeTarget(cdp, sessionId);
    if (schemeState === 'primary') break;
    await clickCurrentSetupSchemeTarget(cdp, sessionId);
  }
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from scheme phase');

  await waitForSetupHeaderText(cdp, sessionId, 'STARTING LINEUP', 'depth chart phase');
  await clickSetupSpotlightTarget(cdp, sessionId, 'wizard.depth-chart.confirm', 'depth-chart philosophy spotlight command');
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from depth chart phase');

  await waitForSetupHeaderText(cdp, sessionId, 'CHOOSE CAP PLAN', 'cap strategy phase');
  await waitForSetupHeaderText(
    cdp,
    sessionId,
    'Choose restructures now or save injury, trade, and extension cap space',
    'cap strategy phase subtitle',
  );
  await assertBodyTextAbsent(cdp, sessionId, 'protect later fixes', 'cap strategy avoids vague later-fixes shorthand');
  await waitForSetupCapPlanChoices(cdp, sessionId);
  await waitForBodyText(cdp, sessionId, 'Create cap space with one controlled restructure', 'cap strategy restructure consequence');
  await waitForBodyText(cdp, sessionId, 'later injury, trade, and extension fixes stay open', 'cap strategy future cap consequence');
  await assertBodyTextAbsent(cdp, sessionId, 'reduce room for later fixes', 'cap strategy avoids room shorthand');
  await assertBodyTextAbsent(cdp, sessionId, 'losing later room', 'cap strategy avoids later-room shorthand');
  await clickSetupSpotlightTarget(cdp, sessionId, 'wizard.cap-strategy.confirm', 'cap strategy spotlight command');
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from cap strategy phase');

  await waitForSetupHeaderText(cdp, sessionId, 'SET OWNER GOALS', 'goals phase');
  await waitForSetupHeaderText(
    cdp,
    sessionId,
    'Choose goals ownership judges and rules that change morale after losses',
    'goals phase subtitle',
  );
  await assertBodyTextAbsent(cdp, sessionId, 'Pick owner promises and team rules', 'goals phase avoids vague promises-and-rules shorthand');
  await waitFor('plain owner goal recommendation and owner labels', () => evaluate(cdp, sessionId, `
    (() => {
      const text = document.body?.innerText ?? '';
      return /Patient Owner|Win-Now Owner|Cost-Control Owner/.test(text)
        && text.includes('RECOMMENDED')
        && text.includes('OWNER PRESSURE')
        && !/\\bREC\\b|\\bmoderate\\b|\\beasy\\b|\\bhard\\b|win_now|penny/i.test(text);
    })()
  `));
  for (let index = 0; index < 3; index += 1) {
    await clickSetupSpotlightTarget(cdp, sessionId, 'wizard.goals.confirm', `season goal spotlight command ${index + 1}`);
    await waitForBodyText(cdp, sessionId, `SELECT 3 SEASON GOALS (${index + 1}/3)`, `selected season goal count ${index + 1}`);
  }
  await waitForBodyText(cdp, sessionId, 'SELECT 3 SEASON GOALS (3/3)', 'three selected season goals');
  await clickSetupSpotlightTarget(cdp, sessionId, 'wizard.culture.confirm', 'team-rule spotlight command');
  await clickSetupPrimaryAction(cdp, sessionId, 'advance from goals phase');

  await waitForSetupHeaderText(cdp, sessionId, 'OPEN BLUEPRINT', 'blueprint phase');
  await waitForSetupHeaderText(
    cdp,
    sessionId,
    'Preview staff, scheme, lineup, cap space, and goals before Week 1 locks',
    'blueprint phase subtitle',
  );
  await assertBodyTextAbsent(cdp, sessionId, 'Verify locked choices before Week 1 starts', 'blueprint phase avoids locked-choices shorthand');
  await waitForBodyText(cdp, sessionId, 'Ready to start Week 1', 'blueprint week-one readiness copy');
  await clickSetupPrimaryAction(cdp, sessionId, 'start Week 1 from blueprint phase');

  try {
    await waitFor('playable Year 1 preseason Week 1 app shell after full setup', () => evaluate(cdp, sessionId, `
      (() => {
        const body = document.body?.innerText ?? '';
        const lowerBody = body.toLowerCase();
        return Boolean(document.querySelector('[data-mfd-app-shell="true"]'))
          && !document.querySelector('[data-mfd-setup-header="true"]')
          && lowerBody.includes('monday briefing')
          && lowerBody.includes('preseason')
          && lowerBody.includes('season 2026')
          && lowerBody.includes('action center reads phase, prep, starters')
          && lowerBody.includes('must do items stop or redirect advance week')
          && lowerBody.includes('recommendations explain what to fix or accept')
          && /(^|\\n|\\b)(Week|WEEK|WK)\\s*1(\\b|\\n)/.test(body);
      })()
    `));
  } catch (err) {
    const finalState = await evaluate(cdp, sessionId, `
      ({
        url: window.location.href,
        hasAppShell: Boolean(document.querySelector('[data-mfd-app-shell="true"]')),
        hasSetupShell: Boolean(document.querySelector('[data-mfd-setup-header="true"]')),
        bodyHead: document.body?.innerText?.slice(0, 2400) ?? '',
      })
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nFinal full-setup state:\n${JSON.stringify(finalState, null, 2)}`);
  }

  const markerState = await evaluate(cdp, sessionId, `
    ({
      firstTenCompleted: localStorage.getItem('mfd:first-ten-completed'),
      setupRunMode: localStorage.getItem('mfd:setup-run-mode'),
      hasSetupShell: Boolean(document.querySelector('[data-mfd-setup-header="true"]')),
      bodyHead: document.body?.innerText?.slice(0, 400) ?? '',
    })
  `);
  if (markerState?.firstTenCompleted !== 'true') {
    throw new Error(`Full setup completion marker was not persisted. Marker state: ${JSON.stringify(markerState)}`);
  }
  if (markerState?.setupRunMode !== null) {
    throw new Error(`Setup run mode was not cleared after completion. Marker state: ${JSON.stringify(markerState)}`);
  }
  if (markerState?.hasSetupShell) {
    throw new Error(`Setup shell still rendered after full setup completion. Marker state: ${JSON.stringify(markerState)}`);
  }
}

async function runContractRestructureSmoke(cdp, sessionId, baseUrl) {
  const route = '/contracts';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running contract restructure smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Contract Sources', 'contracts source panel');
  await waitForBodyText(cdp, sessionId, 'Contracts & Salary Cap', 'contracts route loaded');

  const selectedName = await waitFor('clear contract row to restructure', () => evaluate(cdp, sessionId, `
    (() => {
      const rows = [...document.querySelectorAll('[data-mfd-table-row="true"][data-mfd-row-clickable="true"]')];
      for (const row of rows) {
        const status = row.querySelector('[data-mfd-table-cell-id="restructured"]')?.innerText ?? '';
        const name = row.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
        if (!name || !/Clear/i.test(status) || /Restructured/i.test(status)) continue;
        row.click();
        return name;
      }
      return '';
    })()
  `));

  await waitForBodyText(cdp, sessionId, 'Actions', 'contract modal actions panel');
  await clickButtonWithExactText(cdp, sessionId, 'Restructure', 'clickable Restructure contract button');
  await waitFor('contract row marked restructured', () => evaluate(cdp, sessionId, `
    (() => {
      const selectedName = ${JSON.stringify(selectedName)};
      return [...document.querySelectorAll('[data-mfd-table-row="true"]')]
        .some((row) => {
          const name = row.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          const status = row.querySelector('[data-mfd-table-cell-id="restructured"]')?.innerText ?? '';
          return name === selectedName && /Restructured/i.test(status);
        });
    })()
  `));
  await waitForBodyText(cdp, sessionId, 'Cap Space', 'contracts cap space after restructure');
}

async function runContractBackloadSmoke(cdp, sessionId, baseUrl) {
  const route = '/contracts';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running contract backload smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Contract Sources', 'contracts source panel');
  await waitForBodyText(cdp, sessionId, 'Contracts & Salary Cap', 'contracts route loaded');

  const candidateCount = await waitFor('contract rows to backload', () => evaluate(cdp, sessionId, `
    [...document.querySelectorAll('[data-mfd-table-row="true"][data-mfd-row-clickable="true"]')]
      .filter((row) => {
        const status = row.querySelector('[data-mfd-table-cell-id="restructured"]')?.innerText ?? '';
        const capHit = row.querySelector('[data-mfd-table-cell-id="capHit"]')?.innerText ?? '';
        return /Clear/i.test(status) && !/Restructured|Holdout|Tagged/i.test(status) && /\\$/.test(capHit);
      }).length
  `));

  let selectedName = '';
  let beforeCapHit = '';
  let afterCapHit = '';

  for (let index = 0; index < candidateCount; index += 1) {
    const candidate = await evaluate(cdp, sessionId, `
      (() => {
        const rows = [...document.querySelectorAll('[data-mfd-table-row="true"][data-mfd-row-clickable="true"]')]
          .filter((row) => {
            const status = row.querySelector('[data-mfd-table-cell-id="restructured"]')?.innerText ?? '';
            const capHit = row.querySelector('[data-mfd-table-cell-id="capHit"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
            return /Clear/i.test(status) && !/Restructured|Holdout|Tagged/i.test(status) && /\\$/.test(capHit);
          });
        const row = rows[${index}];
        if (!row) return null;
        const name = row.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
        const capHit = row.querySelector('[data-mfd-table-cell-id="capHit"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
        if (!name || !capHit) return null;
        row.click();
        return { name, capHit };
      })()
    `);

    if (!candidate?.name || !candidate.capHit) continue;
    await waitForBodyText(cdp, sessionId, 'Actions', 'contract modal actions panel');
    await clickButtonWithExactText(cdp, sessionId, 'Add Void Years', 'clickable Add Void Years contract button');
    await delay(300);

    const nextCapHit = await evaluate(cdp, sessionId, `
      (() => {
        const selectedName = ${JSON.stringify(candidate.name)};
        const row = [...document.querySelectorAll('[data-mfd-table-row="true"]')]
          .find((candidateRow) => {
            const name = candidateRow.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
            return name === selectedName;
          });
        return row?.querySelector('[data-mfd-table-cell-id="capHit"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
      })()
    `);

    if (nextCapHit && nextCapHit !== candidate.capHit) {
      selectedName = candidate.name;
      beforeCapHit = candidate.capHit;
      afterCapHit = nextCapHit;
      break;
    }
  }

  if (!selectedName) {
    throw new Error('Could not find a clear contract row whose cap hit changed after Add Void Years.');
  }

  console.log(`Backloaded ${selectedName}: ${beforeCapHit} -> ${afterCapHit}`);
  await waitForBodyText(cdp, sessionId, 'Cap Space', 'contracts cap space after backload');
}

async function selectClearContractCandidate(cdp, sessionId, purpose) {
  const candidate = await waitFor(`clear contract row to ${purpose}`, () => evaluate(cdp, sessionId, `
    (() => {
      const rows = [...document.querySelectorAll('[data-mfd-table-row="true"][data-mfd-row-clickable="true"]')]
        .map((row) => ({
          row,
          name: row.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
          status: row.querySelector('[data-mfd-table-cell-id="restructured"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
          capHit: row.querySelector('[data-mfd-table-cell-id="capHit"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
        }));
      const nameCounts = new Map();
      for (const entry of rows) {
        if (!entry.name) continue;
        nameCounts.set(entry.name, (nameCounts.get(entry.name) ?? 0) + 1);
      }
      const match = rows.find((entry) => (
        entry.name
        && nameCounts.get(entry.name) === 1
        && /Clear/i.test(entry.status)
        && !/Restructured|Holdout|Tagged/i.test(entry.status)
        && /\\$/.test(entry.capHit)
      ));
      if (!match) return null;
      match.row.click();
      return {
        name: match.name,
        capHit: match.capHit,
        status: match.status,
      };
    })()
  `));

  if (!candidate?.name) {
    throw new Error(`Could not find a unique clear contract row to ${purpose}.`);
  }
  return candidate;
}

async function selectContractNegotiationCandidate(cdp, sessionId, purpose, options = {}) {
  const candidate = await waitFor(`${purpose} contract row`, () => evaluate(cdp, sessionId, `
    (() => {
      const minYears = ${JSON.stringify(options.minYears ?? null)};
      const maxYears = ${JSON.stringify(options.maxYears ?? null)};
      const rows = [...document.querySelectorAll('[data-mfd-table-row="true"][data-mfd-row-clickable="true"]')]
        .map((row) => {
          const yearsText = row.querySelector('[data-mfd-table-cell-id="years"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          return {
            row,
            name: row.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
            status: row.querySelector('[data-mfd-table-cell-id="restructured"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
            capHit: row.querySelector('[data-mfd-table-cell-id="capHit"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
            yearsText,
            years: Number((yearsText.match(/\\d+/) ?? [''])[0]),
          };
        });
      const nameCounts = new Map();
      for (const entry of rows) {
        if (!entry.name) continue;
        nameCounts.set(entry.name, (nameCounts.get(entry.name) ?? 0) + 1);
      }
      const match = rows.find((entry) => (
        entry.name
        && nameCounts.get(entry.name) === 1
        && Number.isFinite(entry.years)
        && (minYears === null || entry.years >= minYears)
        && (maxYears === null || entry.years <= maxYears)
        && /Clear/i.test(entry.status)
        && !/Restructured|Holdout|Tagged/i.test(entry.status)
        && /\\$/.test(entry.capHit)
      ));
      if (!match) return null;
      match.row.click();
      return {
        name: match.name,
        capHit: match.capHit,
        years: match.years,
        yearsText: match.yearsText,
        status: match.status,
      };
    })()
  `));

  if (!candidate?.name || !Number.isFinite(candidate.years)) {
    throw new Error(`Could not find a unique ${purpose} contract row.`);
  }
  return candidate;
}

async function waitForContractRowAbsent(cdp, sessionId, playerName, label) {
  await waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const playerName = ${JSON.stringify(playerName)};
      return ![...document.querySelectorAll('[data-mfd-table-row="true"]')]
        .some((row) => {
          const name = row.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          return name === playerName;
        });
    })()
  `));
}

async function waitForContractRowStatus(cdp, sessionId, playerName, pattern, label) {
  await waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const playerName = ${JSON.stringify(playerName)};
      const pattern = new RegExp(${JSON.stringify(pattern)}, 'i');
      return [...document.querySelectorAll('[data-mfd-table-row="true"]')]
        .some((row) => {
          const name = row.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          const status = row.querySelector('[data-mfd-table-cell-id="restructured"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          return name === playerName && pattern.test(status);
        });
    })()
  `));
}

async function waitForContractRowYears(cdp, sessionId, playerName, years, label) {
  await waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const playerName = ${JSON.stringify(playerName)};
      const years = ${JSON.stringify(years)};
      return [...document.querySelectorAll('[data-mfd-table-row="true"]')]
        .some((row) => {
          const name = row.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          const yearsText = row.querySelector('[data-mfd-table-cell-id="years"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          return name === playerName && yearsText.includes(String(years));
        });
    })()
  `));
}

async function selectCapLabCandidate(cdp, sessionId, index, purpose) {
  const candidate = await waitFor(`cap lab candidate row to ${purpose}`, () => evaluate(cdp, sessionId, `
    (() => {
      const rowIndex = ${JSON.stringify(index)};
      const rows = [...document.querySelectorAll('[data-mfd-table-row="true"][data-mfd-row-clickable="true"]')]
        .map((row) => {
          const playerNameCell = row.querySelector('[data-mfd-table-cell-id="playerName"]');
          const playerNameLines = (playerNameCell?.innerText ?? '').split(/\\n+/).map((line) => line.replace(/\\s+/g, ' ').trim()).filter(Boolean);
          return {
            row,
            name: playerNameLines[0] ?? '',
            pos: playerNameLines[1] ?? '',
            capHit: row.querySelector('[data-mfd-table-cell-id="capHit"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
          };
        })
        .filter((entry) => entry.name && /\\$/.test(entry.capHit));
      const match = rows[rowIndex] ?? null;
      if (!match) return null;
      match.row.click();
      return {
        name: match.name,
        pos: match.pos,
        capHit: match.capHit,
      };
    })()
  `));

  if (!candidate?.name) {
    throw new Error(`Could not find a cap lab candidate row to ${purpose}.`);
  }
  return candidate;
}

async function setCapLabMoveType(cdp, sessionId, moveType) {
  await waitFor(`set cap lab move type ${moveType}`, () => evaluate(cdp, sessionId, `
    (() => {
      const value = ${JSON.stringify(moveType)};
      const select = [...document.querySelectorAll('select')]
        .find((candidate) => [...candidate.options].some((option) => option.value === value));
      if (!select) return false;
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `));
}

async function waitForQueuedCapLabMoves(cdp, sessionId, expectedCount) {
  await waitFor(`${expectedCount} queued cap lab moves`, () => evaluate(cdp, sessionId, `
    (() => {
      return [...document.querySelectorAll('button')]
        .filter((button) => (button.textContent ?? '').replace(/\\s+/g, ' ').trim().toLowerCase() === 'remove')
        .length === ${JSON.stringify(expectedCount)};
    })()
  `));
}

function latestAutosaveCutStateExpression(playerName, expectedPostJune, playerId = null) {
  return `
    (async () => {
      const playerName = ${JSON.stringify(playerName)};
      const expectedPostJune = ${JSON.stringify(expectedPostJune)};
      const expectedPlayerId = ${JSON.stringify(playerId)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });

      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();

      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        return {
          ok: false,
          reason: 'no latest autosave data',
          autosaveSlots: saves.filter((slot) => slot?.isAutosave).map((slot) => ({
            id: slot.id ?? null,
            timestamp: slot.timestamp ?? null,
            year: slot.year ?? null,
            week: slot.week ?? null,
          })),
        };
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return {
          ok: false,
          reason: 'latest autosave data is not valid JSON',
          latestSlot: {
            id: latest.id ?? null,
            timestamp: latest.timestamp ?? null,
            year: latest.year ?? null,
            week: latest.week ?? null,
          },
        };
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      if (!userTeam) {
        return {
          ok: false,
          reason: 'latest autosave has no user team',
          latestSlot: {
            id: latest.id ?? null,
            timestamp: latest.timestamp ?? null,
            year: latest.year ?? null,
            week: latest.week ?? null,
          },
        };
      }

      const matchesExpectedPlayer = (candidatePlayerId) => {
        if (!candidatePlayerId) return false;
        if (expectedPlayerId) return candidatePlayerId === expectedPlayerId;
        return players?.[candidatePlayerId]?.name === playerName;
      };
      const rosterHasPlayer = (userTeam.roster ?? [])
        .some((player) => (expectedPlayerId ? player?.id === expectedPlayerId : player?.name === playerName) && player?.contract);
      const rosterMatches = (userTeam.roster ?? [])
        .filter((player) => (expectedPlayerId ? player?.id === expectedPlayerId : player?.name === playerName))
        .map((player) => ({
          id: player.id ?? null,
          name: player.name ?? '',
          teamId: player.teamId ?? null,
          hasContract: Boolean(player.contract),
        }));
      const matchingWaivers = (save?.waiverWire ?? [])
        .filter((entry) => matchesExpectedPlayer(entry?.playerId))
        .map((entry) => ({
          playerId: entry?.playerId ?? null,
          playerName: players?.[entry?.playerId]?.name ?? '',
          releasedByTeamId: entry?.releasedByTeamId ?? null,
          playerTeamId: players?.[entry?.playerId]?.teamId ?? null,
          playerHasContract: Boolean(players?.[entry?.playerId]?.contract),
        }));
      const matchingCutLogs = (userTeam.txLog ?? [])
        .filter((entry) => entry?.type === 'CUT' && matchesExpectedPlayer(entry?.playerId))
        .map((entry) => ({
          playerId: entry?.playerId ?? null,
          playerName: players?.[entry?.playerId]?.name ?? '',
          notes: entry?.notes ?? '',
          year: entry?.year ?? null,
          week: entry?.week ?? null,
        }));
      const hasReleasedPlayer = matchingWaivers.some((entry) => {
        return entry.playerTeamId === null && !entry.playerHasContract;
      });
      const hasExpectedLog = matchingCutLogs.some((entry) => (
        expectedPostJune ? /Post-June 1/i.test(entry?.notes ?? '') : true
      ));

      return {
        ok: !rosterHasPlayer && hasReleasedPlayer && hasExpectedLog,
        reason: !rosterHasPlayer && hasReleasedPlayer && hasExpectedLog
          ? 'cut persisted'
          : 'latest autosave does not match cut expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        expectedPlayerId,
        rosterHasPlayer,
        rosterMatches,
        matchingWaivers,
        matchingCutLogs,
        hasReleasedPlayer,
        hasExpectedLog,
      };
    })()
  `;
}

function latestAutosaveRosterPlayerIdExpression(playerName) {
  return `
    (async () => {
      const playerName = ${JSON.stringify(playerName)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return null;
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return null;
      }
      const userTeam = Object.values(envelope?.save?.teams ?? {}).find((team) => team?.isUser);
      const matches = (userTeam?.roster ?? [])
        .filter((player) => player?.name === playerName && player?.id)
        .map((player) => player.id);
      return matches.length === 1 ? matches[0] : null;
    })()
  `;
}

async function resolveLatestAutosaveRosterPlayerId(cdp, sessionId, playerName) {
  return evaluate(cdp, sessionId, latestAutosaveRosterPlayerIdExpression(playerName), true);
}

async function readLatestAutosaveCutState(cdp, sessionId, playerName, expectedPostJune, playerId = null) {
  return evaluate(cdp, sessionId, latestAutosaveCutStateExpression(playerName, expectedPostJune, playerId), true);
}

async function waitForLatestAutosaveCut(cdp, sessionId, playerName, expectedPostJune, playerId = null) {
  try {
    return await waitFor(`${playerName} cut persisted to latest autosave`, async () => {
      const state = await readLatestAutosaveCutState(cdp, sessionId, playerName, expectedPostJune, playerId);
      return state?.ok ? state : false;
    });
  } catch (err) {
    const state = await readLatestAutosaveCutState(cdp, sessionId, playerName, expectedPostJune, playerId).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave cut state:\n${JSON.stringify(state, null, 2)}`);
  }
}

function latestAutosaveExtensionStateExpression(playerId) {
  return `
    (async () => {
      const playerId = ${JSON.stringify(playerId)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const player = save?.players?.[playerId] ?? null;
      const userTeam = Object.values(save?.teams ?? {}).find((team) => team?.isUser);
      const rosterPlayer = (userTeam?.roster ?? []).find((entry) => entry?.id === playerId) ?? null;
      const extension = (save?.contractExtensions ?? [])
        .find((entry) => entry?.playerId === playerId && entry?.teamId === userTeam?.id) ?? null;
      const playerYears = player?.contract?.years ?? null;
      const rosterYears = rosterPlayer?.contract?.years ?? null;
      const offerYears = extension?.offer?.newYears ?? null;
      const ok = Boolean(
        player
        && userTeam
        && rosterPlayer
        && player.teamId === userTeam.id
        && player.contract
        && rosterPlayer.contract
        && extension?.status === 'accepted'
        && playerYears === offerYears
        && rosterYears === offerYears
      );
      return {
        ok,
        reason: ok ? 'extension persisted' : 'latest autosave does not match extension expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        playerId,
        playerName: player?.name ?? '',
        playerYears,
        rosterYears,
        extensionStatus: extension?.status ?? null,
        offerYears,
        offerAvgSalary: extension?.offer?.newAvgSalary ?? null,
      };
    })()
  `;
}

function latestAutosaveFranchiseTagStateExpression(playerId) {
  return `
    (async () => {
      const playerId = ${JSON.stringify(playerId)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const player = save?.players?.[playerId] ?? null;
      const userTeam = Object.values(save?.teams ?? {}).find((team) => team?.isUser);
      const rosterPlayer = (userTeam?.roster ?? []).find((entry) => entry?.id === playerId) ?? null;
      const teamTags = userTeam?.franchiseTags ?? (userTeam?.franchiseTag973 ? [userTeam.franchiseTag973] : []);
      const teamTag = teamTags.find((entry) => entry?.playerId === playerId) ?? null;
      const playerTag = player?.contract?.franchiseTag ?? null;
      const rosterTag = rosterPlayer?.contract?.franchiseTag ?? null;
      const ok = Boolean(
        player
        && userTeam
        && rosterPlayer
        && player.teamId === userTeam.id
        && player.contract
        && rosterPlayer.contract
        && playerTag
        && rosterTag === playerTag
        && teamTag
      );
      return {
        ok,
        reason: ok ? 'franchise tag persisted' : 'latest autosave does not match franchise tag expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        playerId,
        playerName: player?.name ?? '',
        playerTag,
        rosterTag,
        teamTag: teamTag ? {
          playerId: teamTag.playerId ?? null,
          playerName: teamTag.playerName ?? '',
          salary: teamTag.salary ?? null,
          year: teamTag.year ?? null,
          reaction: teamTag.reaction ?? null,
        } : null,
        tagCount: teamTags.length,
      };
    })()
  `;
}

function latestAutosaveCapLabBatchStateExpression(restructurePlayerId, backloadPlayerId) {
  return `
    (async () => {
      const restructurePlayerId = ${JSON.stringify(restructurePlayerId)};
      const backloadPlayerId = ${JSON.stringify(backloadPlayerId)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const players = save?.players ?? {};
      const userTeam = Object.values(save?.teams ?? {}).find((team) => team?.isUser);
      if (!userTeam) {
        return { ok: false, reason: 'latest autosave has no user team', slotId: latest.id ?? null };
      }
      const rosterRestructurePlayer = (userTeam.roster ?? []).find((entry) => entry?.id === restructurePlayerId) ?? null;
      const rosterBackloadPlayer = (userTeam.roster ?? []).find((entry) => entry?.id === backloadPlayerId) ?? null;
      const mapRestructurePlayer = players?.[restructurePlayerId] ?? null;
      const mapBackloadPlayer = players?.[backloadPlayerId] ?? null;
      const restructureContract = rosterRestructurePlayer?.contract ?? mapRestructurePlayer?.contract ?? null;
      const backloadContract = rosterBackloadPlayer?.contract ?? mapBackloadPlayer?.contract ?? null;
      const backloadSlices = Array.isArray(backloadContract?.slices) ? backloadContract.slices : [];
      const restructureOk = Boolean(
        rosterRestructurePlayer
        && mapRestructurePlayer
        && rosterRestructurePlayer.contract?.restructured === true
        && mapRestructurePlayer.contract?.restructured === true
      );
      const backloadOk = Boolean(
        rosterBackloadPlayer
        && mapBackloadPlayer
        && (rosterBackloadPlayer.contract?.voidYears ?? 0) >= 1
        && (mapBackloadPlayer.contract?.voidYears ?? 0) >= 1
        && backloadSlices.some((slice) => slice?.sourceOp === 'backload')
      );
      const socialPosts = (save?.socialFeed ?? [])
        .filter((post) => /cap space/i.test(post?.content ?? ''))
        .slice(0, 8)
        .map((post) => ({
          content: post?.content ?? '',
          trigger: post?.trigger ?? null,
        }));
      const restructureName = mapRestructurePlayer?.name ?? rosterRestructurePlayer?.name ?? '';
      const backloadName = mapBackloadPlayer?.name ?? rosterBackloadPlayer?.name ?? '';
      const hasRestructurePost = socialPosts.some((post) => (
        post.content.includes(restructureName) && /restructure/i.test(post.content)
      ));
      const hasBackloadPost = socialPosts.some((post) => (
        post.content.includes(backloadName) && /backload/i.test(post.content)
      ));
      const ok = Boolean(
        restructurePlayerId
        && backloadPlayerId
        && restructurePlayerId !== backloadPlayerId
        && restructureOk
        && backloadOk
        && hasRestructurePost
        && hasBackloadPost
      );
      return {
        ok,
        reason: ok ? 'cap lab batch persisted' : 'latest autosave does not match cap lab batch expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        restructurePlayerId,
        restructurePlayerName: restructureName,
        restructureContract: restructureContract ? {
          restructured: restructureContract.restructured ?? null,
          voidYears: restructureContract.voidYears ?? null,
          years: restructureContract.years ?? null,
        } : null,
        backloadPlayerId,
        backloadPlayerName: backloadName,
        backloadContract: backloadContract ? {
          restructured: backloadContract.restructured ?? null,
          voidYears: backloadContract.voidYears ?? null,
          years: backloadContract.years ?? null,
          backloadSlices: backloadSlices.filter((slice) => slice?.sourceOp === 'backload').length,
        } : null,
        restructureOk,
        backloadOk,
        hasRestructurePost,
        hasBackloadPost,
        socialPosts,
        capSpace: userTeam.capSpace ?? null,
        capUsed: userTeam.capUsed ?? null,
      };
    })()
  `;
}

async function readLatestAutosaveExtensionState(cdp, sessionId, playerId) {
  return evaluate(cdp, sessionId, latestAutosaveExtensionStateExpression(playerId), true);
}

async function waitForLatestAutosaveExtension(cdp, sessionId, playerId) {
  try {
    return await waitFor(`${playerId} extension persisted to latest autosave`, async () => {
      const state = await readLatestAutosaveExtensionState(cdp, sessionId, playerId);
      return state?.ok ? state : false;
    });
  } catch (err) {
    const state = await readLatestAutosaveExtensionState(cdp, sessionId, playerId).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave extension state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function readLatestAutosaveFranchiseTagState(cdp, sessionId, playerId) {
  return evaluate(cdp, sessionId, latestAutosaveFranchiseTagStateExpression(playerId), true);
}

async function waitForLatestAutosaveFranchiseTag(cdp, sessionId, playerId) {
  try {
    return await waitFor(`${playerId} franchise tag persisted to latest autosave`, async () => {
      const state = await readLatestAutosaveFranchiseTagState(cdp, sessionId, playerId);
      return state?.ok ? state : false;
    });
  } catch (err) {
    const state = await readLatestAutosaveFranchiseTagState(cdp, sessionId, playerId).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave franchise tag state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function readLatestAutosaveCapLabBatchState(cdp, sessionId, restructurePlayerId, backloadPlayerId) {
  return evaluate(cdp, sessionId, latestAutosaveCapLabBatchStateExpression(restructurePlayerId, backloadPlayerId), true);
}

async function waitForLatestAutosaveCapLabBatch(cdp, sessionId, restructurePlayerId, backloadPlayerId) {
  try {
    return await waitFor(`cap lab batch persisted to latest autosave`, async () => {
      const state = await readLatestAutosaveCapLabBatchState(cdp, sessionId, restructurePlayerId, backloadPlayerId);
      return state?.ok ? state : false;
    });
  } catch (err) {
    const state = await readLatestAutosaveCapLabBatchState(cdp, sessionId, restructurePlayerId, backloadPlayerId).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave cap lab batch state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function stageTradeCounterBlockFixture(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (async () => {
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const writeSave = (db, slot) => new Promise((resolveWrite, rejectWrite) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(slot);
        request.onsuccess = () => resolveWrite();
        request.onerror = () => rejectWrite(request.error ?? new Error('Could not write mfd save slot.'));
      });

      const db = await openDb();
      const saves = await readSaves(db);
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        if (typeof db.close === 'function') db.close();
        throw new Error('No latest autosave data available to stage the trade smoke fixture.');
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        if (typeof db.close === 'function') db.close();
        throw new Error('Latest autosave data was not valid JSON.');
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      const partnerTeam = Object.values(teams)
        .filter((team) => team && !team.isUser && Array.isArray(team.roster))
        .sort((left, right) => {
          const leftRebuild = left.gmStrategy === 'rebuild' ? 0 : 1;
          const rightRebuild = right.gmStrategy === 'rebuild' ? 0 : 1;
          return leftRebuild - rightRebuild || String(left.id).localeCompare(String(right.id));
        })[0];

      if (!userTeam || !partnerTeam) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find user and partner teams for the trade smoke fixture.');
      }

      const blockPlayer = (userTeam.roster ?? []).find((player) => player?.pos !== 'QB') ?? userTeam.roster?.[0];
      const targetPlayer = (partnerTeam.roster ?? []).find((player) => player?.pos === 'WR')
        ?? partnerTeam.roster?.find((player) => player?.pos !== 'QB')
        ?? partnerTeam.roster?.[0];

      if (!blockPlayer?.id || !targetPlayer?.id) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find player fixtures for the trade smoke.');
      }

      save.week = 1;
      save.phase = 'regular_season';
      save.tradeDeadlineState = undefined;
      save.activeProposals = [];
      save.offseasonState = null;
      save.nearMissTracker = { declinedTrades: [], passedPicks: [], missedFAs: [] };
      save.year = Number(save.year) || latest.year || 2026;

      for (const player of userTeam.roster ?? []) {
        player.tradeBlock = false;
        if (players[player.id]) players[player.id].tradeBlock = false;
      }

      blockPlayer.tradeBlock = false;
      if (players[blockPlayer.id]) players[blockPlayer.id].tradeBlock = false;

      partnerTeam.gmStrategy = 'rebuild';
      partnerTeam.philosophy = 'rebuild';
      targetPlayer.ovr = 86;
      targetPlayer.age = 28;
      targetPlayer.devTrait = 'normal';
      targetPlayer.tradeBlock = true;
      targetPlayer.teamId = partnerTeam.id;
      if (players[targetPlayer.id]) {
        players[targetPlayer.id] = { ...players[targetPlayer.id], ...targetPlayer };
      } else {
        players[targetPlayer.id] = targetPlayer;
      }

      userTeam.draftPicks = [
        {
          round: 2,
          pick: 20,
          originalTeamId: userTeam.id,
          currentTeamId: userTeam.id,
          year: save.year,
          isCompPick: false,
        },
        {
          round: 3,
          pick: 12,
          originalTeamId: userTeam.id,
          currentTeamId: userTeam.id,
          year: save.year,
          isCompPick: false,
        },
      ];

      latest.data = JSON.stringify(envelope);
      latest.year = save.year;
      latest.week = save.week;
      latest.timestamp = Date.now();
      await writeSave(db, latest);
      if (typeof db.close === 'function') db.close();

      return {
        year: save.year,
        week: save.week,
        userTeamId: userTeam.id,
        partnerTeamId: partnerTeam.id,
        partnerTeamName: [partnerTeam.city, partnerTeam.name].filter(Boolean).join(' '),
        blockPlayerId: blockPlayer.id,
        blockPlayerName: blockPlayer.name,
        targetPlayerId: targetPlayer.id,
        targetPlayerName: targetPlayer.name,
        offerPickDescription: 'Round 3 pick',
        expectedCounterPickDescription: 'Round 2 pick',
      };
    })()
  `, true);
}

async function deleteSmokeSaveSlot(cdp, sessionId, slotId, label) {
  const deleted = await evaluate(cdp, sessionId, `
    (async () => {
      const slotId = ${JSON.stringify(slotId)};
      if (!Number.isInteger(slotId) || slotId < 1) return false;
      const db = await new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      await new Promise((resolveDelete, rejectDelete) => {
        const tx = db.transaction('saves', 'readwrite');
        tx.oncomplete = () => resolveDelete();
        tx.onerror = () => rejectDelete(tx.error ?? new Error('Could not delete temporary smoke save slot.'));
        tx.objectStore('saves').delete(slotId);
      });
      if (typeof db.close === 'function') db.close();
      return true;
    })()
  `, true);
  if (!deleted) {
    throw new Error(`Could not delete temporary smoke save slot ${slotId} after ${label}.`);
  }
}

function latestAutosaveTradeCounterBlockStateExpression(fixture) {
  return `
    (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = teams?.[fixture.userTeamId] ?? Object.values(teams).find((team) => team?.isUser);
      const partnerTeam = teams?.[fixture.partnerTeamId] ?? null;
      const userRosterPlayer = (userTeam?.roster ?? []).find((player) => player?.id === fixture.blockPlayerId) ?? null;
      const mapBlockPlayer = players?.[fixture.blockPlayerId] ?? null;
      const partnerRosterPlayer = (partnerTeam?.roster ?? []).find((player) => player?.id === fixture.targetPlayerId) ?? null;
      const mapTargetPlayer = players?.[fixture.targetPlayerId] ?? null;
      const proposal = (save?.activeProposals ?? [])
        .find((entry) => (entry?.requesting ?? []).some((asset) => asset?.playerId === fixture.targetPlayerId)) ?? null;
      const counterOffer = proposal?.counterOffer ?? null;
      const declinedTrades = save?.nearMissTracker?.declinedTrades ?? [];
      const matchingDeclinedTrade = declinedTrades.find((entry) => entry?.playerName === fixture.targetPlayerName) ?? null;
      const userPickStillOwned = (userTeam?.draftPicks ?? []).some((pick) => (
        pick?.round === 3
        && pick?.pick === 12
        && pick?.year === fixture.year
        && pick?.currentTeamId === fixture.userTeamId
      ));
      const targetStillPartnerOwned = Boolean(
        partnerRosterPlayer
        && mapTargetPlayer
        && mapTargetPlayer.teamId === fixture.partnerTeamId
      );
      const blockOk = Boolean(userRosterPlayer?.tradeBlock === true && mapBlockPlayer?.tradeBlock === true);
      const proposalOk = Boolean(
        proposal?.status === 'rejected'
        && proposal?.aiResponse === 'Counter declined.'
        && counterOffer
        && (counterOffer.offering ?? []).some((asset) => asset?.description === fixture.expectedCounterPickDescription)
        && (proposal.requesting ?? []).some((asset) => asset?.playerId === fixture.targetPlayerId)
      );
      const nearMissOk = Boolean(matchingDeclinedTrade && declinedTrades.length === 1);
      const ok = Boolean(blockOk && proposalOk && nearMissOk && userPickStillOwned && targetStillPartnerOwned);
      return {
        ok,
        reason: ok ? 'trade counter/block workflow persisted' : 'latest autosave does not match trade counter/block expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        blockPlayerId: fixture.blockPlayerId,
        blockPlayerName: fixture.blockPlayerName,
        userRosterTradeBlock: userRosterPlayer?.tradeBlock ?? null,
        mapTradeBlock: mapBlockPlayer?.tradeBlock ?? null,
        partnerTeamId: fixture.partnerTeamId,
        targetPlayerId: fixture.targetPlayerId,
        targetPlayerName: fixture.targetPlayerName,
        targetStillPartnerOwned,
        userPickStillOwned,
        proposal: proposal ? {
          id: proposal.id ?? null,
          status: proposal.status ?? null,
          aiResponse: proposal.aiResponse ?? null,
          offering: (proposal.offering ?? []).map((asset) => asset?.description ?? ''),
          requesting: (proposal.requesting ?? []).map((asset) => asset?.description ?? ''),
          counterOffering: (counterOffer?.offering ?? []).map((asset) => asset?.description ?? ''),
          counterRequesting: (counterOffer?.requesting ?? []).map((asset) => asset?.description ?? ''),
        } : null,
        nearMissDeclinedTrade: matchingDeclinedTrade,
        declinedTrades,
        declinedTradeCount: declinedTrades.length,
        blockOk,
        proposalOk,
        nearMissOk,
      };
    })()
  `;
}

async function readLatestAutosaveTradeCounterBlockState(cdp, sessionId, fixture) {
  return evaluate(cdp, sessionId, latestAutosaveTradeCounterBlockStateExpression(fixture), true);
}

async function waitForLatestAutosaveTradeCounterBlock(cdp, sessionId, fixture) {
  try {
    return await waitFor(`trade counter/block workflow persisted to latest autosave`, async () => {
      const state = await readLatestAutosaveTradeCounterBlockState(cdp, sessionId, fixture);
      return state?.ok ? state : false;
    });
  } catch (err) {
    const state = await readLatestAutosaveTradeCounterBlockState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave trade counter/block state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function stageWaiverPracticeSquadFixture(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (async () => {
      const displayName = (player) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || player?.id || '';
      };
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const writeSave = (db, slot) => new Promise((resolveWrite, rejectWrite) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(slot);
        request.onsuccess = () => resolveWrite();
        request.onerror = () => rejectWrite(request.error ?? new Error('Could not write mfd save slot.'));
      });

      const db = await openDb();
      const saves = await readSaves(db);
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        if (typeof db.close === 'function') db.close();
        throw new Error('No latest autosave data available to stage the waiver/practice-squad smoke fixture.');
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        if (typeof db.close === 'function') db.close();
        throw new Error('Latest autosave data was not valid JSON.');
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      const sourceTeams = Object.values(teams)
        .filter((team) => team && !team.isUser && Array.isArray(team.roster) && team.roster.length >= 2)
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));

      if (!userTeam || sourceTeams.length === 0) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find user and source teams for the waiver/practice-squad smoke fixture.');
      }

      const candidatePool = sourceTeams
        .flatMap((team) => (team.roster ?? []).map((player) => ({ team, player })))
        .filter(({ player }) => player?.id && player.pos !== 'QB');
      const waiverCandidate = candidatePool.find(({ player }) => player.pos === 'WR') ?? candidatePool[0];
      const practiceCandidate = candidatePool.find(({ player }) => player.id !== waiverCandidate?.player?.id && ['RB', 'CB', 'WR', 'LB'].includes(player.pos))
        ?? candidatePool.find(({ player }) => player.id !== waiverCandidate?.player?.id);

      if (!waiverCandidate?.player?.id || !practiceCandidate?.player?.id) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find player fixtures for the waiver/practice-squad smoke.');
      }

      const removeFromTeam = (team, playerId) => {
        team.roster = (team.roster ?? []).filter((player) => player?.id !== playerId);
        team.practiceSquad = (team.practiceSquad ?? []).filter((entry) => entry?.playerId !== playerId);
      };

      save.phase = 'regular_season';
      save.week = Number(save.week) || latest.week || 14;
      save.year = Number(save.year) || latest.year || 2026;
      save.tradeDeadlineState = undefined;
      save.offseasonState = null;
      save.settings = {
        ...(save.settings ?? {}),
        halftimeDecisions: 'off',
      };
      save.postGameUi = {
        ...(save.postGameUi ?? {}),
        pendingHalftimeDecision: null,
      };
      save.waiverClaims = [];
      save.waiverResults = [];
      save.waiverWire = [];
      userTeam.practiceSquad = [];
      userTeam.wins = 0;
      userTeam.losses = Math.max(Number(userTeam.losses) || 0, 13);
      userTeam.ties = 0;
      userTeam.seasonStats ??= {};
      userTeam.seasonStats.pointDifferential = -500;
      for (const team of Object.values(teams)) {
        team.practiceSquad ??= [];
        team.txLog ??= [];
        if (!team.isUser) {
          team.wins = Math.max(Number(team.wins) || 0, 1);
          team.seasonStats ??= {};
          team.seasonStats.pointDifferential = Math.max(Number(team.seasonStats.pointDifferential) || 0, -50);
        }
      }
      const waiverPlayer = waiverCandidate.player;
      const practicePlayer = practiceCandidate.player;
      const rosterFillerIds = new Set();
      const buildUserContract = (player) => {
        const sourceContract = player?.contract ?? players[player.id]?.contract ?? null;
        if (sourceContract) {
          return {
            ...sourceContract,
            playerId: player.id,
            teamId: userTeam.id,
          };
        }
        return {
          playerId: player.id,
          teamId: userTeam.id,
          years: 1,
          totalValue: 1,
          yearlyBreakdown: [{
            year: save.year,
            baseSalary: 1,
            capHit: 1,
            deadCap: 0,
            guaranteed: false,
          }],
          baseSalary: 1,
          guaranteed: 0,
          signingBonus: 0,
          prorated: 0,
          voidYears: 0,
          franchiseTag: null,
          incentives: [],
        };
      };
      const existingUserRosterIds = new Set((userTeam.roster ?? []).map((player) => player?.id).filter(Boolean));
      const fillerCandidates = candidatePool
        .filter(({ player }) => (
          player.id !== waiverPlayer.id
          && player.id !== practicePlayer.id
          && !existingUserRosterIds.has(player.id)
        ));
      for (const { team, player } of fillerCandidates) {
        if ((userTeam.roster ?? []).length >= 22) break;
        removeFromTeam(team, player.id);
        const stagedFiller = {
          ...(players[player.id] ?? {}),
          ...player,
          teamId: userTeam.id,
          contract: buildUserContract(player),
        };
        userTeam.roster ??= [];
        userTeam.roster.push(stagedFiller);
        players[player.id] = stagedFiller;
        rosterFillerIds.add(player.id);
      }
      if ((userTeam.roster ?? []).length < 22) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not borrow enough roster fillers to stage a valid week-advance fixture.');
      }
      for (const [index, player] of (userTeam.roster ?? []).entries()) {
        player.isStarter = index < 22;
        if (players[player.id]) {
          players[player.id].isStarter = player.isStarter;
        }
      }
      removeFromTeam(waiverCandidate.team, waiverPlayer.id);
      removeFromTeam(practiceCandidate.team, practicePlayer.id);

      const stagedWaiverPlayer = {
        ...(players[waiverPlayer.id] ?? {}),
        ...waiverPlayer,
        teamId: null,
        contract: null,
      };
      const stagedPracticePlayer = {
        ...(players[practicePlayer.id] ?? {}),
        ...practicePlayer,
        teamId: null,
        contract: null,
      };
      players[waiverPlayer.id] = stagedWaiverPlayer;
      players[practicePlayer.id] = stagedPracticePlayer;

      save.freeAgents = [
        ...new Set([
          ...(save.freeAgents ?? []).filter((id) => id !== waiverPlayer.id && id !== practicePlayer.id && !rosterFillerIds.has(id)),
          practicePlayer.id,
        ]),
      ];
      save.waiverWire.push({
        playerId: waiverPlayer.id,
        releasedByTeamId: waiverCandidate.team.id,
        createdYear: save.year,
        createdWeek: save.week,
        expiresYear: save.year,
        expiresWeek: save.week + 1,
      });
      save.waiverOrder = [
        userTeam.id,
        ...Object.values(teams).map((team) => team.id).filter((id) => id !== userTeam.id),
      ];

      latest.data = JSON.stringify(envelope);
      latest.year = save.year;
      latest.week = save.week;
      latest.timestamp = Date.now();
      await writeSave(db, latest);
      if (typeof db.close === 'function') db.close();

      return {
        year: save.year,
        week: save.week,
        userTeamId: userTeam.id,
        userTeamName: [userTeam.city, userTeam.name].filter(Boolean).join(' '),
        waiverPlayerId: waiverPlayer.id,
        waiverPlayerName: displayName(stagedWaiverPlayer),
        waiverReleasedByTeamId: waiverCandidate.team.id,
        waiverReleasedByTeamName: [waiverCandidate.team.city, waiverCandidate.team.name].filter(Boolean).join(' '),
        practicePlayerId: practicePlayer.id,
        practicePlayerName: displayName(stagedPracticePlayer),
        practiceSourceTeamId: practiceCandidate.team.id,
      };
    })()
  `, true);
}

function latestAutosaveWaiverPracticeSquadStateExpression(fixture) {
  return `
    (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const displayName = (player, fallback) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || fallback;
      };
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = teams?.[fixture.userTeamId] ?? Object.values(teams).find((team) => team?.isUser);
      const waiverPlayer = players?.[fixture.waiverPlayerId] ?? null;
      const practicePlayer = players?.[fixture.practicePlayerId] ?? null;
      const practiceEntry = (userTeam?.practiceSquad ?? []).find((entry) => entry?.playerId === fixture.practicePlayerId) ?? null;
      const userRosterWaiverPlayer = (userTeam?.roster ?? []).find((player) => player?.id === fixture.waiverPlayerId) ?? null;
      const userRosterPracticePlayer = (userTeam?.roster ?? []).find((player) => player?.id === fixture.practicePlayerId) ?? null;
      const waiverClaimPending = (save?.waiverClaims ?? []).some((claim) => claim?.teamId === fixture.userTeamId && claim?.playerId === fixture.waiverPlayerId);
      const waiverOnWire = (save?.waiverWire ?? []).some((entry) => entry?.playerId === fixture.waiverPlayerId);
      const waiverResultEntry = (save?.waiverResults ?? [])
        .flatMap((batch) => batch?.entries ?? [])
        .find((entry) => entry?.playerId === fixture.waiverPlayerId) ?? null;
      const waiverResolvedToUser = Boolean(
        userRosterWaiverPlayer
        && waiverPlayer?.teamId === fixture.userTeamId
        && waiverPlayer?.contract?.teamId === fixture.userTeamId
        && !waiverOnWire
        && !waiverClaimPending
        && waiverResultEntry?.winningTeamId === fixture.userTeamId
        && waiverResultEntry?.clearedToFreeAgency === false
      );
      const practiceAdded = Boolean(
        practiceEntry
        && !practiceEntry.isElevated
        && practiceEntry.elevationsUsed === 0
        && practicePlayer?.teamId === fixture.userTeamId
        && !(save?.freeAgents ?? []).includes(fixture.practicePlayerId)
        && !userRosterPracticePlayer
      );
      const practiceElevated = Boolean(
        practiceEntry
        && practiceEntry.isElevated === true
        && practiceEntry.elevationsUsed >= 1
        && practicePlayer?.teamId === fixture.userTeamId
        && userRosterPracticePlayer
      );
      const practiceReleased = Boolean(
        !practiceEntry
        && !userRosterPracticePlayer
        && (save?.freeAgents ?? []).includes(fixture.practicePlayerId)
        && practicePlayer?.teamId === null
      );
      // Week advance may immediately sign a released player to a CPU club as
      // deterministic roster-health repair. The release still survived when
      // the player is absent from the user's PS and active roster and is not
      // assigned back to the user team.
      const practiceReleaseSurvived = Boolean(
        !practiceEntry
        && !userRosterPracticePlayer
        && practicePlayer?.teamId !== fixture.userTeamId
      );
      const waiverClaimIntent = Boolean(
        waiverClaimPending
        && waiverOnWire
        && !userRosterWaiverPlayer
        && waiverPlayer?.teamId === null
      );
      return {
        ok: Boolean(waiverClaimIntent || waiverResolvedToUser || practiceAdded || practiceElevated || practiceReleased),
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        userTeamId: fixture.userTeamId,
        waiverPlayerId: fixture.waiverPlayerId,
        waiverPlayerName: displayName(waiverPlayer, fixture.waiverPlayerId),
        waiverClaimIntent,
        waiverClaimPending,
        waiverOnWire,
        waiverResolvedToUser,
        waiverResultEntry,
        practicePlayerId: fixture.practicePlayerId,
        practicePlayerName: displayName(practicePlayer, fixture.practicePlayerId),
        practiceAdded,
        practiceElevated,
        practiceReleased,
        practiceReleaseSurvived,
        practiceEntry,
        practiceInFreeAgents: (save?.freeAgents ?? []).includes(fixture.practicePlayerId),
        practiceTeamId: practicePlayer?.teamId ?? null,
        practiceInRoster: Boolean(userRosterPracticePlayer),
      };
    })()
  `;
}

async function readLatestAutosaveWaiverPracticeSquadState(cdp, sessionId, fixture) {
  return evaluate(cdp, sessionId, latestAutosaveWaiverPracticeSquadStateExpression(fixture), true);
}

async function waitForLatestAutosaveWaiverPracticeSquad(cdp, sessionId, fixture, expectation, label, ms = timeoutMs) {
  try {
    return await waitFor(label, async () => {
      const state = await readLatestAutosaveWaiverPracticeSquadState(cdp, sessionId, fixture);
      return state?.[expectation] ? state : false;
    }, ms);
  } catch (err) {
    const state = await readLatestAutosaveWaiverPracticeSquadState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave waiver/practice-squad state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function advanceWeekForWaiverResolution(cdp, sessionId, baseUrl, fixture) {
  const route = '/week-advance';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Advancing week for waiver resolution at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Advance Week Uses', 'week-advance source panel for waiver resolution');

  const beforeText = await evaluate(cdp, sessionId, 'document.body?.innerText ?? ""');
  if (/Prepare Game Plan/i.test(beforeText)) {
    throw new Error('Waiver resolution smoke reached the game-plan gate instead of an advance button.');
  }

  await evaluate(cdp, sessionId, `
    (() => {
      window.__MFD_SMOKE_WEEK_ADVANCE_DEBUG = [];
      const record = (entry) => {
        window.__MFD_SMOKE_WEEK_ADVANCE_DEBUG.push({
          ...entry,
          at: Date.now(),
        });
      };
      window.addEventListener('error', (event) => {
        record({
          type: 'error',
          message: event.message ?? '',
          filename: event.filename ?? '',
          lineno: event.lineno ?? null,
          colno: event.colno ?? null,
          error: event.error?.stack ?? event.error?.message ?? String(event.error ?? ''),
        });
      }, { once: true });
      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        record({
          type: 'unhandledrejection',
          message: reason?.message ?? String(reason ?? ''),
          error: reason?.stack ?? String(reason ?? ''),
        });
      }, { once: true });
      const button = document.querySelector('[data-mfd-week-advance-action="true"]');
      if (button) {
        button.addEventListener('click', () => {
          record({
            type: 'click',
            text: (button.textContent ?? '').replace(/\\s+/g, ' ').trim(),
          });
        }, { capture: true });
      }
      return true;
    })()
  `);

  const clickedLabel = await clickButtonSelectorWithMouse(
    cdp,
    sessionId,
    '[data-mfd-week-advance-action="true"]',
    'clickable week-advance action button for waiver resolution',
  );
  console.log(`Clicked week-advance action: ${clickedLabel}`);
  await delay(500);
  const clickStartedAdvance = await evaluate(cdp, sessionId, `
    (() => {
      const body = document.body?.innerText ?? '';
      const button = document.querySelector('[data-mfd-week-advance-action="true"]');
      return body.includes('SIMULATING') || Boolean(button?.disabled);
    })()
  `);
  if (!clickStartedAdvance) {
    const fallbackLabel = await evaluate(cdp, sessionId, `
      (() => {
        const button = document.querySelector('[data-mfd-week-advance-action="true"]');
        if (!(button instanceof HTMLButtonElement) || button.disabled) return '';
        button.click();
        return (button.textContent ?? '').replace(/\\s+/g, ' ').trim();
      })()
    `);
    console.log(`Fell back to DOM click for week-advance action: ${fallbackLabel || 'unavailable'}`);
  }

  let firstOutcome;
  try {
    firstOutcome = await waitFor('waiver resolution or halftime decision gate', async () => {
      const state = await readLatestAutosaveWaiverPracticeSquadState(cdp, sessionId, fixture);
      if (state?.waiverResolvedToUser) return 'resolved';
      const halftime = await evaluate(cdp, sessionId, `
        Boolean(document.querySelector('[data-halftime-chip-host="true"]'))
      `);
      return halftime ? 'halftime' : '';
    }, 90_000);
  } catch (err) {
    const state = await readLatestAutosaveWaiverPracticeSquadState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    const bodyText = await evaluate(cdp, sessionId, '(document.body?.innerText ?? "").slice(0, 4000)').catch((bodyErr) => (
      bodyErr instanceof Error ? bodyErr.message : String(bodyErr)
    ));
    const advanceDebug = await evaluate(cdp, sessionId, 'window.__MFD_SMOKE_WEEK_ADVANCE_DEBUG ?? []').catch((debugErr) => (
      debugErr instanceof Error ? debugErr.message : String(debugErr)
    ));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave waiver/practice-squad state after advance click:\n${JSON.stringify(state, null, 2)}\nWeek-advance action debug:\n${JSON.stringify(advanceDebug, null, 2)}\nWeek-advance body excerpt:\n${bodyText}`);
  }

  if (firstOutcome === 'halftime') {
    console.log('Resolving halftime decision with Stick for waiver resolution smoke...');
    await clickButtonContaining(cdp, sessionId, 'Stick', 'clickable halftime Stick button for waiver resolution');
    await waitForLatestAutosaveWaiverPracticeSquad(
      cdp,
      sessionId,
      fixture,
      'waiverResolvedToUser',
      'waiver claim resolution persisted after halftime decision',
      90_000,
    );
  }
}

async function hardReloadAndContinueAutosave(cdp, sessionId, route, label, routeTexts = ['Contract Sources', 'Contracts & Salary Cap']) {
  console.log(`Hard-reloading after ${label} and continuing latest autosave...`);
  const loadEvent = cdp.waitForEvent('Page.loadEventFired', () => true, sessionId);
  await cdp.send('Page.reload', { ignoreCache: true }, sessionId);
  await loadEvent;
  await waitForBodyText(cdp, sessionId, 'Continue Latest Autosave', `${label} continue action after hard reload`);
  await clickButtonContaining(cdp, sessionId, 'Continue Latest Autosave', `${label} clickable Continue Latest Autosave button`);
  await waitFor(`${label} app shell after hard reload continue`, () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('[data-mfd-app-shell="true"]'))
  `));
  await setHashRoute(cdp, sessionId, route);
  for (const routeText of routeTexts) {
    await waitForBodyText(cdp, sessionId, routeText, `${label} route text "${routeText}" after hard reload`);
  }
  await waitFor(`non-empty root after ${label} hard reload`, () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('#root > *'))
  `));
}

async function hardReloadAndLoadLatestAutosave(cdp, sessionId, route, label, routeTexts = ['Contract Sources', 'Contracts & Salary Cap']) {
  console.log(`Hard-reloading after ${label} and loading the latest autosave...`);
  const loadEvent = cdp.waitForEvent('Page.loadEventFired', () => true, sessionId);
  await cdp.send('Page.reload', { ignoreCache: true }, sessionId);
  await loadEvent;

  const continued = await waitFor(`${label} clickable Continue Latest Autosave button`, () => evaluate(cdp, sessionId, `
    (() => {
      const button = [...document.querySelectorAll('button')]
        .find((candidate) => !candidate.disabled && (candidate.textContent ?? '').includes('Continue Latest Autosave'));
      if (!button) return false;
      button.click();
      return true;
    })()
  `), 6_000).then(() => true).catch(() => false);

  if (!continued) {
    console.log(`Continue Latest Autosave was unavailable after ${label}; importing the latest autosave cartridge through the launch screen...`);
    await waitForBodyText(cdp, sessionId, 'Import Backup Code', `${label} launch import controls after hard reload`);
    const importedLength = await waitFor(`${label} latest autosave cartridge staged in launch import textarea`, () => evaluate(cdp, sessionId, `
      (async () => {
        const openDb = () => new Promise((resolveOpen, rejectOpen) => {
          const request = indexedDB.open('mfd');
          request.onsuccess = () => resolveOpen(request.result);
          request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
        });
        const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
          const tx = db.transaction('saves', 'readonly');
          const store = tx.objectStore('saves');
          const request = store.getAll();
          request.onsuccess = () => resolveRead(request.result ?? []);
          request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
        });
        const db = await openDb();
        const saves = await readSaves(db);
        if (typeof db.close === 'function') db.close();
        const latest = saves
          .filter((slot) => slot?.isAutosave)
          .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
        const input = document.querySelector('#dynasty-import-text');
        if (!(input instanceof HTMLTextAreaElement) || !latest?.data) return 0;
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        if (!setter) throw new Error('Textarea value setter missing.');
        setter.call(input, latest.data);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return latest.data.length;
      })()
    `, true));
    if (importedLength < 100) {
      throw new Error(`Latest autosave cartridge was unexpectedly short after ${label}: ${importedLength} bytes.`);
    }
    await clickButtonWithExactText(cdp, sessionId, 'Import Backup Code', `${label} clickable Import Backup Code button`);
  }

  try {
    await waitFor(`${label} app shell after hard reload load`, () => evaluate(cdp, sessionId, `
      Boolean(document.querySelector('[data-mfd-app-shell="true"]'))
    `));
  } catch (err) {
    const expandedError = await evaluate(cdp, sessionId, `
      (() => {
        const button = [...document.querySelectorAll('button')]
          .find((candidate) => (candidate.textContent ?? '').includes('Show Error'));
        if (button instanceof HTMLButtonElement && !button.disabled) {
          button.click();
        }
        return document.body?.innerText?.slice(0, 5000) ?? '';
      })()
    `).catch((expandErr) => (expandErr instanceof Error ? expandErr.message : String(expandErr)));
    const debugState = await evaluate(cdp, sessionId, `
      (() => ({
        url: window.location.href,
        hasAppShell: Boolean(document.querySelector('[data-mfd-app-shell="true"]')),
        importTextareaLength: document.querySelector('#dynasty-import-text')?.value?.length ?? null,
        buttons: [...document.querySelectorAll('button')]
          .map((button) => ({
            text: (button.textContent ?? '').replace(/\\s+/g, ' ').trim(),
            disabled: Boolean(button.disabled),
          }))
          .slice(0, 20),
        bodyHead: document.body?.innerText?.slice(0, 2600) ?? '',
      }))()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\n${label} hard reload load state:\n${JSON.stringify(debugState, null, 2)}\n${label} expanded error text:\n${expandedError}`);
  }
  await setHashRoute(cdp, sessionId, route);
  for (const routeText of routeTexts) {
    await waitForBodyText(cdp, sessionId, routeText, `${label} route text "${routeText}" after hard reload load`);
  }
  await waitFor(`non-empty root after ${label} hard reload load`, () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('#root > *'))
  `));
}

async function runContractCutsSmoke(cdp, sessionId, baseUrl) {
  const route = '/contracts';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running contract cuts smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Contract Sources', 'contracts source panel');
  await waitForBodyText(cdp, sessionId, 'Contracts & Salary Cap', 'contracts route loaded');

  const standardCut = await selectClearContractCandidate(cdp, sessionId, 'standard-cut');
  await waitForBodyText(cdp, sessionId, 'Actions', 'standard-cut contract modal actions panel');
  await clickButtonWithExactText(cdp, sessionId, 'Cut Player', 'clickable Cut Player contract button');
  await waitForContractRowAbsent(cdp, sessionId, standardCut.name, 'standard-cut removed from active contracts table');
  const standardSave = await waitForLatestAutosaveCut(cdp, sessionId, standardCut.name, false);
  console.log(`Standard cut ${standardCut.name} (${standardCut.capHit}); latest autosave slot ${standardSave.slotId ?? 'n/a'}.`);
  await hardReloadAndContinueAutosave(cdp, sessionId, route, 'standard-cut');
  await waitForContractRowAbsent(cdp, sessionId, standardCut.name, 'standard-cut absent after autosave hard reload');

  const postJuneCut = await selectClearContractCandidate(cdp, sessionId, 'Post-June-1 cut');
  const postJunePlayerId = await resolveLatestAutosaveRosterPlayerId(cdp, sessionId, postJuneCut.name);
  if (!postJunePlayerId) {
    throw new Error(`Could not resolve ${postJuneCut.name} to a unique latest-autosave roster player before Post-June-1 cut.`);
  }
  await waitForBodyText(cdp, sessionId, 'Actions', 'Post-June-1 contract modal actions panel');
  await clickButtonContaining(cdp, sessionId, 'Post-June 1', 'clickable Post-June 1 switch');
  await clickButtonWithExactText(cdp, sessionId, 'Cut Post-June 1', 'clickable Cut Post-June 1 contract button');
  await waitForContractRowAbsent(cdp, sessionId, postJuneCut.name, 'Post-June-1 cut removed from active contracts table');
  const postJuneSave = await waitForLatestAutosaveCut(cdp, sessionId, postJuneCut.name, true, postJunePlayerId);
  console.log(`Post-June-1 cut ${postJuneCut.name} (${postJuneCut.capHit}); latest autosave slot ${postJuneSave.slotId ?? 'n/a'}.`);
  await hardReloadAndContinueAutosave(cdp, sessionId, route, 'Post-June-1 cut');
  await waitForContractRowAbsent(cdp, sessionId, postJuneCut.name, 'Post-June-1 cut absent after autosave hard reload');
  await waitForBodyText(cdp, sessionId, 'Cap Space', 'contracts cap space after persisted cuts');
}

async function runContractNegotiationsSmoke(cdp, sessionId, baseUrl) {
  const route = '/contracts';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running contract negotiations smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Contract Sources', 'contracts source panel');
  await waitForBodyText(cdp, sessionId, 'Contracts & Salary Cap', 'contracts route loaded');

  const extensionCandidate = await selectContractNegotiationCandidate(cdp, sessionId, 'extension', { minYears: 2 });
  const extensionPlayerId = await resolveLatestAutosaveRosterPlayerId(cdp, sessionId, extensionCandidate.name);
  if (!extensionPlayerId) {
    throw new Error(`Could not resolve ${extensionCandidate.name} to a unique latest-autosave roster player before extension.`);
  }
  await waitForBodyText(cdp, sessionId, 'Extension Preview', 'extension preview panel');
  await waitFor('set aggressive extension preset', () => evaluate(cdp, sessionId, `
    (() => {
      const select = document.querySelector('select[aria-label="Extension preset"]');
      if (!select) return false;
      select.value = 'aggressive';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `));
  await clickButtonWithExactText(cdp, sessionId, 'Submit Extension', 'clickable Submit Extension button');
  const extensionSave = await waitForLatestAutosaveExtension(cdp, sessionId, extensionPlayerId);
  console.log(`Extended ${extensionCandidate.name} (${extensionCandidate.yearsText} -> ${extensionSave.offerYears}yr); latest autosave slot ${extensionSave.slotId ?? 'n/a'}.`);
  await hardReloadAndContinueAutosave(cdp, sessionId, route, 'contract extension');
  await waitForContractRowYears(cdp, sessionId, extensionCandidate.name, extensionSave.offerYears, 'extended player years after autosave hard reload');

  const tagCandidate = await selectContractNegotiationCandidate(cdp, sessionId, 'franchise tag', { maxYears: 1 });
  const tagPlayerId = await resolveLatestAutosaveRosterPlayerId(cdp, sessionId, tagCandidate.name);
  if (!tagPlayerId) {
    throw new Error(`Could not resolve ${tagCandidate.name} to a unique latest-autosave roster player before franchise tag.`);
  }
  await waitForBodyText(cdp, sessionId, 'Franchise Tag', 'franchise tag panel');
  await clickButtonWithExactText(cdp, sessionId, 'Apply Franchise Tag', 'clickable Apply Franchise Tag button');
  await waitForContractRowStatus(cdp, sessionId, tagCandidate.name, 'Tagged', 'tagged contract row status');
  const tagSave = await waitForLatestAutosaveFranchiseTag(cdp, sessionId, tagPlayerId);
  console.log(`Tagged ${tagCandidate.name} (${tagSave.playerTag}); latest autosave slot ${tagSave.slotId ?? 'n/a'}.`);
  await hardReloadAndContinueAutosave(cdp, sessionId, route, 'franchise tag');
  await waitForContractRowStatus(cdp, sessionId, tagCandidate.name, 'Tagged', 'tagged player status after autosave hard reload');
  await waitForLatestAutosaveFranchiseTag(cdp, sessionId, tagPlayerId);
  await waitForBodyText(cdp, sessionId, 'Cap Space', 'contracts cap space after persisted negotiations');
}

async function runCapLabBatchSmoke(cdp, sessionId, baseUrl) {
  const route = '/cap-lab';
  const routeUrl = `${baseUrl}#${route}`;

  console.log(`Running Cap Lab batch smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Cap Lab Sources', 'cap lab source panel');
  await waitForBodyText(cdp, sessionId, 'Cap Laboratory', 'cap lab route loaded');

  const restructureCandidate = await selectCapLabCandidate(cdp, sessionId, 0, 'queue restructure');
  const restructurePlayerId = await resolveLatestAutosaveRosterPlayerId(cdp, sessionId, restructureCandidate.name);
  if (!restructurePlayerId) {
    throw new Error(`Could not resolve ${restructureCandidate.name} to a unique latest-autosave roster player before Cap Lab restructure.`);
  }
  await setCapLabMoveType(cdp, sessionId, 'restructure');
  await clickButtonWithExactText(cdp, sessionId, 'Add Move', 'clickable Add Move button for Cap Lab restructure');
  await waitForQueuedCapLabMoves(cdp, sessionId, 1);

  const backloadCandidate = await selectCapLabCandidate(cdp, sessionId, 1, 'queue backload');
  const backloadPlayerId = await resolveLatestAutosaveRosterPlayerId(cdp, sessionId, backloadCandidate.name);
  if (!backloadPlayerId) {
    throw new Error(`Could not resolve ${backloadCandidate.name} to a unique latest-autosave roster player before Cap Lab backload.`);
  }
  if (backloadPlayerId === restructurePlayerId) {
    throw new Error(`Cap Lab batch smoke selected the same player for both queued moves: ${backloadCandidate.name}.`);
  }
  await setCapLabMoveType(cdp, sessionId, 'backload');
  await clickButtonWithExactText(cdp, sessionId, 'Add Move', 'clickable Add Move button for Cap Lab backload');
  await waitForQueuedCapLabMoves(cdp, sessionId, 2);

  await clickButtonWithExactText(cdp, sessionId, 'Apply Sandbox', 'clickable Apply Sandbox button');
  await waitForBodyText(cdp, sessionId, 'Commit these cap moves', 'cap lab confirmation modal');
  await clickButtonWithExactText(cdp, sessionId, 'Confirm', 'clickable Confirm Cap Lab batch button');
  await waitForBodyText(cdp, sessionId, 'Cap Lab Execution Receipt', 'cap lab execution receipt');
  await waitForBodyText(cdp, sessionId, 'Cap Lab Applied', 'cap lab applied receipt');
  await waitForQueuedCapLabMoves(cdp, sessionId, 0);

  const batchSave = await waitForLatestAutosaveCapLabBatch(cdp, sessionId, restructurePlayerId, backloadPlayerId);
  console.log(`Applied Cap Lab batch: restructured ${restructureCandidate.name}, backloaded ${backloadCandidate.name}; latest autosave slot ${batchSave.slotId ?? 'n/a'}.`);

  await hardReloadAndContinueAutosave(cdp, sessionId, route, 'Cap Lab batch', ['Cap Lab Sources', 'Cap Laboratory']);
  await waitForLatestAutosaveCapLabBatch(cdp, sessionId, restructurePlayerId, backloadPlayerId);
  await waitForBodyText(cdp, sessionId, 'Cap Space', 'cap lab cap space after persisted batch');
}

async function clickRosterManageButton(cdp, sessionId, playerName) {
  await waitFor(`clickable Manage button for ${playerName}`, () => evaluate(cdp, sessionId, `
    (() => {
      const playerName = ${JSON.stringify(playerName)};
      const row = [...document.querySelectorAll('[data-mfd-table-row="true"]')]
        .find((candidate) => {
          const name = candidate.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          return name === playerName;
        });
      const button = row ? [...row.querySelectorAll('button')]
        .find((candidate) => !candidate.disabled && (candidate.textContent ?? '').replace(/\\s+/g, ' ').trim() === 'Manage')
        : null;
      if (!button) return false;
      button.click();
      return true;
    })()
  `));
}

async function setRosterTrainingFocus(cdp, sessionId, playerName, focus) {
  await waitFor(`training focus ${focus} for ${playerName}`, () => evaluate(cdp, sessionId, `
    (() => {
      const playerName = ${JSON.stringify(playerName)};
      const focus = ${JSON.stringify(focus)};
      const row = [...document.querySelectorAll('[data-mfd-table-row="true"]')]
        .find((candidate) => {
          const name = candidate.querySelector('[data-mfd-table-cell-id="name"]')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
          return name === playerName;
        });
      const select = row?.querySelector('select');
      if (!(select instanceof HTMLSelectElement)) return false;
      select.value = focus;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `));
}

async function clickDepthSlot(cdp, sessionId, slotLabel) {
  await waitFor(`clickable depth slot ${slotLabel}`, () => evaluate(cdp, sessionId, `
    (() => {
      const slotLabel = ${JSON.stringify(slotLabel)};
      const button = [...document.querySelectorAll('button[data-mfd-focusable="depth-slot"]')]
        .find((candidate) => (candidate.innerText ?? '').split(/\\n+/).some((line) => line.trim() === slotLabel));
      if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
      button.scrollIntoView({ block: 'center', inline: 'center' });
      button.click();
      return true;
    })()
  `));
}

async function setReturnerSelect(cdp, sessionId, ariaLabel, playerId) {
  await waitFor(`${ariaLabel} select ${playerId}`, () => evaluate(cdp, sessionId, `
    (() => {
      const select = document.querySelector(${JSON.stringify(`select[aria-label="${ariaLabel}"]`)});
      const playerId = ${JSON.stringify(playerId)};
      if (!(select instanceof HTMLSelectElement)) return false;
      if (![...select.options].some((option) => option.value === playerId)) return false;
      select.value = playerId;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `));
}

async function clickRosterActionWithStateDebug(cdp, sessionId, text, fixture, label) {
  try {
    await clickButtonWithExactText(cdp, sessionId, text, label);
  } catch (err) {
    const state = fixture
      ? await readLatestAutosaveRosterDepthTrainingState(cdp, sessionId, fixture).catch((stateErr) => ({
        ok: false,
        reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
      }))
      : null;
    const ui = await evaluate(cdp, sessionId, `
      (() => ({
        url: window.location.href,
        buttons: [...document.querySelectorAll('button')]
          .map((button) => ({
            text: (button.textContent ?? '').replace(/\\s+/g, ' ').trim(),
            disabled: Boolean(button.disabled),
            ariaLabel: button.getAttribute('aria-label') ?? '',
          }))
          .filter((entry) => entry.text || entry.ariaLabel)
          .slice(0, 80),
        bodyHead: document.body?.innerText?.slice(0, 3500) ?? '',
      }))()
    `).catch((uiErr) => ({
      reason: uiErr instanceof Error ? uiErr.message : String(uiErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nRoster action UI state:\n${JSON.stringify(ui, null, 2)}\nLatest autosave roster/depth/training state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function selectTradePartner(cdp, sessionId, partnerTeamId) {
  await waitFor(`trade partner select ${partnerTeamId}`, () => evaluate(cdp, sessionId, `
    (() => {
      const partnerTeamId = ${JSON.stringify(partnerTeamId)};
      const select = [...document.querySelectorAll('select')]
        .find((candidate) => [...candidate.options].some((option) => option.value === partnerTeamId));
      if (!select) return false;
      select.value = partnerTeamId;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `));
}

async function clickAssetAddButton(cdp, sessionId, description, label) {
  await waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const description = ${JSON.stringify(description)};
      const buttons = [...document.querySelectorAll('button')]
        .filter((button) => !button.disabled && (button.textContent ?? '').replace(/\\s+/g, ' ').trim() === 'Add');
      for (const button of buttons) {
        const row = button.parentElement;
        const rowText = row?.innerText?.replace(/\\s+/g, ' ').trim() ?? '';
        if (rowText.includes(description)) {
          button.click();
          return true;
        }
      }
      return false;
    })()
  `));
}

async function runTradeCounterBlockSmoke(cdp, sessionId, baseUrl) {
  console.log('Staging trade counter/block smoke fixture from the latest autosave...');
  const fixture = await stageTradeCounterBlockFixture(cdp, sessionId);
  if (!fixture?.blockPlayerName || !fixture?.targetPlayerName || !fixture?.partnerTeamId) {
    throw new Error(`Trade smoke fixture did not return usable identifiers: ${JSON.stringify(fixture)}`);
  }
  console.log(`Trade fixture: block ${fixture.blockPlayerName}; propose ${fixture.offerPickDescription} for ${fixture.targetPlayerName} from ${fixture.partnerTeamName}.`);

  await hardReloadAndContinueAutosave(cdp, sessionId, '/roster', 'trade fixture staging', ['Roster Sources', 'Roster Management']);
  await clickRosterManageButton(cdp, sessionId, fixture.blockPlayerName);
  await waitForBodyText(cdp, sessionId, 'Actions', 'roster action panel for trade-block toggle');
  await clickButtonWithExactText(cdp, sessionId, 'Trade Block', 'clickable Trade Block roster action');
  await waitForBodyText(cdp, sessionId, 'Roster Action Receipt', 'roster trade-block action receipt');
  await waitForBodyText(cdp, sessionId, 'Added to trade block', 'trade-block add receipt');

  const route = '/trades';
  const routeUrl = `${baseUrl}#${route}`;
  console.log(`Running trade counter/block smoke at ${routeUrl}...`);
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Trade Center Sources', 'trade center source panel');
  await waitForBodyText(cdp, sessionId, 'Trade Center', 'trade center route loaded');
  await clickButtonWithExactText(cdp, sessionId, 'Build Offer', 'clickable Build Offer command');
  await waitForBodyText(cdp, sessionId, 'Step 1 // Trade Partner', 'trade proposal partner step');
  await selectTradePartner(cdp, sessionId, fixture.partnerTeamId);
  await waitForBodyText(cdp, sessionId, fixture.targetPlayerName, 'staged partner target in proposal builder');
  await waitForBodyText(cdp, sessionId, fixture.offerPickDescription, 'staged user pick in proposal builder');
  await clickAssetAddButton(cdp, sessionId, fixture.offerPickDescription, 'clickable Add button for staged user pick');
  await clickAssetAddButton(cdp, sessionId, fixture.targetPlayerName, 'clickable Add button for staged partner target');
  await waitForBodyText(cdp, sessionId, 'Decision Forecast', 'trade decision forecast after package selection');
  await clickButtonWithExactText(cdp, sessionId, 'Submit Proposal', 'clickable Submit Proposal button');
  await waitForBodyText(cdp, sessionId, 'Direct Proposal Countered', 'direct proposal countered receipt');
  await waitForBodyText(cdp, sessionId, 'AI Response', 'AI response panel after counter');
  await waitForBodyText(cdp, sessionId, 'COUNTERED', 'countered proposal status');
  await waitForBodyText(cdp, sessionId, fixture.expectedCounterPickDescription, 'expected counter pick in AI counter package');
  await clickButtonWithExactText(cdp, sessionId, 'Reject Counter', 'clickable Reject Counter button');
  await waitForBodyText(cdp, sessionId, 'Counter Rejected', 'counter rejected receipt');

  const tradeSave = await waitForLatestAutosaveTradeCounterBlock(cdp, sessionId, fixture);
  console.log(`Rejected trade counter for ${fixture.targetPlayerName}; latest autosave slot ${tradeSave.slotId ?? 'n/a'}.`);

  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'trade counter/block', ['Trade Center Sources', 'Trade Center']);
  await waitForLatestAutosaveTradeCounterBlock(cdp, sessionId, fixture);
  await clickButtonWithExactText(cdp, sessionId, 'Build Offer', 'clickable Build Offer command after trade hard reload');
  await waitForBodyText(cdp, sessionId, 'AI Response', 'trade AI response panel after autosave hard reload');
  await waitForBodyText(cdp, sessionId, 'Counter declined', 'trade counter rejection after autosave hard reload');
}

async function stageRosterDepthTrainingFixture(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (async () => {
      const displayName = (player) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || player?.id || '';
      };
      const clone = (value) => JSON.parse(JSON.stringify(value));
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const writeSave = (db, slot) => new Promise((resolveWrite, rejectWrite) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(slot);
        request.onsuccess = () => resolveWrite();
        request.onerror = () => rejectWrite(request.error ?? new Error('Could not write mfd save slot.'));
      });

      const db = await openDb();
      const saves = await readSaves(db);
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        if (typeof db.close === 'function') db.close();
        throw new Error('No latest autosave data available to stage the roster/depth/training smoke fixture.');
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        if (typeof db.close === 'function') db.close();
        throw new Error('Latest autosave data was not valid JSON.');
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      if (!userTeam?.roster?.length) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find a user roster for the roster/depth/training smoke fixture.');
      }

      const ensureName = (player) => {
        const name = displayName(player);
        if (!player.name) player.name = name;
        if (!player.firstName || !player.lastName) {
          const parts = name.split(/\\s+/);
          player.firstName ||= parts[0] || player.id;
          player.lastName ||= parts.slice(1).join(' ') || player.pos || 'Player';
        }
        return player;
      };
      const mirrorPlayer = (player) => {
        const existing = players[player.id] ?? {};
        players[player.id] = ensureName({
          ...existing,
          ...clone(player),
          id: player.id,
          teamId: userTeam.id,
        });
        return players[player.id];
      };
      const setInjury = (player, injury) => {
        player.injury = clone(injury);
        const mapPlayer = mirrorPlayer(player);
        mapPlayer.injury = clone(injury);
      };

      for (const player of userTeam.roster) {
        if (!player?.id) continue;
        ensureName(player);
        player.teamId = userTeam.id;
        player.ratings ??= {};
        mirrorPlayer(player);
      }

      const roster = userTeam.roster;
      const usedIds = new Set();
      const takePlayer = (predicate, label) => {
        const player = roster.find((candidate) => candidate?.id && !usedIds.has(candidate.id) && predicate(candidate));
        if (!player) throw new Error('Could not stage ' + label + ' player for roster/depth/training smoke.');
        usedIds.add(player.id);
        return player;
      };

      const offensiveSlots = ['WR', 'RB', 'TE', 'OL', 'QB'];
      const depthSlot = offensiveSlots.find((pos) => roster.filter((player) => player?.pos === pos).length >= 2);
      if (!depthSlot) throw new Error('Could not find an offensive position room with two players for depth smoke.');
      const depthRoom = roster
        .filter((player) => player?.pos === depthSlot)
        .sort((left, right) => Number(right.ovr ?? 0) - Number(left.ovr ?? 0) || String(left.id).localeCompare(String(right.id)));
      const [starterPlayer, promotePlayer] = depthRoom;
      if (!starterPlayer?.id || !promotePlayer?.id || starterPlayer.id === promotePlayer.id) {
        throw new Error('Could not stage distinct starter and promotion players for depth smoke.');
      }
      usedIds.add(starterPlayer.id);
      usedIds.add(promotePlayer.id);
      const trainingPlayer = takePlayer((player) => !player.injury && player.pos !== 'K' && player.pos !== 'P', 'training');
      const placeIrPlayer = takePlayer((player) => player.pos !== 'K' && player.pos !== 'P', 'place-IR');
      const activateIrPlayer = takePlayer((player) => player.pos !== 'K' && player.pos !== 'P', 'activate-IR');
      const returnerPlayer = roster
        .filter((player) => player?.id && (player.pos === 'RB' || player.pos === 'WR'))
        .sort((left, right) => {
          const leftSelected = left.id === promotePlayer.id ? 0 : 1;
          const rightSelected = right.id === promotePlayer.id ? 0 : 1;
          return leftSelected - rightSelected || Number(right.ovr ?? 0) - Number(left.ovr ?? 0);
        })[0];
      if (!returnerPlayer?.id) {
        throw new Error('Could not stage a kick-returner candidate for depth smoke.');
      }

      save.phase = 'regular_season';
      save.week = Math.max(1, Number(save.week) || latest.week || 1);
      save.year = Number(save.year) || latest.year || 2026;
      save.tradeDeadlineState = undefined;
      save.offseasonState = null;
      save.weeklyPrepPlans = save.weeklyPrepPlans ?? {};
      userTeam.trainingAssignments = {};
      userTeam.fatigueState = userTeam.fatigueState ?? {};
      userTeam.specialTeams = {
        ...(userTeam.specialTeams ?? {}),
        kickReturner: null,
        puntReturner: userTeam.specialTeams?.puntReturner ?? null,
        longSnapper: userTeam.specialTeams?.longSnapper ?? null,
        kickCoverageUnit: userTeam.specialTeams?.kickCoverageUnit ?? [],
        puntCoverageUnit: userTeam.specialTeams?.puntCoverageUnit ?? [],
      };

      setInjury(placeIrPlayer, {
        id: 'smoke-place-ir-' + placeIrPlayer.id,
        type: 'ankle_sprain',
        severity: 'out',
        severityTier: 'severe',
        gamesOut: 2,
        gamesRecovered: 0,
        reinjuryRisk: 0.15,
        affectedRatings: ['speed'],
        ratingPenalty: 2,
        onIR: false,
      });
      setInjury(activateIrPlayer, {
        id: 'smoke-activate-ir-' + activateIrPlayer.id,
        type: 'hamstring',
        severity: 'ir',
        severityTier: 'moderate',
        gamesOut: 0,
        gamesRecovered: 4,
        reinjuryRisk: 0.05,
        affectedRatings: ['speed'],
        ratingPenalty: 1,
        onIR: true,
      });

      trainingPlayer.injury = null;
      starterPlayer.injury = null;
      promotePlayer.injury = null;
      starterPlayer.isStarter = true;
      promotePlayer.isStarter = false;
      returnerPlayer.ratings ??= {};
      returnerPlayer.ratings.speed = Math.max(Number(returnerPlayer.ratings.speed ?? returnerPlayer.ovr ?? 0), 92);
      for (const player of [trainingPlayer, starterPlayer, promotePlayer, returnerPlayer]) {
        mirrorPlayer(player);
      }

      latest.data = JSON.stringify(envelope);
      latest.year = save.year;
      latest.week = save.week;
      latest.timestamp = Date.now();
      await writeSave(db, latest);
      if (typeof db.close === 'function') db.close();

      return {
        year: save.year,
        week: save.week,
        userTeamId: userTeam.id,
        userTeamName: [userTeam.city, userTeam.name].filter(Boolean).join(' '),
        trainingPlayerId: trainingPlayer.id,
        trainingPlayerName: displayName(trainingPlayer),
        trainingFocus: 'conditioning',
        placeIrPlayerId: placeIrPlayer.id,
        placeIrPlayerName: displayName(placeIrPlayer),
        activateIrPlayerId: activateIrPlayer.id,
        activateIrPlayerName: displayName(activateIrPlayer),
        depthSlot,
        starterPlayerId: starterPlayer.id,
        starterPlayerName: displayName(starterPlayer),
        promotePlayerId: promotePlayer.id,
        promotePlayerName: displayName(promotePlayer),
        returnerPlayerId: returnerPlayer.id,
        returnerPlayerName: displayName(returnerPlayer),
      };
    })()
  `, true);
}

function latestAutosaveRosterDepthTrainingStateExpression(fixture) {
  return `
    (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const displayName = (player, fallback) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || fallback;
      };
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = teams?.[fixture.userTeamId] ?? Object.values(teams).find((team) => team?.isUser);
      const roster = userTeam?.roster ?? [];
      const rosterTrainingPlayer = roster.find((player) => player?.id === fixture.trainingPlayerId) ?? null;
      const rosterPlaceIrPlayer = roster.find((player) => player?.id === fixture.placeIrPlayerId) ?? null;
      const rosterActivateIrPlayer = roster.find((player) => player?.id === fixture.activateIrPlayerId) ?? null;
      const rosterPromotePlayer = roster.find((player) => player?.id === fixture.promotePlayerId) ?? null;
      const mapPlaceIrPlayer = players?.[fixture.placeIrPlayerId] ?? null;
      const mapActivateIrPlayer = players?.[fixture.activateIrPlayerId] ?? null;
      const mapPromotePlayer = players?.[fixture.promotePlayerId] ?? null;
      const assignment = userTeam?.trainingAssignments?.[fixture.trainingPlayerId] ?? null;
      const trainingAssigned = Boolean(
        assignment
        && assignment.playerId === fixture.trainingPlayerId
        && assignment.focus === fixture.trainingFocus
      );
      const placeIrPersisted = Boolean(
        rosterPlaceIrPlayer?.injury?.onIR === true
        && rosterPlaceIrPlayer?.injury?.severity === 'ir'
        && rosterPlaceIrPlayer?.injury?.gamesOut >= 4
        && mapPlaceIrPlayer?.injury?.onIR === true
        && mapPlaceIrPlayer?.injury?.severity === 'ir'
        && mapPlaceIrPlayer?.injury?.gamesOut >= 4
      );
      const activatedFromIr = Boolean(
        rosterActivateIrPlayer?.injury
        && rosterActivateIrPlayer.injury.onIR === false
        && rosterActivateIrPlayer.injury.gamesOut === 0
        && mapActivateIrPlayer?.injury
        && mapActivateIrPlayer.injury.onIR === false
        && mapActivateIrPlayer.injury.gamesOut === 0
      );
      const starterPromoted = Boolean(
        rosterPromotePlayer?.isStarter === true
        && mapPromotePlayer?.isStarter === true
      );
      const returnerAssigned = userTeam?.specialTeams?.kickReturner === fixture.returnerPlayerId;
      const allPersisted = Boolean(trainingAssigned && placeIrPersisted && activatedFromIr && starterPromoted && returnerAssigned);
      return {
        ok: Boolean(trainingAssigned || placeIrPersisted || activatedFromIr || starterPromoted || returnerAssigned),
        allPersisted,
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        userTeamId: fixture.userTeamId,
        trainingPlayerId: fixture.trainingPlayerId,
        trainingPlayerName: displayName(rosterTrainingPlayer, fixture.trainingPlayerId),
        trainingAssigned,
        assignment,
        placeIrPlayerId: fixture.placeIrPlayerId,
        placeIrPlayerName: displayName(rosterPlaceIrPlayer, fixture.placeIrPlayerId),
        placeIrPersisted,
        rosterPlaceIrInjury: rosterPlaceIrPlayer?.injury ?? null,
        mapPlaceIrInjury: mapPlaceIrPlayer?.injury ?? null,
        activateIrPlayerId: fixture.activateIrPlayerId,
        activateIrPlayerName: displayName(rosterActivateIrPlayer, fixture.activateIrPlayerId),
        activatedFromIr,
        rosterActivateIrInjury: rosterActivateIrPlayer?.injury ?? null,
        mapActivateIrInjury: mapActivateIrPlayer?.injury ?? null,
        promotePlayerId: fixture.promotePlayerId,
        promotePlayerName: displayName(rosterPromotePlayer, fixture.promotePlayerId),
        starterPromoted,
        rosterPromoteStarter: rosterPromotePlayer?.isStarter ?? null,
        mapPromoteStarter: mapPromotePlayer?.isStarter ?? null,
        returnerPlayerId: fixture.returnerPlayerId,
        returnerAssigned,
        kickReturner: userTeam?.specialTeams?.kickReturner ?? null,
      };
    })()
  `;
}

async function readLatestAutosaveRosterDepthTrainingState(cdp, sessionId, fixture) {
  return evaluate(cdp, sessionId, latestAutosaveRosterDepthTrainingStateExpression(fixture), true);
}

async function waitForLatestAutosaveRosterDepthTraining(cdp, sessionId, fixture, expectation, label, ms = timeoutMs) {
  try {
    return await waitFor(label, async () => {
      const state = await readLatestAutosaveRosterDepthTrainingState(cdp, sessionId, fixture);
      return state?.[expectation] ? state : false;
    }, ms);
  } catch (err) {
    const state = await readLatestAutosaveRosterDepthTrainingState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave roster/depth/training state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function runRosterDepthTrainingSmoke(cdp, sessionId, baseUrl) {
  console.log('Staging roster/depth/training smoke fixture from the latest autosave...');
  const fixture = await stageRosterDepthTrainingFixture(cdp, sessionId);
  if (!fixture?.trainingPlayerName || !fixture?.placeIrPlayerName || !fixture?.activateIrPlayerName || !fixture?.promotePlayerName) {
    throw new Error(`Roster/depth/training smoke fixture did not return usable identifiers: ${JSON.stringify(fixture)}`);
  }
  console.log(`Roster fixture: train ${fixture.trainingPlayerName}, place ${fixture.placeIrPlayerName} on IR, activate ${fixture.activateIrPlayerName}, promote ${fixture.promotePlayerName}, set ${fixture.returnerPlayerName} as KR.`);

  const rosterRoute = '/roster';
  console.log(`Running roster training and IR smoke at ${baseUrl}#${rosterRoute}...`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, rosterRoute, 'roster/depth/training fixture staging', ['Roster Sources', 'Roster Management']);
  await waitForBodyText(cdp, sessionId, fixture.trainingPlayerName, 'staged training player on roster route');
  await setRosterTrainingFocus(cdp, sessionId, fixture.trainingPlayerName, fixture.trainingFocus);
  await waitForBodyText(cdp, sessionId, 'Training Assignment Receipt', 'training assignment receipt panel');
  const trainingSave = await waitForLatestAutosaveRosterDepthTraining(
    cdp,
    sessionId,
    fixture,
    'trainingAssigned',
    'training assignment persisted to latest autosave',
  );
  console.log(`Assigned ${fixture.trainingFocus} training to ${fixture.trainingPlayerName}; latest autosave slot ${trainingSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, rosterRoute, 'training assignment', ['Roster Sources', 'Roster Management']);
  await waitForLatestAutosaveRosterDepthTraining(
    cdp,
    sessionId,
    fixture,
    'trainingAssigned',
    'training assignment persisted after hard reload',
  );

  await clickRosterManageButton(cdp, sessionId, fixture.placeIrPlayerName);
  await waitForBodyText(cdp, sessionId, 'Medical Report', 'place-IR medical report');
  await clickRosterActionWithStateDebug(cdp, sessionId, 'Place on IR', fixture, 'clickable Place on IR roster action');
  await waitForBodyText(cdp, sessionId, 'Roster Action Receipt', 'place-IR roster action receipt');
  await waitForBodyText(cdp, sessionId, 'Placed on IR', 'place-IR receipt text');
  const placeIrSave = await waitForLatestAutosaveRosterDepthTraining(
    cdp,
    sessionId,
    fixture,
    'placeIrPersisted',
    'IR placement persisted to latest autosave',
  );
  console.log(`Placed ${fixture.placeIrPlayerName} on IR; latest autosave slot ${placeIrSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, rosterRoute, 'IR placement', ['Roster Sources', 'Roster Management']);
  await waitForLatestAutosaveRosterDepthTraining(
    cdp,
    sessionId,
    fixture,
    'placeIrPersisted',
    'IR placement persisted after hard reload',
  );

  await clickRosterManageButton(cdp, sessionId, fixture.activateIrPlayerName);
  await waitForBodyText(cdp, sessionId, 'Medical Report', 'activate-IR medical report');
  await clickRosterActionWithStateDebug(cdp, sessionId, 'Activate from IR', fixture, 'clickable Activate from IR roster action');
  await waitForBodyText(cdp, sessionId, 'Activated from IR', 'activate-IR receipt text');
  const activateIrSave = await waitForLatestAutosaveRosterDepthTraining(
    cdp,
    sessionId,
    fixture,
    'activatedFromIr',
    'IR activation persisted to latest autosave',
  );
  console.log(`Activated ${fixture.activateIrPlayerName} from IR; latest autosave slot ${activateIrSave.slotId ?? 'n/a'}.`);

  const depthRoute = '/depth-chart';
  console.log(`Running depth chart and returner smoke at ${baseUrl}#${depthRoute}...`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, depthRoute, 'IR activation', ['Depth Chart Sources', 'Depth Chart']);
  await clickDepthSlot(cdp, sessionId, fixture.depthSlot);
  await waitForBodyText(cdp, sessionId, fixture.promotePlayerName, 'staged depth promotion player in room modal');
  await clickButtonNearText(cdp, sessionId, 'Promote To Starter', fixture.promotePlayerName, 'clickable Promote To Starter depth action');
  const starterSave = await waitForLatestAutosaveRosterDepthTraining(
    cdp,
    sessionId,
    fixture,
    'starterPromoted',
    'depth starter promotion persisted to latest autosave',
  );
  console.log(`Promoted ${fixture.promotePlayerName} in ${fixture.depthSlot}; latest autosave slot ${starterSave.slotId ?? 'n/a'}.`);

  await setReturnerSelect(cdp, sessionId, 'Kick returner', fixture.returnerPlayerId);
  const returnerSave = await waitForLatestAutosaveRosterDepthTraining(
    cdp,
    sessionId,
    fixture,
    'returnerAssigned',
    'kick returner assignment persisted to latest autosave',
  );
  console.log(`Assigned ${fixture.returnerPlayerName} as kick returner; latest autosave slot ${returnerSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, depthRoute, 'depth starter and returner assignment', ['Depth Chart Sources', 'Depth Chart']);
  await waitForLatestAutosaveRosterDepthTraining(
    cdp,
    sessionId,
    fixture,
    'allPersisted',
    'roster/depth/training workflow persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, fixture.promotePlayerName, 'promoted depth player after hard reload');
  await waitForBodyText(cdp, sessionId, fixture.returnerPlayerName, 'returner player after hard reload');
}

async function stageWeeklyPrepFixture(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (async () => {
      const displayName = (player) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || player?.id || '';
      };
      const clone = (value) => JSON.parse(JSON.stringify(value));
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const writeSave = (db, slot) => new Promise((resolveWrite, rejectWrite) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(slot);
        request.onsuccess = () => resolveWrite(request.result);
        request.onerror = () => rejectWrite(request.error ?? new Error('Could not write mfd save slot.'));
      });

      const db = await openDb();
      const saves = await readSaves(db);
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        if (typeof db.close === 'function') db.close();
        throw new Error('No latest autosave data available to stage the weekly-prep smoke fixture.');
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        if (typeof db.close === 'function') db.close();
        throw new Error('Latest autosave data was not valid JSON.');
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      if (!userTeam?.id || !Array.isArray(userTeam.roster) || userTeam.roster.length === 0) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find a user roster for the weekly-prep smoke fixture.');
      }

      const ensureName = (player) => {
        const name = displayName(player);
        if (!player.name) player.name = name;
        if (!player.firstName || !player.lastName) {
          const parts = name.split(/\\s+/);
          player.firstName ||= parts[0] || player.id;
          player.lastName ||= parts.slice(1).join(' ') || player.pos || 'Player';
        }
        return player;
      };
      const mirrorPlayer = (player) => {
        const existing = players[player.id] ?? {};
        players[player.id] = ensureName({
          ...existing,
          ...clone(player),
          id: player.id,
          teamId: userTeam.id,
        });
        return players[player.id];
      };

      for (const player of userTeam.roster) {
        if (!player?.id) continue;
        ensureName(player);
        player.teamId = userTeam.id;
        player.injury ??= null;
        player.ratings ??= {};
        mirrorPlayer(player);
      }

      const weeks = Array.isArray(save.schedule) ? [...save.schedule] : [];
      const currentWeek = Number(save.week) || Number(latest.week) || 1;
      const hasUserGame = (week) => (week?.games ?? []).some((game) =>
        game?.homeTeamId === userTeam.id || game?.awayTeamId === userTeam.id);
      const sortedWeeks = weeks
        .filter((week) => Number.isFinite(Number(week?.week)) && Array.isArray(week?.games) && hasUserGame(week))
        .sort((left, right) => Number(left.week) - Number(right.week));
      const candidateWeeks = sortedWeeks.filter((week) => Number(week.week) >= currentWeek);
      const hasOpenUserGame = (week) => (week.games ?? []).some((game) =>
        (game.homeTeamId === userTeam.id || game.awayTeamId === userTeam.id)
        && !game.result);
      const highStakesWeeks = candidateWeeks.filter((week) => Number(week.week) >= 15);
      const targetWeek = highStakesWeeks.find(hasOpenUserGame)
        ?? highStakesWeeks[0]
        ?? candidateWeeks.find((week) => Number(week.week) >= 10 && hasOpenUserGame(week))
        ?? candidateWeeks.find((week) => Number(week.week) >= 10)
        ?? sortedWeeks.find((week) => Number(week.week) >= 10)
        ?? candidateWeeks[0]
        ?? sortedWeeks[0];
      const targetGame = (targetWeek?.games ?? []).find((game) =>
        game?.homeTeamId === userTeam.id || game?.awayTeamId === userTeam.id);
      if (!targetWeek?.week || !targetGame) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find a scheduled user matchup for the weekly-prep smoke fixture.');
      }

      const stagedWeekNumber = Math.max(Number(targetWeek.week), 15);
      targetWeek.week = stagedWeekNumber;

      for (const game of targetWeek.games ?? []) {
        game.result = null;
      }

      const opponentTeamId = targetGame.homeTeamId === userTeam.id ? targetGame.awayTeamId : targetGame.homeTeamId;
      const opponentTeam = teams[opponentTeamId];
      if (!opponentTeam?.id) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not resolve weekly-prep smoke opponent team.');
      }

      const keyMatchupPlayer = userTeam.roster
        .filter((player) => player?.id && ['QB', 'RB', 'WR', 'TE', 'CB', 'S'].includes(player.pos))
        .sort((left, right) => Number(right.ovr ?? 0) - Number(left.ovr ?? 0) || String(left.id).localeCompare(String(right.id)))[0]
        ?? userTeam.roster.find((player) => player?.id);
      if (!keyMatchupPlayer?.id) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find a key matchup player for the weekly-prep smoke fixture.');
      }

      save.phase = 'regular_season';
      save.week = stagedWeekNumber;
      save.year = Number(save.year) || Number(latest.year) || 2026;
      save.settings = {
        ...(save.settings ?? {}),
        halftimeDecisions: 'off',
      };
      save.postGameUi = {
        ...(save.postGameUi ?? {}),
        pressConferenceQueue: [],
        audioCueQueue: [],
        pendingHalftimeDecision: null,
      };
      save.tradeDeadlineState = undefined;
      save.offseasonState = null;
      delete save.activeCallYourShot;
      save.gamePlan = null;
      save.weeklyPrepPlans = save.weeklyPrepPlans ?? {};
      delete save.weeklyPrepPlans[userTeam.id];
      save.weeklyPrepHistory = (save.weeklyPrepHistory ?? []).filter((entry) => !(
        entry?.teamId === userTeam.id
        && entry?.opponentTeamId === opponentTeamId
        && entry?.year === save.year
        && entry?.week === save.week
      ));
      save.filmRoomHistory = (save.filmRoomHistory ?? []).filter((entry) => !(
        entry?.teamId === userTeam.id
        && entry?.opponentTeamId === opponentTeamId
        && entry?.year === save.year
        && entry?.week === save.week
      ));
      save.opponentReports = (save.opponentReports ?? []).filter((entry) => !(
        entry?.teamId === opponentTeamId
        && entry?.year === save.year
        && entry?.week === save.week
      ));

      const newestTimestamp = saves.reduce(
        (current, slot) => Math.max(current, Number(slot?.timestamp) || 0),
        0,
      );
      const stagedSlot = {
        ...latest,
        name: 'Autosave (weekly-prep smoke fixture)',
        data: JSON.stringify(envelope),
        year: save.year,
        week: save.week,
        // Keep the isolated fixture ahead of any slow demo autosave still
        // committing on a hosted runner. The slot is deleted after Continue
        // loads it, before the workflow creates its real result autosave.
        timestamp: Math.max(Date.now(), newestTimestamp) + (60 * 60 * 1000),
      };
      delete stagedSlot.id;
      const stagedSlotId = await writeSave(db, stagedSlot);
      if (typeof db.close === 'function') db.close();

      return {
        stagedSlotId: Number(stagedSlotId),
        year: save.year,
        week: save.week,
        userTeamId: userTeam.id,
        userTeamName: [userTeam.city, userTeam.name].filter(Boolean).join(' '),
        opponentTeamId,
        opponentTeamName: [opponentTeam.city, opponentTeam.name].filter(Boolean).join(' '),
        callYourShotEligible: Number(save.week) >= 15,
        keyMatchupPlayerId: keyMatchupPlayer.id,
        keyMatchupPlayerName: displayName(keyMatchupPlayer),
        plan: {
          offensiveFocus: 'attack_secondary',
          defensiveFocus: 'limit_explosive',
          practiceIntensity: 'light',
          snapManagement: 'protect_starters',
          specialSituation: 'red_zone',
        },
      };
    })()
  `, true);
}

async function setWeeklyPrepPanelSelect(cdp, sessionId, panelTitle, value) {
  await waitFor(`${panelTitle} weekly-prep select ${value}`, () => evaluate(cdp, sessionId, `
    (() => {
      const expectedTitle = ${JSON.stringify(panelTitle.trim().toLowerCase())};
      const value = ${JSON.stringify(value)};
      const panels = [...document.querySelectorAll('[data-mfd-pixel-panel="true"]')];
      for (const panel of panels) {
        const text = (panel.innerText ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
        if (!text.includes(expectedTitle)) continue;
        const select = panel.querySelector('select');
        if (!(select instanceof HTMLSelectElement)) continue;
        if (![...select.options].some((option) => option.value === value)) continue;
        select.value = value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    })()
  `));
}

function latestAutosaveWeeklyPrepStateExpression(fixture) {
  return `
    (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const prepOutcome = (save?.weeklyPrepHistory ?? []).find((entry) => (
        entry?.teamId === fixture.userTeamId
        && entry?.opponentTeamId === fixture.opponentTeamId
        && entry?.year === fixture.year
        && entry?.week === fixture.week
      )) ?? null;
      const filmRoomReport = (save?.filmRoomHistory ?? []).find((entry) => (
        entry?.teamId === fixture.userTeamId
        && entry?.opponentTeamId === fixture.opponentTeamId
        && entry?.year === fixture.year
        && entry?.week === fixture.week
      )) ?? null;
      const opponentReport = (save?.opponentReports ?? []).find((entry) => (
        entry?.teamId === fixture.opponentTeamId
        && entry?.year === fixture.year
        && entry?.week === fixture.week
      )) ?? null;
      const plan = prepOutcome?.plan ?? null;
      const targetWeek = (save?.schedule ?? []).find((entry) => entry?.week === fixture.week);
      const targetGame = (targetWeek?.games ?? []).find((game) =>
        (game?.homeTeamId === fixture.userTeamId && game?.awayTeamId === fixture.opponentTeamId)
        || (game?.awayTeamId === fixture.userTeamId && game?.homeTeamId === fixture.opponentTeamId));
      const planMatches = Boolean(
        plan
        && plan.teamId === fixture.userTeamId
        && plan.opponentTeamId === fixture.opponentTeamId
        && plan.year === fixture.year
        && plan.week === fixture.week
        && plan.offensiveFocus === fixture.plan.offensiveFocus
        && plan.defensiveFocus === fixture.plan.defensiveFocus
        && plan.practiceIntensity === fixture.plan.practiceIntensity
        && plan.snapManagement === fixture.plan.snapManagement
        && plan.specialSituation === fixture.plan.specialSituation
        && plan.keyMatchupPlayerId === fixture.keyMatchupPlayerId
      );
      const weeklyPrepCleared = !save?.weeklyPrepPlans?.[fixture.userTeamId];
      const gamePlanCleared = save?.gamePlan === null || save?.gamePlan === undefined;
      const targetGameCompleted = Boolean(
        targetGame?.result
        && typeof targetGame.result.homeScore === 'number'
        && typeof targetGame.result.awayScore === 'number'
      );
      const filmRoomPersisted = Boolean(
        filmRoomReport
        && typeof filmRoomReport.grade === 'string'
        && typeof filmRoomReport.score === 'number'
        && typeof filmRoomReport.headline === 'string'
      );
      const opponentReportPersisted = Boolean(
        opponentReport
        && typeof opponentReport.teamName === 'string'
        && opponentReport.keyPlayers?.length >= 0
      );
      const ok = Boolean(
        planMatches
        && weeklyPrepCleared
        && gamePlanCleared
        && targetGameCompleted
        && filmRoomPersisted
        && opponentReportPersisted
      );
      return {
        ok,
        reason: ok ? 'weekly prep sim persisted' : 'latest autosave does not match weekly-prep expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        saveYear: save?.year ?? null,
        saveWeek: save?.week ?? null,
        savePhase: save?.phase ?? null,
        prepOutcomePersisted: Boolean(prepOutcome),
        planMatches,
        weeklyPrepCleared,
        gamePlanCleared,
        targetGameCompleted,
        filmRoomPersisted,
        filmGrade: filmRoomReport?.grade ?? null,
        filmScore: filmRoomReport?.score ?? null,
        opponentReportPersisted,
        activePlan: save?.weeklyPrepPlans?.[fixture.userTeamId] ?? null,
        gamePlan: save?.gamePlan ?? null,
        prepOutcome,
        filmRoomReport,
      };
    })()
  `;
}

async function readLatestAutosaveWeeklyPrepState(cdp, sessionId, fixture) {
  return evaluate(cdp, sessionId, latestAutosaveWeeklyPrepStateExpression(fixture), true);
}

async function waitForLatestAutosaveWeeklyPrep(cdp, sessionId, fixture, label, ms = timeoutMs) {
  try {
    return await waitFor(label, async () => {
      const state = await readLatestAutosaveWeeklyPrepState(cdp, sessionId, fixture);
      return state?.ok ? state : false;
    }, ms);
  } catch (err) {
    const state = await readLatestAutosaveWeeklyPrepState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave weekly-prep state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function runWeeklyPrepSmoke(cdp, sessionId, baseUrl) {
  console.log('Staging weekly-prep smoke fixture from the latest autosave...');
  const fixture = await stageWeeklyPrepFixture(cdp, sessionId);
  if (!fixture?.opponentTeamName || !fixture?.keyMatchupPlayerName || !Number.isInteger(fixture?.stagedSlotId)) {
    throw new Error(`Weekly-prep smoke fixture did not return usable identifiers: ${JSON.stringify(fixture)}`);
  }
  console.log(`Weekly prep fixture: Week ${fixture.week} vs ${fixture.opponentTeamName}; key matchup ${fixture.keyMatchupPlayerName}.`);

  const route = '/game-plan';
  console.log(`Running weekly-prep smoke at ${baseUrl}#${route}...`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'weekly-prep fixture staging', ['Weekly Prep Sources', 'Weekly Prep']);
  await deleteSmokeSaveSlot(cdp, sessionId, fixture.stagedSlotId, 'weekly-prep fixture load');
  if (fixture.callYourShotEligible) {
    await waitForBodyText(cdp, sessionId, 'Choose one promise before Save', 'Call Your Shot action/deadline copy');
    await waitForBodyText(cdp, sessionId, 'hit it for fan-confidence gain', 'Call Your Shot success consequence copy');
    await waitForBodyText(cdp, sessionId, 'fan confidence drops in the recap receipt', 'Call Your Shot miss consequence copy');
    await waitForBodyText(cdp, sessionId, 'Promise 250+ passing yards', 'Call Your Shot declaration copy');
    console.log(`Call Your Shot copy visible for staged Week ${fixture.week}.`);
  }
  await waitForBodyText(cdp, sessionId, fixture.opponentTeamName, 'staged weekly-prep opponent');
  await setWeeklyPrepPanelSelect(cdp, sessionId, 'Offensive Focus', fixture.plan.offensiveFocus);
  await setWeeklyPrepPanelSelect(cdp, sessionId, 'Defensive Focus', fixture.plan.defensiveFocus);
  await setWeeklyPrepPanelSelect(cdp, sessionId, 'Practice Intensity', fixture.plan.practiceIntensity);
  await setWeeklyPrepPanelSelect(cdp, sessionId, 'Snap Management', fixture.plan.snapManagement);
  await setWeeklyPrepPanelSelect(cdp, sessionId, 'Special Situation', fixture.plan.specialSituation);
  await setWeeklyPrepPanelSelect(cdp, sessionId, 'Key Matchup', fixture.keyMatchupPlayerId);
  await waitForBodyText(cdp, sessionId, 'Decision Forecast', 'weekly-prep decision forecast after selections');
  await clickButtonWithExactText(cdp, sessionId, 'Save Weekly Prep & Sim', 'clickable Save Weekly Prep & Sim button');
  const savedState = await waitForLatestAutosaveWeeklyPrep(
    cdp,
    sessionId,
    fixture,
    'weekly prep outcome and film room persisted to latest autosave',
    90_000,
  );
  console.log(`Saved weekly prep vs ${fixture.opponentTeamName}; film grade ${savedState.filmGrade ?? 'n/a'} (${savedState.filmScore ?? 'n/a'}), latest autosave slot ${savedState.slotId ?? 'n/a'}.`);

  const filmRoute = '/film-room';
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, filmRoute, 'weekly-prep result', ['Film Room Sources', 'Film Room']);
  await waitForLatestAutosaveWeeklyPrep(
    cdp,
    sessionId,
    fixture,
    'weekly prep persisted after hard reload',
    30_000,
  );
  await waitForBodyText(cdp, sessionId, 'Grade', 'film-room grade after weekly-prep hard reload');
}

async function stageDraftScoutingFixture(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (async () => {
      const displayName = (player) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || player?.id || '';
      };
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const writeSave = (db, slot) => new Promise((resolveWrite, rejectWrite) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(slot);
        request.onsuccess = () => resolveWrite();
        request.onerror = () => rejectWrite(request.error ?? new Error('Could not write mfd save slot.'));
      });

      const db = await openDb();
      const saves = await readSaves(db);
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        if (typeof db.close === 'function') db.close();
        throw new Error('No latest autosave data available to stage the draft/scouting smoke fixture.');
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        if (typeof db.close === 'function') db.close();
        throw new Error('Latest autosave data was not valid JSON.');
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      const cpuTeam = Object.values(teams).find((team) => team?.id && team.id !== userTeam?.id);
      if (!save || !userTeam?.id || !cpuTeam?.id) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find usable user and CPU teams for the draft/scouting smoke fixture.');
      }

      const year = Number(save.year) || Number(latest.year) || 2026;
      const userEntryId = 'smoke-draft-' + year + '-1';
      const cpuEntryId = 'smoke-draft-' + year + '-2';
      const targetProspect = {
        id: 'smoke-draft-qb-1',
        firstName: 'Kai',
        lastName: 'Signal',
        pos: 'QB',
        college: 'Texas',
        region: 'south',
        ratings: {
          awareness: 86,
          speed: 73,
          stamina: 82,
          throwAccuracy: 91,
          throwPower: 88,
          decisionSpeed: 87,
          leadership: 84,
        },
        projectedRound: 1,
        scoutGrade: 82,
        trueGrade: 88,
        personality: {
          workEthic: 9,
          loyalty: 7,
          greed: 3,
          pressure: 8,
          ambition: 8,
        },
        traits: ['film_junkie', 'clutch'],
        archetype: {
          archetype: 'field_general',
          label: 'Field General',
          description: 'Accurate pocket passer with quick answers against pressure.',
        },
        characterArchetype: 'captain',
        bustProbability: 0.12,
        stealProbability: 0.24,
        scoutingReports: [
          {
            type: 'film',
            accuracy: 0.72,
            grade: 82,
            notes: 'Processes full-field reads and keeps the offense on schedule.',
          },
        ],
        combine: {
          fortyYard: 4.74,
          benchPress: 17,
          vertical: 32.5,
          broadJump: 116.2,
          threeCone: 7.02,
          shuttle: 4.26,
        },
        bloodline: null,
      };
      const cpuProspect = {
        id: 'smoke-draft-wr-1',
        firstName: 'Rene',
        lastName: 'Volt',
        pos: 'WR',
        college: 'Oregon',
        region: 'west',
        ratings: {
          awareness: 77,
          speed: 92,
          stamina: 84,
          catch: 86,
          routeRunning: 83,
          acceleration: 91,
        },
        projectedRound: 1,
        scoutGrade: 80,
        trueGrade: 84,
        personality: {
          workEthic: 8,
          loyalty: 6,
          greed: 5,
          pressure: 7,
          ambition: 8,
        },
        traits: ['showtime'],
        archetype: null,
        characterArchetype: 'competitor',
        bustProbability: 0.18,
        stealProbability: 0.18,
        scoutingReports: [],
        combine: {
          fortyYard: 4.36,
          benchPress: 14,
          vertical: 39.4,
          broadJump: 128.1,
          threeCone: 6.82,
          shuttle: 4.08,
        },
        bloodline: null,
      };
      const scout = {
        id: 'smoke-scout-south-qb',
        name: 'Mara Signal',
        tier: 'elite',
        specialty: 'QB',
        scope: 'regional',
        region: 'south',
        salary: 1.2,
        accuracy: 0.94,
      };

      save.players = players;
      for (const team of Object.values(teams)) {
        if (!Array.isArray(team?.roster)) continue;
        team.roster = team.roster.filter((player) => (
          player?.id !== targetProspect.id
          && player?.id !== cpuProspect.id
        ));
      }
      delete players[targetProspect.id];
      delete players[cpuProspect.id];

      userTeam.draftPicks = (userTeam.draftPicks ?? []).filter((pick) => !(
        pick?.year === year
        && pick?.round === 1
        && pick?.pick === 1
        && pick?.originalTeamId === userTeam.id
      ));
      userTeam.draftPicks.push({
        round: 1,
        pick: 1,
        originalTeamId: userTeam.id,
        currentTeamId: userTeam.id,
        year,
        isCompPick: false,
      });

      cpuTeam.draftPicks = (cpuTeam.draftPicks ?? []).filter((pick) => !(
        pick?.year === year
        && pick?.round === 1
        && pick?.pick === 2
        && pick?.originalTeamId === cpuTeam.id
      ));
      cpuTeam.draftPicks.push({
        round: 1,
        pick: 2,
        originalTeamId: cpuTeam.id,
        currentTeamId: cpuTeam.id,
        year,
        isCompPick: false,
      });

      save.phase = 'draft';
      save.year = year;
      save.week = Number(save.week) || Number(latest.week) || 1;
      save.draftClass = [
        targetProspect,
        cpuProspect,
        ...((save.draftClass ?? []).filter((prospect) => (
          prospect?.id
          && prospect.id !== targetProspect.id
          && prospect.id !== cpuProspect.id
        ))),
      ];
      save.scoutingDepartment = {
        scouts: [scout],
        availableScouts: [],
        budget: 4,
        maxScouts: 5,
        privateWorkoutsRemaining: 3,
      };
      save.offseasonState = {
        round: 0,
        expiringPlayerIds: [],
        reSignDecisions: {},
        freeAgencyBids: {},
        scoutingState: {},
        scoutingWatchlist: [],
        tradeOffers: [],
        draftOrder: [
          {
            id: userEntryId,
            teamId: userTeam.id,
            round: 1,
            pick: 1,
            overall: 1,
            originalTeamId: userTeam.id,
          },
          {
            id: cpuEntryId,
            teamId: cpuTeam.id,
            round: 1,
            pick: 2,
            overall: 2,
            originalTeamId: cpuTeam.id,
          },
        ],
        currentDraftPickIndex: 0,
        completedDraftPickIds: [],
      };
      save.warRoomState = null;
      save.pendingPassedPickTargets = [];
      if (save.scenarioState) {
        save.scenarioState = {
          ...save.scenarioState,
          activeScenario: null,
        };
      }

      latest.data = JSON.stringify(envelope);
      latest.year = save.year;
      latest.week = save.week;
      latest.timestamp = Date.now();
      await writeSave(db, latest);
      if (typeof db.close === 'function') db.close();

      return {
        year,
        week: save.week,
        userTeamId: userTeam.id,
        userTeamName: [userTeam.city, userTeam.name].filter(Boolean).join(' '),
        cpuTeamId: cpuTeam.id,
        draftEntryId: userEntryId,
        targetProspectId: targetProspect.id,
        targetProspectName: targetProspect.firstName + ' ' + targetProspect.lastName,
        targetProspectPos: targetProspect.pos,
        scoutId: scout.id,
        scoutName: scout.name,
        privateWorkoutsBefore: 3,
        userRosterSize: Array.isArray(userTeam.roster) ? userTeam.roster.length : 0,
        cpuTeamName: [cpuTeam.city, cpuTeam.name].filter(Boolean).join(' '),
        displayNameSample: displayName(userTeam.roster?.[0] ?? null),
      };
    })()
  `, true);
}

function latestAutosaveDraftScoutingStateExpression(fixture) {
  return `
    (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const displayName = (player, fallback) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || fallback;
      };
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = teams?.[fixture.userTeamId] ?? Object.values(teams).find((team) => team?.isUser);
      const scouting = save?.offseasonState?.scoutingState?.[fixture.targetProspectId] ?? null;
      const draftClass = Array.isArray(save?.draftClass) ? save.draftClass : [];
      const roster = Array.isArray(userTeam?.roster) ? userTeam.roster : [];
      const rookie = roster.find((player) => player?.id === fixture.targetProspectId) ?? null;
      const mapRookie = players?.[fixture.targetProspectId] ?? null;
      const targetStillInDraftClass = draftClass.some((prospect) => prospect?.id === fixture.targetProspectId);
      const userPickStillAvailable = (userTeam?.draftPicks ?? []).some((pick) => (
        pick?.year === fixture.year
        && pick?.round === 1
        && pick?.pick === 1
        && pick?.originalTeamId === fixture.userTeamId
      ));
      const actions = scouting?.actions ?? [];
      const scoutingPersisted = Boolean(
        save?.phase === 'draft'
        && save?.offseasonState?.scoutingWatchlist?.includes(fixture.targetProspectId)
        && actions.includes('film')
        && actions.includes('private_workout')
        && scouting?.assignedScoutId === fixture.scoutId
        && typeof scouting?.proDayRating === 'string'
        && scouting.proDayRating.length > 0
        && Array.isArray(scouting?.privateWorkoutRatings)
        && scouting.privateWorkoutRatings.length > 0
        && Number(scouting?.confidence ?? 0) > 0
        && save?.scoutingDepartment?.privateWorkoutsRemaining === fixture.privateWorkoutsBefore - 1
      );
      const draftPersisted = Boolean(
        !targetStillInDraftClass
        && rookie
        && mapRookie
        && rookie.teamId === fixture.userTeamId
        && mapRookie.teamId === fixture.userTeamId
        && rookie.draftYear === fixture.year
        && rookie.draftRound === 1
        && rookie.draftPick === 1
        && mapRookie.draftYear === fixture.year
        && mapRookie.draftRound === 1
        && mapRookie.draftPick === 1
        && !userPickStillAvailable
        && save?.offseasonState?.completedDraftPickIds?.includes(fixture.draftEntryId)
        && Number(save?.offseasonState?.currentDraftPickIndex ?? -1) >= 1
      );
      const draftNewsPersisted = (save?.leagueNews ?? []).some((item) => (
        item?.type === 'draft'
        && item?.playerIds?.includes(fixture.targetProspectId)
        && item?.teamIds?.includes(fixture.userTeamId)
      ));
      const allPersisted = Boolean(scoutingPersisted && draftPersisted && draftNewsPersisted);
      return {
        ok: Boolean(scoutingPersisted || draftPersisted),
        allPersisted,
        scoutingPersisted,
        draftPersisted,
        draftNewsPersisted,
        reason: allPersisted ? 'draft/scouting workflow persisted' : 'latest autosave does not match draft/scouting expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        saveYear: save?.year ?? null,
        saveWeek: save?.week ?? null,
        savePhase: save?.phase ?? null,
        actions,
        assignedScoutId: scouting?.assignedScoutId ?? null,
        proDayRating: scouting?.proDayRating ?? null,
        privateWorkoutRatings: scouting?.privateWorkoutRatings ?? null,
        privateWorkoutsRemaining: save?.scoutingDepartment?.privateWorkoutsRemaining ?? null,
        watchlist: save?.offseasonState?.scoutingWatchlist ?? null,
        targetStillInDraftClass,
        rookieName: displayName(rookie, fixture.targetProspectId),
        mapRookieName: displayName(mapRookie, fixture.targetProspectId),
        rookieDraftYear: rookie?.draftYear ?? null,
        rookieDraftRound: rookie?.draftRound ?? null,
        rookieDraftPick: rookie?.draftPick ?? null,
        userPickStillAvailable,
        currentDraftPickIndex: save?.offseasonState?.currentDraftPickIndex ?? null,
        completedDraftPickIds: save?.offseasonState?.completedDraftPickIds ?? null,
      };
    })()
  `;
}

async function readLatestAutosaveDraftScoutingState(cdp, sessionId, fixture) {
  return evaluate(cdp, sessionId, latestAutosaveDraftScoutingStateExpression(fixture), true);
}

async function waitForLatestAutosaveDraftScouting(cdp, sessionId, fixture, expectation, label, ms = timeoutMs) {
  try {
    return await waitFor(label, async () => {
      const state = await readLatestAutosaveDraftScoutingState(cdp, sessionId, fixture);
      return state?.[expectation] ? state : false;
    }, ms);
  } catch (err) {
    const state = await readLatestAutosaveDraftScoutingState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave draft/scouting state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function runDraftScoutingSmoke(cdp, sessionId, baseUrl) {
  console.log('Staging draft/scouting smoke fixture from the latest autosave...');
  const fixture = await stageDraftScoutingFixture(cdp, sessionId);
  if (!fixture?.targetProspectName || !fixture?.draftEntryId || !fixture?.scoutId) {
    throw new Error(`Draft/scouting smoke fixture did not return usable identifiers: ${JSON.stringify(fixture)}`);
  }
  console.log(`Draft/scouting fixture: ${fixture.targetProspectName} (${fixture.targetProspectPos}) at pick #1 with scout ${fixture.scoutName}.`);

  const scoutingRoute = '/scouting';
  console.log(`Running scouting smoke at ${baseUrl}#${scoutingRoute}...`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, scoutingRoute, 'draft/scouting fixture staging', ['Scouting Sources', 'Scouting Board']);
  await waitForBodyText(cdp, sessionId, fixture.targetProspectName, 'staged draft prospect on scouting route');
  await clickButtonNearText(cdp, sessionId, 'Watch', fixture.targetProspectName, 'clickable Watch button for staged draft prospect');
  await waitForBodyText(cdp, sessionId, 'Scouting Watchlist Receipt', 'scouting watchlist receipt panel');
  await clickButtonNearText(cdp, sessionId, 'film', fixture.targetProspectName, 'clickable film button for staged draft prospect');
  await waitForBodyText(cdp, sessionId, 'Scouting Intel Receipt', 'scouting intel receipt panel');
  await clickButtonNearText(cdp, sessionId, 'Pro Day', fixture.targetProspectName, 'clickable Pro Day button for staged draft prospect');
  await waitForBodyText(cdp, sessionId, 'Pro Day Receipt', 'pro-day receipt panel');
  await clickButtonNearText(cdp, sessionId, 'Private Workout', fixture.targetProspectName, 'clickable Private Workout button for staged draft prospect');
  await waitForBodyText(cdp, sessionId, 'Private Workout Receipt', 'private-workout receipt panel');
  const scoutingSave = await waitForLatestAutosaveDraftScouting(
    cdp,
    sessionId,
    fixture,
    'scoutingPersisted',
    'scouting actions persisted to latest autosave',
  );
  console.log(`Saved scouting intel for ${fixture.targetProspectName}; pro day ${scoutingSave.proDayRating ?? 'n/a'}, latest autosave slot ${scoutingSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, scoutingRoute, 'draft/scouting scouting result', ['Scouting Sources', 'Scouting Board']);
  await waitForLatestAutosaveDraftScouting(
    cdp,
    sessionId,
    fixture,
    'scoutingPersisted',
    'scouting actions persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, 'Private workout:', 'private workout scouting text after hard reload');
  await waitForBodyText(cdp, sessionId, 'Pro Day:', 'pro-day scouting text after hard reload');

  const draftRoute = '/draft';
  console.log(`Running draft pick smoke at ${baseUrl}#${draftRoute}...`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, draftRoute, 'draft/scouting pre-draft state', ['Draft Board Sources', 'Draft Board']);
  await waitForBodyText(cdp, sessionId, fixture.targetProspectName, 'staged draft prospect on draft route');
  await clickButtonNearText(cdp, sessionId, 'Draft Player', fixture.targetProspectName, 'clickable Draft Player button for staged prospect');
  await waitForBodyText(cdp, sessionId, 'Draft Pick Receipt', 'draft pick receipt panel');
  const draftSave = await waitForLatestAutosaveDraftScouting(
    cdp,
    sessionId,
    fixture,
    'allPersisted',
    'draft pick and scouting state persisted to latest autosave',
    90_000,
  );
  console.log(`Drafted ${fixture.targetProspectName}; rookie ${draftSave.rookieName ?? fixture.targetProspectName}, latest autosave slot ${draftSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, draftRoute, 'draft/scouting draft result', ['Draft Board Sources', 'Draft Board']);
  await waitForLatestAutosaveDraftScouting(
    cdp,
    sessionId,
    fixture,
    'allPersisted',
    'draft/scouting workflow persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, 'Current Pick', 'draft route current pick after draft hard reload');
}

async function stageDraftWarRoomTradeFixture(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (async () => {
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const writeSave = (db, slot) => new Promise((resolveWrite, rejectWrite) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(slot);
        request.onsuccess = () => resolveWrite();
        request.onerror = () => rejectWrite(request.error ?? new Error('Could not write mfd save slot.'));
      });
      const teamName = (team) => [team?.city, team?.name].filter(Boolean).join(' ') || team?.id || '';

      const db = await openDb();
      const saves = await readSaves(db);
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        if (typeof db.close === 'function') db.close();
        throw new Error('No latest autosave data available to stage the draft war-room trade smoke fixture.');
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        if (typeof db.close === 'function') db.close();
        throw new Error('Latest autosave data was not valid JSON.');
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      const cpuTeam = Object.values(teams).find((team) => team?.id && team.id !== userTeam?.id);
      if (!save || !userTeam?.id || !cpuTeam?.id) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find usable user and CPU teams for the draft war-room trade smoke fixture.');
      }

      const year = Number(save.year) || Number(latest.year) || 2026;
      const currentEntryId = userTeam.id + '-' + year + '-1-1-' + userTeam.id;
      const offeredEntryId = cpuTeam.id + '-' + year + '-1-9-' + cpuTeam.id;
      const futurePickId = cpuTeam.id + '-' + (year + 1) + '-3-9-' + cpuTeam.id;
      const targetProspect = {
        id: 'smoke-war-room-qb-1',
        firstName: 'Talon',
        lastName: 'Voltage',
        pos: 'QB',
        college: 'Oklahoma',
        region: 'south',
        ratings: {
          awareness: 91,
          speed: 76,
          stamina: 84,
          throwAccuracy: 94,
          throwPower: 93,
          decisionSpeed: 91,
          leadership: 89,
        },
        projectedRound: 1,
        scoutGrade: 94,
        trueGrade: 99,
        personality: {
          workEthic: 9,
          loyalty: 7,
          greed: 4,
          pressure: 9,
          ambition: 9,
        },
        traits: ['field_general', 'clutch'],
        archetype: {
          archetype: 'field_general',
          label: 'Field General',
          description: 'Premium quarterback prospect with immediate franchise value.',
        },
        characterArchetype: 'captain',
        bustProbability: 0.08,
        stealProbability: 0.32,
        scoutingReports: [],
        combine: {
          fortyYard: 4.69,
          benchPress: 18,
          vertical: 34.1,
          broadJump: 119.3,
          threeCone: 6.95,
          shuttle: 4.19,
        },
        bloodline: null,
      };

      save.players = players;
      for (const team of Object.values(teams)) {
        if (!Array.isArray(team?.roster)) continue;
        team.roster = team.roster.filter((player) => player?.id !== targetProspect.id);
      }
      delete players[targetProspect.id];
      if (Array.isArray(cpuTeam.roster)) {
        for (const player of cpuTeam.roster) {
          if (player?.pos === 'QB') {
            player.ovr = 58;
            if (players?.[player.id]) players[player.id].ovr = 58;
          }
        }
      }

      const removeStagedPicks = (team) => {
        team.draftPicks = (team.draftPicks ?? []).filter((pick) => !(
          (pick?.year === year && pick?.round === 1 && pick?.pick === 1 && pick?.originalTeamId === userTeam.id) ||
          (pick?.year === year && pick?.round === 1 && pick?.pick === 9 && pick?.originalTeamId === cpuTeam.id) ||
          (pick?.year === year + 1 && pick?.round === 3 && pick?.pick === 9 && pick?.originalTeamId === cpuTeam.id)
        ));
      };
      removeStagedPicks(userTeam);
      removeStagedPicks(cpuTeam);
      userTeam.draftPicks.push({
        round: 1,
        pick: 1,
        originalTeamId: userTeam.id,
        currentTeamId: userTeam.id,
        year,
        isCompPick: false,
      });
      cpuTeam.draftPicks.push({
        round: 1,
        pick: 9,
        originalTeamId: cpuTeam.id,
        currentTeamId: cpuTeam.id,
        year,
        isCompPick: false,
      });
      cpuTeam.draftPicks.push({
        round: 3,
        pick: 9,
        originalTeamId: cpuTeam.id,
        currentTeamId: cpuTeam.id,
        year: year + 1,
        isCompPick: false,
      });

      save.phase = 'draft';
      save.year = year;
      save.week = Number(save.week) || Number(latest.week) || 1;
      save.draftClass = [
        targetProspect,
        ...((save.draftClass ?? []).filter((prospect) => prospect?.id && prospect.id !== targetProspect.id)),
      ];
      save.offseasonState = {
        round: 0,
        expiringPlayerIds: [],
        reSignDecisions: {},
        freeAgencyBids: {},
        scoutingState: {},
        scoutingWatchlist: [],
        tradeOffers: [],
        draftOrder: [
          {
            id: currentEntryId,
            teamId: userTeam.id,
            round: 1,
            pick: 1,
            overall: 1,
            originalTeamId: userTeam.id,
          },
          {
            id: offeredEntryId,
            teamId: cpuTeam.id,
            round: 1,
            pick: 9,
            overall: 9,
            originalTeamId: cpuTeam.id,
          },
        ],
        currentDraftPickIndex: 0,
        completedDraftPickIds: [],
      };
      save.warRoomState = null;
      save.pendingPassedPickTargets = [];
      if (save.scenarioState) {
        save.scenarioState = {
          ...save.scenarioState,
          activeScenario: null,
        };
      }

      latest.data = JSON.stringify(envelope);
      latest.year = save.year;
      latest.week = save.week;
      latest.timestamp = Date.now();
      await writeSave(db, latest);
      if (typeof db.close === 'function') db.close();

      return {
        year,
        week: save.week,
        userTeamId: userTeam.id,
        userTeamName: teamName(userTeam),
        cpuTeamId: cpuTeam.id,
        cpuTeamName: teamName(cpuTeam),
        currentEntryId,
        offeredEntryId,
        futurePickId,
        targetProspectId: targetProspect.id,
        targetProspectName: targetProspect.firstName + ' ' + targetProspect.lastName,
        offerAnchorText: cpuTeam.id + ' wants pick #1',
      };
    })()
  `, true);
}

function latestAutosaveDraftWarRoomTradeStateExpression(fixture) {
  return `
    (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const hasPick = (team, expected) => (team?.draftPicks ?? []).some((pick) => (
        pick?.year === expected.year
        && pick?.round === expected.round
        && pick?.pick === expected.pick
        && pick?.originalTeamId === expected.originalTeamId
        && pick?.currentTeamId === expected.currentTeamId
      ));
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const userTeam = save?.teams?.[fixture.userTeamId] ?? null;
      const cpuTeam = save?.teams?.[fixture.cpuTeamId] ?? null;
      const draftOrder = save?.offseasonState?.draftOrder ?? [];
      const currentPickEntry = draftOrder.find((entry) => (
        entry?.round === 1
        && entry?.pick === 1
        && entry?.overall === 1
        && entry?.originalTeamId === fixture.userTeamId
      )) ?? null;
      const offeredPickEntry = draftOrder.find((entry) => (
        entry?.round === 1
        && entry?.pick === 9
        && entry?.overall === 9
        && entry?.originalTeamId === fixture.cpuTeamId
      )) ?? null;
      const draftOrderUpdated = Boolean(
        currentPickEntry?.teamId === fixture.cpuTeamId
        && currentPickEntry?.id === fixture.cpuTeamId + '-' + fixture.year + '-1-1-' + fixture.userTeamId
        && offeredPickEntry?.teamId === fixture.userTeamId
        && offeredPickEntry?.id === fixture.userTeamId + '-' + fixture.year + '-1-9-' + fixture.cpuTeamId
      );
      const userReceivedCurrentPick = hasPick(userTeam, {
        year: fixture.year,
        round: 1,
        pick: 9,
        originalTeamId: fixture.cpuTeamId,
        currentTeamId: fixture.userTeamId,
      });
      const userReceivedFuturePick = hasPick(userTeam, {
        year: fixture.year + 1,
        round: 3,
        pick: 9,
        originalTeamId: fixture.cpuTeamId,
        currentTeamId: fixture.userTeamId,
      });
      const cpuReceivedUserPick = hasPick(cpuTeam, {
        year: fixture.year,
        round: 1,
        pick: 1,
        originalTeamId: fixture.userTeamId,
        currentTeamId: fixture.cpuTeamId,
      });
      const userStillOwnsUserPick = hasPick(userTeam, {
        year: fixture.year,
        round: 1,
        pick: 1,
        originalTeamId: fixture.userTeamId,
        currentTeamId: fixture.userTeamId,
      });
      const cpuStillOwnsOfferPicks = hasPick(cpuTeam, {
        year: fixture.year,
        round: 1,
        pick: 9,
        originalTeamId: fixture.cpuTeamId,
        currentTeamId: fixture.cpuTeamId,
      }) || hasPick(cpuTeam, {
        year: fixture.year + 1,
        round: 3,
        pick: 9,
        originalTeamId: fixture.cpuTeamId,
        currentTeamId: fixture.cpuTeamId,
      });
      const warRoomRebuiltForCpu = Boolean(
        save?.warRoomState?.currentPick === 1
        && save?.warRoomState?.onTheClock === fixture.cpuTeamId
        && Array.isArray(save?.warRoomState?.incomingOffers)
        && save.warRoomState.incomingOffers.length === 0
      );
      const draftTradeNews = (save?.leagueNews ?? []).find((item) => (
        item?.id === 'draft-trade-' + fixture.year + '-' + fixture.week + '-1-' + fixture.cpuTeamId
        && item?.type === 'trade'
        && Array.isArray(item?.teamIds)
        && item.teamIds.includes(fixture.cpuTeamId)
        && item.teamIds.includes(fixture.userTeamId)
        && String(item?.body ?? '').includes('Future round 3 pick')
        && String(item?.body ?? '').includes('Draft order ownership updated')
      )) ?? null;
      const draftTradeNewsPersisted = Boolean(draftTradeNews);
      const transferPersisted = Boolean(
        save?.phase === 'draft'
        && draftOrderUpdated
        && userReceivedCurrentPick
        && userReceivedFuturePick
        && cpuReceivedUserPick
        && !userStillOwnsUserPick
        && !cpuStillOwnsOfferPicks
        && warRoomRebuiltForCpu
        && draftTradeNewsPersisted
      );
      return {
        ok: transferPersisted,
        transferPersisted,
        draftOrderUpdated,
        userReceivedCurrentPick,
        userReceivedFuturePick,
        cpuReceivedUserPick,
        userStillOwnsUserPick,
        cpuStillOwnsOfferPicks,
        warRoomRebuiltForCpu,
        draftTradeNewsPersisted,
        reason: transferPersisted ? 'draft war-room trade transfer persisted' : 'latest autosave does not match draft war-room trade expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        saveYear: save?.year ?? null,
        saveWeek: save?.week ?? null,
        savePhase: save?.phase ?? null,
        currentDraftPickIndex: save?.offseasonState?.currentDraftPickIndex ?? null,
        currentPickEntry,
        offeredPickEntry,
        draftTradeNews,
        warRoomState: save?.warRoomState ?? null,
        userDraftPicks: userTeam?.draftPicks ?? null,
        cpuDraftPicks: cpuTeam?.draftPicks ?? null,
      };
    })()
  `;
}

async function readLatestAutosaveDraftWarRoomTradeState(cdp, sessionId, fixture) {
  return evaluate(cdp, sessionId, latestAutosaveDraftWarRoomTradeStateExpression(fixture), true);
}

async function waitForLatestAutosaveDraftWarRoomTrade(cdp, sessionId, fixture, expectation, label, ms = timeoutMs) {
  try {
    return await waitFor(label, async () => {
      const state = await readLatestAutosaveDraftWarRoomTradeState(cdp, sessionId, fixture);
      return state?.[expectation] ? state : false;
    }, ms);
  } catch (err) {
    const state = await readLatestAutosaveDraftWarRoomTradeState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave draft war-room trade state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function runDraftWarRoomTradeSmoke(cdp, sessionId, baseUrl) {
  console.log('Staging draft war-room trade smoke fixture from the latest autosave...');
  const fixture = await stageDraftWarRoomTradeFixture(cdp, sessionId);
  if (!fixture?.offerAnchorText || !fixture?.futurePickId || !fixture?.targetProspectName) {
    throw new Error(`Draft war-room trade smoke fixture did not return usable identifiers: ${JSON.stringify(fixture)}`);
  }
  console.log(`Draft war-room fixture: ${fixture.cpuTeamName} offers pick #9 plus a future round 3 pick for #1 and ${fixture.targetProspectName}.`);

  const draftRoute = '/draft';
  console.log(`Running draft war-room trade smoke at ${baseUrl}#${draftRoute}...`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, draftRoute, 'draft war-room trade fixture staging', ['Draft Board Sources', 'War Room']);
  await waitForBodyText(cdp, sessionId, fixture.targetProspectName, 'staged elite prospect on draft route');
  await waitForBodyText(cdp, sessionId, fixture.offerAnchorText, 'staged incoming draft war-room offer');
  await waitForBodyText(cdp, sessionId, 'Future round 3 pick', 'source-backed future sweetener text');
  await waitForBodyText(cdp, sessionId, 'Draft Market Receipt', 'draft market receipt before accepting trade');
  await clickButtonNearText(cdp, sessionId, 'Accept', fixture.offerAnchorText, 'clickable Accept button for staged draft war-room offer');
  const tradeSave = await waitForLatestAutosaveDraftWarRoomTrade(
    cdp,
    sessionId,
    fixture,
    'transferPersisted',
    'draft war-room trade transfer persisted to latest autosave',
    90_000,
  );
  console.log(`Accepted draft war-room offer from ${fixture.cpuTeamId}; live order and future pick transfer persisted in autosave slot ${tradeSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, draftRoute, 'draft war-room trade result', ['Draft Board Sources', 'War Room']);
  await waitForLatestAutosaveDraftWarRoomTrade(
    cdp,
    sessionId,
    fixture,
    'transferPersisted',
    'draft war-room trade transfer persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, 'Current Pick', 'draft route current pick after war-room trade hard reload');
}

async function stageStaffFacilityMedicalFixture(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (async () => {
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const writeSave = (db, slot) => new Promise((resolveWrite, rejectWrite) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(slot);
        request.onsuccess = () => resolveWrite();
        request.onerror = () => rejectWrite(request.error ?? new Error('Could not write mfd save slot.'));
      });
      const baseEffect = {
        trainingXPBonus: 1,
        recoveryBonus: 1,
        injuryPreventionBonus: 1,
        scoutingBonus: 1,
        moraleBonus: 1,
        fatigueGainBonus: 1,
      };

      const db = await openDb();
      const saves = await readSaves(db);
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        if (typeof db.close === 'function') db.close();
        throw new Error('No latest autosave data available to stage the staff/facility/medical smoke fixture.');
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        if (typeof db.close === 'function') db.close();
        throw new Error('Latest autosave data was not valid JSON.');
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      if (!save || !userTeam?.id) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find a user team for the staff/facility/medical smoke fixture.');
      }

      const facilityType = 'medical_center';
      const facilityLabel = 'Medical Center';
      const startingBudget = 10;
      const upgradeCost = 4;
      const startingLevel = 1;
      const expectedLevel = 2;
      const expectedBudget = startingBudget - upgradeCost;
      const startingEffect = {
        trainingXPBonus: 1,
        recoveryBonus: 1.05,
        injuryPreventionBonus: 0.99,
        scoutingBonus: 1,
        moraleBonus: 1,
        fatigueGainBonus: 1,
      };
      const expectedEffect = {
        trainingXPBonus: 1,
        recoveryBonus: 1.1,
        injuryPreventionBonus: 0.98,
        scoutingBonus: 1,
        moraleBonus: 1,
        fatigueGainBonus: 1,
      };
      const priorStaff = {
        id: 'smoke-medical-current',
        name: 'Rowan Baseline',
        tier: 'average',
        salary: 1.1,
        recoveryBonus: 1,
        preventionBonus: 1,
      };
      const candidate = {
        id: 'smoke-medical-elite',
        name: 'Ivy Patch',
        tier: 'elite',
        salary: 2.8,
        recoveryBonus: 0.8,
        preventionBonus: 0.8,
      };
      const facilityTypes = [
        'training_complex',
        'medical_center',
        'film_room',
        'weight_room',
        'recovery_suite',
      ];

      userTeam.facilityState = {
        facilities: facilityTypes.map((type) => ({
          type,
          level: type === facilityType ? startingLevel : 1,
          effect: type === facilityType ? { ...startingEffect } : { ...baseEffect },
        })),
        budget: startingBudget,
        maxFacilities: 5,
        upgradeCosts: {
          training_complex: [5, 8],
          medical_center: [upgradeCost, 8],
          film_room: [3, 6],
          weight_room: [6, 9],
          recovery_suite: [5, 10],
        },
      };
      userTeam.medicalStaff = priorStaff;
      save.availableMedicalStaff = [
        candidate,
        ...((save.availableMedicalStaff ?? []).filter((staff) => (
          staff?.id
          && staff.id !== candidate.id
          && staff.id !== priorStaff.id
        ))),
      ];
      save.phase = 'offseason';
      save.offseasonState = null;
      save.warRoomState = null;

      latest.data = JSON.stringify(envelope);
      latest.year = save.year;
      latest.week = save.week;
      latest.timestamp = Date.now();
      await writeSave(db, latest);
      if (typeof db.close === 'function') db.close();

      return {
        year: save.year,
        week: save.week,
        userTeamId: userTeam.id,
        userTeamName: [userTeam.city, userTeam.name].filter(Boolean).join(' '),
        facilityType,
        facilityLabel,
        facilityButtonText: 'Upgrade ($' + upgradeCost + ')',
        startingBudget,
        upgradeCost,
        expectedBudget,
        expectedEffect,
        startingLevel,
        expectedLevel,
        priorStaffId: priorStaff.id,
        priorStaffName: priorStaff.name,
        medicalCandidateId: candidate.id,
        medicalCandidateName: candidate.name,
      };
    })()
  `, true);
}

function latestAutosaveStaffFacilityMedicalStateExpression(fixture) {
  return `
    (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }
      const save = envelope?.save;
      const userTeam = save?.teams?.[fixture.userTeamId] ?? Object.values(save?.teams ?? {}).find((team) => team?.isUser);
      const facility = userTeam?.facilityState?.facilities?.find((entry) => entry?.type === fixture.facilityType) ?? null;
      const availableMedicalStaff = save?.availableMedicalStaff ?? [];
      const availableIds = availableMedicalStaff.map((staff) => staff?.id).filter(Boolean);
      const facilityBudget = Number(userTeam?.facilityState?.budget ?? NaN);
      const facilityEffectMatches = Boolean(
        fixture.expectedEffect
        && facility?.effect
        && Object.entries(fixture.expectedEffect).every(([key, value]) => Math.abs(Number(facility.effect[key]) - Number(value)) < 0.0001)
      );
      const facilityUpgraded = Boolean(
        facility
        && facility.level === fixture.expectedLevel
        && Math.abs(facilityBudget - fixture.expectedBudget) < 0.001
        && facilityEffectMatches
      );
      const medicalHired = Boolean(
        userTeam?.medicalStaff?.id === fixture.medicalCandidateId
        && !availableIds.includes(fixture.medicalCandidateId)
        && availableIds.includes(fixture.priorStaffId)
      );
      const allPersisted = Boolean(facilityUpgraded && medicalHired);
      return {
        ok: Boolean(facilityUpgraded || medicalHired),
        allPersisted,
        facilityUpgraded,
        medicalHired,
        reason: allPersisted ? 'staff/facility/medical workflow persisted' : 'latest autosave does not match staff/facility/medical expectations',
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        saveYear: save?.year ?? null,
        saveWeek: save?.week ?? null,
        savePhase: save?.phase ?? null,
        facilityType: fixture.facilityType,
        facilityLevel: facility?.level ?? null,
        facilityBudget,
        facilityEffectMatches,
        facilityEffect: facility?.effect ?? null,
        medicalStaffId: userTeam?.medicalStaff?.id ?? null,
        medicalStaffName: userTeam?.medicalStaff?.name ?? null,
        availableIds,
      };
    })()
  `;
}

async function readLatestAutosaveStaffFacilityMedicalState(cdp, sessionId, fixture) {
  return evaluate(cdp, sessionId, latestAutosaveStaffFacilityMedicalStateExpression(fixture), true);
}

async function waitForLatestAutosaveStaffFacilityMedical(cdp, sessionId, fixture, expectation, label, ms = timeoutMs) {
  try {
    return await waitFor(label, async () => {
      const state = await readLatestAutosaveStaffFacilityMedicalState(cdp, sessionId, fixture);
      return state?.[expectation] ? state : false;
    }, ms);
  } catch (err) {
    const state = await readLatestAutosaveStaffFacilityMedicalState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave staff/facility/medical state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function runStaffFacilityMedicalSmoke(cdp, sessionId, baseUrl) {
  console.log('Staging staff/facility/medical smoke fixture from the latest autosave...');
  const fixture = await stageStaffFacilityMedicalFixture(cdp, sessionId);
  if (!fixture?.facilityLabel || !fixture?.medicalCandidateName || !fixture?.userTeamId) {
    throw new Error(`Staff/facility/medical smoke fixture did not return usable identifiers: ${JSON.stringify(fixture)}`);
  }
  console.log(`Staff/facility/medical fixture: upgrade ${fixture.facilityLabel}, hire ${fixture.medicalCandidateName}.`);

  const route = '/settings';
  console.log(`Running staff/facility/medical smoke at ${baseUrl}#${route}...`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'staff/facility/medical fixture staging', ['Settings', 'Operations Source']);
  await waitForBodyText(cdp, sessionId, fixture.facilityLabel, 'staged facility on settings route');
  await waitForBodyText(cdp, sessionId, fixture.medicalCandidateName, 'staged medical candidate on settings route');
  await clickButtonNearText(cdp, sessionId, fixture.facilityButtonText, fixture.facilityLabel, 'clickable facility upgrade button');
  await waitForBodyText(cdp, sessionId, 'Facility Upgrade Processed', 'facility upgrade receipt panel');
  const facilitySave = await waitForLatestAutosaveStaffFacilityMedical(
    cdp,
    sessionId,
    fixture,
    'facilityUpgraded',
    'facility upgrade persisted to latest autosave',
  );
  console.log(`Upgraded ${fixture.facilityLabel} to level ${facilitySave.facilityLevel}; latest autosave slot ${facilitySave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'staff/facility/medical facility result', ['Settings', 'Operations Source']);
  await waitForLatestAutosaveStaffFacilityMedical(
    cdp,
    sessionId,
    fixture,
    'facilityUpgraded',
    'facility upgrade persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, 'L2', 'facility level after hard reload');

  await clickButtonNearText(cdp, sessionId, 'Hire Staff', fixture.medicalCandidateName, 'clickable Hire Staff button for staged medical candidate');
  await waitForBodyText(cdp, sessionId, 'Medical Staff Hire Processed', 'medical staff hire receipt panel');
  const medicalSave = await waitForLatestAutosaveStaffFacilityMedical(
    cdp,
    sessionId,
    fixture,
    'allPersisted',
    'medical hire and facility upgrade persisted to latest autosave',
  );
  console.log(`Hired ${medicalSave.medicalStaffName ?? fixture.medicalCandidateName}; latest autosave slot ${medicalSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'staff/facility/medical final state', ['Settings', 'Operations Source']);
  await waitForLatestAutosaveStaffFacilityMedical(
    cdp,
    sessionId,
    fixture,
    'allPersisted',
    'staff/facility/medical workflow persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, fixture.medicalCandidateName, 'hired medical staff after hard reload');
}

async function runChipMuteSmoke(cdp, sessionId, baseUrl) {
  const route = '/roster';
  console.log('Running Chip mute persistence smoke...');
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Roster Sources', 'Chip mute smoke roster source panel');

  await waitFor('expanded Chip dock with active route guidance', () => evaluate(cdp, sessionId, `
    (() => {
      const dock = document.querySelector('[data-chip-dock="true"]');
      if (!dock) return false;
      if (dock.getAttribute('data-chip-dock-state') === 'collapsed') {
        const opener = dock.querySelector('button[data-chip-ask-dock-button="true"], button[aria-label^="Ask Chip"], button[aria-label^="Open Chip"]');
        if (opener instanceof HTMLButtonElement) opener.click();
        return false;
      }
      return Boolean(dock.querySelector('[data-chip-route-beat]'));
    })()
  `));

  // E4: the quiet trio lives inside the quiet menu; open it before looking
  // for the Mute season control.
  await waitFor('open Chip quiet menu', () => evaluate(cdp, sessionId, `
    (() => {
      if (document.querySelector('[data-chip-quiet-menu="true"]')) return true;
      const trigger = document.querySelector('button[data-chip-control-id="quietMenu"]');
      if (trigger instanceof HTMLButtonElement && !trigger.disabled) trigger.click();
      return false;
    })()
  `));

  try {
    await waitFor('visible Mute season control', () => evaluate(cdp, sessionId, `
      (() => {
        const control = document.querySelector('button[data-chip-control-id="quietThisSeason"]');
        if (!(control instanceof HTMLButtonElement) || control.disabled) return false;
        const rect = control.getBoundingClientRect();
        const label = (control.innerText ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
        return rect.width >= 80 && rect.height >= 32 && label.includes('mute season');
      })()
    `));
  } catch (err) {
    const evidence = await evaluate(cdp, sessionId, `
      (() => {
        const dock = document.querySelector('[data-chip-dock="true"]');
        const control = document.querySelector('button[data-chip-control-id="quietThisSeason"]');
        const rect = control?.getBoundingClientRect();
        return JSON.stringify({
          dockState: dock?.getAttribute('data-chip-dock-state') ?? null,
          dockBeat: dock?.getAttribute('data-chip-dock-beat') ?? null,
          hasRouteBeat: Boolean(document.querySelector('[data-chip-route-beat]')),
          controlExists: control instanceof HTMLButtonElement,
          disabled: control instanceof HTMLButtonElement ? control.disabled : null,
          innerText: control instanceof HTMLButtonElement ? (control.innerText ?? '').replace(/\\s+/g, ' ').trim() : null,
          textContent: control instanceof HTMLButtonElement ? (control.textContent ?? '').replace(/\\s+/g, ' ').trim() : null,
          ariaLabel: control instanceof HTMLButtonElement ? control.getAttribute('aria-label') : null,
          width: rect?.width ?? null,
          height: rect?.height ?? null,
          display: control instanceof HTMLButtonElement ? getComputedStyle(control).display : null,
          labelDisplay: control instanceof HTMLButtonElement
            ? getComputedStyle(control.querySelector('.mfd-chip-dock__control-label')).display
            : null,
        });
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip mute evidence: ${evidence}`);
  }

  await evaluate(cdp, sessionId, `
    (() => {
      const control = document.querySelector('button[data-chip-control-id="quietThisSeason"]');
      if (!(control instanceof HTMLButtonElement) || control.disabled) return false;
      control.click();
      return true;
    })()
  `);

  await waitFor('Chip season mute persisted and route coaching quieted', () => evaluate(cdp, sessionId, `
    (() => {
      const raw = localStorage.getItem('mfd.chip.local');
      if (!raw) return false;
      const prefs = JSON.parse(raw);
      return Number.isInteger(prefs.quietForSeason)
        && document.querySelector('[data-chip-dock="true"]')?.getAttribute('data-chip-dock-state') === 'collapsed'
        && !document.querySelector('[data-chip-route-beat]');
    })()
  `));

  const loadEvent = cdp.waitForEvent('Page.loadEventFired', () => true, sessionId);
  await cdp.send('Page.reload', { ignoreCache: true }, sessionId);
  await loadEvent;
  await waitForBodyText(cdp, sessionId, 'Continue Latest Autosave', 'Chip mute smoke launch continue after reload');
  await clickButtonContaining(cdp, sessionId, 'Continue Latest Autosave', 'Chip mute smoke clickable continue after reload');
  await waitFor('post-reload post-setup app shell for Chip mute smoke', () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('[data-mfd-app-shell="true"]'))
  `));
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Roster Sources', 'Chip mute smoke roster source panel after reload');
  await waitFor('Chip season mute survives hard reload', () => evaluate(cdp, sessionId, `
    (() => {
      const raw = localStorage.getItem('mfd.chip.local');
      if (!raw) return false;
      const prefs = JSON.parse(raw);
      return Number.isInteger(prefs.quietForSeason)
        && document.querySelector('[data-chip-dock="true"]')?.getAttribute('data-chip-dock-state') === 'collapsed'
        && !document.querySelector('[data-chip-route-beat]');
    })()
  `));
}

async function clearVisibleChipRouteBeats(cdp, sessionId, label) {
  for (let index = 0; index < 8; index += 1) {
    const state = await evaluate(cdp, sessionId, `
      (() => {
        const dock = document.querySelector('[data-chip-dock="true"]');
        if (!dock) return { done: false, reason: 'missing-dock' };
        if (dock.getAttribute('data-chip-dock-state') === 'collapsed') {
          const opener = dock.querySelector('button[data-chip-ask-dock-button="true"], button[aria-label^="Ask Chip"], button[aria-label^="Open Chip"]');
          if (opener instanceof HTMLButtonElement && !opener.disabled) opener.click();
          return { done: false, reason: 'opened-dock' };
        }
        const beat = document.querySelector('[data-chip-route-beat]');
        if (!beat) return { done: true };
        const id = beat.getAttribute('data-chip-route-beat');
        const button = [...beat.querySelectorAll('button')]
          .find((candidate) => (
            !candidate.disabled
            && ['Next', 'Got it'].includes((candidate.textContent ?? '').trim())
          ));
        if (!(button instanceof HTMLButtonElement)) return { done: false, reason: 'missing-route-action', id };
        const actionLabel = (button.textContent ?? '').trim();
        button.click();
        return { done: false, reason: 'clicked-route-action', id, actionLabel };
      })()
    `);
    if (state?.done) return;
    await delay(180);
  }

  const evidence = await readChipReceiptRespectEvidence(cdp, sessionId);
  throw new Error(`${label} did not clear route beats.\nChip Ask-summary evidence:\n${JSON.stringify(evidence, null, 2)}`);
}

async function runChipAskSummarySmoke(cdp, sessionId, baseUrl) {
  const route = '/';
  const clearCopy = 'Recommended: open Monday Briefing.';
  const clearWhere = 'Where: Action Center, then any legal team screen: roster, depth, cap, market, staff, scouting, medical, or Game Plan.';
  const clearConsequence = 'Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.';
  console.log('Running Chip Ask summary smoke...');

  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Living Week', 'Chip Ask summary briefing shell');
  await clearVisibleChipRouteBeats(cdp, sessionId, 'Chip Ask summary route beat clearing');

  await waitFor('clickable Where am I control for Ask Chip summary', () => evaluate(cdp, sessionId, `
    (() => {
      const dock = document.querySelector('[data-chip-dock="true"]');
      if (!dock) return false;
      if (dock.getAttribute('data-chip-dock-state') === 'collapsed') {
        const opener = dock.querySelector('button[data-chip-ask-dock-button="true"], button[aria-label^="Ask Chip"], button[aria-label^="Open Chip"]');
        if (opener instanceof HTMLButtonElement && !opener.disabled) opener.click();
        return false;
      }
      const button = [...document.querySelectorAll('button')]
        .find((candidate) => candidate.getAttribute('aria-label') === 'Where am I?' || (candidate.textContent ?? '').includes('Where am I?'));
      if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
      button.click();
      return true;
    })()
  `));

  try {
    await waitFor('Ask Chip summary live beat copy', () => evaluate(cdp, sessionId, `
      (() => {
        const beat = document.querySelector('[data-chip-live-beat="chip.dock.summary"]');
        const text = (beat?.textContent ?? '').replace(/\\s+/g, ' ').trim();
        const clearSummary = text.includes('Must Do: none right now.')
          && text.includes(${JSON.stringify(clearCopy)})
          && text.includes(${JSON.stringify(clearWhere)})
          && text.includes(${JSON.stringify(clearConsequence)});
        const pendingSummary = text.includes('Must Do: choose or defer')
          && text.includes('before Advance Week')
          && text.includes('Where: Inbox, Action Center, or highlighted screen badges')
          && text.includes('Consequence: offers, promises, votes, cap, lineup, and morale expire or lock at Advance Week.');
        return (clearSummary || pendingSummary)
          && !text.includes('review injuries, depth, cap space, and Game Plan')
          && !text.includes('Recommended: open Roster, Depth Chart, Cap Lab, or Game Plan only if')
          && !text.includes('Consequence: Advance Week locks what you accept.')
          && !text.includes('waiting decision screen')
          && !text.includes('unanswered items')
          ? text
          : false;
      })()
    `));
  } catch (err) {
    const evidence = await evaluate(cdp, sessionId, `
      (() => {
        const dock = document.querySelector('[data-chip-dock="true"]');
        const routeBeat = document.querySelector('[data-chip-route-beat]');
        const liveBeat = document.querySelector('[data-chip-live-beat]');
        const buttons = [...document.querySelectorAll('button')]
          .map((button) => ({
            text: (button.textContent ?? '').replace(/\\s+/g, ' ').trim(),
            aria: button.getAttribute('aria-label'),
            disabled: button.disabled,
          }))
          .filter((button) => button.text || button.aria)
          .slice(0, 30);
        return {
          href: window.location.href,
          dockState: dock?.getAttribute('data-chip-dock-state') ?? null,
          dockBeat: dock?.getAttribute('data-chip-dock-beat') ?? null,
          routeBeatId: routeBeat?.getAttribute('data-chip-route-beat') ?? null,
          routeBeatText: routeBeat ? (routeBeat.textContent ?? '').replace(/\\s+/g, ' ').trim() : null,
          liveBeatId: liveBeat?.getAttribute('data-chip-live-beat') ?? null,
          liveBeatText: liveBeat ? (liveBeat.textContent ?? '').replace(/\\s+/g, ' ').trim() : null,
          buttons,
        };
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip Ask-summary evidence:\n${JSON.stringify(evidence, null, 2)}`);
  }
}

async function readChipReceiptRespectEvidence(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (() => {
      const parseJson = (key, fallback) => {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        try {
          return JSON.parse(raw);
        } catch {
          return { parseError: true, raw };
        }
      };
      const dock = document.querySelector('[data-chip-dock="true"]');
      const routeBeat = document.querySelector('[data-chip-route-beat]');
      return {
        href: window.location.href,
        routeBeatId: routeBeat?.getAttribute('data-chip-route-beat') ?? null,
        routeBeatText: routeBeat instanceof HTMLElement ? (routeBeat.innerText ?? '').replace(/\\s+/g, ' ').trim() : null,
        dockState: dock?.getAttribute('data-chip-dock-state') ?? null,
        dockBeat: dock?.getAttribute('data-chip-dock-beat') ?? null,
        readReceipts: parseJson('mfd.chip.read.v1', []),
        onboardingState: parseJson('mfd.chip.onboarding.v2', null),
        dockPrefs: parseJson('mfd.chip.local', null),
      };
    })()
  `);
}

async function waitForChipRouteBeat(cdp, sessionId, expectedId, label) {
  try {
    return await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const expectedId = ${JSON.stringify(expectedId)};
        const dock = document.querySelector('[data-chip-dock="true"]');
        if (!dock) return false;
        if (dock.getAttribute('data-chip-dock-state') === 'collapsed') {
          const opener = dock.querySelector('button[data-chip-ask-dock-button="true"], button[aria-label^="Ask Chip"], button[aria-label^="Open Chip"]');
          if (opener instanceof HTMLButtonElement && !opener.disabled) opener.click();
          return false;
        }
        const beat = document.querySelector('[data-chip-route-beat]');
        const id = beat?.getAttribute('data-chip-route-beat') ?? null;
        if (!id) return false;
        return expectedId === null || id === expectedId ? id : false;
      })()
    `));
  } catch (err) {
    const evidence = await readChipReceiptRespectEvidence(cdp, sessionId);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip receipt-respect evidence:\n${JSON.stringify(evidence, null, 2)}`);
  }
}

async function waitForChipRouteBeatText(cdp, sessionId, expectedId, expectedText, label) {
  try {
    return await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const expectedId = ${JSON.stringify(expectedId)};
        const expectedText = ${JSON.stringify(expectedText)};
        const dock = document.querySelector('[data-chip-dock="true"]');
        if (!dock) return false;
        if (dock.getAttribute('data-chip-dock-state') === 'collapsed') {
          const opener = dock.querySelector('button[data-chip-ask-dock-button="true"], button[aria-label^="Ask Chip"], button[aria-label^="Open Chip"]');
          if (opener instanceof HTMLButtonElement && !opener.disabled) opener.click();
          return false;
        }
        const beat = document.querySelector('[data-chip-route-beat]');
        const id = beat?.getAttribute('data-chip-route-beat') ?? null;
        const text = (beat?.textContent ?? '').replace(/\\s+/g, ' ').trim();
        return id === expectedId && text.includes(expectedText) ? id : false;
      })()
    `));
  } catch (err) {
    const evidence = await readChipReceiptRespectEvidence(cdp, sessionId);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip route beat text evidence:\n${JSON.stringify(evidence, null, 2)}`);
  }
}

async function clickRouteBeatAction(cdp, sessionId, actionLabel, label) {
  return waitFor(label, () => evaluate(cdp, sessionId, `
    (() => {
      const actionLabel = ${JSON.stringify(actionLabel)};
      const beat = document.querySelector('[data-chip-route-beat]');
      if (!beat) return false;
      const button = [...beat.querySelectorAll('button')]
        .find((candidate) => !candidate.disabled && (candidate.textContent ?? '').trim() === actionLabel);
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()
  `));
}

async function waitForChipReadReceipts(cdp, sessionId, expectedIds, forbiddenIds, label) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const expectedIds = ${JSON.stringify(expectedIds)};
        const forbiddenIds = ${JSON.stringify(forbiddenIds)};
        let ids = [];
        try {
          const parsed = JSON.parse(localStorage.getItem('mfd.chip.read.v1') ?? '[]');
          ids = Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
        } catch {
          return false;
        }
        const seen = new Set(ids);
        return expectedIds.every((id) => seen.has(id))
          && forbiddenIds.every((id) => !seen.has(id));
      })()
    `));
  } catch (err) {
    const evidence = await readChipReceiptRespectEvidence(cdp, sessionId);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip receipt-respect evidence:\n${JSON.stringify(evidence, null, 2)}`);
  }
}

async function waitForChipOnboardingCompleted(cdp, sessionId, expectedBeatId, label) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const expectedBeatId = ${JSON.stringify(expectedBeatId)};
        let completedBeatIds = [];
        try {
          const parsed = JSON.parse(localStorage.getItem('mfd.chip.onboarding.v2') ?? '{}');
          completedBeatIds = Array.isArray(parsed.completedBeatIds)
            ? parsed.completedBeatIds.filter((entry) => typeof entry === 'string')
            : [];
        } catch {
          return false;
        }
        return completedBeatIds.includes(expectedBeatId);
      })()
    `));
  } catch (err) {
    const evidence = await readChipReceiptRespectEvidence(cdp, sessionId);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip receipt-respect evidence:\n${JSON.stringify(evidence, null, 2)}`);
  }
}

async function waitForNoChipRouteBeat(cdp, sessionId, expectedReceiptIds, label) {
  try {
    await waitFor(label, () => evaluate(cdp, sessionId, `
      (() => {
        const expectedReceiptIds = ${JSON.stringify(expectedReceiptIds)};
        let receipts = [];
        try {
          const parsed = JSON.parse(localStorage.getItem('mfd.chip.read.v1') ?? '[]');
          receipts = Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
        } catch {
          return false;
        }
        const seen = new Set(receipts);
        const prefsRaw = localStorage.getItem('mfd.chip.local');
        const prefs = prefsRaw ? JSON.parse(prefsRaw) : null;
        return expectedReceiptIds.every((id) => seen.has(id))
          && !document.querySelector('[data-chip-route-beat]')
          && (!prefs || (
            prefs.quietForScreen === null
            && prefs.quietUntilWeek === null
            && prefs.quietForSeason === null
          ));
      })()
    `));
  } catch (err) {
    const evidence = await readChipReceiptRespectEvidence(cdp, sessionId);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip receipt-respect evidence:\n${JSON.stringify(evidence, null, 2)}`);
  }
}

async function runChipMondayBeatChainSmoke(cdp, sessionId, baseUrl) {
  const route = '/';
  const firstTenMondayBeat = 'chip.first10.monday-briefing';
  const mondayBeatOne = 'chip.route.monday-briefing.beat-1';
  const firstTenText = 'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep.';
  const mondayBeatOneText = 'Must Do: open Action Center. Where: Monday Briefing. Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep.';
  console.log('Running Chip Monday route beat-chain smoke...');

  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Living Week', 'Chip Monday beat-chain briefing shell');
  await waitForChipRouteBeatText(
    cdp,
    sessionId,
    firstTenMondayBeat,
    firstTenText,
    'first-ten Monday briefing beat text before logging',
  );
  await clickRouteBeatAction(cdp, sessionId, 'Next', 'clickable Next control for first-ten Monday briefing beat');
  await waitForChipReadReceipts(
    cdp,
    sessionId,
    [firstTenMondayBeat],
    [mondayBeatOne],
    'first-ten Monday briefing beat persisted immediately after Next',
  );
  await waitForChipOnboardingCompleted(
    cdp,
    sessionId,
    firstTenMondayBeat,
    'first-ten Monday briefing onboarding completion persisted after Next',
  );
  await waitForChipRouteBeatText(
    cdp,
    sessionId,
    mondayBeatOne,
    mondayBeatOneText,
    'Monday briefing route beat text after first-ten receipt',
  );
}

async function runChipReceiptRespectSmoke(cdp, sessionId, baseUrl) {
  const rosterRoute = '/roster';
  const tradeRoute = '/trades';
  const firstTenRosterBeat = 'chip.first10.roster';
  const rosterBeatOne = 'chip.route.roster.beat-1';
  const rosterBeatTwo = 'chip.route.roster.beat-2';
  const rosterBeatThree = 'chip.route.roster.beat-3';
  const firstTenTradeBeat = 'chip.first10.trades';
  const tradeBeatOne = 'chip.route.trade-center.beat-1';
  const firstTenRosterText = 'Recommended: open Roster before Game Plan. Where: injuries and first backups. Consequence: uncovered backups force emergency signings.';
  const rosterBeatOneText = 'Recommended: decide starter, backup, trade, or cut. Where: highlighted player. Consequence: extra names do not fix the role.';
  const rosterBeatTwoText = 'Recommended: open Roster for injury and backup health. Where: Roster, then Depth Chart. Consequence: uncovered injuries force signings.';
  const rosterBeatThreeText = 'Optional: name expiring starters before cuts. Where: Roster. Consequence: contract years change which jobs depth must cover.';
  console.log('Running Chip route receipt-respect smoke...');

  await setHashRoute(cdp, sessionId, rosterRoute);
  await waitForBodyText(cdp, sessionId, 'Roster Sources', 'Chip receipt-respect roster source panel');
  await waitForChipRouteBeatText(cdp, sessionId, firstTenRosterBeat, firstTenRosterText, 'first-ten roster beat text before logging');
  await clickRouteBeatAction(cdp, sessionId, 'Next', 'clickable Next control for first-ten roster beat');
  await waitForChipReadReceipts(
    cdp,
    sessionId,
    [firstTenRosterBeat],
    [rosterBeatOne, rosterBeatTwo, rosterBeatThree],
    'first-ten roster beat persisted immediately after Next',
  );
  await waitForChipOnboardingCompleted(
    cdp,
    sessionId,
    firstTenRosterBeat,
    'first-ten roster onboarding completion persisted after Next',
  );
  await waitForChipRouteBeatText(cdp, sessionId, rosterBeatOne, rosterBeatOneText, 'first roster route beat text before logging');
  await clickRouteBeatAction(cdp, sessionId, 'Next', 'clickable Next control for first roster route beat');
  await waitForChipReadReceipts(
    cdp,
    sessionId,
    [firstTenRosterBeat, rosterBeatOne],
    [rosterBeatTwo, rosterBeatThree],
    'first roster route beat persisted immediately after Next',
  );
  await waitForChipRouteBeatText(cdp, sessionId, rosterBeatTwo, rosterBeatTwoText, 'second roster route beat text after first receipt');
  await clickRouteBeatAction(cdp, sessionId, 'Next', 'clickable Next control for second roster route beat');
  await waitForChipReadReceipts(
    cdp,
    sessionId,
    [firstTenRosterBeat, rosterBeatOne, rosterBeatTwo],
    [rosterBeatThree],
    'second roster route beat persisted immediately after Next',
  );
  await waitForChipRouteBeatText(cdp, sessionId, rosterBeatThree, rosterBeatThreeText, 'third roster route beat text after second receipt');

  await clickRouteBeatAction(cdp, sessionId, 'Got it', 'clickable Got it control for final roster route beat');
  await waitForChipReadReceipts(
    cdp,
    sessionId,
    [firstTenRosterBeat, rosterBeatOne, rosterBeatTwo, rosterBeatThree],
    [],
    'all roster route beats persisted after final Got it',
  );
  await waitForNoChipRouteBeat(
    cdp,
    sessionId,
    [firstTenRosterBeat, rosterBeatOne, rosterBeatTwo, rosterBeatThree],
    'roster route guidance suppressed by read receipts without quiet prefs',
  );

  await setHashRoute(cdp, sessionId, tradeRoute);
  await waitForBodyText(cdp, sessionId, 'Trade Center Sources', 'Chip receipt-respect trade source panel');
  await waitForChipRouteBeat(cdp, sessionId, firstTenTradeBeat, 'unseen first-ten trade beat appears after roster receipts');
  await clickRouteBeatAction(cdp, sessionId, 'Next', 'clickable Next control for first-ten trade beat');
  await waitForChipRouteBeat(cdp, sessionId, tradeBeatOne, 'unseen trade route beat still appears after roster receipts');

  await setHashRoute(cdp, sessionId, rosterRoute);
  await waitForBodyText(cdp, sessionId, 'Roster Sources', 'Chip receipt-respect roster source panel after route return');
  await waitForNoChipRouteBeat(
    cdp,
    sessionId,
    [firstTenRosterBeat, rosterBeatOne, rosterBeatTwo, rosterBeatThree],
    'roster route receipts suppress replay after route return',
  );

  await continueLatestAutosaveAfterReload(cdp, sessionId, 'Chip receipt-respect smoke');
  await setHashRoute(cdp, sessionId, rosterRoute);
  await waitForBodyText(cdp, sessionId, 'Roster Sources', 'Chip receipt-respect roster source panel after reload');
  await waitForNoChipRouteBeat(
    cdp,
    sessionId,
    [firstTenRosterBeat, rosterBeatOne, rosterBeatTwo, rosterBeatThree],
    'roster route receipts suppress replay after hard reload',
  );
}

async function continueLatestAutosaveAfterReload(cdp, sessionId, label) {
  const loadEvent = cdp.waitForEvent('Page.loadEventFired', () => true, sessionId);
  await cdp.send('Page.reload', { ignoreCache: true }, sessionId);
  await loadEvent;
  await waitForBodyText(cdp, sessionId, 'Continue Latest Autosave', `${label} launch continue after reload`);
  await clickButtonContaining(cdp, sessionId, 'Continue Latest Autosave', `${label} clickable continue after reload`);
  await waitFor(`${label} post-reload post-setup app shell`, () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('[data-mfd-app-shell="true"]'))
  `));
}

async function runChipFocusReducedMotionSmoke(cdp, sessionId, baseUrl) {
  const route = '/roster';
  console.log('Running Chip keyboard focus and reduced-motion smoke...');
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Roster Sources', 'Chip focus/reduced-motion roster source panel');

  await waitFor('Chip dock mounted for keyboard focus smoke', () => evaluate(cdp, sessionId, `
    Boolean(document.querySelector('[data-chip-dock="true"]'))
  `));

  try {
    await waitFor('collapsed Chip dock before keyboard open', () => evaluate(cdp, sessionId, `
      (() => {
        const dock = document.querySelector('[data-chip-dock="true"]');
        if (!dock) return false;
        if (dock.getAttribute('data-chip-dock-state') === 'collapsed') return true;
        const collapse = dock.querySelector('button[data-chip-control-id="collapse"]');
        if (collapse instanceof HTMLButtonElement && !collapse.disabled) collapse.click();
        return false;
      })()
    `));
  } catch (err) {
    const evidence = await evaluate(cdp, sessionId, `
      (() => {
        const dock = document.querySelector('[data-chip-dock="true"]');
        const collapse = document.querySelector('button[data-chip-control-id="collapse"]');
        return JSON.stringify({
          dockState: dock?.getAttribute('data-chip-dock-state') ?? null,
          dockBeat: dock?.getAttribute('data-chip-dock-beat') ?? null,
          collapseExists: collapse instanceof HTMLButtonElement,
          collapseDisabled: collapse instanceof HTMLButtonElement ? collapse.disabled : null,
          controlIds: [...document.querySelectorAll('[data-chip-control-id]')]
            .map((control) => control.getAttribute('data-chip-control-id')),
        });
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip focus collapse evidence: ${evidence}`);
  }

  await waitFor('focused Chip dock opener before keyboard activation', () => evaluate(cdp, sessionId, `
    (() => {
      const opener = document.querySelector('[data-chip-dock="true"] button[data-chip-ask-dock-button="true"], [data-chip-dock="true"] button[aria-label^="Ask Chip"], [data-chip-dock="true"] button[aria-label^="Open Chip"]');
      if (!(opener instanceof HTMLButtonElement) || opener.disabled) return false;
      opener.focus();
      return document.activeElement === opener;
    })()
  `));
  await pressKey(cdp, sessionId, 'Enter');

  try {
    await waitFor('keyboard Enter opens Chip dock', () => evaluate(cdp, sessionId, `
      document.querySelector('[data-chip-dock="true"]')?.getAttribute('data-chip-dock-state') === 'expanded'
    `));
  } catch (err) {
    const evidence = await evaluate(cdp, sessionId, `
      (() => {
        const dock = document.querySelector('[data-chip-dock="true"]');
        const active = document.activeElement;
        return JSON.stringify({
          dockState: dock?.getAttribute('data-chip-dock-state') ?? null,
          dockBeat: dock?.getAttribute('data-chip-dock-beat') ?? null,
          activeTag: active?.tagName ?? null,
          activeAriaLabel: active instanceof HTMLElement ? active.getAttribute('aria-label') : null,
          activeClass: active instanceof HTMLElement ? active.className : null,
          openerExists: Boolean(document.querySelector('[data-chip-dock="true"] button[data-chip-ask-dock-button="true"], [data-chip-dock="true"] button[aria-label^="Ask Chip"], [data-chip-dock="true"] button[aria-label^="Open Chip"]')),
        });
      })()
    `);
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nChip keyboard open evidence: ${evidence}`);
  }

  await waitFor('focused disable animations control before keyboard activation', () => evaluate(cdp, sessionId, `
    (() => {
      const control = document.querySelector('button[data-chip-control-id="disableAnimations"]');
      if (!(control instanceof HTMLButtonElement) || control.disabled) return false;
      control.focus();
      return document.activeElement === control;
    })()
  `));
  await pressKey(cdp, sessionId, 'Enter');

  await waitFor('keyboard Enter enables reduced-motion dock mode', () => evaluate(cdp, sessionId, `
    (() => {
      const raw = localStorage.getItem('mfd.chip.local');
      if (!raw) return false;
      const prefs = JSON.parse(raw);
      const control = document.querySelector('button[data-chip-control-id="disableAnimations"]');
      const dock = document.querySelector('[data-chip-dock="true"]');
      return prefs.animationsDisabled === true
        && dock?.getAttribute('data-chip-dock-motion') === 'reduced'
        && control instanceof HTMLButtonElement
        && control.getAttribute('aria-pressed') === 'true'
        && Boolean(document.querySelector('[data-chip-motion="reduced"]'));
    })()
  `));

  await continueLatestAutosaveAfterReload(cdp, sessionId, 'Chip focus/reduced-motion smoke');
  await setHashRoute(cdp, sessionId, route);
  await waitForBodyText(cdp, sessionId, 'Roster Sources', 'Chip focus/reduced-motion roster source panel after reload');

  await waitFor('reduced-motion preference survives hard reload', () => evaluate(cdp, sessionId, `
    (() => {
      const raw = localStorage.getItem('mfd.chip.local');
      if (!raw) return false;
      const prefs = JSON.parse(raw);
      const dock = document.querySelector('[data-chip-dock="true"]');
      return prefs.animationsDisabled === true
        && dock?.getAttribute('data-chip-dock-motion') === 'reduced';
    })()
  `));

  await evaluate(cdp, sessionId, `
    (() => {
      const dock = document.querySelector('[data-chip-dock="true"]');
      if (dock?.getAttribute('data-chip-dock-state') === 'collapsed') {
        const opener = dock.querySelector('button[data-chip-ask-dock-button="true"], button[aria-label^="Ask Chip"], button[aria-label^="Open Chip"]');
        if (opener instanceof HTMLButtonElement && !opener.disabled) opener.click();
      }
      return true;
    })()
  `);
  await waitFor('disable animations control remains pressed after reload', () => evaluate(cdp, sessionId, `
    document.querySelector('button[data-chip-control-id="disableAnimations"]')?.getAttribute('aria-pressed') === 'true'
  `));
}

async function stageFreeAgencySigningsFixture(cdp, sessionId, mode) {
  if (!['re_sign', 'open_market', 'street_sign'].includes(mode)) {
    throw new Error(`Unknown free-agency smoke fixture mode: ${mode}`);
  }

  return evaluate(cdp, sessionId, `
    (async () => {
      const mode = ${JSON.stringify(mode)};
      const displayName = (player) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || player?.id || '';
      };
      const ensureNameParts = (player) => {
        if (!player) return player;
        const name = displayName(player);
        if (!player.firstName || !player.lastName) {
          const parts = name.split(/\\s+/).filter(Boolean);
          player.firstName ||= parts[0] ?? 'Free';
          player.lastName ||= parts.slice(1).join(' ') || player.id || 'Agent';
        }
        player.name ||= [player.firstName, player.lastName].filter(Boolean).join(' ').trim() || player.id;
        return player;
      };
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const writeSave = (db, slot) => new Promise((resolveWrite, rejectWrite) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const request = store.put(slot);
        request.onsuccess = () => resolveWrite(request.result);
        request.onerror = () => rejectWrite(request.error ?? new Error('Could not write mfd save slot.'));
      });

      const db = await openDb();
      const saves = await readSaves(db);
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) {
        if (typeof db.close === 'function') db.close();
        throw new Error('No latest autosave data available to stage the free-agency smoke fixture.');
      }

      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        if (typeof db.close === 'function') db.close();
        throw new Error('Latest autosave data was not valid JSON.');
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = Object.values(teams).find((team) => team?.isUser);
      if (!userTeam) {
        if (typeof db.close === 'function') db.close();
        throw new Error('Could not find a user team for the free-agency smoke fixture.');
      }

      const teamLabel = (team) => [team?.city, team?.name].filter(Boolean).join(' ') || team?.id || '';
      const buildContract = (player, years = 1, teamId = userTeam.id) => {
        const salary = Math.round(Math.max(1.2, Number(player?.contract?.baseSalary) || Number(player?.ovr || 60) / 10) * 10) / 10;
        return {
          playerId: player.id,
          teamId,
          years,
          totalValue: Math.round(salary * years * 10) / 10,
          yearlyBreakdown: Array.from({ length: Math.max(1, years) }, (_, index) => ({
            year: (Number(save.year) || 2026) + index,
            baseSalary: salary,
            capHit: salary,
            deadCap: 0,
            guaranteed: index === 0,
          })),
          baseSalary: salary,
          guaranteed: salary,
          signingBonus: 0,
          prorated: 0,
          voidYears: 0,
          franchiseTag: null,
          incentives: [],
        };
      };
      const demandFor = (player) => {
        const baseSalary = Math.round(Math.max(1.8, Number(player?.contract?.baseSalary) || Number(player?.ovr || 70) / 9) * 10) / 10;
        const years = Number(player?.age) <= 25 ? 4 : Number(player?.age) <= 29 ? 3 : 2;
        const salary = Math.round(baseSalary * 1.2 * 10) / 10;
        return {
          years,
          salary,
          signingBonus: Math.round(salary * years * 0.25 * 10) / 10,
          guaranteed: Math.round(salary * Math.min(years, 2) * 1.1 * 10) / 10,
        };
      };
      const removeFromLivePools = (playerId) => {
        for (const team of Object.values(teams)) {
          team.roster = (team.roster ?? []).filter((player) => player?.id !== playerId);
          team.practiceSquad = (team.practiceSquad ?? []).filter((entry) => entry?.playerId !== playerId);
        }
        save.freeAgents = (save.freeAgents ?? []).filter((id) => id !== playerId);
        save.waiverWire = (save.waiverWire ?? []).filter((entry) => entry?.playerId !== playerId);
        save.waiverClaims = (save.waiverClaims ?? []).filter((claim) => claim?.playerId !== playerId);
      };
      const baseOffseason = () => ({
        round: 1,
        expiringPlayerIds: [],
        reSignDecisions: {},
        freeAgencyBids: {},
        scoutingState: {},
        scoutingWatchlist: [],
        tradeOffers: [],
        draftOrder: save.offseasonState?.draftOrder ?? [],
        currentDraftPickIndex: 0,
        completedDraftPickIds: [],
      });
      const sourceEntries = Object.values(teams)
        .filter((team) => team && !team.isUser && Array.isArray(team.roster))
        .flatMap((team) => (team.roster ?? []).map((player) => ({ team, player })))
        .filter(({ player }) => player?.id && player.pos !== 'QB')
        .sort((left, right) => (
          (['WR', 'CB', 'RB', 'LB', 'TE'].indexOf(left.player.pos) === -1 ? 99 : ['WR', 'CB', 'RB', 'LB', 'TE'].indexOf(left.player.pos))
          - (['WR', 'CB', 'RB', 'LB', 'TE'].indexOf(right.player.pos) === -1 ? 99 : ['WR', 'CB', 'RB', 'LB', 'TE'].indexOf(right.player.pos))
          || String(left.player.id).localeCompare(String(right.player.id))
        ));
      const prepareMarketPlayer = () => {
        const entry = sourceEntries.find(({ player }) => !userTeam.roster?.some((candidate) => candidate?.id === player.id));
        if (!entry?.player?.id) {
          throw new Error('Could not find a CPU player to stage as a free-agent target.');
        }
        removeFromLivePools(entry.player.id);
        const stagedPlayer = ensureNameParts({
          ...(players[entry.player.id] ?? {}),
          ...entry.player,
          teamId: null,
          contract: null,
        });
        players[entry.player.id] = stagedPlayer;
        return { sourceTeam: entry.team, player: stagedPlayer };
      };

      save.year = Number(save.year) || latest.year || 2026;
      save.week = Number(save.week) || latest.week || 1;
      save.tradeDeadlineState = undefined;
      if (save.scenarioState?.activeScenario) {
        save.scenarioState.activeScenario = null;
      }
      save.settings = {
        ...(save.settings ?? {}),
        halftimeDecisions: 'off',
      };
      save.postGameUi = {
        ...(save.postGameUi ?? {}),
        pendingHalftimeDecision: null,
      };
      userTeam.capSpace = Math.max(Number(userTeam.capSpace) || 0, 200);
      userTeam.capUsed = Math.max(0, Number(userTeam.capUsed) || 0);
      for (const team of Object.values(teams)) {
        team.txLog ??= [];
        if (!team.isUser) {
          team.capSpace = 0;
        }
      }

      let result;
      if (mode === 're_sign') {
        const rosterCandidate = [...(userTeam.roster ?? [])]
          .filter((player) => player?.id && player.pos !== 'K' && player.pos !== 'P')
          .sort((left, right) => Number(right.ovr ?? 0) - Number(left.ovr ?? 0) || String(left.id).localeCompare(String(right.id)))[0];
        if (!rosterCandidate?.id) {
          throw new Error('Could not find a user roster player to stage for re-signing.');
        }
        const player = ensureNameParts({
          ...(players[rosterCandidate.id] ?? {}),
          ...rosterCandidate,
          teamId: userTeam.id,
        });
        player.contract = buildContract(player, 1, userTeam.id);
        const rosterIndex = userTeam.roster.findIndex((entry) => entry?.id === player.id);
        userTeam.roster[rosterIndex] = player;
        players[player.id] = player;
        save.freeAgents = (save.freeAgents ?? []).filter((id) => id !== player.id);
        const demand = demandFor(player);
        save.phase = 'offseason';
        save.week = 1;
        save.offseasonState = {
          ...baseOffseason(),
          expiringPlayerIds: [player.id],
          reSignDecisions: {
            [player.id]: {
              playerId: player.id,
              teamId: userTeam.id,
              askingPrice: demand,
              agentDemand: demand,
              lastOffer: null,
              counterOffer: null,
              agentResponse: '',
              patienceWeeksRemaining: 3,
              status: 'pending',
            },
          },
        };
        result = {
          mode,
          userTeamId: userTeam.id,
          userTeamName: teamLabel(userTeam),
          playerId: player.id,
          playerName: displayName(player),
          expectedOffer: demand,
        };
      } else if (mode === 'open_market') {
        const { sourceTeam, player } = prepareMarketPlayer();
        save.phase = 'free_agency';
        save.week = 1;
        save.offseasonState = baseOffseason();
        save.offseasonState.freeAgencyBids = {};
        save.freeAgents = [player.id];
        result = {
          mode,
          userTeamId: userTeam.id,
          userTeamName: teamLabel(userTeam),
          playerId: player.id,
          playerName: displayName(player),
          sourceTeamId: sourceTeam.id,
          sourceTeamName: teamLabel(sourceTeam),
        };
      } else {
        const { sourceTeam, player } = prepareMarketPlayer();
        const rosterLimit = Number(save.leagueRules?.entries?.roster_limit?.value) || 53;
        if ((userTeam.roster ?? []).length >= rosterLimit) {
          userTeam.roster = (userTeam.roster ?? []).slice(0, Math.max(0, rosterLimit - 1));
        }
        save.phase = 'regular_season';
        save.week = Math.max(1, Number(save.week) || 1);
        save.offseasonState = null;
        save.freeAgents = [player.id];
        result = {
          mode,
          userTeamId: userTeam.id,
          userTeamName: teamLabel(userTeam),
          playerId: player.id,
          playerName: displayName(player),
          sourceTeamId: sourceTeam.id,
          sourceTeamName: teamLabel(sourceTeam),
        };
      }

      const newestTimestamp = saves.reduce(
        (current, slot) => Math.max(current, Number(slot?.timestamp) || 0),
        0,
      );
      const stagedSlot = {
        ...latest,
        name: 'Autosave (free-agency ' + mode + ' smoke fixture)',
        data: JSON.stringify(envelope),
        year: save.year,
        week: save.week,
        timestamp: Math.max(Date.now(), newestTimestamp) + (60 * 60 * 1000),
      };
      delete stagedSlot.id;
      const stagedSlotId = await writeSave(db, stagedSlot);
      if (typeof db.close === 'function') db.close();
      return {
        ...result,
        stagedSlotId: Number(stagedSlotId),
      };
    })()
  `, true);
}

function latestAutosaveFreeAgencySigningsStateExpression(fixture) {
  return `
    (async () => {
      const fixture = ${JSON.stringify(fixture)};
      const displayName = (player, fallback) => {
        const legacyName = typeof player?.name === 'string' ? player.name.trim() : '';
        if (legacyName) return legacyName;
        return [player?.firstName, player?.lastName].filter(Boolean).join(' ').trim() || fallback;
      };
      const openDb = () => new Promise((resolveOpen, rejectOpen) => {
        const request = indexedDB.open('mfd');
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(request.error ?? new Error('Could not open mfd IndexedDB.'));
      });
      const readSaves = (db) => new Promise((resolveRead, rejectRead) => {
        const tx = db.transaction('saves', 'readonly');
        const store = tx.objectStore('saves');
        const request = store.getAll();
        request.onsuccess = () => resolveRead(request.result ?? []);
        request.onerror = () => rejectRead(request.error ?? new Error('Could not read mfd saves.'));
      });
      const db = await openDb();
      const saves = await readSaves(db);
      if (typeof db.close === 'function') db.close();
      const latest = saves
        .filter((slot) => slot?.isAutosave)
        .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];
      if (!latest?.data) return { ok: false, reason: 'no latest autosave data' };
      let envelope;
      try {
        envelope = JSON.parse(latest.data);
      } catch {
        return { ok: false, reason: 'latest autosave data is not valid JSON', slotId: latest.id ?? null };
      }

      const save = envelope?.save;
      const teams = save?.teams ?? {};
      const players = save?.players ?? {};
      const userTeam = teams?.[fixture.userTeamId] ?? Object.values(teams).find((team) => team?.isUser);
      const player = players?.[fixture.playerId] ?? null;
      const rosterPlayer = (userTeam?.roster ?? []).find((entry) => entry?.id === fixture.playerId) ?? null;
      const decision = save?.offseasonState?.reSignDecisions?.[fixture.playerId] ?? null;
      const bids = save?.offseasonState?.freeAgencyBids?.[fixture.playerId] ?? [];
      const userBid = bids.find((bid) => bid?.teamId === fixture.userTeamId) ?? null;
      const txLog = userTeam?.txLog ?? [];
      const hasSignTransaction = txLog.some((entry) => (
        entry?.type === 'SIGN_FA'
        && entry?.playerId === fixture.playerId
        && entry?.toTeamId === fixture.userTeamId
      ));
      const reSignAccepted = Boolean(
        decision
        && decision.status === 'accepted'
        && decision.lastOffer
        && decision.lastOffer.years === fixture.expectedOffer?.years
        && decision.lastOffer.salary === fixture.expectedOffer?.salary
      );
      const marketBidPending = Boolean(
        userBid
        && userBid.status === 'pending'
        && userBid.round === 1
        && (save?.freeAgents ?? []).includes(fixture.playerId)
        && player?.teamId === null
      );
      const marketSigned = Boolean(
        userBid
        && userBid.status === 'won'
        && rosterPlayer
        && player?.teamId === fixture.userTeamId
        && player?.contract?.teamId === fixture.userTeamId
        && rosterPlayer?.contract?.teamId === fixture.userTeamId
        && !(save?.freeAgents ?? []).includes(fixture.playerId)
        && hasSignTransaction
      );
      const streetSigned = Boolean(
        rosterPlayer
        && player?.teamId === fixture.userTeamId
        && player?.contract?.teamId === fixture.userTeamId
        && rosterPlayer?.contract?.teamId === fixture.userTeamId
        && !(save?.freeAgents ?? []).includes(fixture.playerId)
      );
      return {
        ok: Boolean(reSignAccepted || marketBidPending || marketSigned || streetSigned),
        slotId: latest.id ?? null,
        timestamp: latest.timestamp ?? null,
        year: latest.year ?? null,
        week: latest.week ?? null,
        phase: save?.phase ?? null,
        round: save?.offseasonState?.round ?? null,
        userTeamId: fixture.userTeamId,
        playerId: fixture.playerId,
        playerName: displayName(player, fixture.playerId),
        rosterPlayerName: displayName(rosterPlayer, fixture.playerId),
        reSignAccepted,
        decisionStatus: decision?.status ?? null,
        lastOffer: decision?.lastOffer ?? null,
        marketBidPending,
        marketSigned,
        streetSigned,
        userBid: userBid ? {
          round: userBid.round ?? null,
          status: userBid.status ?? null,
          salary: userBid.salary ?? null,
          score: userBid.score ?? null,
        } : null,
        inFreeAgents: (save?.freeAgents ?? []).includes(fixture.playerId),
        playerTeamId: player?.teamId ?? null,
        rosterHasPlayer: Boolean(rosterPlayer),
        playerContractTeamId: player?.contract?.teamId ?? null,
        rosterContractTeamId: rosterPlayer?.contract?.teamId ?? null,
        hasSignTransaction,
      };
    })()
  `;
}

async function readLatestAutosaveFreeAgencySigningsState(cdp, sessionId, fixture) {
  return evaluate(cdp, sessionId, latestAutosaveFreeAgencySigningsStateExpression(fixture), true);
}

async function waitForLatestAutosaveFreeAgencySignings(cdp, sessionId, fixture, expectation, label, ms = timeoutMs) {
  try {
    return await waitFor(label, async () => {
      const state = await readLatestAutosaveFreeAgencySigningsState(cdp, sessionId, fixture);
      return state?.[expectation] ? state : false;
    }, ms);
  } catch (err) {
    const state = await readLatestAutosaveFreeAgencySigningsState(cdp, sessionId, fixture).catch((stateErr) => ({
      ok: false,
      reason: stateErr instanceof Error ? stateErr.message : String(stateErr),
    }));
    throw new Error(`${err instanceof Error ? err.message : String(err)}\nLatest autosave free-agency state:\n${JSON.stringify(state, null, 2)}`);
  }
}

async function runFreeAgencySigningsSmoke(cdp, sessionId, baseUrl) {
  const route = '/free-agency';
  console.log('Staging free-agency re-sign fixture from the latest autosave...');
  const reSignFixture = await stageFreeAgencySigningsFixture(cdp, sessionId, 're_sign');
  if (!reSignFixture?.playerName || !Number.isInteger(reSignFixture?.stagedSlotId)) {
    throw new Error(`Free-agency re-sign fixture did not return usable identifiers: ${JSON.stringify(reSignFixture)}`);
  }
  console.log(`Free-agency re-sign fixture: meet demand for ${reSignFixture.playerName}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'free-agency re-sign fixture staging', ['Free Agency Sources', 'Re-Sign Window']);
  await deleteSmokeSaveSlot(cdp, sessionId, reSignFixture.stagedSlotId, 'free-agency re-sign fixture load');
  await waitForBodyText(cdp, sessionId, reSignFixture.playerName, 'staged re-sign player on free-agency route');
  await clickButtonNearText(cdp, sessionId, 'Meet Demand', reSignFixture.playerName, 'clickable Meet Demand button for staged re-sign player');
  await waitForBodyText(cdp, sessionId, 'Free Agency Action Receipt', 'free-agency re-sign receipt panel');
  await waitForBodyText(cdp, sessionId, 'Re-Sign Offer Sent', 'free-agency re-sign receipt');
  const reSignSave = await waitForLatestAutosaveFreeAgencySignings(
    cdp,
    sessionId,
    reSignFixture,
    'reSignAccepted',
    're-sign offer persisted to latest autosave',
  );
  console.log(`Re-sign offer accepted for ${reSignFixture.playerName}; latest autosave slot ${reSignSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'free-agency re-sign offer', ['Free Agency Sources', 'Re-Sign Window']);
  await waitForLatestAutosaveFreeAgencySignings(
    cdp,
    sessionId,
    reSignFixture,
    'reSignAccepted',
    're-sign offer persisted after hard reload',
  );

  console.log('Staging open-market free-agency fixture from the latest autosave...');
  const marketFixture = await stageFreeAgencySigningsFixture(cdp, sessionId, 'open_market');
  if (!marketFixture?.playerName || !Number.isInteger(marketFixture?.stagedSlotId)) {
    throw new Error(`Free-agency open-market fixture did not return usable identifiers: ${JSON.stringify(marketFixture)}`);
  }
  console.log(`Free-agency market fixture: bid on ${marketFixture.playerName}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'free-agency market fixture staging', ['Free Agency Sources', 'Open Market']);
  await deleteSmokeSaveSlot(cdp, sessionId, marketFixture.stagedSlotId, 'free-agency market fixture load');
  await waitForBodyText(cdp, sessionId, marketFixture.playerName, 'staged market player on free-agency route');
  await clickButtonNearText(cdp, sessionId, 'Aggressive', marketFixture.playerName, 'clickable Aggressive bid button for staged market player');
  await waitForBodyText(cdp, sessionId, 'Open-Market Bid Stored', 'free-agency bid receipt');
  await waitForBodyText(cdp, sessionId, 'Bid Placed', 'free-agency bid placed label');
  const bidSave = await waitForLatestAutosaveFreeAgencySignings(
    cdp,
    sessionId,
    marketFixture,
    'marketBidPending',
    'open-market bid persisted to latest autosave',
  );
  console.log(`Stored open-market bid for ${marketFixture.playerName}; latest autosave slot ${bidSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'free-agency market bid', ['Free Agency Sources', 'Open Market']);
  await waitForLatestAutosaveFreeAgencySignings(
    cdp,
    sessionId,
    marketFixture,
    'marketBidPending',
    'open-market bid persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, marketFixture.playerName, 'market player after bid hard reload');
  await waitForBodyText(cdp, sessionId, 'Bid Placed', 'bid placed label after hard reload');
  await clickButtonWithExactText(cdp, sessionId, 'Resolve Round 1', 'clickable Resolve Round 1 button');
  const marketSignedSave = await waitForLatestAutosaveFreeAgencySignings(
    cdp,
    sessionId,
    marketFixture,
    'marketSigned',
    'open-market signing resolution persisted to latest autosave',
    90_000,
  );
  console.log(`Resolved open-market signing for ${marketFixture.playerName}; latest autosave slot ${marketSignedSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'free-agency market signing', ['Free Agency Sources', 'Free Agency Hub']);
  await waitForLatestAutosaveFreeAgencySignings(
    cdp,
    sessionId,
    marketFixture,
    'marketSigned',
    'open-market signing resolution persisted after hard reload',
  );

  console.log('Staging street free-agent fixture from the latest autosave...');
  const streetFixture = await stageFreeAgencySigningsFixture(cdp, sessionId, 'street_sign');
  if (!streetFixture?.playerName || !Number.isInteger(streetFixture?.stagedSlotId)) {
    throw new Error(`Free-agency street-sign fixture did not return usable identifiers: ${JSON.stringify(streetFixture)}`);
  }
  console.log(`Free-agency street fixture: sign ${streetFixture.playerName}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'free-agency street fixture staging', ['Free Agency Sources', 'Street Free Agents']);
  await deleteSmokeSaveSlot(cdp, sessionId, streetFixture.stagedSlotId, 'free-agency street fixture load');
  await waitForBodyText(cdp, sessionId, streetFixture.playerName, 'staged street free agent on free-agency route');
  await clickButtonNearText(cdp, sessionId, 'Sign', streetFixture.playerName, 'clickable Sign button for staged street free agent');
  await waitForBodyText(cdp, sessionId, 'Street Signing Submitted', 'street signing receipt');
  const streetSave = await waitForLatestAutosaveFreeAgencySignings(
    cdp,
    sessionId,
    streetFixture,
    'streetSigned',
    'street signing persisted to latest autosave',
  );
  console.log(`Signed street free agent ${streetFixture.playerName}; latest autosave slot ${streetSave.slotId ?? 'n/a'}.`);
  await hardReloadAndLoadLatestAutosave(cdp, sessionId, route, 'free-agency street signing', ['Free Agency Sources', 'Street Free Agents']);
  await waitForLatestAutosaveFreeAgencySignings(
    cdp,
    sessionId,
    streetFixture,
    'streetSigned',
    'street signing persisted after hard reload',
  );
}

async function runWaiverPracticeSquadSmoke(cdp, sessionId, baseUrl) {
  console.log('Staging waiver/practice-squad smoke fixture from the latest autosave...');
  const fixture = await stageWaiverPracticeSquadFixture(cdp, sessionId);
  if (!fixture?.waiverPlayerName || !fixture?.practicePlayerName) {
    throw new Error(`Waiver/practice-squad smoke fixture did not return usable identifiers: ${JSON.stringify(fixture)}`);
  }
  console.log(`Waiver/practice fixture: claim ${fixture.waiverPlayerName}; add/elevate/release ${fixture.practicePlayerName}.`);

  const waiversRoute = '/waivers';
  console.log(`Running waiver claim smoke at ${baseUrl}#${waiversRoute}...`);
  await hardReloadAndContinueAutosave(cdp, sessionId, waiversRoute, 'waiver/practice fixture staging', ['Waiver Wire', 'Waiver Board']);
  await waitForBodyText(cdp, sessionId, fixture.waiverPlayerName, 'staged waiver player on waiver board');
  await clickButtonNearText(cdp, sessionId, 'Submit Claim', fixture.waiverPlayerName, 'clickable Submit Claim button for staged waiver player');
  await waitForBodyText(cdp, sessionId, 'Waiver Claim Receipt', 'waiver claim receipt');
  await waitForBodyText(cdp, sessionId, 'Waiver Claim Submitted', 'waiver claim submitted receipt');
  await waitForBodyText(cdp, sessionId, 'Claim Pending', 'waiver pending label after submit');
  const claimSave = await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'waiverClaimIntent',
    'waiver claim intent persisted to latest autosave',
  );
  console.log(`Submitted waiver claim for ${fixture.waiverPlayerName}; latest autosave slot ${claimSave.slotId ?? 'n/a'}.`);

  await hardReloadAndLoadLatestAutosave(cdp, sessionId, waiversRoute, 'waiver claim intent', ['Waiver Wire', 'Waiver Board']);
  await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'waiverClaimIntent',
    'waiver claim intent persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, fixture.waiverPlayerName, 'staged waiver player after claim hard reload');
  await waitForBodyText(cdp, sessionId, 'Claim Pending', 'waiver pending label after claim hard reload');

  const practiceRoute = '/practice-squad';
  console.log(`Running practice-squad movement smoke at ${baseUrl}#${practiceRoute}...`);
  await setHashRoute(cdp, sessionId, practiceRoute);
  await waitForBodyText(cdp, sessionId, 'Practice Squad', 'practice-squad route loaded');
  await waitForBodyText(cdp, sessionId, 'Add To Practice Squad', 'practice-squad add table');
  await waitForBodyText(cdp, sessionId, fixture.practicePlayerName, 'staged practice-squad candidate');
  await clickButtonNearText(cdp, sessionId, 'Add', fixture.practicePlayerName, 'clickable Add button for staged practice-squad candidate');
  await waitForBodyText(cdp, sessionId, 'Practice Squad Action Receipt', 'practice-squad add receipt panel');
  await waitForBodyText(cdp, sessionId, 'Practice Squad Add Processed', 'practice-squad add receipt');
  const addedSave = await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'practiceAdded',
    'practice-squad add persisted to latest autosave',
  );
  console.log(`Added ${fixture.practicePlayerName} to practice squad; latest autosave slot ${addedSave.slotId ?? 'n/a'}.`);

  await clickButtonNearText(cdp, sessionId, 'Elevate', fixture.practicePlayerName, 'clickable Elevate button for staged practice-squad player');
  await waitForBodyText(cdp, sessionId, 'Practice Squad Elevation Processed', 'practice-squad elevation receipt');
  await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'practiceElevated',
    'practice-squad elevation persisted to latest autosave',
  );

  await hardReloadAndLoadLatestAutosave(cdp, sessionId, practiceRoute, 'practice-squad elevation', ['Practice Squad', 'Practice Squad Slots']);
  await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'practiceElevated',
    'practice-squad elevation persisted after hard reload',
  );
  await waitForBodyText(cdp, sessionId, fixture.practicePlayerName, 'practice-squad elevated player after hard reload');
  await waitForBodyText(cdp, sessionId, 'Elevated to active roster', 'practice-squad elevated status after hard reload');

  await clickButtonNearText(cdp, sessionId, 'Release', fixture.practicePlayerName, 'clickable Release button for staged practice-squad player');
  await waitForBodyText(cdp, sessionId, 'Practice Squad Release Processed', 'practice-squad release receipt');
  await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'practiceReleased',
    'practice-squad release persisted to latest autosave',
  );

  console.log('Advancing the week to resolve the staged waiver claim...');
  await advanceWeekForWaiverResolution(cdp, sessionId, baseUrl, fixture);
  const resolvedSave = await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'waiverResolvedToUser',
    'waiver claim resolution persisted to latest autosave',
    90_000,
  );
  console.log(`Resolved waiver claim for ${fixture.waiverPlayerName}; latest autosave slot ${resolvedSave.slotId ?? 'n/a'}.`);

  await hardReloadAndLoadLatestAutosave(cdp, sessionId, waiversRoute, 'waiver/practice final state', ['Waiver Wire', 'Claim Results']);
  await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'waiverResolvedToUser',
    'waiver claim resolution persisted after final hard reload',
  );
  await waitForLatestAutosaveWaiverPracticeSquad(
    cdp,
    sessionId,
    fixture,
    'practiceReleaseSurvived',
    'practice-squad release persisted after final hard reload',
  );
  await waitForBodyText(cdp, sessionId, fixture.waiverPlayerName, 'waiver claim result after final hard reload');
}

async function run() {
  if (!existsSync(distDir)) {
    fail(`apps/web/dist missing. Run a Chip-enabled web build before this smoke.`);
  }

  if (typeof fetch !== 'function' || typeof WebSocket !== 'function') {
    fail('this smoke requires a Node runtime with built-in fetch and WebSocket support.');
  }

  const routeChecks = parsePostSetupRouteChecks(process.env);
  const runAdvanceWeek = shouldRunAdvanceWeekSmoke(process.env);
  const runCartridgeRoundTrip = shouldRunCartridgeRoundTripSmoke(process.env);
  const runCartridgeFileRoundTrip = shouldRunCartridgeFileRoundTripSmoke(process.env);
  const runLocalSaveSlotRoundTrip = shouldRunLocalSaveSlotRoundTripSmoke(process.env);
  const runNewDynastySetupEntry = shouldRunNewDynastySetupEntrySmoke(process.env);
  const runFullSetupComplete = shouldRunFullSetupCompleteSmoke(process.env);
  const runContractRestructure = shouldRunContractRestructureSmoke(process.env);
  const runContractBackload = shouldRunContractBackloadSmoke(process.env);
  const runContractCuts = shouldRunContractCutsSmoke(process.env);
  const runContractNegotiations = shouldRunContractNegotiationsSmoke(process.env);
  const runCapLabBatch = shouldRunCapLabBatchSmoke(process.env);
  const runTradeCounterBlock = shouldRunTradeCounterBlockSmoke(process.env);
  const runWaiverPracticeSquad = shouldRunWaiverPracticeSquadSmoke(process.env);
  const runFreeAgencySignings = shouldRunFreeAgencySigningsSmoke(process.env);
  const runRosterDepthTraining = shouldRunRosterDepthTrainingSmoke(process.env);
  const runWeeklyPrep = shouldRunWeeklyPrepSmoke(process.env);
  const runDraftScouting = shouldRunDraftScoutingSmoke(process.env);
  const runDraftWarRoomTrade = shouldRunDraftWarRoomTradeSmoke(process.env);
  const runStaffFacilityMedical = shouldRunStaffFacilityMedicalSmoke(process.env);
  const runChipMute = shouldRunChipMuteSmoke(process.env);
  const runChipReceiptRespect = shouldRunChipReceiptRespectSmoke(process.env);
  const runChipAskSummary = shouldRunChipAskSummarySmoke(process.env);
  const runChipMondayBeatChain = shouldRunChipMondayBeatChainSmoke(process.env);
  const runChipFocusReducedMotion = shouldRunChipFocusReducedMotionSmoke(process.env);
  const runG6CoreUx = shouldRunG6CoreUxSmoke(process.env);
  const runG6StateFeedback = shouldRunG6StateFeedbackSmoke(process.env);
  const runG6FocusSweep = shouldRunG6FocusSweepSmoke(process.env);
  const runG6VisualSweep = shouldRunG6VisualSweepSmoke(process.env);
  const runPostImportHardReload = shouldRunPostImportHardReloadSmoke(process.env);
  const viewport = parseSmokeViewport(process.env);
  const postImportRouteCheck = parsePostImportRouteCheck(process.env);
  const previewPort = Number(process.env.SMOKE_PORT ?? await getOpenPort());
  const cdpPort = Number(process.env.SMOKE_CDP_PORT ?? await getOpenPort());
  const baseUrl = `http://127.0.0.1:${previewPort}/MFD/`;
  const previewCommand = createPreviewCommand(previewPort);
  const chromeBin = findChrome();
  const userDataDir = mkdtempSync(join(tmpdir(), 'mfd-post-setup-smoke-'));
  const children = [];
  let cdp = null;
  let cleanupStarted = false;

  const waitForChildExit = (child) => new Promise((resolveExit) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveExit();
      return;
    }

    const closeChildPipes = () => {
      child.stdout?.destroy();
      child.stderr?.destroy();
    };
    const done = () => {
      clearTimeout(forceKillTimer);
      clearTimeout(giveUpTimer);
      closeChildPipes();
      resolveExit();
    };
    const forceKillTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }, 500);
    const giveUpTimer = setTimeout(() => {
      closeChildPipes();
      resolveExit();
    }, 1500);
    forceKillTimer.unref?.();
    giveUpTimer.unref?.();
    child.once('exit', done);
    child.kill('SIGTERM');
    closeChildPipes();
  });

  const cleanup = async () => {
    if (cleanupStarted) return;
    cleanupStarted = true;
    if (cdp) {
      await cdp.close();
      cdp = null;
    }
    for (const child of children) {
      await waitForChildExit(child);
    }
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };

  process.once('SIGINT', () => {
    void cleanup().finally(() => process.exit(130));
  });
  process.once('SIGTERM', () => {
    void cleanup().finally(() => process.exit(143));
  });

  let previewLog = '';
  console.log(`Starting preview server on :${previewPort}...`);
  const preview = spawn(previewCommand.command, previewCommand.args, {
    cwd: previewCommand.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(preview);
  let previewError = null;
  preview.once('error', (err) => {
    previewError = err;
  });
  preview.stdout.on('data', (chunk) => {
    previewLog += chunk.toString();
  });
  preview.stderr.on('data', (chunk) => {
    previewLog += chunk.toString();
  });

  try {
    try {
      await waitFor('preview server', async () => {
        if (previewError) {
          throw previewError;
        }
        if (preview.exitCode !== null) {
          throw new Error(`preview exited with status ${preview.exitCode}`);
        }
        if (preview.signalCode !== null) {
          throw new Error(`preview exited with signal ${preview.signalCode}`);
        }
        const response = await fetch(baseUrl).catch(() => null);
        return response?.ok;
      }, previewTimeoutMs);
    } catch (err) {
      throw new Error(formatPreviewStartFailure(err, previewCommand, previewLog));
    }

    console.log(`Launching headless Chrome with CDP on :${cdpPort}...`);
    const chrome = spawn(chromeBin, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(chrome);

    let chromeLog = '';
    chrome.stdout.on('data', (chunk) => {
      chromeLog += chunk.toString();
    });
    chrome.stderr.on('data', (chunk) => {
      chromeLog += chunk.toString();
    });

    const version = await waitFor('Chrome CDP endpoint', async () => {
      if (chrome.exitCode !== null) {
        throw new Error(`chrome exited with ${chrome.exitCode}\n${chromeLog}`);
      }
      const response = await fetch(`http://127.0.0.1:${cdpPort}/json/version`).catch(() => null);
      return response?.ok ? response.json() : null;
    });

    cdp = await CdpConnection.connect(version.webSocketDebuggerUrl);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    const browserErrors = [];
    cdp.onEvent((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === 'Runtime.exceptionThrown') {
        browserErrors.push(message.params?.exceptionDetails?.text ?? 'Runtime exception');
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
        browserErrors.push((message.params.args ?? []).map((arg) => arg.value ?? arg.description).filter(Boolean).join(' '));
      }
      if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') {
        if (isTransientBrowserInfrastructureError(message.params.entry)) {
          console.warn(`WARN: ignored transient Chrome network restart: ${message.params.entry.text}`);
        } else {
          browserErrors.push(message.params.entry.text);
        }
      }
    });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Log.enable', {}, sessionId);
    if (viewport) {
      console.log(`Setting viewport to ${viewport.width}x${viewport.height}${viewport.mobile ? ' mobile' : ''}...`);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      }, sessionId);
    }

    console.log(`Loading ${baseUrl} and resetting browser storage...`);
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

    if (runNewDynastySetupEntry) {
      await runNewDynastySetupEntrySmoke(cdp, sessionId, baseUrl);
      if (browserErrors.length > 0) {
        fail('browser errors detected during new-dynasty setup entry smoke.', browserErrors.join('\n'));
      }
      console.log('PASS: started a new dynasty, reached the setup shell and focused Assistant GM chooser, and saw no browser errors.');
      return;
    }

    if (runFullSetupComplete) {
      await runNewDynastyFullSetupSmoke(cdp, sessionId, baseUrl);
      if (browserErrors.length > 0) {
        fail('browser errors detected during full new-dynasty setup smoke.', browserErrors.join('\n'));
      }
      console.log('PASS: completed Full Setup from cleared storage, reached playable Year 1 preseason Week 1, persisted the first-ten marker, and saw no browser errors.');
      return;
    }

    console.log('Launching convention demo...');
    await waitFor('clickable Launch Demo Scenario button', () => evaluate(cdp, sessionId, `
      (() => {
        const button = [...document.querySelectorAll('button')]
          .find((candidate) => candidate.textContent?.includes('Launch Demo Scenario'));
        if (!button) return false;
        button.click();
        return true;
      })()
    `));

    await waitFor('post-setup app shell', () => evaluate(cdp, sessionId, `
      Boolean(document.querySelector('[data-mfd-app-shell="true"]'))
    `));

    for (const routeCheck of routeChecks) {
      const routeUrl = `${baseUrl}#${routeCheck.route}`;
      console.log(`Navigating to ${routeUrl}...`);
      await setHashRoute(cdp, sessionId, routeCheck.route);
      await waitForBodyText(cdp, sessionId, routeCheck.text, `route text "${routeCheck.text}"`);
      await waitFor(`non-empty root after ${routeCheck.route} route navigation`, () => evaluate(cdp, sessionId, `
        Boolean(document.querySelector('#root > *'))
      `));
    }

    if (postImportRouteCheck && runLocalSaveSlotRoundTrip && !runCartridgeRoundTrip && !runCartridgeFileRoundTrip) {
      throw new Error('SMOKE_POST_IMPORT_ROUTE_SMOKE can run alone or with a cartridge import workflow, not only with SMOKE_LOCAL_SAVE_SLOT_ROUND_TRIP.');
    }

    const postImportOptions = { hardReload: runPostImportHardReload };

    if (runCartridgeRoundTrip) {
      await runCartridgeRoundTripSmoke(cdp, sessionId, baseUrl, postImportRouteCheck, postImportOptions);
    } else if (runCartridgeFileRoundTrip) {
      await runCartridgeFileRoundTripSmoke(cdp, sessionId, baseUrl, postImportRouteCheck, postImportOptions);
    } else if (runLocalSaveSlotRoundTrip) {
      await runLocalSaveSlotRoundTripSmoke(cdp, sessionId, baseUrl);
    } else if (postImportRouteCheck) {
      await runCartridgeRoundTripSmoke(cdp, sessionId, baseUrl, postImportRouteCheck, postImportOptions);
    } else if (runStaffFacilityMedical) {
      await runStaffFacilityMedicalSmoke(cdp, sessionId, baseUrl);
    } else if (runChipMute) {
      await runChipMuteSmoke(cdp, sessionId, baseUrl);
    } else if (runChipReceiptRespect) {
      await runChipReceiptRespectSmoke(cdp, sessionId, baseUrl);
    } else if (runChipAskSummary) {
      await runChipAskSummarySmoke(cdp, sessionId, baseUrl);
    } else if (runChipMondayBeatChain) {
      await runChipMondayBeatChainSmoke(cdp, sessionId, baseUrl);
    } else if (runChipFocusReducedMotion) {
      await runChipFocusReducedMotionSmoke(cdp, sessionId, baseUrl);
    } else if (runG6StateFeedback) {
      await runG6StateFeedbackSmoke(cdp, sessionId, baseUrl);
    } else if (runG6FocusSweep) {
      await runG6FocusSweepSmoke(cdp, sessionId, baseUrl);
    } else if (runG6VisualSweep) {
      await runG6VisualSweepSmoke(cdp, sessionId, baseUrl);
    } else if (runDraftScouting) {
      await runDraftScoutingSmoke(cdp, sessionId, baseUrl);
    } else if (runDraftWarRoomTrade) {
      await runDraftWarRoomTradeSmoke(cdp, sessionId, baseUrl);
    } else if (runWeeklyPrep) {
      await runWeeklyPrepSmoke(cdp, sessionId, baseUrl);
    } else if (runRosterDepthTraining) {
      await runRosterDepthTrainingSmoke(cdp, sessionId, baseUrl);
    } else if (runFreeAgencySignings) {
      await runFreeAgencySigningsSmoke(cdp, sessionId, baseUrl);
    } else if (runWaiverPracticeSquad) {
      await runWaiverPracticeSquadSmoke(cdp, sessionId, baseUrl);
    } else if (runTradeCounterBlock) {
      await runTradeCounterBlockSmoke(cdp, sessionId, baseUrl);
    } else if (runCapLabBatch) {
      await runCapLabBatchSmoke(cdp, sessionId, baseUrl);
    } else if (runContractNegotiations) {
      await runContractNegotiationsSmoke(cdp, sessionId, baseUrl);
    } else if (runContractCuts) {
      await runContractCutsSmoke(cdp, sessionId, baseUrl);
    } else if (runContractRestructure) {
      await runContractRestructureSmoke(cdp, sessionId, baseUrl);
    } else if (runContractBackload) {
      await runContractBackloadSmoke(cdp, sessionId, baseUrl);
    } else if (runAdvanceWeek) {
      await runAdvanceWeekSmoke(cdp, sessionId, baseUrl);
    }

    if (browserErrors.length > 0) {
      fail('browser errors detected during post-setup route smoke.', browserErrors.join('\n'));
    }

    const checkedRoutes = routeChecks.map((routeCheck) => `${routeCheck.route} -> "${routeCheck.text}"`).join(', ');
    const postImportWorkflow = postImportRouteCheck ? ` and opened ${postImportRouteCheck.route} after import` : '';
    const postImportReloadWorkflow = runPostImportHardReload ? ' with a hard reload' : '';
    const ranCartridgeImport = runCartridgeRoundTrip || Boolean(postImportRouteCheck && !runCartridgeFileRoundTrip);
    const workflow = ranCartridgeImport
          ? `, round-tripped a cartridge import${postImportWorkflow}${postImportReloadWorkflow}`
        : runCartridgeFileRoundTrip
          ? `, round-tripped a .mfd file import${postImportWorkflow}${postImportReloadWorkflow}`
          : runLocalSaveSlotRoundTrip
          ? ', round-tripped a local save slot'
          : runStaffFacilityMedical
            ? ', upgraded a facility, hired medical staff, and verified autosave hard reloads'
          : runChipMute
            ? ', clicked Mute season, verified route guidance quieting, and verified persistence after hard reload'
          : runChipReceiptRespect
            ? ', logged route guidance, verified read-receipt suppression, verified another route still coaches, and verified persistence after hard reload'
          : runChipAskSummary
            ? ', cleared visible Chip route beats, clicked Where am I?, and verified the updated Ask Chip summary copy'
          : runChipMondayBeatChain
            ? ', clicked the first-ten Monday briefing Chip beat, verified its receipt, and verified the updated Monday route beat text'
          : runChipFocusReducedMotion
            ? ', opened Chip with keyboard Enter, toggled reduced motion with keyboard Enter, and verified persistence after hard reload'
          : runG6StateFeedback
            ? ', verified accessible loading, empty, error, and success states'
          : runG6FocusSweep
            ? ', verified route-change main focus, in-route tab stops, and keyboard command-palette focus'
          : runG6VisualSweep
            ? ', completed the G6 visual/playability route sweep'
          : runG6CoreUx
            ? ', completed the G6 core route UX/console sweep'
          : runDraftScouting
            ? ', scouted a prospect, saved watchlist/pro-day/private-workout state, drafted the prospect, and verified autosave hard reloads'
            : runDraftWarRoomTrade
              ? ', accepted a source-backed draft war-room offer, transferred live draft-order ownership plus a future sweetener, and verified autosave hard reload'
          : runWeeklyPrep
            ? ', saved weekly prep through the live route, simulated the week, verified prep/film history, and verified autosave hard reload'
          : runRosterDepthTraining
            ? ', assigned roster training, placed and activated IR players, promoted a depth starter, assigned a returner, and verified autosave hard reloads'
          : runFreeAgencySignings
            ? ', sent a re-sign offer, stored and resolved an open-market FA bid, signed a street free agent, and verified autosave hard reloads'
          : runWaiverPracticeSquad
            ? ', submitted and resolved a waiver claim, moved a practice-squad player through add/elevate/release, and verified autosave hard reloads'
          : runTradeCounterBlock
            ? ', toggled a roster trade-block flag, rejected a direct-trade counter, and verified autosave hard reload'
          : runCapLabBatch
            ? ', applied a two-move Cap Lab batch with verified autosave hard reload'
          : runContractNegotiations
            ? ', extended one demo contract and applied one franchise tag with verified autosave hard reloads'
            : runContractCuts
            ? ', cut demo contracts with standard and Post-June-1 designations and verified autosave hard reloads'
            : runContractRestructure
            ? ', restructured a demo contract'
            : runContractBackload
              ? ', backloaded a demo contract'
              : runAdvanceWeek
                ? ', advanced the demo week'
                : '';
    console.log(`PASS: launched demo save, opened ${routeChecks.length} post-setup route(s), found ${checkedRoutes}${workflow}, and saw no browser errors.`);
  } finally {
    await cleanup();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    fail(err instanceof Error ? err.message : String(err));
  });
}
