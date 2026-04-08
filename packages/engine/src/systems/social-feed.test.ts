import { describe, expect, it } from 'vitest';
import {
  appendToSocialFeed,
  generateGameDayPosts,
  generatePlayerReaction,
  generateTransactionPosts,
  generateWeeklyBuzz,
  mulberry32,
  type BroadcastOutput,
  type GameResult,
} from '../index';
import { makeLeagueState } from './test-helpers';

function makeFixture() {
  const game = makeLeagueState('regular_season', 5);
  const home = structuredClone(game.teams.afce1!);
  const away = structuredClone(game.teams.afce2!);

  home.city = 'Nashville';
  home.name = 'Buckle of the Bible Belt';
  away.city = 'Jacksonville';
  away.name = 'Bold New City Swamps';

  const marcus = home.roster[0]!;
  marcus.name = 'Marcus Cole';
  marcus.personality.workEthic = 9;
  marcus.personality.greed = 3;

  const deshawn = home.roster[2]!;
  deshawn.name = 'DeShawn Williams';
  deshawn.traits = ['showtime'];

  const greedy = away.roster[0]!;
  greedy.name = 'Trevor Hale';
  greedy.personality.greed = 10;
  greedy.personality.workEthic = 4;

  game.teams[home.id] = home;
  game.teams[away.id] = away;
  game.players[marcus.id] = marcus;
  game.players[deshawn.id] = deshawn;
  game.players[greedy.id] = greedy;

  const gameResult: GameResult = {
    id: 'game-2026-5-afce1-afce2',
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore: 31,
    awayScore: 24,
    week: 5,
    year: 2026,
    overtime: false,
    mvpPlayerId: marcus.id,
    stats: {
      [home.id]: {
        totalYards: 404,
        passingYards: 298,
        rushingYards: 106,
        turnovers: 1,
        sacks: 3,
        pressuresAllowed: 2,
        thirdDownConversions: 8,
        thirdDownAttempts: 13,
        timeOfPossession: 31,
        passAttempts: 34,
        passCompletions: 24,
        passTDs: 3,
        interceptions: 1,
        rushAttempts: 23,
        rushTDs: 1,
        fumbles: 0,
        penalties: 4,
        penaltyYards: 31,
        fgMade: 1,
        fgAttempted: 1,
        punts: 3,
        drives: 11,
        yacYards: 84,
        redZoneTrips: 4,
        redZoneScores: 4,
        quarterScores: [7, 7, 10, 7],
        playerLines: [
          { playerId: marcus.id, name: marcus.name, pos: 'QB', passAtt: 34, passComp: 24, passYds: 298, passTD: 3, passINT: 1 },
          { playerId: deshawn.id, name: deshawn.name, pos: 'WR', rec: 7, recYds: 126, recTD: 2, targets: 10 },
        ],
      },
      [away.id]: {
        totalYards: 331,
        passingYards: 251,
        rushingYards: 80,
        turnovers: 2,
        sacks: 2,
        pressuresAllowed: 3,
        thirdDownConversions: 4,
        thirdDownAttempts: 12,
        timeOfPossession: 29,
        passAttempts: 32,
        passCompletions: 21,
        passTDs: 2,
        interceptions: 2,
        rushAttempts: 21,
        rushTDs: 0,
        fumbles: 0,
        penalties: 6,
        penaltyYards: 49,
        fgMade: 1,
        fgAttempted: 1,
        punts: 4,
        drives: 10,
        yacYards: 47,
        redZoneTrips: 3,
        redZoneScores: 2,
        quarterScores: [3, 7, 7, 7],
        playerLines: [
          { playerId: greedy.id, name: greedy.name, pos: 'QB', passAtt: 32, passComp: 21, passYds: 251, passTD: 2, passINT: 2 },
        ],
      },
    },
    weather: 'clear',
    matchupHighlight: null,
    broadcastNetwork: 'MFN',
    primetime: true,
    flexed: false,
    specialTeams: {
      [home.id]: {
        kickReturnYards: 23,
        puntReturnYards: 15,
        returnTouchdowns: 0,
        returnFumbles: 0,
        touchbacks: 4,
        netPuntAverage: 42,
        highlights: [],
      },
      [away.id]: {
        kickReturnYards: 17,
        puntReturnYards: 7,
        returnTouchdowns: 0,
        returnFumbles: 0,
        touchbacks: 4,
        netPuntAverage: 40,
        highlights: [],
      },
    },
  };

  const broadcast: BroadcastOutput = {
    gameId: gameResult.id,
    quarters: [[], [], [], []],
    highlights: [
      {
        type: 'touchdown',
        yardsGained: 28,
        playerIds: [marcus.id, deshawn.id],
        commentary: 'Marcus Cole drops in the dagger to DeShawn Williams.',
        excitement: 0.93,
        isBigPlay: true,
        isClutch: true,
      },
      {
        type: 'turnover',
        yardsGained: 0,
        playerIds: [greedy.id],
        commentary: 'Trevor Hale forces a late mistake.',
        excitement: 0.79,
        isBigPlay: true,
        isClutch: true,
      },
    ],
    mvpPlayerIds: [marcus.id],
    momentumSwings: [{ quarter: 4, play: 3, description: 'Marcus Cole finds the knockout shot.' }],
    broadcastNetwork: 'MFN',
    finalNarrative: 'Nashville takes it late.',
  };

  return {
    game,
    broadcast,
    gameResult,
    players: Object.values(game.players),
    marcus,
    deshawn,
    greedy,
  };
}

