#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = join(repoRoot, 'apps/web');
const vitestBin = process.platform === 'win32' ? 'vitest.cmd' : 'vitest';
const vitestPath = join(webRoot, 'node_modules/.bin', vitestBin);
const g4TestPath = join(webRoot, 'src/app/store/g4-multi-year-trust.test.ts');

export function buildG4MultiYearTrustCommand(env = process.env, platform = process.platform) {
  const bin = platform === 'win32' ? 'vitest.cmd' : 'vitest';
  return {
    command: join(webRoot, 'node_modules/.bin', bin),
    args: ['run', 'src/app/store/g4-multi-year-trust.test.ts'],
    cwd: webRoot,
    env: {
      ...env,
      VITE_CHIP_ENABLED: env.VITE_CHIP_ENABLED ?? 'true',
    },
  };
}

export function runG4MultiYearTrustSmoke() {
  if (!existsSync(vitestPath)) {
    throw new Error(`Missing app-local vitest binary at ${vitestPath}. Install workspace dependencies first.`);
  }

  if (!existsSync(g4TestPath)) {
    throw new Error(`Missing G4 multi-year trust test at ${g4TestPath}.`);
  }

  const startedAt = Date.now();
  console.log('Running G4 multi-year trust smoke...');
  const command = buildG4MultiYearTrustCommand();
  const result = spawnSync(command.command, command.args, {
    cwd: command.cwd,
    env: command.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`G4 multi-year trust smoke failed with exit code ${result.status ?? 'unknown'}.`);
  }

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`PASS: G4 multi-year trust smoke passed in ${elapsedSeconds}s.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runG4MultiYearTrustSmoke();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
