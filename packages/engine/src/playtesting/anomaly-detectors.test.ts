import { STARTER_SLOTS } from '../systems/roster-management';
import type { GameState, Player, Team } from '../types';
import {
  canonicalJsonStringify,
  detectCapSanity,
  detectAwardsSanity,
  detectBloodlineSanity,
  detectDraftClassSanity,
  detectInjurySanity,
  detectMonotonicTime,
  detectPerfBudget,
  detectPlayerAgeSanity,
  detectPhaseBoundaries,
  detectRecordBookSanity,
  detectRngChannel,
  detectRosterMinimums,
  detectSaveRoundTrip,
  saveRoundTripBytes,
} from './anomaly-detectors';
import { PLAYTEST_PERSONAS } from './personas';
import type { PlaytestDetectorContext } from './types';

function makePlayer(id: string, pos: Player['pos'], unavailable = false): Player {
  return {
    id,
    name: `${id} Player`,
    pos,
    age: 26,
    injury: unavailable
      ? {
        id: `${id}-injury`,
        type: 'hamstring',
        severity: 'questionable',
        severityTier: 'minor',
        gamesOut: 2,
        gamesRecovered: 0,
        reinjuryRisk: 0.1,
        affectedRatings: ['speed'],
        ratingPenalty: 1,
        onIR: false,
      }
      : null,
    bloodline: null,
  } as unknown as Player;
}

function makeRoster(teamId: string): Player[] {
  return Object.entries(STARTER_SLOTS).flatMap(([pos, count]) =>
    Array.from({ length: count }, (_, index) => makePlayer(`${teamId}-${pos}-${index}`, pos as Player['pos'])),
  );
}

function makeTeam(id: string, roster = makeRoster(id)): Team {
  return {
    id,
    roster,
    capSpace: 25,
    capUsed: 210,
    deadCap: 5,
    isUser: false,
  } as unknown as Team;
}

function makeContext(overrides: Partial<PlaytestDetectorContext> = {}): PlaytestDetectorContext {
  return {
    step: 1,
    seed: 42,
    persona: PLAYTEST_PERSONAS[0]!,
    previousFrame: { year: 2026, week: 1, phase: 'regular_season' },
    currentFrame: { year: 2026, week: 2, phase: 'regular_season' },
    state: {
      version: 34,
      year: 2026,
      players: {},
      teams: {
        home: makeTeam('home'),
      },
      draftClass: [],
      awardsHistory: [],
      records: {
        singleGame: {},
        singleSeason: {},
        career: {},
        franchise: {},
      },
      playerArchive: [],
      hallOfFame: [],
    } as unknown as GameState,
    serializedState: '{"ok":true}',
    roundTripSerializedState: '{"ok":true}',
    mathRandomCalls: 0,
    elapsedMs: 120,
    elapsedHistoryMs: [100, 120, 150],
    completedSeasons: 0,
    weeksAdvanced: 1,
    ...overrides,
  };
}