describe('social feed', () => {
  it('generates deterministic game-day posts with the same seed', () => {
    const { broadcast, gameResult, game, players } = makeFixture();

    const left = generateGameDayPosts(broadcast, gameResult, game.teams, players, 5, mulberry32(12));
    const right = generateGameDayPosts(broadcast, gameResult, game.teams, players, 5, mulberry32(12));

    expect(left).toEqual(right);
  });

  it('references highlighted player names in game-day posts', () => {
    const { broadcast, gameResult, game, players } = makeFixture();

    const posts = generateGameDayPosts(broadcast, gameResult, game.teams, players, 5, mulberry32(14));
    const combined = posts.map((post) => post.content).join(' ');

    expect(combined).toMatch(/Marcus Cole|DeShawn Williams/);
  });

  it('builds trade transaction posts with the expected team names', () => {
    const posts = generateTransactionPosts('trade', {
      playerNames: ['Marcus Cole', 'Jalen Price'],
      teamNames: ['Buckle of the Bible Belt', 'Bold New City Swamps'],
      context: 'Blockbuster swap',
    }, mulberry32(22));

    expect(posts.length).toBeGreaterThanOrEqual(2);
    expect(posts.some((post) => /Bible Belt|Bold New City/.test(post.content))).toBe(true);
  });

  it('keeps only the newest 100 posts in FIFO order', () => {
    const existing = Array.from({ length: 100 }, (_, index) => ({
      id: `post-${index}`,
      source: 'fan' as const,
      authorName: `Fan ${index}`,
      authorPlayerId: undefined,
      content: `Post ${index}`,
      trigger: 'weekly' as const,
      sentiment: 'neutral' as const,
      likes: index,
      timestamp: 1,
      replyTo: undefined,
    }));

    const updated = appendToSocialFeed(existing, [
      {
        id: 'new-1',
        source: 'analyst',
        authorName: 'Analyst',
        authorPlayerId: undefined,
        content: 'Fresh post',
        trigger: 'weekly',
        sentiment: 'hype',
        likes: 99,
        timestamp: 2,
        replyTo: undefined,
      },
      {
        id: 'new-2',
        source: 'reporter',
        authorName: 'Reporter',
        authorPlayerId: undefined,
        content: 'Another fresh post',
        trigger: 'weekly',
        sentiment: 'neutral',
        likes: 87,
        timestamp: 2,
        replyTo: undefined,
      },
    ]);

    expect(updated).toHaveLength(100);
    expect(updated[0]?.id).toBe('post-2');
    expect(updated[99]?.id).toBe('new-2');
  });

  it('changes player voice based on personality and traits', () => {
    const { marcus, deshawn, greedy } = makeFixture();

    const workEthicPost = generatePlayerReaction(marcus, 'achievement', 'big win', mulberry32(3));
    const showtimePost = generatePlayerReaction(deshawn, 'big_play', 'highlight grab', mulberry32(4));
    const greedPost = generatePlayerReaction(greedy, 'trade', 'new situation', mulberry32(5));

    expect(workEthicPost.content).toMatch(/team|work|earned/i);
    expect(showtimePost.content).toMatch(/lights|show|spotlight/i);
    expect(greedPost.content).toMatch(/business|paid|value|bag/i);
  });

  it('always includes an analyst bold prediction in weekly buzz', () => {
    const { game } = makeFixture();

    const posts = generateWeeklyBuzz(game, 5, mulberry32(17));

    expect(posts.some((post) => post.source === 'analyst' && /bold prediction/i.test(post.content))).toBe(true);
  });
});
