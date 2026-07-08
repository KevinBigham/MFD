import { describe, expect, it } from 'vitest';
import type { DraftRecap, GameDayPackage, HallOfFameEntry, Player, RecordBook, Team } from '@mfd/engine';
import { buildWeeklyCallbacks, type DynastyCallbacksInput } from './dynasty-callbacks';

const jayStone = {
  id: 'p1',
  firstName: 'Jay',
  lastName: 'Stone',
  name: 'Jay Stone',
  pos: 'QB',
  age: 27,
  ovr: 88,
  pot: 93,
  teamId: 'team-1',
  isStarter: true,
} as Player;

const teams = {
  'team-1': {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    roster: [jayStone],
  } as Team,
  'team-2': {
    id: 'team-2',
    city: 'Austin',
    name: 'Armadillos',
    roster: [],
  } as unknown as Team,
};

const draftPick = {
  playerId: 'p1',
  teamId: 'team-1',
  playerName: 'Jay Stone',
  position: 'QB',
  ovr: 82,
  round: 1,
  pick: 12,
  projectedPick: 18,
  valueDelta: 6,
  verdict: 'steal',
} satisfies DraftRecap['picks'][number];

function baseInput(overrides: Partial<DynastyCallbacksInput> = {}): DynastyCallbacksInput {
  return {
    year: 2030,
    week: 8,
    userTeamId: 'team-1',
    players: { p1: jayStone },
    teams,
    ...overrides,
  };
}

function namedGamePackage(overrides: Partial<GameDayPackage> = {}): GameDayPackage {
  return {
    id: 'pkg-1',
    year: 2027,
    week: 8,
    headline: 'Chicago survives a frozen classic',
    namedGame: {
      name: 'The Snow Bowl',
      archetype: 'snow_bowl',
      gameId: 'game-2027-8',
      year: 2027,
      week: 8,
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      winnerTeamId: 'team-1',
      homeScore: 24,
      awayScore: 21,
      reason: 'A frozen fourth quarter turned into a forever win.',
    },
    ...overrides,
  } as unknown as GameDayPackage;
}

function draftRecap(overrides: Partial<DraftRecap> = {}): DraftRecap {
  return {
    year: 2027,
    teamId: 'team-1',
    picks: [draftPick],
    classGrade: 'A',
    bestValue: draftPick,
    biggestReach: draftPick,
    steals: [draftPick],
    leagueHighlights: [],
    ...overrides,
  };
}

function recordBook(): RecordBook {
  return {
    singleGame: {},
    singleSeason: {
      passYds: [
        {
          category: 'singleSeason',
          stat: 'passYds',
          value: 5100,
          teamId: 'team-1',
          teamName: 'Chicago Blaze',
          year: 2026,
          week: 8,
          playerId: 'p1',
          playerName: 'Jay Stone',
          note: 'A franchise passing pace became league history.',
        },
      ],
    },
    career: {},
    franchise: {},
  };
}

