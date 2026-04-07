import { execSync } from 'node:child_process';

export async function runWithRetry(runFn, maxAttempts) {
  var fn = typeof runFn === 'function' ? runFn : function () {};
  var attempts = Math.max(1, Number(maxAttempts) || 2);
  var errors = [];
  for (var i = 1; i <= attempts; i += 1) {
    try {
      var output = await fn(i);
      return { ok: true, attempts: i, output: output, errors: errors };
    } catch (err) {
      errors.push(err && err.message ? err.message : String(err));
      if (i >= attempts) {
        return { ok: false, attempts: i, output: '', errors: errors };
      }
    }
  }
  return { ok: false, attempts: attempts, output: '', errors: errors };
}

function parseArgs(args) {
  var out = { command: '', attempts: 2 };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--cmd' && args[i + 1]) out.command = args[i + 1];
    if (args[i] === '--attempts' && args[i + 1]) out.attempts = Number(args[i + 1]) || 2;
  }
  return out;
}

async function main() {
  var args = parseArgs(process.argv.slice(2));
  if (!args.command) {
    console.error('[retry-once] missing --cmd');
    process.exit(1);
  }
  var out = await runWithRetry(function () {
    execSync(args.command, { stdio: 'inherit' });
    return 'ok';
  }, args.attempts);

  if (!out.ok) {
    console.error('[retry-once] command failed after ' + out.attempts + ' attempt(s)');
    process.exit(1);
  }
  console.log('[retry-once] command passed in ' + out.attempts + ' attempt(s)');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
