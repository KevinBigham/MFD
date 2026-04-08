import { getSalaryCap } from '../config';
import { makeContract, restructureContract, backloadContract } from './contracts';
import { v36CapHit, v36DeadIfCut, v36DeadIfTraded, v36TradeSavings } from './contract-helpers';
import { postJune1Cut } from './contract-extensions';
import type {
  CapCandidate,
  CapDelta,
  CapHealthReport,
  CapMove,
  CapScenario,
  CapScenarioResult,
  Contract,
  GameState,
  MultiYearProjection,
  Team,
  YearProjection,
} from '../types';

type CapScenarioInternal = CapScenario & {
  _salaryCap?: number;
  _otherCharges?: number;
  _playerMeta?: Record<string, { name: string }>;
  _deadCapByYear?: Record<number, number>;
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function cloneDeep<T>(value: T): T {
  return structuredClone(value);
}

function cloneScenario(scenario: CapScenario): CapScenarioInternal {
  return cloneDeep(scenario) as CapScenarioInternal;
}

function contractCapHit(contract: Contract): number {
  return round(v36CapHit(contract));
}

function playerMeta(team: Team): Record<string, { name: string }> {
  return Object.fromEntries(team.roster.map((player) => [player.id, { name: player.name }]));
}

function expiringNames(
  contracts: Contract[],
  meta: Record<string, { name: string }>,
  yearsOut: number,
): string[] {
  return contracts
    .filter((contract) => contract.years === yearsOut)
    .map((contract) => meta[contract.playerId]?.name ?? contract.playerId)
    .sort((a, b) => a.localeCompare(b));
}

function committedForYear(contracts: Contract[], yearsOut: number): number {
  return round(contracts.reduce((sum, contract) => {
    if (contract.years < yearsOut) return sum;
    return sum + contractCapHit(contract);
  }, 0));
}

function buildProjectionYears(
  contracts: Contract[],
  game: GameState,
  count: number,
  meta: Record<string, { name: string }>,
  deadCapByYear: Record<number, number>,
): YearProjection[] {
  return Array.from({ length: count }, (_, index) => {
    const year = game.year + index;
    const yearsOut = index + 1;
    const capTotal = getSalaryCap(year, game);
    const committed = committedForYear(contracts, yearsOut);
    const deadCap = round(deadCapByYear[year] ?? 0);
    const available = round(capTotal - committed - deadCap);
    const notes: string[] = [];
    if (deadCap > capTotal * 0.15) notes.push('Dead cap risk');
    if (available < capTotal * 0.05) notes.push('Tight flexibility');
    return {
      year,
      capTotal,
      committed,
      deadCap,
      available,
      expiringContracts: expiringNames(contracts, meta, yearsOut),
      notes,
    };
  });
}

function recalculateScenario(scenario: CapScenarioInternal): CapScenarioInternal {
  const salaryCap = scenario._salaryCap ?? 0;
  const contractCommitments = round(scenario.contracts.reduce((sum, contract) => sum + contractCapHit(contract), 0));
  const otherCharges = round(scenario._otherCharges ?? 0);
  scenario.currentCapUsed = round(contractCommitments + otherCharges + scenario.currentDeadCap);
  scenario.currentCapSpace = round(salaryCap - scenario.currentCapUsed);
  scenario.projections = buildProjectionYears(
    scenario.contracts,
    {
      year: scenario.projections[0]?.year ?? 2026,
    } as GameState,
    scenario.projections.length || 3,
    scenario._playerMeta ?? {},
    scenario._deadCapByYear ?? {},
  );
  return scenario;
}

function buildScenarioInternal(team: Team, game: GameState): CapScenarioInternal {
  const contracts = team.roster
    .filter((player) => player.contract)
    .map((player) => cloneDeep(player.contract!));
  const salaryCap = getSalaryCap(game.year, game);
  const contractCommitments = round(contracts.reduce((sum, contract) => sum + contractCapHit(contract), 0));
  const otherCharges = round(Math.max(0, team.capUsed - contractCommitments - team.deadCap));
  const meta = playerMeta(team);
  const deadCapByYear = { ...(team.deadCapByYear ?? {}), [game.year]: round(team.deadCap) };

  const scenario: CapScenarioInternal = {
    teamId: team.id,
    originalCapSpace: round(team.capSpace),
    originalCapUsed: round(team.capUsed),
    originalDeadCap: round(team.deadCap),
    contracts,
    appliedMoves: [],
    currentCapSpace: round(team.capSpace),
    currentCapUsed: round(team.capUsed),
    currentDeadCap: round(team.deadCap),
    projections: buildProjectionYears(contracts, game, 3, meta, deadCapByYear),
    _salaryCap: salaryCap,
    _otherCharges: otherCharges,
    _playerMeta: meta,
    _deadCapByYear: deadCapByYear,
  };

  return scenario;
}

function nameFor(scenario: CapScenarioInternal, playerId: string): string {
  return scenario._playerMeta?.[playerId]?.name ?? playerId;
}

function contractFor(scenario: CapScenarioInternal, playerId: string): Contract | null {
  return scenario.contracts.find((contract) => contract.playerId === playerId) ?? null;
}

function finalizeResult(
  before: CapScenarioInternal,
  after: CapScenarioInternal,
  success: boolean,
  details: string,
  warnings: string[] = [],
): CapScenarioResult {
  return {
    success,
    capSpaceBefore: before.currentCapSpace,
    capSpaceAfter: after.currentCapSpace,
    capSaved: round(before.currentCapUsed - after.currentCapUsed),
    deadCapAdded: round(after.currentDeadCap - before.currentDeadCap),
    yearlyImpact: after.projections,
    warnings,
    details,
    scenario: after,
  };
}

function applyMoveInternal(
  scenario: CapScenarioInternal,
  game: GameState,
  move: CapMove,
): CapScenarioResult {
  const next = cloneScenario(scenario);
  const contract = contractFor(next, move.playerId);
  if (!contract) {
    return finalizeResult(scenario, next, false, `No contract found for ${move.playerId}.`, ['Player is not under contract.']);
  }

  const beforeCap = next.currentCapSpace;
  const playerName = nameFor(next, move.playerId);

  if (move.type === 'restructure') {
    const result = restructureContract({ contract });
    if (!result.ok) {
      return finalizeResult(scenario, next, false, result.msg, [result.msg]);
    }
    next.appliedMoves.push(move);
    recalculateScenario(next);
    return finalizeResult(
      scenario,
      next,
      true,
      `${playerName} restructure saves $${round(next.currentCapSpace - beforeCap)}M this year.`,
    );
  }

  if (move.type === 'backload') {
    if ((contract.voidYears ?? 0) >= 3) {
      return finalizeResult(scenario, next, false, `${playerName} is already at the void year limit.`, ['Void year limit']);
    }
    const voidYears = Math.max(1, Math.min(3, move.params?.voidYears ?? 1));
    const result = backloadContract({ contract }, voidYears);
    if (!result.ok) {
      return finalizeResult(scenario, next, false, result.msg, [result.msg]);
    }
    next.appliedMoves.push({ ...move, params: { ...move.params, voidYears } });
    recalculateScenario(next);
    const warnings = contract.voidYears >= 3 ? ['Void year limit'] : [];
    return finalizeResult(
      scenario,
      next,
      true,
      `${playerName} backload with ${voidYears} void year(s) changes cap space by $${round(next.currentCapSpace - beforeCap)}M.`,
      warnings,
    );
  }

  if (move.type === 'cut' || move.type === 'trade') {
    const deadCap = move.type === 'trade' ? round(v36DeadIfTraded(contract)) : round(v36DeadIfCut(contract));
    const capSavings = move.type === 'trade' ? round(v36TradeSavings(contract)) : round(contractCapHit(contract) - deadCap);
    next.currentDeadCap = round(next.currentDeadCap + deadCap);
    if (next._deadCapByYear) {
      next._deadCapByYear[game.year] = round((next._deadCapByYear[game.year] ?? 0) + deadCap);
    }
    next.contracts = next.contracts.filter((entry) => entry.playerId !== move.playerId);
    next.appliedMoves.push(move);
    recalculateScenario(next);
    return finalizeResult(
      scenario,
      next,
      true,
      `${move.type === 'trade' ? 'Trading' : 'Cutting'} ${playerName} ${capSavings >= 0 ? `frees` : `costs`} $${Math.abs(capSavings)}M in cap space.`,
      deadCap > (next._salaryCap ?? 0) * 0.15 ? ['Dead cap risk'] : [],
    );
  }

  if (move.type === 'post_june_1_cut') {
    const tempTeam: Team = {
      deadCapByYear: { ...(next._deadCapByYear ?? {}) },
      deadCap: next.currentDeadCap,
    } as Team;
    const tempPlayer = {
      id: move.playerId,
      name: playerName,
      contract,
    } as Parameters<typeof postJune1Cut>[0];
    const impact = postJune1Cut(tempPlayer, tempTeam, game.year);
    const currentYearDead = round(impact.deadCap - impact.acceleratedCap);
    next.currentDeadCap = round(next.currentDeadCap + currentYearDead);
    next._deadCapByYear = { ...(next._deadCapByYear ?? {}) };
    next._deadCapByYear[game.year] = round((next._deadCapByYear[game.year] ?? 0) + currentYearDead);
    next._deadCapByYear[game.year + 1] = round((next._deadCapByYear[game.year + 1] ?? 0) + impact.acceleratedCap);
    next.contracts = next.contracts.filter((entry) => entry.playerId !== move.playerId);
    next.appliedMoves.push(move);
    recalculateScenario(next);
    return finalizeResult(
      scenario,
      next,
      true,
      `Post-June 1 cut of ${playerName} creates $${impact.capSavings}M in room with future dead cap carrying forward.`,
    );
  }

  const extensionYears = Math.max(1, Math.min(5, move.params?.years ?? 2));
  const averageSalary = Math.max(0.5, round(move.params?.avgSalary ?? contract.baseSalary));
  const signingBonus = round(averageSalary * extensionYears * 0.2);
  const guaranteed = round(averageSalary * Math.min(extensionYears, 2));
  const replacement = makeContract(
    averageSalary,
    extensionYears,
    signingBonus,
    guaranteed,
    contract.playerId,
    contract.teamId,
  );
  next.contracts = next.contracts.map((entry) => entry.playerId === move.playerId ? replacement : entry);
  next.appliedMoves.push({
    ...move,
    params: { ...move.params, years: extensionYears, avgSalary: averageSalary },
  });
  recalculateScenario(next);
  return finalizeResult(
    scenario,
    next,
    true,
    `${playerName} extension resets the deal to ${extensionYears} years at $${averageSalary}M average salary.`,
  );
}

function annualCapHit(contract: Contract | null): number {
  if (!contract) return 0;
  return round((contract.baseSalary ?? 0) + (contract.prorated ?? 0));
}

function restructureSavings(contract: Contract | null): number {
  if (!contract) return 0;
  const clone = cloneDeep(contract);
  const result = restructureContract({ contract: clone });
  return result.ok ? round(result.savings) : 0;
}

function backloadSavings(contract: Contract | null): number {
  if (!contract) return 0;
  const clone = cloneDeep(contract);
  const result = backloadContract({ contract: clone }, 1);
  return result.ok ? round(result.savings) : 0;
}

function capScoreFromMetrics(
  capSpacePct: number,
  deadCapPct: number,
  topHeavyPct: number,
  futureRiskPct: number,
): number {
  return round(
    80
    + capSpacePct * 2
    - deadCapPct * 2.5
    - topHeavyPct * 0.9
    - futureRiskPct * 1.2,
  );
}

function gradeFor(score: number): CapHealthReport['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function buildCapScenario(team: Team, game: GameState): CapScenario {
  return buildScenarioInternal(team, game);
}

export function simulateRestructure(scenario: CapScenario, playerId: string): CapScenarioResult {
  const internal = cloneScenario(scenario);
  const game = { year: internal.projections[0]?.year ?? 2026 } as GameState;
  return applyMoveInternal(internal, game, { type: 'restructure', playerId });
}

export function simulateBackload(
  scenario: CapScenario,
  playerId: string,
  voidYears: number,
): CapScenarioResult {
  const internal = cloneScenario(scenario);
  const game = { year: internal.projections[0]?.year ?? 2026 } as GameState;
  return applyMoveInternal(internal, game, { type: 'backload', playerId, params: { voidYears } });
}

export function simulateCut(
  scenario: CapScenario,
  playerId: string,
  postJune1: boolean,
): CapScenarioResult {
  const internal = cloneScenario(scenario);
  const game = { year: internal.projections[0]?.year ?? 2026, teams: { [internal.teamId]: { deadCapByYear: {} } } } as unknown as GameState;
  return applyMoveInternal(internal, game, { type: postJune1 ? 'post_june_1_cut' : 'cut', playerId });
}

export function simulateExtension(
  scenario: CapScenario,
  playerId: string,
  years: number,
  avgSalary: number,
): CapScenarioResult {
  const internal = cloneScenario(scenario);
  const game = { year: internal.projections[0]?.year ?? 2026 } as GameState;
  return applyMoveInternal(internal, game, { type: 'extend', playerId, params: { years, avgSalary } });
}

export function simulateMultipleMoves(scenario: CapScenario, moves: CapMove[]): CapScenarioResult {
  let working = cloneScenario(scenario);
  const year = working.projections[0]?.year ?? 2026;
  let last = finalizeResult(working, working, true, 'No moves applied.');
  for (const move of moves) {
    last = applyMoveInternal(
      working,
      {
        year,
        teams: { [working.teamId]: { deadCapByYear: cloneDeep(working._deadCapByYear ?? {}) } },
      } as unknown as GameState,
      move,
    );
    working = cloneScenario(last.scenario);
    if (!last.success) {
      return last;
    }
  }
  return last;
}

export function getCapHealth(team: Team, game: GameState): CapHealthReport {
  const capTotal = getSalaryCap(game.year, game);
  const topFivePct = round(
    team.roster
      .filter((player) => player.contract)
      .map((player) => annualCapHit(player.contract))
      .sort((a, b) => b - a)
      .slice(0, 5)
      .reduce((sum, value) => sum + value, 0) / capTotal * 100,
  );
  const deadCapPct = round((team.deadCap / capTotal) * 100);
  const capSpacePct = round((team.capSpace / capTotal) * 100);
  const futureDeadCap = round(((team.deadCapByYear?.[game.year + 1] ?? 0) + (team.deadCapByYear?.[game.year + 2] ?? 0)) / capTotal * 100);
  const score = capScoreFromMetrics(capSpacePct, deadCapPct, topFivePct, futureDeadCap);
  const recommendations: string[] = [];
  if (team.capSpace < capTotal * 0.05) recommendations.push('Create room before extension season.');
  if (deadCapPct > 10) recommendations.push('Dead money is crowding flexibility.');
  if (topFivePct > 45) recommendations.push('Roster is too top-heavy.');
  if (futureDeadCap > 8) recommendations.push('Future dead cap needs to come down.');
  if (recommendations.length === 0) recommendations.push('Cap sheet is in stable shape.');

  return {
    grade: gradeFor(score),
    capSpace: round(team.capSpace),
    capUsed: round(team.capUsed),
    deadCapPct,
    topHeavyScore: topFivePct,
    flexibilityScore: capSpacePct,
    futureRisk: futureDeadCap,
    recommendations,
  };
}

export function identifyCapCandidates(team: Team): CapCandidate[] {
  return team.roster
    .filter((player) => player.contract)
    .map((player) => {
      const contract = player.contract!;
      const valueSurplus = round((Math.max(0, player.ovr - 60) * 0.35) - annualCapHit(contract));
      const capHit = annualCapHit(contract);
      const deadIfCut = round(v36DeadIfCut(contract));
      const deadIfTraded = round(v36DeadIfTraded(contract));
      const savingsIfCut = round(capHit - deadIfCut);
      const savingsIfTraded = round(v36TradeSavings(contract));
      const restructure = restructureSavings(contract);
      const backload = backloadSavings(contract);
      let recommendation: CapCandidate['recommendation'] = 'hold';
      if (restructure > 1 && contract.years > 1 && !contract.restructured && player.ovr >= 80) recommendation = 'restructure';
      else if (valueSurplus < 0 && savingsIfTraded > 0.5) recommendation = 'trade';
      else if (valueSurplus < 0 && savingsIfCut > 0.5) recommendation = 'cut';
      else if (backload > 0.5 && (contract.voidYears ?? 0) < 3) recommendation = 'backload';

      return {
        playerId: player.id,
        playerName: player.name,
        pos: player.pos,
        capHit,
        deadIfCut,
        deadIfTraded,
        savingsIfCut,
        savingsIfTraded,
        restructureSavings: restructure,
        backloadSavings: backload,
        recommendation,
      };
    })
    .sort((a, b) => b.capHit - a.capHit || a.playerName.localeCompare(b.playerName));
}

export function buildMultiYearProjection(team: Team, game: GameState, years: number): MultiYearProjection {
  const scenario = buildScenarioInternal(team, game);
  scenario.projections = buildProjectionYears(
    scenario.contracts,
    game,
    years,
    scenario._playerMeta ?? {},
    scenario._deadCapByYear ?? {},
  );
  return {
    years: scenario.projections,
  };
}

export function projectCapDeltas(
  team: Team,
  game: GameState,
  moves: CapMove[],
  years = 3,
): CapDelta[] {
  const before = buildMultiYearProjection(team, game, years);
  const scenario = buildCapScenario(team, game);
  const result = simulateMultipleMoves(scenario, moves);
  const after = result.scenario.projections.length > 0
    ? result.scenario.projections
    : buildProjectionYears(
        result.scenario.contracts,
        game,
        years,
        playerMeta(team),
        team.deadCapByYear ?? {},
      );

  return before.years.map((bYear, i) => {
    const aYear = after[i];
    const currentCommitted = bYear.committed;
    const projectedCommitted = aYear ? aYear.committed : currentCommitted;
    return {
      year: bYear.year,
      currentCommitted: round(currentCommitted),
      projectedCommitted: round(projectedCommitted),
      delta: round(projectedCommitted - currentCommitted),
    };
  });
}
