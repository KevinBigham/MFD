import { describe, expect, it } from 'vitest';
import {
  checkWorkStoppage,
  generateLaborEvent,
  getUnionLeader,
  initLaborState,
  resolveWorkStoppage,
  updateUnionSatisfaction,
} from './labor-relations';
import { initCBA } from './cba-engine';
import { makeLeagueState } from './test-helpers';

describe('labor relations', () => {
  it('initializes labor state at a stable baseline', () => {
    const labor = initLaborState();

    expect(labor.unionSatisfaction).toBeGreaterThan(0);
    expect(labor.activeStoppage).toBeNull();
  });

  it('selects a veteran star as union leader', () => {
    const game = makeLeagueState('regular_season', 5);
    const player = Object.values(game.players)[0]!;
    player.ovr = 95;
    player.yearsExp = 8;
    player.personality.ambition = 9;

    const leader = getUnionLeader(game);

    expect(leader?.id).toBe(player.id);
  });

  it('drops satisfaction when tagged players are holding out', () => {
    const game = makeLeagueState('regular_season', 5);
    const team = Object.values(game.teams)[0]!;
    const player = team.roster[0]!;
    player.holdout = true;
    team.franchiseTag973 = {
      playerId: player.id,
      playerName: player.name,
      pos: player.pos,
      salary: 20,
      year: game.year,
      reaction: 'holdout',
    };

    const updated = updateUnionSatisfaction(initLaborState(), game);

    expect(updated.unionSatisfaction).toBeLessThan(60);
  });

  it('triggers a holdout wave when satisfaction is very low', () => {
    const stoppage = checkWorkStoppage({
      ...initLaborState(),
      unionSatisfaction: 35,
      activeStoppage: null,
    }, initCBA(2026));

    expect(stoppage.triggered).toBe(true);
    expect(stoppage.stoppage?.type).toBe('holdout_wave');
  });

  it('triggers a practice boycott at extreme dissatisfaction', () => {
    const stoppage = checkWorkStoppage({
      ...initLaborState(),
      unionSatisfaction: 20,
      activeStoppage: null,
    }, initCBA(2026));

    expect(stoppage.stoppage?.type).toBe('practice_boycott');
    expect(stoppage.playerOvrPenalty).toBeLessThan(0);
  });

  it('mirrors cba lockouts into labor stoppages', () => {
    const cba = initCBA(2026);
    cba.status = 'lockout';

    const stoppage = checkWorkStoppage(initLaborState(), cba);

    expect(stoppage.stoppage?.type).toBe('lockout');
  });

  it('resolves active stoppages and clears penalties', () => {
    const labor = {
      ...initLaborState(),
      activeStoppage: {
        type: 'practice_boycott' as const,
        severity: 2 as const,
        startWeek: 8,
        resolvedWeek: null,
        affectedTeams: ['afce1'],
        moralePenalty: -6,
      },
    };

    const resolved = resolveWorkStoppage(labor, makeLeagueState('regular_season', 8));

    expect(resolved.resolved).toBe(true);
    expect(resolved.labor.activeStoppage).toBeNull();
  });

  it('generates narrative labor events during tense periods', () => {
    const game = makeLeagueState('offseason', 1);
    const labor = {
      ...initLaborState(),
      unionSatisfaction: 30,
    };

    const event = generateLaborEvent(labor, game);

    expect(event).not.toBeNull();
    expect(['union_statement', 'owner_response', 'media_leak', 'mediation_call']).toContain(event?.type);
  });
});
