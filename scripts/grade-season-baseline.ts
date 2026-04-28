#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  baselinePathFor,
  parseGradeSeasonCliArgs,
  reportPathFor,
  runGradeSeason,
} from './grade-season.ts';

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(resolve(entry)).href;
}

async function main(): Promise<void> {
  const options = parseGradeSeasonCliArgs(process.argv.slice(2));
  const record = await runGradeSeason({ ...options, baselineMode: true });
  const baselinePath = baselinePathFor(options.outputDir, options.releaseTag, options.seed);

  process.stdout.write(`Season report written to ${reportPathFor(options.outputDir, options.releaseTag, options.seed)}\n`);
  process.stdout.write(`Baseline written to ${baselinePath}\n`);
  process.stdout.write(`Judge count: ${record.aggregate.judgeCount}, total score: ${record.aggregate.totalScore}\n`);
}

if (isMainModule()) {
  main().catch((error) => {
    process.stderr.write(`grade-season-baseline failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