describe('buildWeeklyCallbacks', () => {
  it('builds exact anniversary cards from saved named-game packages', () => {
    expect(buildWeeklyCallbacks(baseInput({ gameDayPackages: [namedGamePackage()] }))).toEqual([
      {
        id: 'anniversary:named-game:game-2027-8',
        kind: 'ANNIVERSARY',
        headline: '3 seasons ago: The Snow Bowl',
        body: 'A frozen fourth quarter turned into a forever win. Final: 24-21. Chicago Blaze won it.',
        seasonsAgo: 3,
        ctaRoute: '/legacy/named-games',
        ctaLabel: 'Open Named Games',
        sourceRefs: ['gameDayPackage:pkg-1', 'namedGame:game-2027-8', 'Week 8 2027'],
      },
    ]);
  });

  it('builds exact follow-through cards by joining saved draft recaps to current players', () => {
    expect(buildWeeklyCallbacks(baseInput({ draftRecaps: [draftRecap()] }))).toEqual([
      {
        id: 'follow-through:draft:2027:p1',
        kind: 'FOLLOW_THROUGH',
        headline: '3 seasons ago: you drafted Jay Stone',
        body: '3 seasons ago this week, your 2027 draft recap saved Jay Stone in Round 1. Today he is still starting for you at 88 OVR.',
        seasonsAgo: 3,
        ctaRoute: '/player/p1',
        ctaLabel: 'Open Player',
        sourceRefs: ['draftRecap:2027:p1', 'players:p1'],
      },
    ]);
  });

  it('builds exact milestone echoes from week-stamped record-book entries', () => {
    expect(buildWeeklyCallbacks(baseInput({ records: recordBook() }))).toEqual([
      {
        id: 'milestone-echo:record:singleSeason:passYds:2026:8:Jay Stone',
        kind: 'MILESTONE_ECHO',
        headline: '4 seasons ago: Jay Stone entered the record book',
        body: 'Jay Stone saved a singleSeason passYds mark of 5100 in Week 8 2026: A franchise passing pace became league history.',
        seasonsAgo: 4,
        ctaRoute: '/records',
        ctaLabel: 'Open Records',
        sourceRefs: ['records:singleSeason:passYds:2026:8', 'Week 8 2026'],
      },
    ]);
  });

  it('builds exact milestone echoes from HOF entries when saved league news provides the week receipt', () => {
    const hallEntry = {
      playerId: 'p1',
      name: 'Jay Stone',
      position: 'QB',
      inductionYear: 2028,
      peakOvr: 97,
      careerYears: 14,
      score: 188,
      awards: { mvps: 1, allPros: 4, proBowls: 8, championships: 2 },
      highlights: ['First-ballot franchise legend'],
      teams: ['team-1'],
    } satisfies HallOfFameEntry;

    expect(buildWeeklyCallbacks(baseInput({
      leagueNews: [
        {
          id: 'hof-2028-p1',
          year: 2028,
          week: 8,
          type: 'milestone',
          headline: 'Jay Stone enters the Hall of Fame',
          body: 'Jay Stone closed the loop from franchise pick to immortal.',
          teamIds: ['team-1'],
          playerIds: ['p1'],
          importance: 'major',
        },
      ],
      hallOfFame: [hallEntry],
    }))).toEqual([
      {
        id: 'milestone-echo:hall-of-fame:p1:hof-2028-p1',
        kind: 'MILESTONE_ECHO',
        headline: '2 seasons ago: Jay Stone joined the Hall',
        body: 'Jay Stone closed the loop from franchise pick to immortal.',
        seasonsAgo: 2,
        ctaRoute: '/franchise/hall',
        ctaLabel: 'Open Hall of Fame',
        sourceRefs: ['leagueNews:hof-2028-p1', 'hallOfFame:p1:2028', 'Week 8 2028'],
      },
    ]);
  });

  it('returns an empty list for sparse or young saves', () => {
    expect(buildWeeklyCallbacks({ year: 2026, week: 1, players: {}, teams: {} })).toEqual([]);
  });

  it('treats missing optional stores as empty and never throws', () => {
    expect(() => buildWeeklyCallbacks({ year: 2030, week: 8 })).not.toThrow();
    expect(buildWeeklyCallbacks({ year: 2030, week: 8 })).toEqual([]);
  });

  it('is deterministic for identical inputs', () => {
    const input = baseInput({
      gameDayPackages: [namedGamePackage()],
      draftRecaps: [draftRecap()],
      records: recordBook(),
    });

    expect(buildWeeklyCallbacks(input)).toEqual(buildWeeklyCallbacks(input));
  });

  it('caps at three cards and orders by priority, oldest seasonsAgo, then stable id', () => {
    const cards = buildWeeklyCallbacks(baseInput({
      gameDayPackages: [namedGamePackage({ id: 'pkg-named' })],
      leagueNews: [
        {
          id: 'trade-young',
          year: 2028,
          week: 8,
          type: 'trade',
          headline: 'Deadline move paid off',
          body: 'Chicago added a starter for the stretch run.',
          teamIds: ['team-1'],
          playerIds: ['p1'],
          importance: 'major',
        },
        {
          id: 'signing-old',
          year: 2025,
          week: 8,
          type: 'signing',
          headline: 'Veteran signing changed the room',
          body: 'A mentor arrived before the playoff push.',
          teamIds: ['team-1'],
          playerIds: ['p1'],
          importance: 'major',
        },
      ],
      draftRecaps: [draftRecap({ year: 2026 })],
      records: recordBook(),
    }));

    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.id)).toEqual([
      'anniversary:named-game:game-2027-8',
      'anniversary:league-news:signing-old',
      'anniversary:league-news:trade-young',
    ]);
    expect(cards.every((card) => card.sourceRefs.length > 0)).toBe(true);
  });
});
