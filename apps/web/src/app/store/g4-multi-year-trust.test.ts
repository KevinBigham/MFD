import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  advanceFranchiseWeek,
  advanceSetupPhase,
  applyCBADealToRules,
  applySetupDecision,
  checkCBAStatus,
  finalizeDeadline,
  finalizeSetup,
  generateGoalContext,
  generateSchemeContext,
  getSalaryCap,
  getRegularSeasonWeekCount,
  makeDraftPick,
  migrate,
  negotiateCBA,
  PHASE_ORDER,
  ratifyCBA,
  resolveLockout,
  SAVE_VERSION,
  SaveStateSchema,
  STARTER_SLOTS,
} from '@mfd/engine';
import type { GameState, SeasonPhase, Team } from '@mfd/engine';
import { createSeedGameState } from './seed';

const G4_SEED = 860_618;
const TARGET_COMPLETED_SEASONS = Number(process.env.G4_TARGET_SEASONS ?? 10);
const STEP_GUARD = 800;
const VALIDATED_STATE_GUARD = STEP_GUARD * 4;
const ADVANCE_ONLY_BIAS = Object.freeze({ advanceOnly: true, fatigueIgnore: true });
const G4_SOAK_LOG = process.env.G4_SOAK_LOG === '1';
const G4_SOAK_TIMEOUT_MS = 3_600_000;

const PHASE_ORDER_FOR_ASSERTIONS: readonly SeasonPhase[] = [
  'offseason',
  'free_agency',
  'draft',
  'post_draft',
  'training_camp',
  'preseason',
  'regular_season',
  'playoffs',
];

interface Frame {
  year: number;
  week: number;
  phase: SeasonPhase;
}

interface SeasonStartMilestone {
  seasonNumber: number;
  frame: Frame;
}

interface SoakResult {
  startFrame: Frame;
  finalFrame: Frame;
  completedSeasonCycles: number;
  advanceCount: number;
  cbaActions: number;
  deadlineFinalizations: number;
  userDraftPicks: number;
  validatedStates: number;
  signatures: string[];
  seasonStarts: SeasonStartMilestone[];
}

function sortJson(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortJson);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortJson(child)]),
  );
}

