import { describe, expect, it } from 'vitest';
import { createRngState, mulberry32 } from '../rng';
import type { PlayerGameLine, Team } from '../types';
import { applyPlayerLines, createSimulationContext, simGame, simGameWithContext } from './game-sim';
import { makeTeam } from './test-helpers';

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe('game-sim public simulation boundary', () => {
  it('promotes calibrated snap scores and box scores only when explicitly requested', () => {
    const home = makeTeam('snap-home', 'AFC', 'East', true, 80);
    const away = makeTeam('snap-away', 'NFC', 'West', false, 78);
    const result = simGameWithContext(home, away, {
      rng: { play: mulberry32(444), event: mulberry32(451) },
      shadowSeed: 9_001,
      snapMode: 'canonical',
      gameId: 'canonical-snap',
    });

    expect(result.shadow).toBeDefined();
    expect(result.homeScore).toBe(result.shadow!.homeScore);
    expect(result.awayScore).toBe(result.shadow!.awayScore);
    expect(result.homeStats.quarterScores.reduce((total, points) => total + points, 0)).toBe(result.homeScore);
    expect(result.homeStats.totalYards).toBe(result.shadow!.homeYards);
  });

  it('returns deterministic box-score artifacts for the same seed and inputs', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 80);
    const away = makeTeam('away', 'NFC', 'West', false, 78);
    const context = {
      weather: 'snow' as const,
      rivalryIntensity: 80,
      homeFieldBonus: 2,
      home: { teamOvrBonus: 1 },
      away: { teamOvrBonus: -1 },
    };

    const first = simGame(structuredClone(home), structuredClone(away), createSimulationContext(context, createRngState(2026)));

    const second = simGame(structuredClone(home), structuredClone(away), createSimulationContext(context, createRngState(2026)));

    expect(second).toEqual(first);
    expect(first.weather).toBe('snow');
    expect(first.overtime).toBe(first.homeStats.quarterScores.length > 4 || first.awayStats.quarterScores.length > 4);
    expect(sum(first.homeStats.quarterScores)).toBe(first.homeScore);
    expect(sum(first.awayStats.quarterScores)).toBe(first.awayScore);
    expect(first.homeStats.drives).toBeGreaterThanOrEqual(11);
    expect(first.homeStats.drives).toBeLessThanOrEqual(13);
    expect(first.awayStats.drives).toBe(first.homeStats.drives);
    expect(Object.keys(first.specialTeams).sort()).toEqual(['away', 'home']);
    expect(first.homeMvpId === null || home.roster.some((player) => player.id === first.homeMvpId)).toBe(true);
    expect(first.awayMvpId === null || away.roster.some((player) => player.id === first.awayMvpId)).toBe(true);
    expect(first.homeStats.playerLines.every((line) => home.roster.some((player) => player.id === line.playerId))).toBe(true);
    expect(first.awayStats.playerLines.every((line) => away.roster.some((player) => player.id === line.playerId))).toBe(true);
  });

  it('does not mutate source teams while building context-adjusted simulation copies', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 80);
    const away = makeTeam('away', 'NFC', 'West', false, 78);
    const beforeHome = structuredClone(home);
    const beforeAway = structuredClone(away);

    simGame(home, away, createSimulationContext({
      weather: 'wind',
      home: {
        teamOvrBonus: 4,
        playerOvrBonuses: { [home.roster[0]!.id]: 6 },
      },
      away: {
        teamOvrBonus: -3,
        clutchPlayerBonuses: { [away.roster[0]!.id]: 8 },
      },
    }, createRngState(99)));

    expect(home).toEqual(beforeHome);
    expect(away).toEqual(beforeAway);
  });

  it('executes a selected trick play deterministically and burns its tendency once', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 80);
    const away = makeTeam('away', 'NFC', 'West', false, 78);
    home.staff.hc = {
      id: 'creative-hc',
      name: 'Coach Creative',
      age: 48,
      role: 'hc',
      ratings: { gameplan: 90, motivation: 75, development: 75 },
      traits: ['creative'],
      contract: null,
      yearsWithTeam: 2,
      careerWins: 24,
      careerLosses: 10,
      experience: 6,
      xp: 0,
      perks: [],
    } as NonNullable<Team['staff']['hc']>;
    const context = {
      home: { gamePlan: { trickPlays: ['flea_flicker'] } },
    };

    let seedWithCall = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const candidate = simGame(structuredClone(home), structuredClone(away), createSimulationContext(context, createRngState(seed)));
      if (candidate.contingencyActivations.some((entry) => entry.ruleId === 'trick:flea_flicker')) {
        seedWithCall = seed;
        break;
      }
    }

    expect(seedWithCall).toBeGreaterThan(0);
    const first = simGame(structuredClone(home), structuredClone(away), createSimulationContext(context, createRngState(seedWithCall)));
    const second = simGame(structuredClone(home), structuredClone(away), createSimulationContext(context, createRngState(seedWithCall)));
    const calls = first.contingencyActivations.filter((entry) => entry.ruleId === 'trick:flea_flicker');

    expect(second).toEqual(first);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.callout).toContain('Flea Flicker');
    expect(calls[0]?.triggerLabel).toMatch(/^TRICK_PLAY\|success=[01]\|yards=\d+/);
  });
});

