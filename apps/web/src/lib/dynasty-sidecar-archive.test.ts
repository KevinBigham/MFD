import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DYNASTY_SIDECAR_ARCHIVE_KIND,
  exportDynastySidecarArchiveJson,
  importDynastySidecarArchiveJson,
  mergeDynastySidecarArchiveJson,
  mergeDynastySidecarPayloads,
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

  describe('selective per-dynasty sidecar restore', () => {
    it('restores only selected dynasty from archive while preserving unselected local dynasty', () => {
      // Seed local storage with Dynasty A and Dynasty B
      importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(makePayload('dynasty-a')));
      const payloadB = makePayload('dynasty-b');
      // Append Dynasty B
      const localCombined: DynastySidecarArchivePayload = {
        schemaVersion: 1,
        sidecars: {
          hallOfFame: {
            schemaVersion: 1,
            dynastiesById: {
              ...readHallOfFameArchive().dynastiesById,
              ...payloadB.sidecars.hallOfFame.dynastiesById,
            },
          },
          scrapbook: {
            schemaVersion: 2,
            entriesByDynastyId: {
              ...readScrapbookStore().entriesByDynastyId,
              ...payloadB.sidecars.scrapbook.entriesByDynastyId,
            },
            pendingPlayoffLoreByDynastyId: {
              ...readScrapbookStore().pendingPlayoffLoreByDynastyId,
              ...payloadB.sidecars.scrapbook.pendingPlayoffLoreByDynastyId,
            },
          },
          rookieOfYear: {
            schemaVersion: 1,
            byDynastyId: {
              ...readRookieOfYearStore().byDynastyId,
              ...payloadB.sidecars.rookieOfYear.byDynastyId,
            },
          },
          rosterContinuity: {
            schemaVersion: 1,
            byDynastyId: {
              ...readRosterContinuity().byDynastyId,
              ...payloadB.sidecars.rosterContinuity.byDynastyId,
            },
          },
          careerMeta: {
            schemaVersion: 1,
            dynasties: [...readCareerMeta().dynasties, ...payloadB.sidecars.careerMeta.dynasties],
            careerTotals: readCareerMeta().careerTotals,
          },
          rivalries: loadRivalries(),
        },
      };
      importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(localCombined));

      const beforeA = readHallOfFameArchive().dynastiesById['dynasty-a'];
      const beforeB = readHallOfFameArchive().dynastiesById['dynasty-b'];
      expect(beforeA).toBeDefined();
      expect(beforeB).toBeDefined();

      // Incoming archive contains updated Dynasty A and new Dynasty C
      const incomingA = makePayload('dynasty-a');
      incomingA.sidecars.hallOfFame.dynastiesById['dynasty-a']!.entries[0]!.name = 'Jay Stone Updated';
      const incomingC = makePayload('dynasty-c');
      const incomingPayload: DynastySidecarArchivePayload = {
        schemaVersion: 1,
        sidecars: {
          hallOfFame: {
            schemaVersion: 1,
            dynastiesById: {
              ...incomingA.sidecars.hallOfFame.dynastiesById,
              ...incomingC.sidecars.hallOfFame.dynastiesById,
            },
          },
          scrapbook: {
            schemaVersion: 2,
            entriesByDynastyId: {
              ...incomingA.sidecars.scrapbook.entriesByDynastyId,
              ...incomingC.sidecars.scrapbook.entriesByDynastyId,
            },
            pendingPlayoffLoreByDynastyId: {
              ...incomingA.sidecars.scrapbook.pendingPlayoffLoreByDynastyId,
              ...incomingC.sidecars.scrapbook.pendingPlayoffLoreByDynastyId,
            },
          },
          rookieOfYear: {
            schemaVersion: 1,
            byDynastyId: {
              ...incomingA.sidecars.rookieOfYear.byDynastyId,
              ...incomingC.sidecars.rookieOfYear.byDynastyId,
            },
          },
          rosterContinuity: {
            schemaVersion: 1,
            byDynastyId: {
              ...incomingA.sidecars.rosterContinuity.byDynastyId,
              ...incomingC.sidecars.rosterContinuity.byDynastyId,
            },
          },
          careerMeta: {
            schemaVersion: 1,
            dynasties: [...incomingA.sidecars.careerMeta.dynasties, ...incomingC.sidecars.careerMeta.dynasties],
            careerTotals: incomingA.sidecars.careerMeta.careerTotals,
          },
        },
      };

      // Perform selective merge selecting ONLY dynasty-a
      const result = mergeDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(incomingPayload), ['dynasty-a']);
      expect(result.ok).toBe(true);

      const afterHof = readHallOfFameArchive().dynastiesById;
      expect(afterHof['dynasty-a']?.entries[0]?.name).toBe('Jay Stone Updated');
      expect(afterHof['dynasty-b']).toEqual(beforeB); // Deeply equal unselected local dynasty!
      expect(afterHof['dynasty-c']).toBeUndefined(); // Dynasty C not selected
    });

    it('selective merge never modifies local rivalry storage', () => {
      const initialPayload = makePayload('dynasty-a');
      initialPayload.sidecars.rivalries = {
        schemaVersion: 1,
        generatedAt: 10,
        teams: {
          'team-x': [{
            opponentId: 'team-y',
            intensity: 50,
            dramaTags: [],
            lastMatchup: null,
            headToHeadRecent: { wins: 5, losses: 2, ties: 0 },
          }],
        },
      };
      importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(initialPayload));
      const rivalryBefore = loadRivalries();

      const incomingPayload = makePayload('dynasty-b');
      incomingPayload.sidecars.rivalries = {
        schemaVersion: 1,
        generatedAt: 99,
        teams: {
          'team-x': [{
            opponentId: 'team-y',
            intensity: 99,
            dramaTags: [],
            lastMatchup: null,
            headToHeadRecent: { wins: 99, losses: 99, ties: 0 },
          }],
        },
      };

      mergeDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(incomingPayload), ['dynasty-b']);

      const rivalryAfter = loadRivalries();
      expect(rivalryAfter).toEqual(rivalryBefore);
    });

    it('rejects selection of unknown dynasty ID without mutating storage', () => {
      importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(makePayload('dynasty-a')));
      const before = readDynastySidecarArchivePayload();

      const incomingPayload = makePayload('dynasty-b');
      const result = mergeDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(incomingPayload), ['unknown-dynasty-id']);

      expect(result.ok).toBe(false);
      expect((result as { ok: false; reason: string }).reason).toContain('Unknown selected dynasty IDs');
      expect(readDynastySidecarArchivePayload()).toEqual(before);
    });

    it('rejects empty selection without mutating storage', () => {
      importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(makePayload('dynasty-a')));
      const before = readDynastySidecarArchivePayload();

      const incomingPayload = makePayload('dynasty-b');
      const result = mergeDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(incomingPayload), []);

      expect(result.ok).toBe(false);
      expect((result as { ok: false; reason: string }).reason).toBe('No dynasties selected for selective sidecar import.');
      expect(readDynastySidecarArchivePayload()).toEqual(before);
    });

    it('recomputes career totals from merged dynasty summaries', () => {
      importDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(makePayload('dynasty-a')));

      const incomingB = makePayload('dynasty-b');
      mergeDynastySidecarArchiveJson(exportDynastySidecarArchiveJson(incomingB), ['dynasty-b']);

      const career = readCareerMeta();
      expect(career.dynasties).toHaveLength(2);
      expect(career.careerTotals.dynasties).toBe(2);
      expect(career.careerTotals.wins).toBe(career.dynasties.reduce((sum, d) => sum + d.wins, 0));
    });
  });
});
