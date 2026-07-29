import { describe, expect, it } from 'vitest';
import type { GameResult, Team } from '../types';
import { makeLeagueState } from './test-helpers';
import {
  applyPressResponseConsequences,
  auditCpuTransactionReceiptCoverage,
  buildDynastyMemoryDigest,
  compactCanonicalSnapLedgers,
  ensureCausalSpineState,
  persistGameCapsule,
  rebuildMemoryGraph,
  reconcileCausalSpine,
  recordActionCenterCardClosure,
  recordRivalPlanDefeat,
  recordWeeklyBriefingReceipts,
  updateFranchisePlans,
} from './causal-spine';
import { simulateSnapShadow } from './snap-shadow';

describe('canonical causal spine', () => {
  it('seeds one durable plan per CPU team and does not regenerate it without a trigger', () => {
    const game = makeLeagueState();
    ensureCausalSpineState(game);
    const cpuTeams = Object.values(game.teams).filter((team) => !team.isUser);
    expect(Object.keys(game.franchisePlans ?? {})).toHaveLength(cpuTeams.length);
    const team = cpuTeams[0]!;
    const initial = structuredClone(game.franchisePlans?.[team.id]);

    game.year += 1;
    updateFranchisePlans(game);

    expect(game.franchisePlans?.[team.id]).toEqual(initial);
    expect(game.franchisePlans?.[team.id]?.priorityPositions.length).toBeGreaterThanOrEqual(3);
  });

  it('pivots a plan only after a named change trigger and preserves history', () => {
    const game = makeLeagueState();
    ensureCausalSpineState(game);
    const team = Object.values(game.teams).find((entry) => !entry.isUser)!;
    const before = game.franchisePlans![team.id]!;
    team.staff.hc = {
      id: 'replacement-hc',
      name: 'New Coach',
      age: 47,
      role: 'hc',
      ratings: { gameplan: 75, motivation: 75, development: 75 },
      traits: [],
      contract: null,
      yearsWithTeam: 0,
      careerWins: 0,
      careerLosses: 0,
      experience: 5,
      xp: 0,
      perks: [],
    } as NonNullable<Team['staff']['hc']>;

    updateFranchisePlans(game);

    expect(game.franchisePlans?.[team.id]?.planHistory.at(-1)?.trigger).toBe('new_coach');
    expect(game.franchisePlans?.[team.id]?.planHistory.length).toBe(before.planHistory.length + 1);
  });

  it('promotes legacy transactions once and gives every CPU transaction a numeric receipt', () => {
    const game = makeLeagueState();
    ensureCausalSpineState(game);
    const team = Object.values(game.teams).find((entry) => !entry.isUser)!;
    const player = team.roster[0]!;
    team.txLog.push({
      type: 'SIGN_FA',
      year: game.year,
      week: game.week,
      playerId: player.id,
      toTeamId: team.id,
    });

    reconcileCausalSpine(game);
    reconcileCausalSpine(game);

    const event = game.leagueEvents?.find((entry) => entry.actors.playerIds.includes(player.id));
    const receipt = game.decisionReceipts?.find((entry) => entry.eventRefs.includes(event?.id ?? ''));
    expect(event?.type).toBe('signing');
    expect(receipt?.drivers.some((driver) => typeof driver.value === 'number')).toBe(true);
    expect(game.leagueEvents?.filter((entry) => entry.id === event?.id)).toHaveLength(1);
    expect(game.decisionReceipts?.filter((entry) => entry.id === receipt?.id)).toHaveLength(1);
  });

  it('audits long CPU receipt histories through indexed event references', () => {
    const game = makeLeagueState();
    ensureCausalSpineState(game);
    const cpuTeam = Object.values(game.teams).find((team) => !team.isUser)!;
    const historySize = 5_000;
    game.leagueEvents = Array.from({ length: historySize }, (_, index) => ({
      id: `perf-event-${index}`,
      seasonWeek: { year: game.year + Math.floor(index / 300), week: index % 18 + 1 },
      type: 'signing' as const,
      actors: { teamIds: [cpuTeam.id], playerIds: [], staffIds: [] },
      payload: {},
      causeIds: [],
    }));
    game.decisionReceipts = game.leagueEvents.map((event) => ({
      id: `receipt:${event.id}`,
      seasonWeek: event.seasonWeek,
      teamId: cpuTeam.id,
      decision: 'Indexed receipt coverage',
      drivers: [],
      outcome: 'covered',
      counterfactual: 'none',
      eventRefs: [event.id],
    }));
    game.decisionReceipts.pop();

    expect(auditCpuTransactionReceiptCoverage(game)).toMatchObject({
      cpuTransactionCount: historySize,
      receiptBackedCpuTransactionCount: historySize - 1,
      missingEventIds: [`perf-event-${historySize - 1}`],
    });
  });

  it('gives CPU staff transactions persistent plan-based numeric receipts', () => {
    const game = makeLeagueState();
    ensureCausalSpineState(game);
    const team = Object.values(game.teams).find((entry) => !entry.isUser)!;
    game.eventLog.push({
      id: 'cpu-hire-1',
      type: 'coach_hired',
      timestamp: game.week,
      description: `${team.abbr} hired a head coach`,
      data: { teamId: team.id, coachId: 'coach-1' },
    });

    reconcileCausalSpine(game);

    const receipt = game.decisionReceipts?.find((entry) => entry.id === 'receipt:legacy:cpu-hire-1');
    expect(receipt?.drivers.map((driver) => driver.label)).toContain('risk tolerance');
    expect(receipt?.drivers.every((driver) => typeof driver.value === 'number')).toBe(true);
    expect(receipt?.counterfactual).toContain('previous staff');
  });

  it('applies bounded press consequences and persists a callback memory tag', () => {
    const game = makeLeagueState();
    const team = Object.values(game.teams).find((entry) => entry.isUser)!;
    game.postGameUi ??= { pressConferenceQueue: [], audioCueQueue: [], pendingHalftimeDecision: null };
    game.postGameUi.pressConferenceQueue.push({
      conferenceId: 'press-1',
      teamId: team.id,
      year: game.year,
      week: game.week,
      speaker: 'Coach',
      topic: 'result',
      scenario: 'postgame',
      responses: { high: ['We own it.'], mid: [], low: [] },
    });
    const ownerBefore = team.ownerMood;
    const moraleBefore = team.roster[0]!.morale;

    const receipt = applyPressResponseConsequences(game, 'press-1', 'high', 'We own it.');

    expect(team.ownerMood).toBe(ownerBefore + 2);
    expect(team.roster[0]?.morale).toBe(moraleBefore + 1);
    expect(game.pressMemoryTags?.[0]?.tag).toBe('bold');
    expect(receipt?.drivers.map((driver) => driver.value)).toContain(2);
  });

  it('compresses a game into a capsule and links it into dynasty memory', () => {
    const game = makeLeagueState();
    const [home, away] = Object.values(game.teams);
    const result = {
      id: 'game-capsule-1',
      homeTeamId: home!.id,
      awayTeamId: away!.id,
      homeScore: 24,
      awayScore: 20,
      week: 1,
      year: game.year,
      overtime: false,
      mvpPlayerId: home!.roster[0]!.id,
      stats: {},
      playerMatchupEvents: [],
    } as GameResult;

    const capsule = persistGameCapsule(game, result);

    expect(capsule.summary).toContain('24');
    expect(game.gameCapsules).toHaveLength(1);
    expect(game.memoryGraph?.nodes.some((node) => node.id === `game:${result.id}`)).toBe(true);
    expect(game.memoryGraph?.edges.filter((edge) => edge.toId === `game:${result.id}` && edge.kind === 'played')).toHaveLength(2);
    expect(game.memoryGraph?.edges.some((edge) => edge.toId === `game:${result.id}` && edge.kind === 'remembered')).toBe(true);
  });

  it('materializes people and rivalries as durable memory nodes with causal edges', () => {
    const game = makeLeagueState();
    const [home, away] = Object.values(game.teams);
    const star = home!.roster[0]!;
    game.gameCapsules = [{
      id: 'capsule:memory-types',
      gameId: 'memory-types',
      year: game.year,
      week: game.week,
      teamIds: [home!.id, away!.id],
      score: [27, 24],
      turningPoint: 'The rivalry turned on one fourth-quarter snap.',
      keyPlayEventIds: ['snap:memory-types:88'],
      receiptIds: [],
      starPlayerIds: [star.id],
      summary: `${home!.abbr} beat ${away!.abbr} 27-24.`,
    }];
    game.leagueRivalries = [{
      id: 'memory-rivalry',
      teamA: home!.id,
      teamB: away!.id,
      intensity: 82,
      isDivision: true,
      history: [],
      lastMetYear: game.year,
      lastMetWeek: game.week,
    }];

    const graph = rebuildMemoryGraph(game);

    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: `person:${star.id}`, kind: 'person' }),
      expect.objectContaining({ id: 'rivalry:memory-rivalry', kind: 'rivalry' }),
    ]));
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromId: `person:${star.id}`, toId: 'game:memory-types', kind: 'remembered' }),
      expect.objectContaining({ fromId: `team:${home!.id}`, toId: 'rivalry:memory-rivalry', kind: 'rivaled', weight: 82 }),
      expect.objectContaining({ fromId: `team:${away!.id}`, toId: 'rivalry:memory-rivalry', kind: 'rivaled', weight: 82 }),
    ]));
  });

  it('connects saved storyline beats to the player memory node', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1!.roster[0]!;
    game.storylineThreads = [{
      id: `storyline|records-chase|${game.year}|${player.id}`,
      key: `records-chase|${game.year}|${player.id}`,
      archetype: 'records-chase',
      title: `${player.name} is chasing history`,
      summary: 'The record is within reach.',
      teamIds: ['afce1'],
      playerIds: [player.id],
      startWeek: 8,
      startYear: game.year,
      weeksActive: 1,
      status: 'active',
      beats: [{
        label: 'record watch',
        summary: 'The chase reached the national conversation.',
        weekNumber: 8,
        year: game.year,
      }],
      heat: 74,
      nextBeatHint: 'Next beat: record pace update.',
      beatIndex: 0,
      updatedWeek: 8,
      updatedYear: game.year,
      closeReason: null,
      metadata: {},
    }];

    const graph = rebuildMemoryGraph(game);
    const person = graph.nodes.find((node) => node.id === `person:${player.id}`);

    expect(person?.eventRefs).toContain(
      `storyline:${game.storylineThreads[0]!.id}:${game.year}:8:0`,
    );
  });

  it('authors previously-on, anniversary, retrospective, and season documentary copy from saved memory nodes', () => {
    const game = makeLeagueState();
    const [home, away] = Object.values(game.teams);
    const result = {
      id: 'memory-game-2026', homeTeamId: home!.id, awayTeamId: away!.id,
      homeScore: 28, awayScore: 21, week: 1, year: 2026,
      overtime: false, mvpPlayerId: home!.roster[0]!.id, stats: {}, playerMatchupEvents: [],
    } as GameResult;
    persistGameCapsule(game, result);
    game.year = 2027;
    game.week = 1;

    const digest = buildDynastyMemoryDigest(game, home!.id);

    expect(digest.previouslyOn).toContain('28');
    expect(digest.anniversary).toContain('1 season ago this week');
    expect(digest.retrospective).toContain('Retrospective');
    expect(digest.seasonDocumentary).toContain('The 2026 season');
    expect(digest.sourceNodeIds).toContain(`game:${result.id}`);
  });

  it('compacts old full user snap ledgers after their derived memory is saved', () => {
    const game = makeLeagueState();
    const user = Object.values(game.teams).find((team) => team.isUser)!;
    const opponent = Object.values(game.teams).find((team) => !team.isUser)!;
    const results = [1, 2, 3].map((week) => {
      const snap = simulateSnapShadow(`compact-${week}`, { id: user.id, overall: 80 }, { id: opponent.id, overall: 78 }, week);
      return {
        id: `compact-${week}`, homeTeamId: user.id, awayTeamId: opponent.id,
        homeScore: snap.homeScore, awayScore: snap.awayScore, week, year: game.year,
        overtime: false, mvpPlayerId: null, stats: {}, playerMatchupEvents: [],
        snapEvents: snap.snapEvents, snapLedgerMode: 'canonical',
      } as GameResult;
    });
    game.schedule = results.map((result) => ({ week: result.week, games: [{ homeTeamId: user.id, awayTeamId: opponent.id, result }] }));

    expect(compactCanonicalSnapLedgers(game, user.id, 2)).toBe(1);
    expect(results[0]!.snapEvents).toBeUndefined();
    expect(results[1]!.snapEvents?.length).toBeGreaterThan(80);
    expect(results[2]!.snapEvents?.length).toBeGreaterThan(80);
  });

  it('creates one next-week receipt for each explicitly closed Action Center card', () => {
    const game = makeLeagueState();
    const team = Object.values(game.teams).find((entry) => entry.isUser)!;
    const opponent = Object.values(game.teams).find((entry) => entry.id !== team.id)!;
    const result = {
      id: 'briefing-result-1',
      homeTeamId: team.id,
      awayTeamId: opponent.id,
      homeScore: 27,
      awayScore: 20,
      week: game.week,
      year: game.year,
      overtime: false,
      mvpPlayerId: null,
      stats: {},
      playerMatchupEvents: [],
    } as GameResult;

    recordActionCenterCardClosure(game, team.id, {
      id: 'must-game-plan', lane: 'must_do', label: 'Set your game plan', route: '/game-plan',
    });
    recordActionCenterCardClosure(game, team.id, {
      id: 'recommended-health', lane: 'recommended', label: 'Review injuries', route: '/roster',
    });
    game.week += 1;
    const receipts = recordWeeklyBriefingReceipts(game, team.id, result);
    recordWeeklyBriefingReceipts(game, team.id, result);

    expect(receipts).toHaveLength(2);
    expect(receipts[0]?.drivers.find((driver) => driver.label === 'score margin')?.value).toBe(7);
    expect(receipts[1]?.drivers.find((driver) => driver.label === 'destination')?.value).toBe('/roster');
    expect(receipts.every((receipt) => receipt.seasonWeek.week === result.week + 1)).toBe(true);
    expect(game.decisionReceipts?.filter((receipt) => receipt.id.includes('action-center-closed'))).toHaveLength(2);
  });

  it('records a user victory in the recognizable rival plan history exactly once', () => {
    const game = makeLeagueState();
    ensureCausalSpineState(game);
    const user = Object.values(game.teams).find((entry) => entry.isUser)!;
    const rival = Object.values(game.teams).find((entry) => !entry.isUser)!;
    const result = {
      id: 'rival-plan-game', homeTeamId: user.id, awayTeamId: rival.id,
      homeScore: 30, awayScore: 17, week: game.week, year: game.year,
      overtime: false, mvpPlayerId: null, stats: {}, playerMatchupEvents: [],
    } as GameResult;

    const plan = recordRivalPlanDefeat(game, result, user.id);
    recordRivalPlanDefeat(game, result, user.id);

    expect(plan?.publicNarrative).toContain(rival.city);
    expect(plan?.planHistory.filter((entry) => entry.trigger === `defeated:${result.id}`)).toHaveLength(1);
    expect(plan?.planHistory.at(-1)?.summary).toContain('30-17');
  });
});
