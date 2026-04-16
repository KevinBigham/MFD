/**
 * Canonical scheme ID registry check (Sprint 41).
 *
 * Any scheme/plan identifier referenced in packages/content/ must resolve
 * against SCHEME_IDS. This catches the historical drift where content used
 * e.g. "power_run", "press_man", "tampa_2" while the engine exposed
 * "smashmouth", "man_press", "nickel".
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCHEME_IDS, SCHEME_ID_SET, isCanonicalSchemeId } from './schemes';

const CONTENT_DIR = path.resolve(__dirname, '../../../content');

function loadJson<T>(relPath: string): T {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, relPath), 'utf8')) as T;
}

describe('SCHEME_IDS — canonical registry', () => {
  it('includes baseline offensive schemes', () => {
    expect(SCHEME_ID_SET.has('spread')).toBe(true);
    expect(SCHEME_ID_SET.has('west_coast')).toBe(true);
    expect(SCHEME_ID_SET.has('smashmouth')).toBe(true);
    expect(SCHEME_ID_SET.has('pro_style')).toBe(true);
    expect(SCHEME_ID_SET.has('air_coryell')).toBe(true);
    expect(SCHEME_ID_SET.has('balanced')).toBe(true);
    expect(SCHEME_ID_SET.has('pistol')).toBe(true);
    expect(SCHEME_ID_SET.has('heavy_jumbo')).toBe(true);
  });

  it('includes baseline defensive schemes', () => {
    expect(SCHEME_ID_SET.has('4-3')).toBe(true);
    expect(SCHEME_ID_SET.has('3-4')).toBe(true);
    expect(SCHEME_ID_SET.has('multiple_d')).toBe(true);
    expect(SCHEME_ID_SET.has('nickel')).toBe(true);
    expect(SCHEME_ID_SET.has('bear_46')).toBe(true);
  });

  it('includes canonical plans (air_raid, zone_cov, man_press, etc.)', () => {
    expect(SCHEME_ID_SET.has('air_raid')).toBe(true);
    expect(SCHEME_ID_SET.has('ground_pound')).toBe(true);
    expect(SCHEME_ID_SET.has('zone_cov')).toBe(true);
    expect(SCHEME_ID_SET.has('man_press')).toBe(true);
    expect(SCHEME_ID_SET.has('blitz_heavy')).toBe(true);
    expect(SCHEME_ID_SET.has('balanced_d')).toBe(true);
  });

  it('isCanonicalSchemeId rejects historical drift IDs', () => {
    expect(isCanonicalSchemeId('power_run')).toBe(false);
    expect(isCanonicalSchemeId('press_man')).toBe(false);
    expect(isCanonicalSchemeId('3_4_base')).toBe(false);
    expect(isCanonicalSchemeId('tampa_2')).toBe(false);
    expect(isCanonicalSchemeId('spread_option')).toBe(false);
  });

  it('SCHEME_IDS has no duplicates', () => {
    expect(new Set(SCHEME_IDS).size).toBe(SCHEME_IDS.length);
  });
});

describe('Content scheme IDs — canonical alignment', () => {
  it('hiring-content.json: every scheme_preference ID is canonical', () => {
    interface HiringCandidate {
      scheme_preference?: { offense?: string; defense?: string };
    }
    const hiring = loadJson<{ head_coach_candidates: HiringCandidate[] }>(
      'agm/hiring-content.json',
    );
    const offending: string[] = [];
    for (const candidate of hiring.head_coach_candidates) {
      const off = candidate.scheme_preference?.offense;
      const def = candidate.scheme_preference?.defense;
      if (off && !isCanonicalSchemeId(off)) offending.push(`offense=${off}`);
      if (def && !isCanonicalSchemeId(def)) offending.push(`defense=${def}`);
    }
    expect(offending).toEqual([]);
  });

  it('coach-archetypes.json: every scheme_descriptions key is canonical', () => {
    const archetypes = loadJson<{
      scheme_descriptions: { offense: Record<string, unknown>; defense: Record<string, unknown> };
    }>('coaching/coach-archetypes.json');
    const offensiveKeys = Object.keys(archetypes.scheme_descriptions.offense);
    const defensiveKeys = Object.keys(archetypes.scheme_descriptions.defense);
    const offending = [...offensiveKeys, ...defensiveKeys].filter((id) => !isCanonicalSchemeId(id));
    expect(offending).toEqual([]);
  });

  it('teaching-polish.json: every scheme_reactions key is canonical', () => {
    const polish = loadJson<{
      scheme_reactions: Record<string, Record<string, string>>;
    }>('agm/teaching-polish.json');
    const offending = new Set<string>();
    for (const coachReactions of Object.values(polish.scheme_reactions)) {
      for (const id of Object.keys(coachReactions)) {
        if (!isCanonicalSchemeId(id)) offending.add(id);
      }
    }
    expect([...offending]).toEqual([]);
  });
});
