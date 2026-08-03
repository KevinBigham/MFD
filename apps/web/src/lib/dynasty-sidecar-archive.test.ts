import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DYNASTY_SIDECAR_ARCHIVE_KIND,
  exportDynastySidecarArchiveJson,
  importDynastySidecarArchiveJson,
  mergeDynastySidecarArchiveJson,
  parseDynastySidecarArchiveJson,
  planDynastySidecarMerge,
  readDynastySidecarArchivePayload,
  summarizeDynastySidecarArchive,
  type DynastySidecarArchivePayload,
} from './dynasty-sidecar-archive';
import { readHallOfFameArchive } from './hall-of-fame-archive';
import { readRookieOfYearStore } from './rookie-of-year-store';
import { readRosterContinuity } from './roster-continuity-store';
import { readScrapbookStore } from './scrapbook-store';
import { readCareerMeta } from './career-meta';
import { loadRivalries, replaceRivalries } from './rivalry-storage';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function makePayload(dynastyId: string): DynastySidecarArchivePayload {
  const card = {
    gameId: `${dynastyId}-wild-card`,
    seasonYear: 2028,
    week: 19,
    round: 'wild_card' as const,
    outcome: 'win' as const,
    headline: 'Wild card comeback',
    finalScore: '28-24',
    opponentTeamId: 'opp',
    loreHook: 'A late takeaway ended the panic.',
    heroBlocks: [{ label: 'Swing', value: '+14 fourth quarter' }],
    tags: ['comeback'],
  };

  return {
    schemaVersion: 1,
    sidecars: {
      hallOfFame: {
        schemaVersion: 1,
        dynastiesById: {
          [dynastyId]: {
            dynastyId,
            teamId: 'user',
            teamCity: 'Chicago',
            teamName: 'Blaze',
            teamAbbr: 'CHI',
            startYear: 2026,
            lastSyncedYear: 2033,
            entries: [{
              playerId: `${dynastyId}-hof`,
              name: 'Jay Stone',
              position: 'QB',
              inductionYear: 2033,
              peakOvr: 96,
              careerYears: 12,
              score: 144,
              awards: {
                mvps: 1,
                allPros: 2,
                proBowls: 6,
                championships: 1,
              },
              highlights: ['League MVP', 'Championship captain'],
              teams: ['user'],
            }],
          },
        },
      },
      scrapbook: {
        schemaVersion: 2,
        entriesByDynastyId: {
          [dynastyId]: [{
            year: 2028,
            eraTag: 'Rise',
            seasonHighlightLine: 'A playoff run changed the standard.',
            notableMoments: [{
              headline: 'December surge',
              detail: 'Won four straight to take the division.',
              week: 17,
              importance: 'major',
            }],
            recap: {
              teamId: 'user',
              teamName: 'Blaze',
              teamCity: 'Chicago',
              teamAbbr: 'CHI',
              seasonYear: 2028,
              record: '11-6',
              wins: 11,
              losses: 6,
              ties: 0,
              division: 'NFC North',
              conference: 'NFC',
              divisionFinish: 1,
              conferenceFinish: 3,
              playoffResult: 'division-loss',
              teamAwards: ['Coach of the Year'],
              topPerformers: {
                passingLeader: null,
                rushingLeader: null,
              },
              seasonStory: 'The first real contention year arrived.',
              teamMotto: null,
              breakoutCandidates: [],
            },
            playoffLoreCards: [card],
          }],
        },
        pendingPlayoffLoreByDynastyId: {
          [dynastyId]: {
            '2029': [{ ...card, gameId: `${dynastyId}-pending`, seasonYear: 2029 }],
          },
        },
      },
      rookieOfYear: {
        schemaVersion: 1,
        byDynastyId: {
          [dynastyId]: [{
            playerId: `${dynastyId}-rookie`,
            playerName: 'Drew North',
            teamId: 'user',
            teamAbbr: 'CHI',
            position: 'WR',
            compositeScore: 82.4,
            headline: 'Rookie receiver became the slot engine.',
            highlights: ['82 catches', '9 TD'],
            season: 2028,
          }],
        },
      },
      rosterContinuity: {
        schemaVersion: 1,
        byDynastyId: {
          [dynastyId]: {
            lastSyncedYear: 2029,
            starterIds: [`${dynastyId}-hof`, `${dynastyId}-rookie`, `${dynastyId}-hof`],
          },
        },
      },
      careerMeta: {
        schemaVersion: 1,
        dynasties: [{
          dynastyId,
          teamId: 'user',
          teamCity: 'Chicago',
          teamName: 'Blaze',
          teamAbbr: 'CHI',
          startYear: 2026,
          endYear: null,
          seasonsCoached: 3,
          wins: 30,
          losses: 21,
          ties: 0,
          championships: 1,
          playoffAppearances: 2,
          breakoutsDeveloped: 4,
          coachesDeveloped: 1,
          hallOfFamersDeveloped: 1,
        }],
        careerTotals: {
          dynasties: 1,
          seasonsCoached: 3,
          wins: 30,
          losses: 21,
          ties: 0,
          championships: 1,
          playoffAppearances: 2,
          breakoutsDeveloped: 4,
          coachesDeveloped: 1,
          hallOfFamersDeveloped: 1,
        },
      },
      rivalries: {
        schemaVersion: 1,
        generatedAt: 17,
        teams: {
          user: [{
            opponentId: 'rival',
            intensity: 82,
            dramaTags: ['last-second'],
            lastMatchup: {
              season: 2029,
              week: 17,
              result: 'win',
              margin: 3,
            },
            headToHeadRecent: {
              wins: 3,
              losses: 2,
              ties: 0,
            },
          }],
          rival: [{
            opponentId: 'user',
            intensity: 82,
            dramaTags: ['last-second'],
            lastMatchup: {
              season: 2029,
              week: 17,
              result: 'loss',
              margin: -3,
            },
            headToHeadRecent: {
              wins: 2,
              losses: 3,
              ties: 0,
            },
          }],
        },
      },
    },
  };
}

