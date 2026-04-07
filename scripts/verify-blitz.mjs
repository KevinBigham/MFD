import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export var BLITZ_STEPS = [
  { name: 'toolchain', cmd: ['npm', 'run', 'verify:toolchain'] },
  { name: 'lane', cmd: ['npm', 'run', 'verify:lane'] },
  { name: 'hybrid', cmd: ['npm', 'run', 'verify:hybrid'] },
  { name: 'e2e', cmd: ['npm', 'run', 'e2e:launcher'] },
  { name: 'security', cmd: ['npm', 'run', 'verify:security'] },
  { name: 'perf', cmd: ['npm', 'run', 'verify:perf'] },
  { name: 'contracts', cmd: ['npm', 'run', 'verify:contracts'] },
];

export function runBlitzGate(options) {
  var opts = options || {};
  var runner = typeof opts.runner === 'function' ? opts.runner : function (step) {
    return spawnSync(step.cmd[0], step.cmd.slice(1), {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    });
  };

  var results = BLITZ_STEPS.map(function (step) {
    var outcome = runner(step);
    var code = typeof outcome.status === 'number' ? outcome.status : 1;
    return {
      name: step.name,
      command: step.cmd.join(' '),
      code: code,
      ok: code === 0,
    };
  });

  var report = {
    schemaVersion: 'blitz-gate-report.v1',
    generatedAt: new Date().toISOString(),
    ok: results.every(function (row) { return row.ok; }),
    steps: results,
  };

  var outPath = path.resolve(process.cwd(), opts.reportPath || 'dist/blitz-gate-report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

  return { report: report, outputPath: outPath };
}

function main() {
  var out = runBlitzGate({});
  console.log('[verify-blitz] report: ' + out.outputPath);
  if (!out.report.ok) {
    out.report.steps.filter(function (row) { return !row.ok; }).forEach(function (row) {
      console.error('[verify-blitz] failed: ' + row.name + ' (' + row.command + ')');
    });
    process.exit(1);
  }
  console.log('[verify-blitz] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
