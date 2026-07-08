import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const appRoot = new URL('../', import.meta.url);
const allowedDirectSimImports = new Set([
  'app/store/sim.ts',
  'app/store/sim.worker.ts',
]);
const directEngineSimImportPattern = /import\s*\{[\s\S]*?\b(advanceFranchiseWeek|previewHalftimeDecision)\b[\s\S]*?\}\s*from\s*['"]@mfd\/engine['"]/m;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') return [];
    if (statSync(fullPath).isDirectory()) return listSourceFiles(fullPath);
    return fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') ? [fullPath] : [];
  });
}

describe('app architecture boundaries', () => {
  it('keeps direct engine simulation imports behind the sim Worker boundary', () => {
    const offenders = listSourceFiles(appRoot.pathname)
      .filter((file) => !file.endsWith('.test.ts'))
      .filter((file) => {
        const rel = relative(appRoot.pathname, file);
        if (allowedDirectSimImports.has(rel)) return false;
        const source = readFileSync(file, 'utf8');
        return directEngineSimImportPattern.test(source);
      })
      .map((file) => relative(appRoot.pathname, file));

    expect(offenders).toEqual([]);
  });
});
