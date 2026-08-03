#!/usr/bin/env node
/**
 * Evidence dashboard (C4) — refreshes the "Evidence Dashboard" section at
 * the top of STATUS.md so "is the ledger current?" is never ambiguous.
 *
 *   node scripts/evidence-dashboard.mjs              # refresh STATUS.md
 *   node scripts/evidence-dashboard.mjs --check      # exit 1 if any row is red
 *   node scripts/evidence-dashboard.mjs --with-playtest  # also run the fast
 *                                                        # local 3-season
 *                                                        # anomaly playtest
 *
 * Read-only except for the marked section in STATUS.md. Remote evidence
 * uses the `gh` CLI when available and degrades to "unavailable" rows
 * offline. Heavy gates are never run implicitly — rows point at the exact
 * command instead.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const statusPath = join(repoRoot, 'STATUS.md');
const BEGIN = '<!-- evidence-dashboard:begin -->';
const END = '<!-- evidence-dashboard:end -->';
const BUNDLE_CEILING_KB = Number(process.env.BUNDLE_CEILING_KB ?? 312);
const CHECK_MODE = process.argv.includes('--check');
const WITH_PLAYTEST = process.argv.includes('--with-playtest');

const OK = '✅';
const WARN = '⚠️';
const FAIL = '❌';
const NA = '➖';

function tryExec(command, args, options = {}) {
  try {
    const out = execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options.timeoutMs ?? 60000,
      ...options,
    });
    return { ok: true, out };
  } catch (error) {
    return { ok: false, out: String(error?.stdout ?? ''), err: String(error?.stderr ?? error?.message ?? error) };
  }
}

function ghAvailable() {
  if (!tryExec('gh', ['--version']).ok) return false;
  return tryExec('gh', ['auth', 'status']).ok;
}

function ghJson(args) {
  const res = tryExec('gh', args);
  if (!res.ok) return null;
  try {
    return JSON.parse(res.out);
  } catch {
    return null;
  }
}

function repoSlug() {
  const res = tryExec('git', ['remote', 'get-url', 'origin']);
  const match = res.out.match(/github\.com[:/]([^/]+\/[^/.]+)/);
  return match ? match[1] : null;
}

// ── Remote evidence (gh) ────────────────────────────────

function latestRun(workflow) {
  const runs = ghJson(['run', 'list', '--workflow', workflow, '--branch', 'main', '--limit', '1', '--json',
    'databaseId,conclusion,status,createdAt,headSha,url,displayTitle,headBranch']);
  return Array.isArray(runs) && runs.length > 0 ? runs[0] : null;
}

function runJobs(runId, slug) {
  const payload = ghJson(['api', `repos/${slug}/actions/runs/${runId}/jobs`, '--paginate']);
  return payload?.jobs ?? [];
}

function shortSha(sha) {
  return typeof sha === 'string' ? sha.slice(0, 7) : '???????';
}

function remoteRows(slug) {
  const rows = [];
  const ci = latestRun('CI');
  if (!ci) {
    rows.push({ area: 'Remote gate (CI on main)', status: NA, evidence: 'no CI run visible via gh', pointer: 'gh run list --workflow CI' });
  } else {
    const jobs = runJobs(ci.databaseId, slug);
    const required = ['test', 'determinism-gate', 'release-gate'];
    const parts = required.map((name) => {
      const job = jobs.find((j) => j.name === name);
      return `${name}:${job ? job.conclusion : '?'}`;
    });
    const status = ci.conclusion === 'success' ? OK : ci.status !== 'completed' ? WARN : FAIL;
    rows.push({
      area: 'Remote gate (CI on main)',
      status,
      evidence: `${ci.conclusion || ci.status} @ ${shortSha(ci.headSha)} (${ci.createdAt.slice(0, 10)}) — ${parts.join(' ')}`,
      pointer: ci.url,
    });

    // The G6 visual/playability route sweep is a step *inside*
    // release-gate.mjs, not a standalone GHA job, so the API cannot see it
    // per-run. Evidence row = the step exists in the release contract;
    // freshness comes from running the gate.
    const gateList = tryExec(process.execPath, ['scripts/release-gate.mjs', '--list']);
    const hasSweep = /g6|route sweep/i.test(gateList.out);
    rows.push({
      area: 'Route sweep (G6 visual/playability)',
      status: gateList.ok && hasSweep ? OK : FAIL,
      evidence: gateList.ok && hasSweep
        ? 'G6 sweep step present in the 37-step release contract (runs inside every release-gate, local + remote)'
        : 'G6 sweep step NOT found in release-gate contract',
      pointer: 'node scripts/release-gate.mjs --only browser (local sweep)',
    });
  }

  const eco = latestRun('GOAT Ecology Lab');
  if (!eco) {
    rows.push({ area: 'Ecology Lab nightly', status: NA, evidence: 'no nightly run visible via gh', pointer: 'gh run list --workflow "GOAT Ecology Lab"' });
  } else {
    const jobs = runJobs(eco.databaseId, slug);
    const cells = jobs.filter((j) => /\/\d+y\b|\(\d+y\)|\d+y$/.test(j.name));
    const scoreboard = cells.length > 0
      ? `${cells.filter((j) => j.conclusion === 'success').length}/${cells.length} cells green`
      : (eco.conclusion || eco.status || 'unknown');
    const failed = cells.filter((j) => j.conclusion === 'failure').map((j) => j.name);
    rows.push({
      area: 'Ecology Lab nightly (sim anomalies soak)',
      status: eco.conclusion === 'success' ? OK : eco.status !== 'completed' ? WARN : FAIL,
      evidence: `${scoreboard} (${eco.createdAt.slice(0, 10)})${failed.length ? ` — failed: ${failed.slice(0, 3).join(', ')}` : ''}`,
      pointer: eco.url,
    });
  }
  return rows;
}

// ── Local evidence ──────────────────────────────────────

function localRows() {
  const rows = [];

  const list = tryExec(process.execPath, ['scripts/release-gate.mjs', '--list']);
  const stepCount = (list.out.match(/^\s*\d+\./gm) ?? list.out.match(/\n/g) ?? []).length;
  rows.push({
    area: 'Local release-gate contract',
    status: list.ok ? OK : FAIL,
    evidence: list.ok ? `contract intact (${stepCount || '37'}-step list renders); full local gate is manual` : 'release-gate.mjs --list failed',
    pointer: 'node scripts/release-gate.mjs (full 37-step local gate)',
  });

  const distDir = join(repoRoot, 'apps/web/dist/assets');
  if (!existsSync(distDir)) {
    rows.push({
      area: 'Bundle size (engine chunk)',
      status: NA,
      evidence: 'no local build — size unmeasured',
      pointer: 'pnpm --filter @mfd/web build && bash scripts/check-bundle-size.sh',
    });
  } else {
    const chunk = readdirSync(distDir).find((f) => /^engine-.*\.js$/.test(f) && !f.startsWith('engine-content-'));
    if (!chunk) {
      rows.push({ area: 'Bundle size (engine chunk)', status: FAIL, evidence: 'dist exists but no engine-*.js chunk found', pointer: 'bash scripts/check-bundle-size.sh' });
    } else {
      const gzKb = Math.ceil(gzipSync(readFileSync(join(distDir, chunk))).length / 1024);
      const staleHours = Math.round((Date.now() - parseStatMtime(join(distDir, chunk))) / 3600000);
      rows.push({
        area: 'Bundle size (engine chunk)',
        status: gzKb > BUNDLE_CEILING_KB ? FAIL : gzKb > BUNDLE_CEILING_KB - 10 ? WARN : OK,
        evidence: `${gzKb} KB gzip vs ${BUNDLE_CEILING_KB} KB ceiling (local build ~${staleHours}h old)`,
        pointer: 'bash scripts/check-bundle-size.sh',
      });
    }
  }

  const scan = tryExec('bash', ['scripts/check-math-random.sh']);
  rows.push({
    area: 'Determinism scan (Math.random ban)',
    status: scan.ok ? OK : FAIL,
    evidence: scan.ok ? 'no banned randomness in sim code' : 'scan failed — see output',
    pointer: 'bash scripts/check-math-random.sh',
  });

  return rows;
}

function parseStatMtime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return Date.now();
  }
}

// ── Playtest anomalies (opt-in, fast tier) ──────────────

function playtestRow() {
  if (!WITH_PLAYTEST) {
    return {
      area: 'Playtest anomalies (local fast tier)',
      status: NA,
      evidence: 'not run (heavy) — remote nightly row above is the standing soak',
      pointer: 'node scripts/evidence-dashboard.mjs --with-playtest  OR  corepack pnpm playtest',
    };
  }
  const res = spawnSync('bash', ['scripts/playtest-report.sh', '--persona', 'SPEEDRUNNER', '--seed', '42', '--seasons', '3'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 300000,
  });
  const text = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  const match = text.match(/anomalies=(\d+)\s+high=(\d+)/);
  if (res.status !== 0 || !match) {
    return { area: 'Playtest anomalies (local fast tier)', status: FAIL, evidence: 'fast-tier playtest failed to complete', pointer: 'corepack pnpm playtest' };
  }
  const [, anomalies, high] = match;
  return {
    area: 'Playtest anomalies (local fast tier)',
    status: Number(high) > 0 ? FAIL : Number(anomalies) > 0 ? WARN : OK,
    evidence: `SPEEDRUNNER 3-season seed 42: anomalies=${anomalies} high=${high}`,
    pointer: 'bash scripts/playtest-report.sh --all --seed 42 --seasons 10 (full tier)',
  };
}

// ── Ledger freshness ────────────────────────────────────

function ledgerRow(statusText) {
  const match = statusText.match(/## Run Ledger - (\d{4}-\d{2}-\d{2})/);
  if (!match) {
    return { area: 'Run-ledger freshness', status: WARN, evidence: 'no dated Run Ledger entry found', pointer: 'STATUS.md' };
  }
  const ageDays = Math.floor((Date.now() - Date.parse(match[1])) / 86400000);
  return {
    area: 'Run-ledger freshness',
    status: ageDays <= 7 ? OK : ageDays <= 30 ? WARN : FAIL,
    evidence: `newest ledger entry ${match[1]} (${ageDays}d old)`,
    pointer: 'STATUS.md',
  };
}

// ── Render + write ──────────────────────────────────────

function render(rows) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    BEGIN,
    '',
    '## Evidence Dashboard',
    '',
    `_Refreshed ${now} by \`node scripts/evidence-dashboard.mjs\`. Rows are evidence, not vibes: ✅ current/healthy, ⚠️ aging/attention, ❌ failing, ➖ unavailable here with the exact command to get it._`,
    '',
    '| Area | Status | Evidence | How to refresh |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.area} | ${r.status} | ${r.evidence} | \`${r.pointer}\` |`),
    '',
    END,
  ];
  return lines.join('\n');
}

const statusText = existsSync(statusPath) ? readFileSync(statusPath, 'utf8') : '# STATUS\n';
const slug = repoSlug();
const useGh = ghAvailable() && slug;

const rows = [
  ...(useGh ? remoteRows(slug) : [{
    area: 'Remote gate (CI on main)', status: NA,
    evidence: 'gh CLI unavailable or not authenticated — remote rows skipped',
    pointer: 'gh auth login && gh run list --workflow CI',
  }]),
  ...localRows(),
  playtestRow(),
  ledgerRow(statusText),
];

const section = render(rows);
let next;
if (statusText.includes(BEGIN) && statusText.includes(END)) {
  const before = statusText.slice(0, statusText.indexOf(BEGIN));
  const after = statusText.slice(statusText.indexOf(END) + END.length);
  next = before + section + after;
} else {
  next = statusText.replace(/^# STATUS\n/, `# STATUS\n\n${section}\n`);
}

if (!CHECK_MODE) {
  writeFileSync(statusPath, next);
}

console.log(section);
const reds = rows.filter((r) => r.status === FAIL);
if (CHECK_MODE && reds.length > 0) {
  console.error(`\n${reds.length} red row(s): ${reds.map((r) => r.area).join(', ')}`);
  process.exit(1);
}
if (!CHECK_MODE) {
  console.log('\nSTATUS.md evidence dashboard refreshed.');
}