function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function yieldToVitestWorker(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function frameOf(state: GameState): Frame {
  return {
    year: state.year,
    week: state.week,
    phase: state.phase,
  };
}

function sameFrame(left: Frame, right: Frame): boolean {
  return left.year === right.year && left.week === right.week && left.phase === right.phase;
}

function isCBAInterruptStatus(status: GameState['cbaState']['status']): boolean {
  return status === 'negotiating' || status === 'awaiting_owner_vote' || status === 'lockout';
}

function refreshLeagueCapSpaceForRules(game: GameState): void {
  const salaryCap = getSalaryCap(game.year, game);
  for (const team of Object.values(game.teams)) {
    team.capSpace = Math.round((salaryCap - team.capUsed) * 10) / 10;
  }
}

function resolveCBAActionIfNeeded(state: GameState): GameState {
  const status = checkCBAStatus(state.cbaState, state.year);
  if (!isCBAInterruptStatus(status)) return state;

  const next = structuredClone(state);
  next.cbaState.status = status;

  if (status === 'awaiting_owner_vote') {
    const proposal = next.cbaState.negotiationState?.currentProposal ?? null;
    if (!proposal) throw new Error(`CBA owner vote requested in ${next.year} without a current proposal.`);
    next.cbaState = ratifyCBA(next.cbaState, proposal, next.year);
    applyCBADealToRules(next, next.cbaState.currentDeal!);
    refreshLeagueCapSpaceForRules(next);
    next.laborState.activeStoppage = null;
    return next;
  }

  if (status === 'lockout') {
    const resolution = resolveLockout(next.cbaState, next);
    if (!resolution.resolved) throw new Error(`CBA lockout in ${next.year} could not be resolved.`);
    next.cbaState = resolution.cba;
    applyCBADealToRules(next, next.cbaState.currentDeal!);
    refreshLeagueCapSpaceForRules(next);
    next.laborState.activeStoppage = null;
    return next;
  }

  const outcome = negotiateCBA(next.cbaState, next);
  next.cbaState = outcome.cba;
  if (outcome.lockout) {
    next.laborState.activeStoppage = {
      type: 'lockout',
      severity: 3,
      startWeek: next.week,
      resolvedWeek: null,
      affectedTeams: Object.keys(next.teams),
      moralePenalty: -10,
    };
  }
  return next;
}

function frameLabel(frame: Frame): string {
  return `${frame.phase} Y${frame.year} W${frame.week}`;
}

function phaseRank(phase: SeasonPhase): number {
  const index = PHASE_ORDER_FOR_ASSERTIONS.indexOf(phase);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function expectPhaseBoundary(previousState: GameState, previous: Frame, current: Frame): void {
  if (current.year < previous.year) {
    throw new Error(`Year regressed from ${previous.year} to ${current.year}.`);
  }

  if (current.year > previous.year) return;

  const previousPhaseRank = phaseRank(previous.phase);
  const currentPhaseRank = phaseRank(current.phase);
  if (currentPhaseRank < previousPhaseRank) {
    throw new Error(
      `Phase regressed from ${previous.phase} to ${current.phase} in year ${current.year}.`,
    );
  }

  if (currentPhaseRank === previousPhaseRank && current.week < previous.week) {
    throw new Error(
      `Week regressed from ${previous.week} to ${current.week} in ${current.phase} ${current.year}.`,
    );
  }

  const expected = (() => {
    switch (previous.phase) {
      case 'training_camp':
        return current.phase === 'preseason'
          && current.year === previous.year
          && current.week === previous.week;
      case 'preseason':
        return current.phase === 'regular_season'
          && current.year === previous.year
          && current.week === previous.week;
      case 'regular_season': {
        const regularSeasonWeeks = getRegularSeasonWeekCount(previousState);
        if (previous.week < regularSeasonWeeks) {
          return current.phase === 'regular_season'
            && current.year === previous.year
            && current.week === previous.week + 1;
        }
        return current.phase === 'playoffs'
          && current.year === previous.year
          && current.week === regularSeasonWeeks + 1;
      }
      case 'playoffs':
        if (current.phase === 'playoffs') {
          return current.year === previous.year && current.week === previous.week + 1;
        }
        return current.phase === 'offseason'
          && current.year === previous.year + 1
          && current.week === 1;
      case 'offseason':
        return current.phase === 'free_agency'
          && current.year === previous.year
          && current.week === 1;
      case 'free_agency':
        if (previous.week < 3) {
          return current.phase === 'free_agency'
            && current.year === previous.year
            && current.week === previous.week + 1;
        }
        return current.phase === 'draft'
          && current.year === previous.year
          && current.week === 1;
      case 'draft':
        return current.phase === 'post_draft'
          && current.year === previous.year
          && current.week === previous.week;
      case 'post_draft':
        return current.phase === 'training_camp'
          && current.year === previous.year
          && current.week === 1;
      default:
        return true;
    }
  })();

  if (!expected) {
    throw new Error(
      `Unexpected phase boundary: ${previous.phase} Y${previous.year} W${previous.week} -> `
      + `${current.phase} Y${current.year} W${current.week}.`,
    );
  }
}

function trustProjection(state: GameState) {
  return {
    version: state.version,
    seed: state.seed,
    year: state.year,
    week: state.week,
    phase: state.phase,
    teamCount: Object.keys(state.teams).length,
    playerCount: Object.keys(state.players).length,
    freeAgentCount: state.freeAgents.length,
    draftClassCount: state.draftClass.length,
    franchiseHistoryLength: state.franchiseHistory.length,
    awardsHistoryLength: state.awardsHistory.length,
    eventLogLength: state.eventLog.length,
    playerArchiveLength: state.playerArchive.length,
    playerSeasonHistoryKeys: Object.keys(state.playerSeasonHistory).length,
    seasonReportsLength: state.seasonReports?.length ?? 0,
    scheduleShape: state.schedule.map((week) => [week.week, week.games.length]),
    teams: Object.fromEntries(Object.entries(state.teams)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([teamId, team]) => {
        const positionCounts = team.roster.reduce<Partial<Record<string, number>>>((counts, player) => {
          counts[player.pos] = (counts[player.pos] ?? 0) + 1;
          return counts;
        }, {});
        return [teamId, {
          wins: team.wins,
          losses: team.losses,
          ties: team.ties,
          capSpace: Math.round(team.capSpace * 10) / 10,
          capUsed: Math.round(team.capUsed * 10) / 10,
          deadCap: Math.round((team.deadCap ?? 0) * 10) / 10,
          rosterCount: team.roster.length,
          positions: Object.fromEntries(Object.entries(positionCounts).sort(([left], [right]) => left.localeCompare(right))),
          draftPickCount: team.draftPicks.length,
          gmStrategy: team.gmStrategy,
          philosophy: team.philosophy,
        }];
      })),
    eventTail: state.eventLog.slice(-12).map((event) => [event.id, event.type, event.timestamp]),
    newsTail: state.leagueNews.slice(-12).map((item) => [item.id, item.year, item.week, item.type]),
  };
}

function roundTripState(state: GameState): GameState {
  const serialized = JSON.stringify(state);
  const migrated = migrate(JSON.parse(serialized) as Record<string, unknown>, SAVE_VERSION);
  return SaveStateSchema.parse(migrated) as unknown as GameState;
}

function expectSetupReceiptCompleted(state: GameState): void {
  expect(state.setupState?.completedPhases).toEqual([...PHASE_ORDER]);
  expect(state.setupState?.currentPhase).toBe('blueprint');
  expect(state.setupState?.blueprint).not.toBeNull();
  expect(state.franchiseBlueprint).not.toBeNull();
}

function expectTeamSanity(
  teamId: string,
  team: Team,
  state: GameState,
  rosterIds: Set<string>,
  label: string,
  enforceRosterFloors: boolean,
): void {
  expect(team.id).toBe(teamId);
  for (const [label, value] of Object.entries({
    capSpace: team.capSpace,
    capUsed: team.capUsed,
    deadCap: team.deadCap,
  })) {
    expect(Number.isFinite(value), `${teamId}.${label} must be finite`).toBe(true);
    expect(value, `${teamId}.${label} lower sanity bound`).toBeGreaterThanOrEqual(-50);
    expect(value, `${teamId}.${label} upper sanity bound`).toBeLessThanOrEqual(500);
  }

  expect(team.wins).toBeGreaterThanOrEqual(0);
  expect(team.losses).toBeGreaterThanOrEqual(0);
  expect(team.ties).toBeGreaterThanOrEqual(0);
  expect(team.wins + team.losses + team.ties).toBeLessThanOrEqual(25);

  if (enforceRosterFloors) {
    for (const [position, minimum] of Object.entries(STARTER_SLOTS)) {
      const rostered = team.roster.filter((player) => player.pos === position).length;
      expect(rostered, `${label}: ${teamId} rostered ${position}`).toBeGreaterThanOrEqual(minimum);
    }
  }

  for (const player of team.roster) {
    expect(rosterIds.has(player.id), `duplicate roster player ${player.id}`).toBe(false);
    rosterIds.add(player.id);
    expect(player.teamId).toBe(teamId);
    expect(player.ovr).toBeGreaterThanOrEqual(30);
    expect(player.ovr).toBeLessThanOrEqual(99);
    expect(player.age).toBeGreaterThanOrEqual(18);
    expect(player.age).toBeLessThanOrEqual(60);
    expect(player.morale).toBeGreaterThanOrEqual(0);
    expect(player.morale).toBeLessThanOrEqual(100);

    const mirror = state.players[player.id];
    expect(mirror, `missing flat player mirror for ${player.id}`).toBeDefined();
    expect(mirror?.teamId).toBe(teamId);
    expect(mirror?.pos).toBe(player.pos);
  }
}

function expectStateSane(state: GameState, label: string, options: { saveRoundTrip: boolean }): string {
  expect(state.version, `${label}: save version`).toBe(SAVE_VERSION);
  expect(Number.isInteger(state.year), `${label}: year integer`).toBe(true);
  expect(Number.isInteger(state.week), `${label}: week integer`).toBe(true);
  expect(state.week, `${label}: week lower bound`).toBeGreaterThanOrEqual(1);
  expect(PHASE_ORDER_FOR_ASSERTIONS, `${label}: known phase`).toContain(state.phase);
  expectSetupReceiptCompleted(state);

  const teamIds = new Set(Object.keys(state.teams));
  expect(teamIds.size, `${label}: team count`).toBeGreaterThanOrEqual(16);

  const rosterIds = new Set<string>();
  const enforceRosterFloors = state.phase !== 'offseason' && state.phase !== 'free_agency';
  for (const [teamId, team] of Object.entries(state.teams)) {
    expectTeamSanity(teamId, team, state, rosterIds, label, enforceRosterFloors);
  }

  for (const playerId of state.freeAgents) {
    const player = state.players[playerId];
    expect(player, `${label}: free agent ${playerId} exists`).toBeDefined();
    expect(player?.teamId ?? null, `${label}: free agent ${playerId} team`).toBeNull();
  }

  for (const week of state.schedule) {
    expect(week.week).toBeGreaterThanOrEqual(1);
    for (const game of week.games) {
      expect(teamIds.has(game.homeTeamId), `${label}: home team ${game.homeTeamId}`).toBe(true);
      expect(teamIds.has(game.awayTeamId), `${label}: away team ${game.awayTeamId}`).toBe(true);
    }
  }

  const liveProjection = canonicalJsonStringify(trustProjection(state));
  if (!options.saveRoundTrip) return liveProjection;

  const restored = roundTripState(state);
  const restoredProjection = canonicalJsonStringify(trustProjection(restored));
  expect(restoredProjection, `${label}: save round-trip projection`).toBe(liveProjection);
  return restoredProjection;
}

function signatureFor(state: GameState, label: string, options: { saveRoundTrip: boolean }): string {
  const bytes = expectStateSane(state, label, options);
  const frame = frameOf(state);
  return [
    frame.year,
    frame.phase,
    frame.week,
    Object.keys(state.teams).length,
    Object.keys(state.players).length,
    state.franchiseHistory.length,
    state.awardsHistory.length,
    state.eventLog.length,
    sha256(bytes),
  ].join('|');
}

function completeFullSetup(game: GameState): GameState {
  const userTeam = Object.values(game.teams).find((team) => team.isUser);
  if (!userTeam) throw new Error('G4 setup requires a user team.');

  let setup = game.setupState;
  if (!setup) throw new Error('G4 setup requires a setupState from New Dynasty.');

  setup = applySetupDecision(setup, { agmProfileId: 'marcus_webb' });
  setup = advanceSetupPhase(setup);

  for (const phase of ['intel_briefing', 'meet_roster'] as const) {
    setup = applySetupDecision(setup, {
      acknowledged: [...setup.decisions.acknowledged, phase],
    });
    setup = advanceSetupPhase(setup);
  }

  setup = applySetupDecision(setup, { headCoachId: 'elias_rowe' });
  setup = advanceSetupPhase(setup);
  setup = applySetupDecision(setup, { scoutingDirectorId: 'zoe_wilcox' });
  setup = advanceSetupPhase(setup);

  const schemeContext = generateSchemeContext(game, userTeam.id);
  setup = applySetupDecision(setup, {
    offenseScheme: schemeContext.offenseOptions.find((option) => option.recommended)?.schemeId
      ?? schemeContext.offenseOptions[0]?.schemeId
      ?? userTeam.offScheme,
    defenseScheme: schemeContext.defenseOptions.find((option) => option.recommended)?.schemeId
      ?? schemeContext.defenseOptions[0]?.schemeId
      ?? userTeam.defScheme,
  });
  setup = advanceSetupPhase(setup);

  setup = applySetupDecision(setup, { depthChartPhilosophy: 'best_players' });
  setup = advanceSetupPhase(setup);
  setup = applySetupDecision(setup, { capPosture: 'balanced' });
  setup = advanceSetupPhase(setup);

  const goalContext = generateGoalContext(game, userTeam.id);
  setup = applySetupDecision(setup, {
    seasonGoals: goalContext.recommendedGoals.slice(0, 3).map((goal) => goal.id),
    cultureMandate: 'accountability',
  });
  setup = advanceSetupPhase(setup);
  setup = applySetupDecision(setup, {
    acknowledged: [...setup.decisions.acknowledged, 'blueprint'],
  });

  return finalizeSetup(game, userTeam.id, setup);
}

function makePlayableNewDynasty(seed: number): GameState {
  let state = completeFullSetup(createSeedGameState(seed, 0, 'pro'));
  expect(frameOf(state)).toEqual({ year: 2026, week: 1, phase: 'preseason' });

  const previousFrame = frameOf(state);
  state = advanceFranchiseWeek(state, { playtestBias: ADVANCE_ONLY_BIAS }).nextState;
  expectPhaseBoundary(state, previousFrame, frameOf(state));
  expect(frameOf(state)).toEqual({ year: 2026, week: 1, phase: 'regular_season' });
  return state;
}

function finalizeTradeDeadlineIfNeeded(state: GameState, seed: number, deadlineFinalizations: number): GameState {
  if (!state.tradeDeadlineState) return state;

  const resolved = finalizeDeadline(state, state.tradeDeadlineState);
  resolved.eventLog.push({
    id: `g4-deadline-${seed}-${deadlineFinalizations}`,
    type: 'trade_deadline_resolved',
    timestamp: deadlineFinalizations,
    description: 'G4 multi-year trust gate deadline auto-resolve.',
    data: { year: resolved.year, week: resolved.week },
  });
  return resolved;
}

function currentUserDraftPickTeamId(state: GameState): string | null {
  if (state.phase !== 'draft' || !state.offseasonState) return null;
  const userTeam = Object.values(state.teams).find((team) => team.isUser) ?? null;
  const currentEntry = state.offseasonState.draftOrder[state.offseasonState.currentDraftPickIndex] ?? null;
  if (!userTeam || currentEntry?.teamId !== userTeam.id) return null;
  return userTeam.id;
}

function isUserDraftPause(state: GameState): boolean {
  return currentUserDraftPickTeamId(state) !== null;
}

function makeUserDraftPickIfNeeded(state: GameState): GameState {
  if (!isUserDraftPause(state)) return state;

  const prospect = [...state.draftClass]
    .sort((left, right) =>
      right.trueGrade - left.trueGrade
      || right.scoutGrade - left.scoutGrade
      || left.id.localeCompare(right.id))[0] ?? null;
  if (!prospect) {
    const currentIndex = state.offseasonState?.currentDraftPickIndex ?? -1;
    const draftOrderLength = state.offseasonState?.draftOrder.length ?? -1;
    const currentYearPickCount = Object.values(state.teams)
      .flatMap((team) => team.draftPicks)
      .filter((pick) => pick.year === state.year).length;
    throw new Error(
      `User draft pick is on the clock in ${state.year}, but no prospect is available `
      + `(draftClass=${state.draftClass.length}, index=${currentIndex}, order=${draftOrderLength}, `
      + `teamPicksForYear=${currentYearPickCount}).`,
    );
  }

  return makeDraftPick(state, prospect.id).nextState;
}

async function maybeYieldForLongSoak(validatedStates: number): Promise<void> {
  if (validatedStates % 10 === 0) {
    await yieldToVitestWorker();
  }
}

async function runG4Soak(seed: number, completedSeasonsTarget: number, options: { saveRoundTrips: boolean }): Promise<SoakResult> {
  let state = makePlayableNewDynasty(seed);
  const startFrame = frameOf(state);
  const signatures = [signatureFor(state, 'playable year 1 week 1', { saveRoundTrip: options.saveRoundTrips })];
  const seasonStarts: SeasonStartMilestone[] = [{ seasonNumber: 1, frame: startFrame }];
  let advanceCount = 0;
  let cbaActions = 0;
  let deadlineFinalizations = 0;
  let userDraftPicks = 0;
  let validatedStates = 1;

  while (
    !(
      state.year === startFrame.year + completedSeasonsTarget
      && state.phase === 'regular_season'
      && state.week === 1
    )
  ) {
    expect(advanceCount).toBeLessThan(STEP_GUARD);
    expect(validatedStates).toBeLessThan(VALIDATED_STATE_GUARD);
    if (G4_SOAK_LOG && advanceCount > 0 && advanceCount % 25 === 0) {
      const frame = frameOf(state);
      console.error(`[g4-soak] seed=${seed} advance=${advanceCount} frame=${frameLabel(frame)} seasons=${state.year - startFrame.year} signatures=${signatures.length} cba=${cbaActions} draft=${userDraftPicks}`);
    }

    const deadlineResolved = finalizeTradeDeadlineIfNeeded(state, seed, deadlineFinalizations);
    if (deadlineResolved !== state) {
      state = deadlineResolved;
      deadlineFinalizations += 1;
      signatures.push(signatureFor(state, `deadline ${deadlineFinalizations} resolved ${frameLabel(frameOf(state))}`, { saveRoundTrip: options.saveRoundTrips }));
      validatedStates += 1;
      await maybeYieldForLongSoak(validatedStates);
    }

    const draftPicked = makeUserDraftPickIfNeeded(state);
    if (draftPicked !== state) {
      state = draftPicked;
      userDraftPicks += 1;
      if (G4_SOAK_LOG && userDraftPicks % 10 === 0) {
        console.error(`[g4-soak] seed=${seed} userDraftPicks=${userDraftPicks} frame=${frameLabel(frameOf(state))}`);
      }
      signatures.push(signatureFor(state, `user draft pick ${userDraftPicks} ${frameLabel(frameOf(state))}`, { saveRoundTrip: options.saveRoundTrips }));
      validatedStates += 1;
      await maybeYieldForLongSoak(validatedStates);
      continue;
    }

    const cbaResolved = resolveCBAActionIfNeeded(state);
    if (cbaResolved !== state) {
      state = cbaResolved;
      cbaActions += 1;
      if (G4_SOAK_LOG) {
        console.error(`[g4-soak] seed=${seed} cbaActions=${cbaActions} status=${state.cbaState.status} frame=${frameLabel(frameOf(state))}`);
      }
      signatures.push(signatureFor(state, `cba action ${cbaActions} ${frameLabel(frameOf(state))}`, { saveRoundTrip: options.saveRoundTrips }));
      validatedStates += 1;
      await maybeYieldForLongSoak(validatedStates);
      continue;
    }

    const previousState = state;
    const previousFrame = frameOf(previousState);
    const originalMathRandom = Math.random;
    let mathRandomCalls = 0;
    Math.random = (() => {
      mathRandomCalls += 1;
      return originalMathRandom();
    }) as typeof Math.random;

    try {
      state = advanceFranchiseWeek(previousState, { playtestBias: ADVANCE_ONLY_BIAS }).nextState;
    } finally {
      Math.random = originalMathRandom;
    }

    const currentFrame = frameOf(state);
    expect(mathRandomCalls, `Math.random calls during ${previousFrame.phase} Y${previousFrame.year} W${previousFrame.week}`).toBe(0);
    if (sameFrame(previousFrame, currentFrame) && state.tradeDeadlineState) {
      signatures.push(signatureFor(state, `trade deadline pause ${advanceCount + 1} ${frameLabel(currentFrame)}`, { saveRoundTrip: options.saveRoundTrips }));
      validatedStates += 1;
      await maybeYieldForLongSoak(validatedStates);
      continue;
    }
    if (sameFrame(previousFrame, currentFrame) && isUserDraftPause(state)) {
      signatures.push(signatureFor(state, `user draft pause ${advanceCount + 1} ${frameLabel(currentFrame)}`, { saveRoundTrip: options.saveRoundTrips }));
      validatedStates += 1;
      await maybeYieldForLongSoak(validatedStates);
      continue;
    }
    if (sameFrame(previousFrame, currentFrame) && isCBAInterruptStatus(state.cbaState.status)) {
      signatures.push(signatureFor(state, `cba pause ${advanceCount + 1} ${frameLabel(currentFrame)}`, { saveRoundTrip: options.saveRoundTrips }));
      validatedStates += 1;
      await maybeYieldForLongSoak(validatedStates);
      continue;
    }

    expectPhaseBoundary(previousState, previousFrame, currentFrame);
    advanceCount += 1;

    if (
      previousFrame.phase === 'preseason'
      && currentFrame.phase === 'regular_season'
      && currentFrame.year > startFrame.year
    ) {
      if (G4_SOAK_LOG) {
        console.error(`[g4-soak] seed=${seed} reached season ${currentFrame.year - startFrame.year + 1} at ${frameLabel(currentFrame)}`);
      }
      seasonStarts.push({
        seasonNumber: currentFrame.year - startFrame.year + 1,
        frame: currentFrame,
      });
    }

    signatures.push(signatureFor(state, `advance ${advanceCount} ${frameLabel(currentFrame)}`, { saveRoundTrip: options.saveRoundTrips }));
    validatedStates += 1;
    await maybeYieldForLongSoak(validatedStates);
  }

  return {
    startFrame,
    finalFrame: frameOf(state),
    completedSeasonCycles: state.year - startFrame.year,
    advanceCount,
    cbaActions,
    deadlineFinalizations,
    userDraftPicks,
    validatedStates,
    signatures,
    seasonStarts,
  };
}

describe('G4 multi-year trust gate', () => {
  it('reaches Year 4 Week 1 and replays a deterministic 10-season New Dynasty soak', { timeout: G4_SOAK_TIMEOUT_MS }, async () => {
    const left = await runG4Soak(G4_SEED, TARGET_COMPLETED_SEASONS, { saveRoundTrips: true });
    const right = await runG4Soak(G4_SEED, TARGET_COMPLETED_SEASONS, { saveRoundTrips: false });

    expect(left.startFrame).toEqual({ year: 2026, week: 1, phase: 'regular_season' });
    if (TARGET_COMPLETED_SEASONS >= 3) {
      expect(left.seasonStarts.find((entry) => entry.seasonNumber === 4)?.frame).toEqual({
        year: 2029,
        week: 1,
        phase: 'regular_season',
      });
    }
    expect(left.completedSeasonCycles).toBe(TARGET_COMPLETED_SEASONS);
    expect(left.finalFrame).toEqual({ year: 2026 + TARGET_COMPLETED_SEASONS, week: 1, phase: 'regular_season' });
    expect(left.seasonStarts).toHaveLength(TARGET_COMPLETED_SEASONS + 1);
    expect(left.validatedStates).toBeGreaterThan(left.advanceCount);
    expect(left.signatures).toEqual(right.signatures);
    expect(left).toEqual(right);
  });
});
