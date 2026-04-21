import { describe, expect, it } from 'vitest';
import type { GameDayPackage, GameResult } from '@mfd/engine';
import { buildPlayoffLoreCard, mergePlayoffLoreCards } from './playoff-lore';

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    id: 'game-2026-19-user',
    homeTeamId: 'user',
    awayTeamId: 'opp',
    homeScore: 27,
    awayScore: 24,
    week: 19,
    year: 2026,
    overtime: false,
    mvpPlayerId: 'qb-1',
    stats: {
      user: {
        totalYards: 402,
        passingYards: 288,
        rushingYards: 114,
        turnovers: 1,
        sacks: 3,
        pressuresAllowed: 2,
        thirdDownConversions: 6,
        thirdDownAttempts: 12,
        timeOfPossession: 31,
        passAttempts: 34,
        passCompletions: 23,
        passTDs: 2,
        interceptions: 1,
        rushAttempts: 27,
        rushTDs: 1,
        fumbles: 0,
        penalties: 4,
        penaltyYards: 35,
        fgMade: 2,
        fgAttempted: 2,
        punts: 4,
        drives: 10,
        yacYards: 77,
        redZoneTrips: 4,
        redZoneScores: 3,
        quarterScores: [3, 10, 7, 7],
        playerLines: [
          {
            playerId: 'qb-1',
            name: 'Cole Stone',
            pos: 'QB',
            passComp: 23,
            passAtt: 34,
            passYds: 288,
            passTD: 2,
            passINT: 1,
          },
          {
            playerId: 'wr-1',
            name: 'Mason Vale',
            pos: 'WR',
            rec: 8,
            recYds: 124,
            recTD: 1,
          },
        ],
      },
      opp: {
        totalYards: 355,
        passingYards: 240,
        rushingYards: 115,
        turnovers: 2,
        sacks: 1,
        pressuresAllowed: 3,
        thirdDownConversions: 4,
        thirdDownAttempts: 11,
        timeOfPossession: 29,
        passAttempts: 31,
        passCompletions: 21,
        passTDs: 2,
        interceptions: 2,
        rushAttempts: 24,
        rushTDs: 1,
        fumbles: 0,
        penalties: 6,
        penaltyYards: 55,
        fgMade: 1,
        fgAttempted: 1,
        punts: 5,
        drives: 10,
        yacYards: 61,
        redZoneTrips: 3,
        redZoneScores: 3,
        quarterScores: [7, 7, 3, 7],
        playerLines: [],
      },
    },
    playerMatchupEvents: [],
    namedGame: {
      name: 'The Comeback',
      archetype: 'comeback',
      gameId: 'game-2026-19-user',
      year: 2026,
      week: 19,
      homeTeamId: 'user',
      awayTeamId: 'opp',
      winnerTeamId: 'user',
      homeScore: 27,
      awayScore: 24,
      reason: 'Won after trailing by 14+ entering the fourth quarter.',
    },
    callYourShotResult: {
      declaration: 'air_attack',
      success: true,
      outcome: 'hit',
      magnitude: 0.75,
      reaction: {
        id: 'reaction-hit',
        outcome: 'hit',
        speaker: 'Coach Vega',
        speakerType: 'locker_room',
        tone: 'triumphant',
        headline: 'The deep-shot plan landed when it mattered most.',
        quote: 'The locker room owned the call.',
      },
      fanConfidenceDelta: 4,
      moraleDelta: 3,
      chemistryDelta: 2,
      devBonusMultiplier: 1.1,
      headline: 'Air attack lands',
      narrative: 'The locker room owned the call.',
    },
    ...overrides,
  };
}

