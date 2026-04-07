import fs from 'node:fs';
import path from 'node:path';

export function runDryRollbackCheck(cwd) {
  var root = path.resolve(cwd || process.cwd());
  var docs = [
    'docs/hybrid-v3-rollback-drill.md',
    'docs/playable-rollback-plan.md',
  ];
  var missingDocs = docs.filter(function (rel) {
    return !fs.existsSync(path.resolve(root, rel));
  });
  return {
    ok: missingDocs.length === 0,
    missingDocs: missingDocs,
    checkedAt: new Date().toISOString(),
  };
}

function main() {
  var out = runDryRollbackCheck(process.cwd());
  if (!out.ok) {
    console.error('[dry-rollback] missing rollback docs:');
    out.missingDocs.forEach(function (file) { console.error(' - ' + file); });
    process.exit(1);
  }
  console.log('[dry-rollback] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
