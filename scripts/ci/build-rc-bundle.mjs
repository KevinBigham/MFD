import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function defaultRcBundleFiles() {
  return [
    'dist/playability-report.json',
    'dist/hybrid-metrics.json',
    'dist/perf-threshold-report.json',
    'dist/legacy-save-report.json',
    'dist/legacy-session-smoke-report.json',
    'dist/import-safety-report.json',
    'dist/playable-build-report.json',
    'dist/playable-smoke-report.json',
    'dist/e2e-launcher-report.json',
    'dist/e2e-launcher-summary.md',
    'dist/contracts-report.json',
    'dist/contracts-report.md',
    'dist/security-report.json',
    'docs/release-candidate-summary.md',
  ];
}

function fileChecksum(absPath) {
  var hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(absPath));
  return hash.digest('hex');
}

export function buildRcBundle(input) {
  var opts = input || {};
  var files = Array.isArray(opts.files) && opts.files.length > 0 ? opts.files : defaultRcBundleFiles();
  var included = [];
  var missing = [];

  files.forEach(function (relPath) {
    var abs = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(abs)) {
      missing.push(relPath);
      return;
    }
    included.push({
      path: relPath,
      bytes: fs.statSync(abs).size,
      sha256: fileChecksum(abs),
    });
  });

  var payload = {
    schemaVersion: 'rc-bundle-manifest.v1',
    generatedAt: new Date().toISOString(),
    ok: missing.length === 0,
    included: included,
    missing: missing,
  };

  var outputPath = path.resolve(process.cwd(), opts.outputPath || 'dist/rc-bundle-manifest.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');

  return {
    ok: payload.ok,
    outputPath: outputPath,
    included: included,
    missing: missing,
  };
}

function parseArgs(args) {
  var out = { outputPath: 'dist/rc-bundle-manifest.json' };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--output' && args[i + 1]) out.outputPath = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var out = buildRcBundle({ outputPath: args.outputPath });
  console.log('[rc-bundle] manifest: ' + out.outputPath);
  if (!out.ok) {
    out.missing.forEach(function (item) {
      console.error('[rc-bundle] missing: ' + item);
    });
    process.exit(1);
  }
  console.log('[rc-bundle] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
