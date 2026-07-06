#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  baselinePathFor,
  buildGradeSeasonCliPreflight,
  formatGradeSeasonHelp,
  isGradeSeasonHelpRequested,
  parseGradeSeasonCliArgs,
  reportPathFor,
  runGradeSeason,
} from './grade-season.ts';

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (isGradeSeasonHelpRequested(args)) {
    process.stdout.write(formatGradeSeasonHelp('grade-season-baseline'));
    return;
  }

  const options = parseGradeSeasonCliArgs(args);
  process.stdout.write(`${buildGradeSeasonCliPreflight(options, { baselineMode: true })}\n\n`);
  const record = await runGradeSeason({ ...options, baselineMode: true });
  const baselinePath = baselinePathFor(options.outputDir, options.releaseTag, options.seed);

  process.stdout.write(`Season report written to ${reportPathFor(options.outputDir, options.releaseTag, options.seed)}\n`);
  process.stdout.write(`Baseline written to ${baselinePath}\n`);
  process.stdout.write(`Judge count: ${record.aggregate.judgeCount}, total score: ${record.aggregate.totalScore}\n`);
}

if (isMainModule()) {
  main().catch((error) => {
    process.stderr.write(`grade-season-baseline failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.stderr.write('Run with --help for usage, required flags, output paths, baseline behavior, and API-key expectations.\n');
    process.exit(1);
  });
}
