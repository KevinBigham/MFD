import fs from 'node:fs';
import path from 'node:path';

import {
  decodeAutosavePayload,
  encodeAutosavePayload,
  ENCODED_PREFIX,
  verifyAutosavePayload,
} from '../src/app/legacy-save-api.js';

function check(name, pass, detail) {
  return {
    name: name,
    pass: !!pass,
    detail: detail || '',
  };
}

export function verifyLegacySave() {
  var checks = [];
  var payload = {
    season: 6,
    week: 12,
    teamId: 'NEO',
    leagueName: 'MFD',
    rosterSize: 53,
    generatedAt: 1760000000000,
  };

  var verifyOk = verifyAutosavePayload(payload);
  checks.push(check('payload verification passes for plain object', verifyOk.ok, verifyOk.errors.join('; ')));

  var encoded = '';
  try {
    encoded = encodeAutosavePayload(payload);
    checks.push(check('payload encodes successfully', encoded.indexOf(ENCODED_PREFIX) === 0, 'prefix=' + ENCODED_PREFIX));
  } catch (err) {
    checks.push(check('payload encodes successfully', false, err && err.message ? err.message : String(err)));
  }

  var decoded = decodeAutosavePayload(encoded);
  checks.push(check('payload decodes successfully', decoded.ok, decoded.error || ''));
  checks.push(check('roundtrip payload matches input', decoded.ok && JSON.stringify(decoded.payload) === JSON.stringify(payload), 'roundtrip compare'));

  var malformed = decodeAutosavePayload(ENCODED_PREFIX + '!!!bad-base64!!!');
  checks.push(check('corrupt payload is safely rejected', malformed.ok === false, malformed.error || ''));

  var invalid = verifyAutosavePayload(null);
  checks.push(check('invalid payload is rejected', invalid.ok === false, invalid.errors.join('; ')));

  return {
    ok: checks.every(function (row) { return row.pass; }),
    checks: checks,
  };
}

export function writeLegacySaveReport(reportPath, payload) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/legacy-save-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  return abs;
}

function parseArgs(args) {
  var out = { report: 'dist/legacy-save-report.json' };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--report' && args[i + 1]) out.report = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var result = verifyLegacySave();
  var payload = {
    generatedAt: new Date().toISOString(),
    ok: result.ok,
    checks: result.checks,
  };
  var reportPath = writeLegacySaveReport(args.report, payload);
  console.log('[legacy-save] report: ' + reportPath);
  if (!result.ok) {
    console.error('[legacy-save] failed checks:');
    result.checks.filter(function (row) { return !row.pass; }).forEach(function (row) {
      console.error(' - ' + row.name + ' (' + row.detail + ')');
    });
    process.exit(1);
  }
  console.log('[legacy-save] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
