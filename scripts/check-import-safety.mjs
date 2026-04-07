import fs from 'node:fs';
import path from 'node:path';

import {
  MAX_IMPORT_BYTES,
  SAVE_IMPORT_EXPORT_SCHEMA,
  validateImportPayload,
} from '../src/app/save-import-export.js';

function check(name, pass, detail) {
  return {
    name: name,
    pass: !!pass,
    detail: detail || '',
  };
}

function readInputPayload(inputPath) {
  if (!inputPath) return { exists: false, text: '' };
  var abs = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(abs)) return { exists: false, text: '' };
  return { exists: true, text: fs.readFileSync(abs, 'utf8') };
}

export function runImportSafetyCheck(options) {
  var opts = options || {};
  var inputPath = opts.inputPath || '';
  var input = readInputPayload(inputPath);
  var checks = [];

  checks.push(check('import schema constant is stable', SAVE_IMPORT_EXPORT_SCHEMA === 'mfd-save-slot.v1', SAVE_IMPORT_EXPORT_SCHEMA));
  checks.push(check('import max size guardrail is set', MAX_IMPORT_BYTES >= 1024 * 1024, String(MAX_IMPORT_BYTES)));

  if (!input.exists) {
    checks.push(check('import payload file provided', true, 'no input payload provided; structural checks only'));
    return {
      ok: checks.every(function (row) { return row.pass; }),
      checks: checks,
      inputPath: inputPath,
      payloadBytes: 0,
    };
  }

  checks.push(check('import payload file provided', true, inputPath));
  checks.push(check('import payload respects max size', input.text.length <= MAX_IMPORT_BYTES, input.text.length + ' bytes'));

  var validation = validateImportPayload(input.text);
  checks.push(check('import payload validates', validation.ok, validation.error || 'ok'));

  return {
    ok: checks.every(function (row) { return row.pass; }),
    checks: checks,
    inputPath: inputPath,
    payloadBytes: input.text.length,
    validation: validation,
  };
}

export function writeImportSafetyReport(reportPath, payload) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/import-safety-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  return abs;
}

function parseArgs(args) {
  var out = { inputPath: '', reportPath: 'dist/import-safety-report.json' };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--input' && args[i + 1]) out.inputPath = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.reportPath = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var result = runImportSafetyCheck({ inputPath: args.inputPath });
  var payload = {
    generatedAt: new Date().toISOString(),
    ok: result.ok,
    checks: result.checks,
    inputPath: result.inputPath,
    payloadBytes: result.payloadBytes,
    validation: result.validation || null,
  };
  var report = writeImportSafetyReport(args.reportPath, payload);
  console.log('[import-safety] report: ' + report);
  if (!payload.ok) {
    payload.checks.filter(function (row) { return !row.pass; }).forEach(function (row) {
      console.error('[import-safety] fail: ' + row.name + ' - ' + row.detail);
    });
    process.exit(1);
  }
  console.log('[import-safety] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
