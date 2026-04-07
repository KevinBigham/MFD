import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function runCommand(command, args, options) {
  var out = spawnSync(command, args || [], {
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: (options && options.env) || process.env,
  });
  return {
    status: typeof out.status === 'number' ? out.status : 1,
    stdout: out.stdout || '',
    stderr: out.stderr || '',
    error: out.error || null,
  };
}

export function findCommandInPath(command, envPath) {
  var out = runCommand('sh', ['-lc', 'command -v ' + command], {
    env: Object.assign({}, process.env, { PATH: envPath || process.env.PATH || '' }),
  });
  if (out.status !== 0) return '';
  return String(out.stdout || '').trim();
}

export function checkNodeNpmPath(envPath) {
  var nodePath = findCommandInPath('node', envPath);
  var npmPath = findCommandInPath('npm', envPath);
  return {
    nodePath: nodePath,
    npmPath: npmPath,
    ok: !!nodePath && !!npmPath,
  };
}

export function detectXcodeLicenseIssue(execResult) {
  var combined = [
    execResult && execResult.stdout ? execResult.stdout : '',
    execResult && execResult.stderr ? execResult.stderr : '',
    execResult && execResult.error ? String(execResult.error.message || execResult.error) : '',
  ].join('\n');
  return combined.toLowerCase().indexOf('xcode license') >= 0
    || combined.toLowerCase().indexOf('agree to the xcode license') >= 0;
}

export function checkGitUsability(options) {
  var opts = options || {};
  var runner = typeof opts.runCommand === 'function' ? opts.runCommand : runCommand;
  var gitCheck = runner('git', ['--version'], { env: opts.env });
  if (gitCheck.status !== 0) {
    return {
      ok: false,
      reason: detectXcodeLicenseIssue(gitCheck) ? 'xcode-license-blocked' : 'git-unavailable',
      stdout: gitCheck.stdout,
      stderr: gitCheck.stderr,
    };
  }
  return {
    ok: true,
    reason: 'ok',
    stdout: gitCheck.stdout,
    stderr: gitCheck.stderr,
  };
}

export function runToolchainCheck(options) {
  var opts = options || {};
  var envPath = opts.envPath || process.env.PATH || '';
  var nodeNpm = checkNodeNpmPath(envPath);
  var git = checkGitUsability({ env: opts.env, runCommand: opts.runCommand });

  var checks = [
    { name: 'node in PATH', pass: !!nodeNpm.nodePath, detail: nodeNpm.nodePath || 'missing' },
    { name: 'npm in PATH', pass: !!nodeNpm.npmPath, detail: nodeNpm.npmPath || 'missing' },
    { name: 'git usable', pass: !!git.ok, detail: git.reason },
  ];

  return {
    ok: checks.every(function (item) { return item.pass; }),
    checks: checks,
    environment: {
      platform: process.platform,
      arch: process.arch,
      pathPreview: envPath.split(':').slice(0, 6),
    },
    diagnostics: {
      nodePath: nodeNpm.nodePath,
      npmPath: nodeNpm.npmPath,
      gitReason: git.reason,
      gitStdout: git.stdout,
      gitStderr: git.stderr,
    },
    generatedAt: new Date().toISOString(),
  };
}

export function writeToolchainReport(report, outputPath) {
  var abs = path.resolve(process.cwd(), outputPath || 'dist/toolchain-readiness-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(report, null, 2) + '\n');
  return abs;
}

function parseArgs(args) {
  var out = { report: 'dist/toolchain-readiness-report.json' };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--report' && args[i + 1]) out.report = args[i + 1];
  }
  return out;
}

function main() {
  var parsed = parseArgs(process.argv.slice(2));
  var report = runToolchainCheck({});
  var reportPath = writeToolchainReport(report, parsed.report);
  console.log('[toolchain] report: ' + reportPath);
  if (!report.ok) {
    console.error('[toolchain] one or more toolchain checks failed');
    process.exit(1);
  }
  console.log('[toolchain] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