function makePackage(overrides: Partial<GameDayPackage> = {}): GameDayPackage {
  return {
    id: 'gameday-2026-19-user',
    year: 2026,
    week: 19,
    phase: 'playoffs',
    teamId: 'user',
    opponentTeamId: 'opp',
    headline: 'Chicago survives the wild-card knife fight',
    result: 'win',
    finalScore: '27-24',
    stakes: [{ label: 'Playoff leverage', detail: 'Every snap now shapes whether the season survives.' }],
    turningPoints: [{ label: 'Turnover edge', detail: 'Finished +1 in takeaways.', impact: 'positive' }],
    topPerformers: [
      { playerId: 'qb-1', label: 'Cole Stone (QB)', statLine: '23/34, 288 yds, 2 TD, 1 INT' },
      { playerId: 'wr-1', label: 'Mason Vale (WR)', statLine: '8 rec, 124 yds, 1 TD' },
    ],
    injuryNotes: [],
    ceremony: { title: 'Postgame podium', subtitle: 'The season stays alive.' },
    pressConference: {
      theme: 'Statement win',
      opener: 'We stayed aggressive.',
      quotes: [],
      speaker: 'Coach Vega',
      tone: 'confident',
      topic: 'postgame win',
      reporterQuestions: [],
    },
    rivalry: {
      rivalryId: 'rivalry-1',
      intensity: 84,
      tier: 'blood_feud',
      ovrBoost: 2,
      headline: 'The rivalry turned mean again.',
    },
    activeEffectSummaries: ['Primetime spotlight put the game under a brighter microscope.'],
    autopsy: {
      diagnosis: 'Controlled passing rhythm kept the offense ahead of schedule.',
      leverage: 'Turnover margin plus situational stops tilted the leverage battle.',
      nextFocus: ['Carry the clean situational football forward'],
    },
    recordsMoments: [{
      playerId: 'qb-1',
      playerName: 'Cole Stone',
      teamId: 'user',
      stat: 'passYds',
      newValue: 55555,
      previousValue: 55400,
      previousHolder: 'Old QB',
      category: 'singleSeason',
      year: 2026,
      week: 19,
      narrative: 'The passing mark finally moved.',
    }],
    milestoneMoments: [{
      playerId: 'wr-1',
      playerName: 'Mason Vale',
      stat: 'recYds',
      value: 10000,
      milestoneLabel: '10,000 receiving yards',
      narrative: 'Another receiving mountain was cleared.',
      year: 2026,
      week: 19,
    }],
    callYourShotResult: {
      declaration: 'air_attack',
      success: true,
      outcome: 'hit',
      magnitude: 0.75,
      reaction: {
        id: 'reaction-hit',
        outcome: 'hit',
        speaker: 'Coach Vega',
        speakerType: 'locker_room',
        tone: 'triumphant',
        headline: 'The deep-shot plan landed when it mattered most.',
        quote: 'The locker room owned the call.',
      },
      fanConfidenceDelta: 4,
      moraleDelta: 3,
      chemistryDelta: 2,
      devBonusMultiplier: 1.1,
      headline: 'Air attack lands',
      narrative: 'The locker room owned the call.',
    },
    namedGame: makeResult().namedGame,
    ...overrides,
  };
}

describe('playoff-lore', () => {
  it('builds a wild-card win card for a user-team playoff package', () => {
    const card = buildPlayoffLoreCard({
      packageData: makePackage(),
      result: makeResult(),
      userTeamId: 'user',
      momentumTag: 'cinderella',
    });

    expect(card).not.toBeNull();
    expect(card?.round).toBe('wild_card');
    expect(card?.outcome).toBe('win');
    expect(card?.finalScore).toBe('27-24');
    expect(card?.opponentTeamId).toBe('opp');
  });

  it('maps week 22 to a super bowl loss card', () => {
    const card = buildPlayoffLoreCard({
      packageData: makePackage({
        week: 22,
        result: 'loss',
        finalScore: '20-27',
        headline: 'Chicago falls one drive short on the biggest stage',
      }),
      result: makeResult({
        week: 22,
        homeScore: 20,
        awayScore: 27,
      }),
      userTeamId: 'user',
      momentumTag: null,
    });

    expect(card).not.toBeNull();
    expect(card?.round).toBe('super_bowl');
    expect(card?.outcome).toBe('loss');
    expect(card?.seasonYear).toBe(2026);
  });

  it('prefers the named-game reason as the lore hook when one exists', () => {
    const card = buildPlayoffLoreCard({
      packageData: makePackage(),
      result: makeResult(),
      userTeamId: 'user',
      momentumTag: null,
    });

    expect(card?.namedGameName).toBe('The Comeback');
    expect(card?.loreHook).toContain('trailing by 14+');
  });

  it('includes hero blocks and archive tags from the package context', () => {
    const card = buildPlayoffLoreCard({
      packageData: makePackage(),
      result: makeResult(),
      userTeamId: 'user',
      momentumTag: 'cinderella',
    });

    expect(card?.heroBlocks).toHaveLength(3);
    expect(card?.heroBlocks[0]?.value).toContain('Cole Stone');
    expect(card?.tags).toContain('Cinderella');
    expect(card?.tags).toContain('Named Game');
    expect(card?.tags).toContain('Record Broken');
    expect(card?.tags).toContain('Call Shot Hit');
  });

  it('returns null for regular-season packages and rejects duplicate game ids during merge', () => {
    const regularSeason = buildPlayoffLoreCard({
      packageData: makePackage({ phase: 'regular_season', week: 8 }),
      result: makeResult({ week: 8 }),
      userTeamId: 'user',
      momentumTag: null,
    });

    const first = buildPlayoffLoreCard({
      packageData: makePackage(),
      result: makeResult(),
      userTeamId: 'user',
      momentumTag: null,
    })!;
    const second = { ...first, headline: 'Duplicate should be rejected' };

    expect(regularSeason).toBeNull();
    expect(mergePlayoffLoreCards([], first)).toEqual([first]);
    expect(mergePlayoffLoreCards([first], second)).toEqual([first]);
  });
});