describe('game-sim player-line application boundary', () => {
  it('accumulates season and career stats for matching players only', () => {
    const team = makeTeam('home', 'AFC', 'East', true, 80);
    const qb = team.roster.find((player) => player.pos === 'QB')!;
    const rb = team.roster.find((player) => player.pos === 'RB')!;
    const wr = team.roster.find((player) => player.pos === 'WR')!;
    const idleStarter = team.roster.find((player) => player.pos === 'TE')!;
    const injuredStarter = team.roster.find((player) => player.pos === 'DL')!;
    rb.isStarter = false;
    injuredStarter.injury = {
      id: 'injury-1',
      type: 'acl',
      severity: 'ir',
      severityTier: 'season_ending',
      gamesOut: 12,
      gamesRecovered: 0,
      reinjuryRisk: 0.35,
      affectedRatings: ['speed'],
      ratingPenalty: 3,
      onIR: true,
    };

    const lines: PlayerGameLine[] = [
      {
        playerId: qb.id,
        name: qb.name,
        pos: qb.pos,
        passYds: 250,
        passTD: 2,
        passINT: 1,
        passAtt: 32,
        passComp: 21,
        rushYds: 14,
        rushAtt: 3,
        fumbles: 1,
      },
      {
        playerId: rb.id,
        name: rb.name,
        pos: rb.pos,
        rushYds: 88,
        rushAtt: 17,
        rushTD: 1,
        rec: 3,
        recYds: 42,
        recTD: 1,
        targets: 4,
      },
      {
        playerId: 'not-on-roster',
        name: 'Ghost Player',
        pos: 'WR',
        rec: 10,
        recYds: 200,
      },
    ];

    applyPlayerLines(team, lines);

    expect(qb.stats).toMatchObject({
      gamesPlayed: 1,
      passYds: 250,
      passTD: 2,
      passINT: 1,
      passAtt: 32,
      passComp: 21,
      rushYds: 14,
      rushAtt: 3,
      fumbles: 1,
    });
    expect(qb.careerStats).toMatchObject({
      gp: 52,
      passYds: 250,
      passTD: 2,
      passINT: 1,
      passAtt: 32,
      passComp: 21,
      rushYds: 14,
      rushAtt: 3,
      fumbles: 1,
    });

    expect(rb.stats).toMatchObject({
      gamesPlayed: 1,
      rushYds: 88,
      rushAtt: 17,
      rushTD: 1,
      rec: 3,
      recYds: 42,
      recTD: 1,
      targets: 4,
      yacYds: 18,
    });
    expect(rb.careerStats).toMatchObject({
      gp: 52,
      rushYds: 88,
      rushAtt: 17,
      rushTD: 1,
      rec: 3,
      recYds: 42,
      recTD: 1,
      targets: 4,
    });

    expect(wr.stats.rec).toBe(0);
    expect(idleStarter.stats.gamesPlayed).toBe(1);
    expect(idleStarter.careerStats.gp).toBe(52);
    expect(injuredStarter.stats.gamesPlayed).toBe(0);
    expect(injuredStarter.careerStats.gp).toBe(51);
  });

  it('does not produce negative yards-after-catch when receiving yards are below the baseline', () => {
    const team = makeTeam('home', 'AFC', 'East', true, 80);
    const receiver = team.roster.find((player) => player.pos === 'WR')!;

    applyPlayerLines(team, [{
      playerId: receiver.id,
      name: receiver.name,
      pos: receiver.pos,
      rec: 4,
      recYds: 20,
    }]);

    expect(receiver.stats.yacYds).toBe(0);
  });

  it('initializes missing stat buckets before applying imported roster lines', () => {
    const team = makeTeam('home', 'AFC', 'East', true, 80);
    const quarterback = team.roster.find((player) => player.pos === 'QB')!;
    delete (quarterback as Partial<typeof quarterback>).stats;
    delete (quarterback as Partial<typeof quarterback>).careerStats;

    applyPlayerLines(team, [{
      playerId: quarterback.id,
      name: quarterback.name,
      pos: quarterback.pos,
      passYds: 180,
      passTD: 2,
      passAtt: 24,
      passComp: 16,
    }]);

    expect(quarterback.stats).toMatchObject({
      gamesPlayed: 1,
      passYds: 180,
      passTD: 2,
      passAtt: 24,
      passComp: 16,
      rushYds: 0,
    });
    expect(quarterback.careerStats).toMatchObject({
      gp: 1,
      passYds: 180,
      passTD: 2,
      passAtt: 24,
      passComp: 16,
    });
  });
});