describe('dynasty-sidecar-archive', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports a versioned archive envelope with all dynasty sidecars', () => {
    const json = exportDynastySidecarArchiveJson(makePayload('dynasty-a'), new Date('2026-06-17T12:00:00.000Z'));
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const result = parseDynastySidecarArchiveJson(json);

    expect(parsed.kind).toBe(DYNASTY_SIDECAR_ARCHIVE_KIND);
    expect(parsed.exportedAt).toBe('2026-06-17T12:00:00.000Z');
    expect(result).toMatchObject({
      ok: true,
      summary: {
        dynasties: 1,
        hallOfFameInductees: 1,
        scrapbookEntries: 1,
        pendingPlayoffLoreCards: 1,
        rookieOfYearEntries: 1,
        rosterContinuityDynasties: 1,
        careerMetaDynasties: 1,
        rivalryTeams: 2,
        rivalryRecords: 2,
      },
    });
  });

  it('parses archive JSON without mutating current sidecar storage', () => {
    const json = exportDynastySidecarArchiveJson(makePayload('dynasty-a'));
    const result = parseDynastySidecarArchiveJson(json);

    expect(result.ok).toBe(true);
    expect(readHallOfFameArchive().dynastiesById).toEqual({});
    expect(readScrapbookStore().entriesByDynastyId).toEqual({});
    expect(readRookieOfYearStore().byDynastyId).toEqual({});
    expect(readRosterContinuity().byDynastyId).toEqual({});
    expect(readCareerMeta().dynasties).toEqual([]);
    expect(loadRivalries().teams).toEqual({});
  });

  it('accepts older complete sidecar archives without a rivalry payload', () => {
    const legacyPayload = makePayload('dynasty-a');
    const { rivalries: _rivalries, ...legacySidecars } = legacyPayload.sidecars;
    const json = JSON.stringify({
      kind: DYNASTY_SIDECAR_ARCHIVE_KIND,
      exportedAt: '2026-06-17T12:00:00.000Z',
      payload: {
        ...legacyPayload,
        sidecars: legacySidecars,
      },
    });

    const result = parseDynastySidecarArchiveJson(json);

    expect(result).toMatchObject({
      ok: true,
      summary: {
        rivalryTeams: 0,
        rivalryRecords: 0,
        missingStores: ['rivalries'],
      },
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.payload.sidecars.rivalries).toBeUndefined();
    expect(result.summary.includedStores).not.toContain('rivalries');
  });

  it('imports a complete archive only after validating every sidecar payload', () => {
    const json = exportDynastySidecarArchiveJson(makePayload('dynasty-a'));
    const result = importDynastySidecarArchiveJson(json);
    const stored = readDynastySidecarArchivePayload();

    expect(result.ok).toBe(true);
    expect(stored.sidecars.hallOfFame.dynastiesById['dynasty-a']?.entries[0]?.name).toBe('Jay Stone');
    expect(stored.sidecars.scrapbook.entriesByDynastyId['dynasty-a']).toHaveLength(1);
    expect(stored.sidecars.scrapbook.pendingPlayoffLoreByDynastyId['dynasty-a']?.['2029']).toHaveLength(1);
    expect(stored.sidecars.rookieOfYear.byDynastyId['dynasty-a']?.[0]?.playerName).toBe('Drew North');
    expect(stored.sidecars.rosterContinuity.byDynastyId['dynasty-a']?.starterIds).toEqual(['dynasty-a-hof', 'dynasty-a-rookie']);
    expect(stored.sidecars.careerMeta.careerTotals.wins).toBe(30);
    expect(stored.sidecars.rivalries?.teams.user?.[0]?.opponentId).toBe('rival');
    expect(loadRivalries().teams.rival?.[0]?.opponentId).toBe('user');
  });

  it('does not replace existing rivalries when an older archive did not carry that store', () => {
    const existing = makePayload('existing-dynasty').sidecars.rivalries;
    if (!existing) throw new Error('fixture missing rivalries');
    replaceRivalries(existing);
    const legacyPayload = makePayload('dynasty-a');
    const { rivalries: _rivalries, ...legacySidecars } = legacyPayload.sidecars;
    const json = JSON.stringify({
      kind: DYNASTY_SIDECAR_ARCHIVE_KIND,
      exportedAt: '2026-06-17T12:00:00.000Z',
      payload: {
        ...legacyPayload,
        sidecars: legacySidecars,
      },
    });

    const result = importDynastySidecarArchiveJson(json);

    expect(result.ok).toBe(true);
    expect(loadRivalries()).toEqual(existing);
    expect(readDynastySidecarArchivePayload().sidecars.hallOfFame.dynastiesById['dynasty-a']).toBeTruthy();
  });

  it('replaces existing rivalries when the archive carries a present empty rivalry store', () => {
    const existing = makePayload('existing-dynasty').sidecars.rivalries;
    if (!existing) throw new Error('fixture missing rivalries');
    replaceRivalries(existing);
    const payload = makePayload('dynasty-a');
    payload.sidecars.rivalries = {
      schemaVersion: 1,
      generatedAt: 25,
      teams: {},
    };

    const result = importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(payload));

    expect(result).toMatchObject({
      ok: true,
      summary: {
        rivalryTeams: 0,
        rivalryRecords: 0,
        missingStores: [],
      },
    });
    expect(loadRivalries().teams).toEqual({});
  });

  it('rejects invalid sidecar archives without replacing existing storage', () => {
    const originalJson = exportDynastySidecarArchiveJson(makePayload('dynasty-a'));
    importDynastySidecarArchiveJson(originalJson);
    const before = readDynastySidecarArchivePayload();
    const invalid = makePayload('dynasty-b');
    invalid.sidecars.rookieOfYear.byDynastyId['dynasty-b']![0]!.position = 'BAD' as never;

    const result = importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(invalid));
    const after = readDynastySidecarArchivePayload();

    expect(result).toEqual({ ok: false, reason: 'Import is not a valid complete-dynasty sidecar archive.' });
    expect(after).toEqual(before);
  });

  it('keeps normal cartridge-looking JSON out of the sidecar import path', () => {
    const result = parseDynastySidecarArchiveJson(JSON.stringify({
      kind: 'mfd-cartridge.v1',
      payload: { save: {} },
    }));

    expect(result).toEqual({ ok: false, reason: 'Import is not a valid complete-dynasty sidecar archive.' });
  });

  it('summarizes dynasty ids across all sidecar buckets', () => {
    const summary = summarizeDynastySidecarArchive({
      ...makePayload('dynasty-a'),
      sidecars: {
        ...makePayload('dynasty-a').sidecars,
        rosterContinuity: {
          schemaVersion: 1,
          byDynastyId: {
            'dynasty-b': { lastSyncedYear: 2030, starterIds: ['p1'] },
          },
        },
      },
    });

    expect(summary.dynasties).toBe(2);
    expect(summary.rosterContinuityDynasties).toBe(1);
  });
});

