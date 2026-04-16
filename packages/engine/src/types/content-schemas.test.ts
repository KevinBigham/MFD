/**
 * Content schema validation (Sprint 40 "The Straight Line", Tier A).
 *
 * Every team JSON in packages/content/teams/ must pass TeamContentSchema.
 * If a team file drifts from the schema the content-loader will throw at
 * import time; this test catches the drift in isolation with a clearer
 * failure message.
 *
 * TODO(sprint-41): extend to Tier B directories (agm/, broadcast/,
 * narrative/, news/, social/, scouting/, coaching/, personalities/,
 * halftime/, ceremonies/, names/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TeamContentSchema } from './content-schemas';

const TEAMS_DIR = path.resolve(__dirname, '../../../content/teams');

describe('content schemas — teams/ (Tier A)', () => {
  const files = fs
    .readdirSync(TEAMS_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();

  it('discovers team JSON files on disk', () => {
    expect(files.length).toBeGreaterThanOrEqual(32);
  });

  it.each(files)('validates %s against TeamContentSchema', (file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf8')) as unknown;
    const result = TeamContentSchema.safeParse(raw);

    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Schema failure in ${file}:\n${issues}`);
    }

    expect(result.success).toBe(true);
  });

  it('every team id matches the 3-letter uppercase abbreviation convention', () => {
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf8')) as {
        id: string;
      };
      expect(raw.id).toMatch(/^[A-Z]{2,4}$/);
    }
  });

  it('no two teams share the same id', () => {
    const ids = files.map((file) => {
      const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf8')) as {
        id: string;
      };
      return raw.id;
    });
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all conferences and divisions are in the allowed enum set', () => {
    const validConferences = new Set(['AFC', 'NFC']);
    const validDivisions = new Set(['North', 'South', 'East', 'West']);
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf8')) as {
        conference: string;
        division: string;
      };
      expect(validConferences.has(raw.conference)).toBe(true);
      expect(validDivisions.has(raw.division)).toBe(true);
    }
  });
});