describe('playtest anomaly detectors', () => {
  it('canonicalJsonStringify sorts object keys deterministically', () => {
    expect(canonicalJsonStringify({ z: 1, a: { d: 2, c: 1 } })).toBe('{"a":{"c":1,"d":2},"z":1}');
  });

  it('saveRoundTripBytes returns an error sentinel for invalid save payloads', () => {
    expect(saveRoundTripBytes({ bad: true } as unknown as GameState).startsWith('__PLAYTEST_ROUNDTRIP_ERROR__')).toBe(true);
  });

  it('detectCapSanity passes when all team cap fields are finite and in range', () => {
    expect(detectCapSanity(makeContext())).toEqual({ ok: true });
  });

  it('detectCapSanity fails when a team cap field is invalid', () => {
    const verdict = detectCapSanity(makeContext({
      state: {
        version: 34,
        teams: {
          bad: {
            ...makeTeam('bad'),
            capSpace: Number.NaN,
          },
        },
      } as unknown as GameState,
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.severity).toBe('high');
  });

  it('detectCapSanity follows the active long-horizon salary cap curve', () => {
    expect(detectCapSanity(makeContext({
      state: {
        version: 34,
        year: 2051,
        teams: {
          future: {
            ...makeTeam('future'),
            capUsed: 890,
            capSpace: -27,
            deadCap: 120,
          },
        },
      } as unknown as GameState,
    }))).toEqual({ ok: true });
  });

  it('detectCapSanity still fails implausible cap blowups above the cap curve', () => {
    const verdict = detectCapSanity(makeContext({
      state: {
        version: 34,
        year: 2051,
        teams: {
          future: {
            ...makeTeam('future'),
            capUsed: 1300,
            capSpace: -27,
            deadCap: 120,
          },
        },
      } as unknown as GameState,
    }));

    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('future.capUsed');
  });

  it('detectRosterMinimums passes with a full healthy starter set', () => {
    expect(detectRosterMinimums(makeContext())).toEqual({ ok: true });
  });

  it('detectRosterMinimums fails when a team is short at a required position', () => {
    const roster = makeRoster('short').filter((player) => !(player.pos === 'QB' && player.id.endsWith('-0')));
    const verdict = detectRosterMinimums(makeContext({
      state: {
        version: 34,
        teams: { short: makeTeam('short', roster) },
      } as unknown as GameState,
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('QB');
    expect(verdict.ok ? null : verdict.severity).toBe('medium');
  });

  it('detectPlayerAgeSanity fails when an active player has an impossible age', () => {
    const badPlayer = { ...makePlayer('old-qb', 'QB'), age: 61 };
    const verdict = detectPlayerAgeSanity(makeContext({
      state: {
        version: 34,
        year: 2026,
        players: { [badPlayer.id]: badPlayer },
        teams: { home: makeTeam('home', [badPlayer]) },
      } as unknown as GameState,
    }));

    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('Player age sanity failed');
  });

  it('detectInjurySanity fails when an injury timer escapes bounds', () => {
    const player = makePlayer('injured-rb', 'RB', true);
    player.injury!.gamesOut = 99;
    const verdict = detectInjurySanity(makeContext({
      state: {
        version: 34,
        year: 2026,
        players: { [player.id]: player },
        teams: { home: makeTeam('home', [player]) },
      } as unknown as GameState,
    }));

    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('Injury sanity failed');
  });

  it('detectDraftClassSanity fails on duplicate prospect ids', () => {
    const prospect = {
      id: 'prospect-1',
      age: 22,
      trueGrade: 78,
      scoutGrade: 75,
    };
    const verdict = detectDraftClassSanity(makeContext({
      state: {
        version: 34,
        year: 2026,
        teams: { home: makeTeam('home') },
        draftClass: [prospect, prospect],
      } as unknown as GameState,
    }));

    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('duplicate prospect prospect-1');
  });

  it('detectAwardsSanity fails on duplicate awards in the same year', () => {
    const award = {
      awardId: 'mvp',
      label: 'MVP',
      winnerId: 'player-1',
      winnerName: 'Player One',
      winnerTeamId: 'home',
      winnerTeam: 'HOME',
      winnerPosition: 'QB',
      winnerStats: {},
      score: 100,
      runnersUp: [],
      narrative: 'Won MVP.',
    };
    const verdict = detectAwardsSanity(makeContext({
      state: {
        version: 34,
        year: 2026,
        teams: { home: makeTeam('home') },
        awardsHistory: [{
          year: 2026,
          awards: [award, award],
          ceremony: { headline: '', intro: '', blurbs: [] },
        }],
      } as unknown as GameState,
    }));

    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('duplicate award mvp');
  });

  it('detectBloodlineSanity fails when the parent reference is missing', () => {
    const player = {
      ...makePlayer('rookie-wr', 'WR'),
      bloodline: {
        parentPlayerId: 'missing-parent',
        parentName: 'Missing Parent',
        parentTeamId: 'home',
        parentPosition: 'WR',
        relationship: 'son',
        legacyTag: 'famous_name',
      },
    } as Player;
    const verdict = detectBloodlineSanity(makeContext({
      state: {
        version: 34,
        year: 2026,
        players: { [player.id]: player },
        teams: { home: makeTeam('home', [player]) },
        playerArchive: [],
        hallOfFame: [],
      } as unknown as GameState,
    }));

    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('missing-parent');
  });

  it('detectRecordBookSanity fails on non-finite record values', () => {
    const verdict = detectRecordBookSanity(makeContext({
      state: {
        version: 34,
        year: 2026,
        teams: { home: makeTeam('home') },
        records: {
          singleGame: {
            passYds: [{
              category: 'singleGame',
              stat: 'passYds',
              value: Number.NaN,
              teamId: 'home',
              teamName: 'Home',
              year: 2026,
            }],
          },
          singleSeason: {},
          career: {},
          franchise: {},
        },
      } as unknown as GameState,
    }));

    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('Record book sanity failed');
  });

  it('detectMonotonicTime fails when the week regresses inside the same phase', () => {
    const verdict = detectMonotonicTime(makeContext({
      previousFrame: { year: 2026, week: 4, phase: 'regular_season' },
      currentFrame: { year: 2026, week: 3, phase: 'regular_season' },
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.severity).toBe('high');
  });

  it('detectPhaseBoundaries accepts a normal regular-season week advance', () => {
    expect(detectPhaseBoundaries(makeContext({
      previousFrame: { year: 2026, week: 7, phase: 'regular_season' },
      currentFrame: { year: 2026, week: 8, phase: 'regular_season' },
    }))).toEqual({ ok: true });
  });

  it('detectPhaseBoundaries follows generated 19-week regular seasons', () => {
    expect(detectPhaseBoundaries(makeContext({
      previousFrame: { year: 2026, week: 18, phase: 'regular_season' },
      currentFrame: { year: 2026, week: 19, phase: 'regular_season' },
      state: {
        version: 34,
        year: 2026,
        schedule: Array.from({ length: 19 }, (_, index) => ({ week: index + 1, games: [] })),
        teams: {
          home: makeTeam('home'),
        },
      } as unknown as GameState,
    }))).toEqual({ ok: true });
  });

  it('detectPhaseBoundaries follows generated 17-week playoff starts', () => {
    expect(detectPhaseBoundaries(makeContext({
      previousFrame: { year: 2026, week: 17, phase: 'regular_season' },
      currentFrame: { year: 2026, week: 18, phase: 'playoffs' },
      state: {
        version: 34,
        year: 2026,
        schedule: Array.from({ length: 17 }, (_, index) => ({ week: index + 1, games: [] })),
        teams: {
          home: makeTeam('home'),
        },
      } as unknown as GameState,
    }))).toEqual({ ok: true });
  });

  it('detectPhaseBoundaries fails on an unexpected transition', () => {
    const verdict = detectPhaseBoundaries(makeContext({
      previousFrame: { year: 2026, week: 18, phase: 'regular_season' },
      currentFrame: { year: 2026, week: 1, phase: 'free_agency' },
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('Unexpected phase boundary');
  });

  it('detectSaveRoundTrip passes when canonical bytes match', () => {
    expect(detectSaveRoundTrip(makeContext())).toEqual({ ok: true });
  });

  it('detectSaveRoundTrip fails when canonical bytes drift', () => {
    const verdict = detectSaveRoundTrip(makeContext({
      roundTripSerializedState: '{"ok":false}',
    }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.severity).toBe('high');
  });

  it('detectRngChannel fails when ambient global random is observed', () => {
    const verdict = detectRngChannel(makeContext({ mathRandomCalls: 2 }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.detail).toContain('was invoked');
  });

  it('detectPerfBudget flags p99 latency overruns', () => {
    const verdict = detectPerfBudget(makeContext({ elapsedHistoryMs: [100, 110, 900] }));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? null : verdict.severity).toBe('medium');
  });
});