describe('dynasty-sidecar-archive selective merge (C8 phase 2)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeTwoDynastyPayload(): DynastySidecarArchivePayload {
    const a = makePayload('dynasty-a');
    const b = makePayload('dynasty-b');
    const rivalries = a.sidecars.rivalries;
    return {
      schemaVersion: 1,
      sidecars: {
        hallOfFame: {
          schemaVersion: 1,
          dynastiesById: { ...a.sidecars.hallOfFame.dynastiesById, ...b.sidecars.hallOfFame.dynastiesById },
        },
        scrapbook: {
          schemaVersion: 2,
          entriesByDynastyId: { ...a.sidecars.scrapbook.entriesByDynastyId, ...b.sidecars.scrapbook.entriesByDynastyId },
          pendingPlayoffLoreByDynastyId: {
            ...a.sidecars.scrapbook.pendingPlayoffLoreByDynastyId,
            ...b.sidecars.scrapbook.pendingPlayoffLoreByDynastyId,
          },
        },
        rookieOfYear: {
          schemaVersion: 1,
          byDynastyId: { ...a.sidecars.rookieOfYear.byDynastyId, ...b.sidecars.rookieOfYear.byDynastyId },
        },
        rosterContinuity: {
          schemaVersion: 1,
          byDynastyId: { ...a.sidecars.rosterContinuity.byDynastyId, ...b.sidecars.rosterContinuity.byDynastyId },
        },
        careerMeta: {
          schemaVersion: 1,
          dynasties: [...a.sidecars.careerMeta.dynasties, ...b.sidecars.careerMeta.dynasties],
          careerTotals: a.sidecars.careerMeta.careerTotals,
        },
        ...(rivalries ? { rivalries } : {}),
      },
    };
  }

  it('merges only the selected dynasty, preserves other local dynasties, and leaves the excluded archive dynasty out', () => {
    // Local already carries dynasty-c; archive carries a+b; user selects a only.
    importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(makePayload('dynasty-c')));
    const json = exportDynastySidecarArchiveJson(makeTwoDynastyPayload());

    const result = mergeDynastySidecarArchiveJson(json, { dynastyIds: ['dynasty-a'] });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    const stored = readDynastySidecarArchivePayload();
    expect(stored.sidecars.hallOfFame.dynastiesById['dynasty-a']?.entries[0]?.name).toBe('Jay Stone');
    expect(stored.sidecars.hallOfFame.dynastiesById['dynasty-c']?.entries[0]?.playerId).toBe('dynasty-c-hof');
    expect(stored.sidecars.hallOfFame.dynastiesById['dynasty-b']).toBeUndefined();
    expect(stored.sidecars.scrapbook.entriesByDynastyId['dynasty-b']).toBeUndefined();
    expect(stored.sidecars.careerMeta.dynasties.map((d) => d.dynastyId).sort()).toEqual(['dynasty-a', 'dynasty-c']);
    // Conflict summary: only dynasty-a, every store "added" (no local conflict).
    expect(result.plan.selectedDynastyIds).toEqual(['dynasty-a']);
    expect(result.plan.conflicts).toHaveLength(1);
    expect(result.plan.conflicts[0]?.dynastyId).toBe('dynasty-a');
    expect(result.plan.conflicts[0]?.stores.map((s) => s.store).sort()).toEqual(
      ['careerMeta', 'hallOfFame', 'rookieOfYear', 'rosterContinuity', 'scrapbook'],
    );
    expect(result.plan.conflicts[0]?.stores.every((s) => s.outcome === 'added')).toBe(true);
    // Career totals recomputed across the merged set (30 wins each fixture).
    expect(readCareerMeta().careerTotals.wins).toBe(60);
    expect(readCareerMeta().careerTotals.dynasties).toBe(2);
  });

  it('reports conflicting dynasty ids as overwrites and replaces local data for those dynasties only', () => {
    // Local already carries dynasty-a (same fixture shape); archive carries a+b.
    importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(makePayload('dynasty-a')));
    const archive = makeTwoDynastyPayload();
    archive.sidecars.hallOfFame.dynastiesById['dynasty-a']!.entries[0]!.name = 'Imported Jay Stone';
    const json = exportDynastySidecarArchiveJson(archive);

    const result = mergeDynastySidecarArchiveJson(json, { dynastyIds: ['dynasty-a', 'dynasty-b'] });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    const aConflicts = result.plan.conflicts.find((c) => c.dynastyId === 'dynasty-a');
    const bConflicts = result.plan.conflicts.find((c) => c.dynastyId === 'dynasty-b');
    expect(aConflicts?.stores.every((s) => s.outcome === 'overwritten')).toBe(true);
    expect(bConflicts?.stores.every((s) => s.outcome === 'added')).toBe(true);
    const stored = readDynastySidecarArchivePayload();
    expect(stored.sidecars.hallOfFame.dynastiesById['dynasty-a']?.entries[0]?.name).toBe('Imported Jay Stone');
    expect(stored.sidecars.hallOfFame.dynastiesById['dynasty-b']).toBeTruthy();
  });

  it('merges an older archive without rivalries and never touches local rivalry heat', () => {
    const existing = makePayload('existing-dynasty').sidecars.rivalries;
    if (!existing) throw new Error('fixture missing rivalries');
    replaceRivalries(existing);
    const legacyPayload = makePayload('dynasty-a');
    const { rivalries: _rivalries, ...legacySidecars } = legacyPayload.sidecars;
    const json = JSON.stringify({
      kind: DYNASTY_SIDECAR_ARCHIVE_KIND,
      exportedAt: '2026-06-17T12:00:00.000Z',
      payload: { ...legacyPayload, sidecars: legacySidecars },
    });

    const result = mergeDynastySidecarArchiveJson(json, { dynastyIds: ['dynasty-a'] });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(loadRivalries()).toEqual(existing);
    expect(result.plan.notes.some((note) => note.includes('league-scoped'))).toBe(true);
    expect(readDynastySidecarArchivePayload().sidecars.hallOfFame.dynastiesById['dynasty-a']).toBeTruthy();
  });

  it('ignores selection ids that are not in the archive and says so', () => {
    const json = exportDynastySidecarArchiveJson(makePayload('dynasty-a'));

    const result = mergeDynastySidecarArchiveJson(json, { dynastyIds: ['dynasty-a', 'dynasty-ghost'] });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.plan.selectedDynastyIds).toEqual(['dynasty-a']);
    expect(result.plan.notes.some((note) => note.includes('dynasty-ghost'))).toBe(true);
    expect(readDynastySidecarArchivePayload().sidecars.hallOfFame.dynastiesById['dynasty-ghost']).toBeUndefined();
  });

  it('treats an empty selection as a no-op with a clear note', () => {
    importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(makePayload('dynasty-c')));
    const before = readDynastySidecarArchivePayload();
    const json = exportDynastySidecarArchiveJson(makePayload('dynasty-a'));

    const result = mergeDynastySidecarArchiveJson(json, { dynastyIds: [] });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.plan.selectedDynastyIds).toEqual([]);
    expect(result.plan.notes.some((note) => note.includes('importing nothing'))).toBe(true);
    expect(readDynastySidecarArchivePayload()).toEqual(before);
  });

  it('plans against live storage without mutating it', () => {
    importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(makePayload('dynasty-a')));
    const before = readDynastySidecarArchivePayload();
    const plan = planDynastySidecarMerge(makeTwoDynastyPayload(), ['dynasty-a', 'dynasty-b']);

    expect(plan.conflicts.find((c) => c.dynastyId === 'dynasty-a')?.stores.every((s) => s.outcome === 'overwritten')).toBe(true);
    expect(plan.conflicts.find((c) => c.dynastyId === 'dynasty-b')?.stores.every((s) => s.outcome === 'added')).toBe(true);
    expect(readDynastySidecarArchivePayload()).toEqual(before);
  });
});
