import { describe, expect, it } from 'vitest';
import { advanceStoryArcs, buildWeeklySummary } from '../index';
import { makeLeagueState } from './test-helpers';

describe('advanceStoryArcs', () => {
  it('starts and resolves a win streak arc from team momentum', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const opponent = game.teams.afce2!;
    team.wins = 5;
    team.losses = 1;
    team.streak = 3;

    const started = advanceStoryArcs(game, {
      team,
      opponent,
      summary: buildWeeklySummary({
        team,
        opponent,
        result: null,
        year: 2026,
        week: 6,
        phase: 'regular_season',
        ownerDelta: 2,
        injuries: [],
        notes: ['Momentum is building'],
      }),
    });

    expect(started.some((arc) => arc.template === 'win_streak')).toBe(true);

    team.streak = 0;
    const resolved = advanceStoryArcs({ ...game, narrativeState: { ...game.narrativeState, activeArcs: started } }, { team, opponent, summary: null });
    expect(resolved.some((arc) => arc.template === 'win_streak')).toBe(false);
  });

  it('tracks hot seat, breakout player, injury crisis, and revenge game arcs', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const opponent = game.teams.afce2!;
    const qb = team.roster.find((player) => player.id === 'afce1-qb')!;
    const rb = team.roster.find((player) => player.id === 'afce1-rb')!;

    team.owner.approval = 24;
    team.ownerMood = 24;
    team.ownerPatience80 = 18;
    team.streak = -1;
    qb.age = 23;
    qb.pot = qb.ovr + 9;
    qb.injury = { type: 'ankle', severity: 'out', gamesOut: 2 };
    rb.injury = { type: 'hamstring', severity: 'doubtful', gamesOut: 1 };

    const summary = buildWeeklySummary({
      team,
      opponent,
      result: {
        id: 'loss-arc',
        homeTeamId: team.id,
        awayTeamId: opponent.id,
        homeScore: 20,
        awayScore: 24,
        week: 7,
        year: 2026,
        overtime: false,
        mvpPlayerId: qb.id,
        stats: {
          [team.id]: { totalYards: 360, passingYards: 270, rushingYards: 90, turnovers: 2, sacks: 2, thirdDownConversions: 5, thirdDownAttempts: 12, timeOfPossession: 29 },
          [opponent.id]: { totalYards: 340, passingYards: 250, rushingYards: 90, turnovers: 1, sacks: 3, thirdDownConversions: 6, thirdDownAttempts: 13, timeOfPossession: 31 },
        },
      },
      year: 2026,
      week: 7,
      phase: 'regular_season',
      ownerDelta: -5,
      injuries: [],
      notes: ['Close loss to a rival'],
    });

    team.rivals[opponent.id] = { heat: 6 };
    const arcs = advanceStoryArcs(game, { team, opponent, summary });

    expect(arcs.some((arc) => arc.template === 'hot_seat')).toBe(true);
    expect(arcs.some((arc) => arc.template === 'breakout_player' && arc.playerId === qb.id)).toBe(true);
    expect(arcs.some((arc) => arc.template === 'injury_crisis')).toBe(true);
    expect(arcs.some((arc) => arc.template === 'revenge_game' && arc.teamId === team.id)).toBe(true);
  });
});
