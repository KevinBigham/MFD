import fs from 'node:fs';
import path from 'node:path';

import { sanitizeLegacyPath } from '../src/app/legacy-url.js';

function check(name, pass, detail) {
  return { name: name, pass: !!pass, detail: detail || '' };
}

function readSource(relPath) {
  var abs = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(abs)) return '';
  return fs.readFileSync(abs, 'utf8');
}

export function validateSecurityGuardrailsReport(payload) {
  var errors = [];
  var data = payload || {};
  if (data.schemaVersion !== 'security-report.v2') {
    errors.push('schemaVersion must be security-report.v2');
  }
  if (typeof data.generatedAt !== 'string' || data.generatedAt.length === 0) {
    errors.push('generatedAt must be an ISO string');
  }
  if (typeof data.ok !== 'boolean') {
    errors.push('ok must be boolean');
  }
  if (!Array.isArray(data.checks)) {
    errors.push('checks must be an array');
  } else {
    data.checks.forEach(function (row, index) {
      if (!row || typeof row.name !== 'string') errors.push('checks[' + index + '].name must be string');
      if (typeof row.pass !== 'boolean') errors.push('checks[' + index + '].pass must be boolean');
      if (!row || typeof row.detail !== 'string') errors.push('checks[' + index + '].detail must be string');
    });
  }
  return { ok: errors.length === 0, errors: errors };
}

export function runSecurityGuardrailsCheck() {
  var checks = [];
  checks.push(check(
    'legacy path sanitizer rejects external URL',
    sanitizeLegacyPath('https://evil.example') === 'legacy/index.html',
    'sanitizeLegacyPath(https://...)'
  ));
  checks.push(check(
    'legacy path sanitizer rejects traversal',
    sanitizeLegacyPath('../legacy/index.html') === 'legacy/index.html',
    'sanitizeLegacyPath(..)'
  ));

  var playScreenSource = readSource('src/app/play-screen.jsx');
  checks.push(check(
    'play-screen iframe uses sandbox policy',
    playScreenSource.indexOf('sandbox=\"allow-same-origin allow-scripts allow-forms allow-modals allow-downloads\"') >= 0,
    'src/app/play-screen.jsx'
  ));
  checks.push(check(
    'direct open links use noopener+noreferrer',
    playScreenSource.indexOf('rel=\"noopener noreferrer\"') >= 0,
    'src/app/play-screen.jsx'
  ));
  checks.push(check(
    'direct open links use no-referrer policy',
    playScreenSource.indexOf('referrerPolicy=\"no-referrer\"') >= 0,
    'src/app/play-screen.jsx'
  ));
  checks.push(check(
    'iframe runtime uses no-referrer policy',
    playScreenSource.indexOf('iframe') >= 0 && playScreenSource.indexOf('referrerPolicy=\"no-referrer\"') >= 0,
    'src/app/play-screen.jsx'
  ));

  var checkerSource = readSource('scripts/check-playable-build.mjs');
  checks.push(check(
    'playable-build checker blocks scheme refs',
    checkerSource.indexOf('/^[a-z][a-z0-9+.-]*:/i') >= 0,
    'scripts/check-playable-build.mjs'
  ));
  checks.push(check(
    'playable-build checker blocks protocol-relative refs',
    checkerSource.indexOf("value.indexOf('//') === 0") >= 0,
    'scripts/check-playable-build.mjs'
  ));
  checks.push(check(
    'playable-build checker normalizes refs before checks',
    checkerSource.indexOf('normalizeRef(ref)') >= 0,
    'scripts/check-playable-build.mjs'
  ));

  return {
    ok: checks.every(function (row) { return row.pass; }),
    checks: checks,
  };
}

export function writeSecurityGuardrailsReport(reportPath, payload) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/security-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  return abs;
}

function main() {
  var result = runSecurityGuardrailsCheck();
  var payload = {
    schemaVersion: 'security-report.v2',
    generatedAt: new Date().toISOString(),
    ok: result.ok,
    checks: result.checks,
  };
  var validation = validateSecurityGuardrailsReport(payload);
  if (!validation.ok) {
    validation.errors.forEach(function (err) {
      console.error('[security-guardrails] schema error: ' + err);
    });
    process.exit(1);
  }
  var reportPath = writeSecurityGuardrailsReport('dist/security-report.json', payload);
  console.log('[security-guardrails] report: ' + reportPath);
  if (!payload.ok) process.exit(1);
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
