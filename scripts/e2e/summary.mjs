import fs from 'node:fs';
import path from 'node:path';

export function buildE2ESummaryMarkdown(report) {
  var payload = report || {};
  var checks = Array.isArray(payload.checks) ? payload.checks : [];
  var lines = [
    '# Launcher E2E Summary',
    '',
    '- Status: ' + (payload.ok ? 'PASS' : 'FAIL'),
    '- Generated: ' + (payload.generatedAt || 'unknown'),
    '- Dist: ' + (payload.distDir || 'unknown'),
    '- Base URL: ' + (payload.baseUrl || '(static-only)'),
    '- Total checks: ' + checks.length,
    '',
    '| Check | Result | Detail |',
    '|---|---|---|',
  ];

  checks.forEach(function (check) {
    var state = check.skipped ? 'SKIP' : (check.pass ? 'PASS' : 'FAIL');
    lines.push('| ' + check.name + ' | ' + state + ' | ' + (check.detail || '') + ' |');
  });

  return lines.join('\n') + '\n';
}

export function writeE2ESummary(summaryPath, markdown) {
  var abs = path.resolve(process.cwd(), summaryPath || 'dist/e2e-launcher-summary.md');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, markdown, 'utf8');
  return abs;
}
