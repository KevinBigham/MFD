import fs from 'node:fs';
import path from 'node:path';

export var E2E_REPORT_VERSION = '1';

export function createE2ECheck(name, pass, detail, extras) {
  var meta = extras || {};
  return {
    name: String(name || 'unnamed-check'),
    pass: !!pass,
    detail: String(detail || ''),
    skipped: !!meta.skipped,
    durationMs: Number(meta.durationMs || 0),
  };
}

export function buildE2EReport(input) {
  var payload = input || {};
  return {
    version: E2E_REPORT_VERSION,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    ok: !!payload.ok,
    distDir: String(payload.distDir || ''),
    baseUrl: String(payload.baseUrl || ''),
    checks: Array.isArray(payload.checks) ? payload.checks : [],
    summary: {
      total: Number(payload.summary && payload.summary.total || 0),
      passed: Number(payload.summary && payload.summary.passed || 0),
      failed: Number(payload.summary && payload.summary.failed || 0),
      skipped: Number(payload.summary && payload.summary.skipped || 0),
    },
  };
}

export function validateE2EReport(report) {
  var errors = [];
  if (!report || typeof report !== 'object') {
    return { ok: false, errors: ['report must be an object'] };
  }
  if (report.version !== E2E_REPORT_VERSION) errors.push('version mismatch');
  if (typeof report.generatedAt !== 'string' || report.generatedAt.length < 8) errors.push('generatedAt missing');
  if (typeof report.ok !== 'boolean') errors.push('ok must be boolean');
  if (!Array.isArray(report.checks)) errors.push('checks must be array');

  if (Array.isArray(report.checks)) {
    report.checks.forEach(function (check, index) {
      if (!check || typeof check !== 'object') {
        errors.push('check[' + index + '] must be object');
        return;
      }
      if (typeof check.name !== 'string' || check.name.length === 0) errors.push('check[' + index + '].name missing');
      if (typeof check.pass !== 'boolean') errors.push('check[' + index + '].pass must be boolean');
      if (typeof check.detail !== 'string') errors.push('check[' + index + '].detail must be string');
      if (typeof check.skipped !== 'boolean') errors.push('check[' + index + '].skipped must be boolean');
      if (typeof check.durationMs !== 'number' || Number.isNaN(check.durationMs)) errors.push('check[' + index + '].durationMs must be number');
    });
  }

  return { ok: errors.length === 0, errors: errors };
}

export function summarizeE2EChecks(checks) {
  var items = Array.isArray(checks) ? checks : [];
  var summary = {
    total: items.length,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  items.forEach(function (item) {
    if (item && item.skipped) {
      summary.skipped += 1;
      return;
    }
    if (item && item.pass) summary.passed += 1;
    else summary.failed += 1;
  });

  return summary;
}

export function writeE2EReport(reportPath, payload) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/e2e-launcher-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  return abs;
}
