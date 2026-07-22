import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../config';
import { makeLeagueState } from '../systems/test-helpers';
import { getRegisteredVersions, migrate } from './migrations';
import { SaveStateSchema } from './schema';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const fixtureDir = path.join(repoRoot, 'packages/engine/src/save/fixtures');
const checkedInFixtureVersions = [1, 10, 20, 30, 31, 32, 33, 34] as const;

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readFixture(version: number): Record<string, unknown> {
  return JSON.parse(readRepoFile(`packages/engine/src/save/fixtures/v${version}.json`)) as Record<string, unknown>;
}

function schemaIssues(result: ReturnType<typeof SaveStateSchema.safeParse>): string {
  if (result.success) return '';
  return result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
}

describe('save version drift guard', () => {
  it('keeps SAVE_VERSION aligned with migration and fixture policy', () => {
    expect(getRegisteredVersions()).toEqual(Array.from({ length: SAVE_VERSION - 1 }, (_, index) => index + 1));

    const fixtureFiles = readdirSync(fixtureDir)
      .filter((fileName) => /^v\d+\.json$/.test(fileName))
      .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0));
    const fixtureVersions = fixtureFiles.map((fileName) => Number(fileName.match(/\d+/)?.[0] ?? 0));

    expect(fixtureVersions).toEqual([...checkedInFixtureVersions]);
    expect(Math.max(...fixtureVersions)).toBeLessThanOrEqual(SAVE_VERSION - 2);

    for (const fixtureVersion of fixtureVersions) {
      expect(readFixture(fixtureVersion)['version']).toBe(fixtureVersion);
    }
  });

  it('keeps generated previous-version and current-version save coverage aligned', () => {
    const latestCheckedInFixture = Math.max(...checkedInFixtureVersions);
    const previousVersionFixture = migrate(readFixture(latestCheckedInFixture), SAVE_VERSION - 1);
    expect(previousVersionFixture['version']).toBe(SAVE_VERSION - 1);

    const migratedPrevious = migrate(structuredClone(previousVersionFixture), SAVE_VERSION);
    const previousResult = SaveStateSchema.safeParse(migratedPrevious);
    expect(migratedPrevious['version']).toBe(SAVE_VERSION);
    expect(previousResult.success, schemaIssues(previousResult)).toBe(true);

    const currentGenerated = JSON.parse(JSON.stringify(makeLeagueState())) as Record<string, unknown>;
    const migratedCurrent = migrate(currentGenerated, SAVE_VERSION);
    const currentResult = SaveStateSchema.safeParse(migratedCurrent);
    expect(migratedCurrent['version']).toBe(SAVE_VERSION);
    expect(currentResult.success, schemaIssues(currentResult)).toBe(true);
  });

  it('keeps Codex handoff docs in sync with the current save version', () => {
    const guide = readRepoFile('CODEX_GAME_GUIDE.md');
    const plan = readRepoFile('CODEX_IMPROVEMENT_PLAN.md');
    const marathonPrompt = readRepoFile('CODEX_GOAT_MARATHON_PROMPT.md');

    expect(guide).toContain(`Current source-truth save schema is \`SAVE_VERSION = ${SAVE_VERSION}\``);
    expect(guide).toContain(`Runtime save version: \`SAVE_VERSION = ${SAVE_VERSION}\``);
    expect(guide).toContain(`current-v${SAVE_VERSION}`);
    expect(guide).toContain(`v${SAVE_VERSION - 1}`);

    expect(plan).toContain(`SAVE_VERSION = ${SAVE_VERSION}`);
    expect(plan).toContain(`generated v${SAVE_VERSION - 1}/current-v${SAVE_VERSION}`);
    expect(plan).toContain('save-version drift');

    expect(marathonPrompt).toContain('save-version drift');
    expect(marathonPrompt).toContain('Confirm SAVE_VERSION from packages/engine/src/config/difficulty.ts');
  });
});
