import fs from 'node:fs';
import path from 'node:path';

var REQUIRED_FILES = [
  'dist/playability-report.json',
  'dist/legacy-save-report.json',
  'dist/legacy-session-smoke-report.json',
  'dist/playable-build-report.json',
  'dist/playable-smoke-report.json',
  'dist/security-report.json',
  'docs/release-candidate-summary.md',
];

export function runRcChecklist(cwd) {
  var root = path.resolve(cwd || process.cwd());
  var missing = REQUIRED_FILES.filter(function (rel) {
    return !fs.existsSync(path.resolve(root, rel));
  });
  return {
    ok: missing.length === 0,
    missing: missing,
    required: REQUIRED_FILES.slice(),
  };
}

function main() {
  var out = runRcChecklist(process.cwd());
  if (!out.ok) {
    console.error('[rc-checklist] missing required files:');
    out.missing.forEach(function (file) { console.error(' - ' + file); });
    process.exit(1);
  }
  console.log('[rc-checklist] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
