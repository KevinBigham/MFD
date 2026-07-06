import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DYNASTY_SIDECAR_ARCHIVE_KIND,
  exportDynastySidecarArchiveJson,
  importDynastySidecarArchiveJson,
  parseDynastySidecarArchiveJson,
  readDynastySidecarArchivePayload,
  summarizeDynastySidecarArchive,
  type DynastySidecarArchivePayload,
} from './dynasty-sidecar-archive';
import { readHallOfFameArchive } from './hall-of-fame-archive';
import { readRookieOfYearStore } from './rookie-of-year-store';
import { readRosterContinuity } from './roster-continuity-store';
import { readScrapbookStore } from './scrapbook-store';
import { readCareerMeta } from './career-meta';
import { loadRivalries } from './rivalry-storage';

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
      },
    });
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
    expect(stored.sidecars.rivalries.teams.user?.[0]?.opponentId).toBe('rival');
    expect(loadRivalries().teams.rival?.[0]?.opponentId).toBe('user');
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
