import { describe, expect, it } from 'vitest';
import {
  createRivalryTrashTalkPost,
  decayRivalries,
  detectNewRivalries,
  getRivalryGameBonus,
  updateRivalryFromGame,
} from './player-rivalries';
import { makeTeam } from './test-helpers';

function matchupResult(homeTeamId: string, awayTeamId: string, events: Array<{ type: 'interception' | 'sack' | 'fumble'; offensePlayerId: string; defensePlayerId: string; quarter: number }>) {
  return {
    id: 'game-1',
    year: 2028,
    week: 3,
    homeTeamId,
    awayTeamId,
    homeScore: 17,
    awayScore: 20,
    playerMatchupEvents: events,
  } as const;
}

describe('player rivalries', () => {
  it('spawns a rivalry when the same defender records two interceptions on one quarterback', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 84);
    const away = makeTeam('away', 'NFC', 'East', false, 82);
    const qb = home.roster.find((player) => player.pos === 'QB')!;
    const db = away.roster.find((player) => player.pos === 'CB')!;

    const rivalries = detectNewRivalries(
      matchupResult(home.id, away.id, [
        { type: 'interception', offensePlayerId: qb.id, defensePlayerId: db.id, quarter: 2 },
        { type: 'interception', offensePlayerId: qb.id, defensePlayerId: db.id, quarter: 4 },
      ]),
      home,
      away,
      [],
      () => 0.1,
    );

    expect(rivalries).toHaveLength(1);
    expect(rivalries[0]?.tier).toBe('budding');
  });

  it('increases intensity when rivals face each other again', () => {
    const rivalry = {
      id: 'riv-1',
      playerAId: 'qb-1',
      playerBId: 'cb-1',
      playerAName: 'Marcus Cole',
      playerBName: 'James Jenkins',
      teamAId: 'home',
      teamBId: 'away',
      intensity: 30,
      tier: 'budding' as const,
      origin: 'Week 3, 2028: Jenkins picked off Cole twice',
      history: [],
      seasonStarted: 2028,
    };

    const updated = updateRivalryFromGame(rivalry, matchupResult('home', 'away', [
      { type: 'interception', offensePlayerId: 'qb-1', defensePlayerId: 'cb-1', quarter: 3 },
    ]));

    expect(updated.intensity).toBeGreaterThan(rivalry.intensity);
  });

  it('upgrades tiers at the configured thresholds', () => {
    const rivalry = {
      id: 'riv-1',
      playerAId: 'qb-1',
      playerBId: 'cb-1',
      playerAName: 'Marcus Cole',
      playerBName: 'James Jenkins',
      teamAId: 'home',
      teamBId: 'away',
      intensity: 49,
      tier: 'budding' as const,
      origin: '',
      history: [],
      seasonStarted: 2028,
    };

    const heated = updateRivalryFromGame(rivalry, matchupResult('home', 'away', [
      { type: 'interception', offensePlayerId: 'qb-1', defensePlayerId: 'cb-1', quarter: 3 },
    ]));
    const nemesis = updateRivalryFromGame({ ...heated, intensity: 79, tier: 'heated' }, matchupResult('home', 'away', [
      { type: 'sack', offensePlayerId: 'qb-1', defensePlayerId: 'cb-1', quarter: 4 },
    ]));

    expect(heated.tier).toBe('heated');
    expect(nemesis.tier).toBe('nemesis');
  });

  it('scales game bonuses by rivalry tier', () => {
    expect(getRivalryGameBonus({ playerAId: 'a', playerBId: 'b', tier: 'budding' } as any, 'a')).toBe(1);
    expect(getRivalryGameBonus({ playerAId: 'a', playerBId: 'b', tier: 'heated' } as any, 'a')).toBe(2);
    expect(getRivalryGameBonus({ playerAId: 'a', playerBId: 'b', tier: 'nemesis' } as any, 'a')).toBe(3);
  });

  it('decays and removes stale rivalries', () => {
    const decayed = decayRivalries([
      {
        id: 'riv-1',
        playerAId: 'a',
        playerBId: 'b',
        playerAName: 'A',
        playerBName: 'B',
        teamAId: 'home',
        teamBId: 'away',
        intensity: 18,
        tier: 'budding',
        origin: '',
        history: [{ year: 2026, week: 4, description: 'spark', intensityDelta: 18 }],
        seasonStarted: 2026,
      },
    ], 2028);

    expect(decayed).toHaveLength(0);
  });

  it('generates deterministic trash talk posts', () => {
    const post = createRivalryTrashTalkPost({
      id: 'riv-1',
      playerAId: 'a',
      playerBId: 'b',
      playerAName: 'Marcus Cole',
      playerBName: 'James Jenkins',
      teamAId: 'home',
      teamBId: 'away',
      intensity: 84,
      tier: 'nemesis',
      origin: '',
      history: [],
      seasonStarted: 2028,
    }, 8, (() => {
      const values = [0.1, 0];
      let index = 0;
      return () => values[index++] ?? 0;
    })());

    expect(post?.content).toContain('waiting');
    expect(post?.trigger).toBe('rivalry');
  });

  it('caps active rivalries at ten entries', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 84);
    const away = makeTeam('away', 'NFC', 'East', false, 82);
    const qb = home.roster.find((player) => player.pos === 'QB')!;
    const db = away.roster.find((player) => player.pos === 'CB')!;
    const existing = Array.from({ length: 10 }, (_, index) => ({
      id: `riv-${index}`,
      playerAId: `a-${index}`,
      playerBId: `b-${index}`,
      playerAName: `A${index}`,
      playerBName: `B${index}`,
      teamAId: 'home',
      teamBId: 'away',
      intensity: 20 + index,
      tier: 'budding' as const,
      origin: '',
      history: [],
      seasonStarted: 2020 + index,
    }));

    const rivalries = detectNewRivalries(
      matchupResult(home.id, away.id, [
        { type: 'interception', offensePlayerId: qb.id, defensePlayerId: db.id, quarter: 1 },
        { type: 'interception', offensePlayerId: qb.id, defensePlayerId: db.id, quarter: 2 },
      ]),
      home,
      away,
      existing,
      () => 0.2,
    );

    expect(rivalries).toHaveLength(10);
    expect(rivalries.some((rivalry) => rivalry.playerAId === qb.id && rivalry.playerBId === db.id)).toBe(true);
  });
});
