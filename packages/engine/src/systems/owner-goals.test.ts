import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  evaluateOwnerMandates,
  installOwnerMandates,
  refreshOwnerMandates,
} from './owner-goals';
import { makeLeagueState } from './test-helpers';

const OWNER_GOALS_SOURCE = readFileSync(new URL('./owner-goals.ts', import.meta.url), 'utf8');
const STALE_OWNER_AGM_NOTE_COPY =
  /\b(?:cap-health readout|weekly standards|player-development proof|owner trust|competitive standard|extra patience|cap space can cover|game-plan checks)\b/i;
const STALE_OWNER_PROMISE_TIER_COPY =
  /\b(?:Floor mandate|Target mandate|Ceiling mandate|Missing this floor|Meeting this target|Delivering this ceiling)\b/i;

describe('owner mandates', () => {
  it('installs selected setup goals as durable floor/target/ceiling mandates and owner handshakes', () => {
    const game = makeLeagueState('regular_season', 1);

    const mandates = installOwnerMandates(
      game,
      'afce1',
      ['winning_record', 'cap_health', 'championship'],
      'marcus_webb',
    );

    expect(mandates.map((mandate) => [mandate.goalId, mandate.slot])).toEqual([
      ['winning_record', 'floor'],
      ['cap_health', 'target'],
      ['championship', 'ceiling'],
    ]);
    expect(game.ownerMandates).toHaveLength(3);
    expect(game.handshakes.filter((handshake) => handshake.condition.metric === 'owner_mandate')).toHaveLength(3);
    expect(game.handshakes.find((handshake) => handshake.targetId === game.ownerMandates![0]!.id)?.promiseText).toContain('Minimum promise');
    expect(game.handshakes.find((handshake) => handshake.targetId === game.ownerMandates![1]!.id)?.promiseText).toContain('Main promise');
    expect(game.handshakes.find((handshake) => handshake.targetId === game.ownerMandates![2]!.id)?.promiseText).toContain('Stretch promise');
    expect(game.handshakes.find((handshake) => handshake.targetId === game.ownerMandates![0]!.id)?.consequence).toContain('cuts owner approval, owner patience, and front-office reputation');
    expect(game.handshakes.find((handshake) => handshake.targetId === game.ownerMandates![1]!.id)?.consequence).toContain('raises owner approval and front-office reputation');
    expect(game.handshakes.find((handshake) => handshake.targetId === game.ownerMandates![2]!.id)?.consequence).toContain('creates the largest owner reward');
    expect(game.ownerMandates![1]!.progress.agmNote).toContain('Marcus Webb');
    expect(OWNER_GOALS_SOURCE).not.toMatch(STALE_OWNER_PROMISE_TIER_COPY);
  });

  it('keeps AGM owner mandate notes specific about actions and consequences', () => {
    const marcusGame = makeLeagueState('regular_season', 1);
    const coachDGame = makeLeagueState('regular_season', 1);
    const sandraGame = makeLeagueState('regular_season', 1);

    installOwnerMandates(marcusGame, 'afce1', ['cap_health'], 'marcus_webb');
    installOwnerMandates(coachDGame, 'afce1', ['winning_record'], 'coach_d_hardaway');
    installOwnerMandates(sandraGame, 'afce1', ['draft_well'], 'sandra_chen');

    expect(marcusGame.ownerMandates![0]!.progress.agmNote).toContain('cap space against injury, extension, and trade fixes');
    expect(coachDGame.ownerMandates![0]!.progress.agmNote).toContain('weekly practice reps and saved Game Plan calls');
    expect(sandraGame.ownerMandates![0]!.progress.agmNote).toContain('young players are earning snaps, roles, and development time');
    expect(OWNER_GOALS_SOURCE).not.toMatch(STALE_OWNER_AGM_NOTE_COPY);
  });

  it('uses actual postseason finish for championship instead of raw wins', () => {
    const game = makeLeagueState('regular_season', 18);
    const team = game.teams.afce1!;
    team.wins = 15;
    team.losses = 2;
    const approvalBefore = team.owner.approval;
    installOwnerMandates(game, team.id, ['championship'], 'coach_d_hardaway');
    game.franchiseHistory.push({
      year: game.year,
      teamId: team.id,
      wins: team.wins,
      losses: team.losses,
      ties: 0,
      record: '15-2',
      pointDifferential: 120,
      playoffFinish: 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    });

    evaluateOwnerMandates(game, team.id);

    expect(game.ownerMandates![0]!.status).toBe('missed');
    expect(game.ownerMandates![0]!.evaluation?.summary).toContain('missed');
    expect(team.owner.approval).toBeLessThan(approvalBefore - 12);
  });

  it('rewards target and ceiling results and records the AGM adjustment', () => {
    const game = makeLeagueState('regular_season', 18);
    const team = game.teams.afce1!;
    team.wins = 10;
    team.losses = 7;
    team.capSpace = 42;
    team.deadCap = 3;
    const ownerRepBefore = game.frontOffice.reputation.owner;
    installOwnerMandates(game, team.id, ['winning_record', 'cap_health'], 'marcus_webb');

    evaluateOwnerMandates(game, team.id);

    const capMandate = game.ownerMandates!.find((mandate) => mandate.goalId === 'cap_health')!;
    expect(capMandate.status).toBe('exceeded');
    expect(capMandate.evaluation?.ownerReputationDelta).toBeGreaterThan(5);
    expect(capMandate.evaluation?.agmAdjustment).toContain('Marcus Webb');
    expect(game.frontOffice.reputation.owner).toBeGreaterThan(ownerRepBefore);
  });

  it('refreshes losing-streak progress from actual schedule results', () => {
    const game = makeLeagueState('regular_season', 4);
    const team = game.teams.afce1!;
    installOwnerMandates(game, team.id, ['no_losing_streak'], 'coach_d_hardaway');
    game.schedule = [
      { week: 1, games: [{ homeTeamId: team.id, awayTeamId: 'afce2', result: result(team.id, 'afce2', 10, 21, 1, game.year) }] },
      { week: 2, games: [{ homeTeamId: team.id, awayTeamId: 'afce2', result: result(team.id, 'afce2', 17, 24, 2, game.year) }] },
      { week: 3, games: [{ homeTeamId: team.id, awayTeamId: 'afce2', result: result(team.id, 'afce2', 14, 20, 3, game.year) }] },
    ];

    refreshOwnerMandates(game, team.id);

    expect(game.ownerMandates![0]!.progress.label).toContain('3-game');
    expect(game.ownerMandates![0]!.progress.status).toBe('at_risk');
  });
});

function result(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number, week: number, year: number) {
  return {
    id: `game-${week}`,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    week,
    year,
    overtime: false,
    mvpPlayerId: null,
    stats: {},
    playerMatchupEvents: [],
  };
}
