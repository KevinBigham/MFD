#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYTEST_PERSONAS, runPlaytest } from '../packages/engine/src/index.ts';

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseStringFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function parseNumberFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const raw = process.argv[index + 1];
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Flag ${name} requires a numeric value; got "${raw}"`);
  }
  return value;
}

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width, ' ');
}

const DEFAULT_PERSONA_ID = 'SPEEDRUNNER';
const all = hasFlag('--all');
const personaId = parseStringFlag('--persona', DEFAULT_PERSONA_ID).toUpperCase();
const seed = parseNumberFlag('--seed', 42);
const seasons = parseNumberFlag('--seasons', all ? 10 : 3);

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const outDir = resolve(repoRoot, 'tmp');

async function main(): Promise<void> {
  const personas = all
    ? PLAYTEST_PERSONAS
    : [PLAYTEST_PERSONAS.find((persona) => persona.id === personaId)]
      .filter((persona): persona is (typeof PLAYTEST_PERSONAS)[number] => Boolean(persona));

  if (personas.length === 0) {
    throw new Error(`Unknown playtest persona "${personaId}". Available: ${PLAYTEST_PERSONAS.map((persona) => persona.id).join(', ')}`);
  }

  await mkdir(outDir, { recursive: true });

  const rows = [
    `${pad('persona', 14)} ${pad('seasons', 8)} ${pad('weeks', 8)} ${pad('anomalies', 10)} ${pad('high', 6)}`,
    `${pad('------', 14)} ${pad('-------', 8)} ${pad('-----', 8)} ${pad('---------', 10)} ${pad('----', 6)}`,
  ];

  for (const persona of personas) {
    process.stdout.write(`Running playtest persona ${persona.id} (seed=${seed}, seasons=${seasons})...\n`);
    const report = runPlaytest(persona, seed, seasons);
    const outPath = resolve(outDir, `playtest-report-${persona.id}-${seed}.json`);

    await writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    rows.push(
      `${pad(report.personaId, 14)} ${pad(report.seasonsCompleted, 8)} ${pad(report.weeksAdvanced, 8)} ${pad(report.anomalyCount, 10)} ${pad(report.highSeverityCount, 6)}`,
    );
    process.stdout.write(`Wrote ${outPath}\n`);

    if (report.highSeverityCount > 0) {
      process.exitCode = 1;
    }
  }

  process.stdout.write(`${rows.join('\n')}\n`);
}

main().catch((error) => {
  process.stderr.write(`playtest-report failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
