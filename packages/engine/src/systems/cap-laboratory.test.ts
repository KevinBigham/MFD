import { describe, expect, it } from 'vitest';
import {
  backloadContract,
  buildCapScenario,
  buildMultiYearProjection,
  getCapHealth,
  identifyCapCandidates,
  restructureContract,
  simulateBackload,
  simulateCut,
  simulateExtension,
  simulateMultipleMoves,
  simulateRestructure,
} from '../index';
import { makeLeagueState } from './test-helpers';

describe('cap laboratory', () => {
  it('builds a cloned sandbox scenario without mutating live contracts', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    const player = team.roster[0]!;
    const scenario = buildCapScenario(team, game);

    scenario.contracts[0]!.baseSalary = 1;

    expect(player.contract?.baseSalary).not.toBe(1);
    expect(scenario.currentCapSpace).toBe(team.capSpace);
  });

  it('simulates restructures using the same math as the live contract helper', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    const player = team.roster[0]!;
    const scenario = buildCapScenario(team, game);
    const expectedContract = JSON.parse(JSON.stringify(player.contract)) as NonNullable<typeof player.contract>;
    const expected = restructureContract({ contract: expectedContract });

    const result = simulateRestructure(scenario, player.id);

    expect(result.success).toBe(true);
    expect(result.capSaved).toBeCloseTo(expected.savings, 4);
    expect(result.scenario.appliedMoves).toHaveLength(1);
  });

  it('rejects backloading when a player already has the maximum void years', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    const player = team.roster[0]!;
    player.contract!.voidYears = 3;
    const scenario = buildCapScenario(team, game);

    const result = simulateBackload(scenario, player.id, 1);

    expect(result.success).toBe(false);
    expect(result.warnings).toContain('Void year limit');
  });

  it('shows a lower current-year dead cap hit for post-June 1 cuts', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    const player = team.roster[0]!;
    const scenario = buildCapScenario(team, game);

    const standard = simulateCut(scenario, player.id, false);
    const postJune = simulateCut(scenario, player.id, true);

    expect(standard.success).toBe(true);
    expect(postJune.success).toBe(true);
    expect(postJune.deadCapAdded).toBeLessThan(standard.deadCapAdded);
    expect(postJune.scenario.projections[1]!.deadCap).toBeGreaterThanOrEqual(postJune.scenario.projections[0]!.deadCap);
  });

  it('chains multiple moves sequentially in the sandbox', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    const qb = team.roster.find((player) => player.pos === 'QB')!;
    const wr = team.roster.find((player) => player.pos === 'WR')!;
    const scenario = buildCapScenario(team, game);

    const result = simulateMultipleMoves(scenario, [
      { type: 'restructure', playerId: qb.id },
      { type: 'cut', playerId: wr.id },
    ]);

    expect(result.success).toBe(true);
    expect(result.scenario.appliedMoves).toHaveLength(2);
    expect(result.capSpaceAfter).toBeGreaterThan(result.capSpaceBefore);
  });

  it('grades healthy and unhealthy cap sheets at the right boundaries', () => {
    const game = makeLeagueState();
    const healthy = game.teams.afce1;
    healthy.capSpace = 42;
    healthy.capUsed = 190;
    healthy.deadCap = 4;

    const unhealthy = game.teams.afce2;
    unhealthy.capSpace = 2;
    unhealthy.capUsed = 253;
    unhealthy.deadCap = 32;
    unhealthy.deadCapByYear[game.year + 1] = 28;
    unhealthy.deadCapByYear[game.year + 2] = 20;

    expect(getCapHealth(healthy, game).grade).toBe('A');
    expect(getCapHealth(unhealthy, game).grade).toBe('F');
  });

  it('keeps cap-health recommendations direct and player-facing', () => {
    const game = makeLeagueState();
    const healthy = game.teams.afce1;
    healthy.capSpace = 42;
    healthy.capUsed = 190;
    healthy.deadCap = 4;

    const unhealthy = game.teams.afce2;
    unhealthy.capSpace = 2;
    unhealthy.capUsed = 253;
    unhealthy.deadCap = 32;
    unhealthy.deadCapByYear[game.year + 1] = 28;
    unhealthy.deadCapByYear[game.year + 2] = 20;

    const copy = [
      ...getCapHealth(healthy, game).recommendations,
      ...getCapHealth(unhealthy, game).recommendations,
    ].join(' ');

    expect(copy).toMatch(/\b(?:cap space|dead money|starter-value|future dead cap|flexibility|extension)\b/i);
    expect(copy).not.toMatch(/\b(?:Create room|Cap sheet|crowding flexibility|too top-heavy|stable shape)\b/i);
  });

  it('identifies cap candidates sorted by cap hit with actionable recommendations', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    const expensiveVeteran = team.roster.find((player) => player.pos === 'QB')!;
    expensiveVeteran.ovr = 68;
    expensiveVeteran.contract!.baseSalary = 18;
    expensiveVeteran.contract!.prorated = 4;
    expensiveVeteran.contract!.years = 2;

    const premiumStarter = team.roster.find((player) => player.pos === 'DL')!;
    premiumStarter.ovr = 92;
    premiumStarter.contract!.baseSalary = 10;
    premiumStarter.contract!.prorated = 2;
    premiumStarter.contract!.years = 3;

    const candidates = identifyCapCandidates(team);

    expect(candidates[0]?.playerId).toBe(expensiveVeteran.id);
    expect(['trade', 'cut']).toContain(candidates[0]!.recommendation);
    expect(candidates.some((candidate) => candidate.playerId === premiumStarter.id && candidate.recommendation === 'restructure')).toBe(true);
  });

  it('builds a multi-year projection using cap growth', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;

    const projection = buildMultiYearProjection(team, game, 3);

    expect(projection.years).toHaveLength(3);
    expect(projection.years[1]!.capTotal).toBeGreaterThan(projection.years[0]!.capTotal);
    expect(projection.years[2]!.capTotal).toBeGreaterThan(projection.years[1]!.capTotal);
  });

  it('simulates extensions with a replacement contract in the scenario only', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    const player = team.roster.find((entry) => entry.pos === 'WR')!;
    const scenario = buildCapScenario(team, game);

    const result = simulateExtension(scenario, player.id, 4, 16);

    expect(result.success).toBe(true);
    expect(result.scenario.contracts.find((contract) => contract.playerId === player.id)?.years).toBe(4);
    expect(player.contract?.years).not.toBe(4);
  });

  it('estimates backload savings through the same helper behavior', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1;
    const player = team.roster.find((entry) => entry.pos === 'DL')!;
    const scenario = buildCapScenario(team, game);
    const expectedContract = JSON.parse(JSON.stringify(player.contract)) as NonNullable<typeof player.contract>;
    const expected = backloadContract({ contract: expectedContract }, 1);

    const result = simulateBackload(scenario, player.id, 1);

    expect(result.success).toBe(true);
    expect(result.capSaved).toBeCloseTo(expected.savings, 4);
  });
});
