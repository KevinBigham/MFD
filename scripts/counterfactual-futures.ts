import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { runCounterfactualFutures } from '../packages/engine/src/playtesting/index.ts';
import type { GameState } from '../packages/engine/src/types/index.ts';

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback ?? '';
}
const statePath = arg('state');
if (!statePath) throw new Error('--state path is required');
const state = JSON.parse(await readFile(statePath, 'utf8')) as GameState;
const scenarioId = arg('scenario', 'counterfactual');
const teamId = arg('team');
const offerId = arg('offer');
const samples = Number(arg('samples', '32'));
const seed = Number(arg('seed', String(state.seed)));
const output = arg('output', 'tmp/counterfactual-futures.json');
if (!teamId || !offerId) throw new Error('--team and --offer are required');
const result = runCounterfactualFutures(state, { id: scenarioId, label: scenarioId, teamId, offerId }, { seed, samples, horizonSeasons: 1 });
const payload = { schemaVersion: 1, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), inputs: { scenarioId, teamId, offerId, seed, samples, horizonSeasons: 1 }, result };
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(output);
