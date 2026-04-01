import { describe, expect, it, vi } from 'vitest';
import { buildGameDayPackage, buildWeeklySummary } from '../index';
import type { GameResult, Hook } from '../types';
import { makeLeagueState } from './test-helpers';

function makeResult(): GameResult {
  return {
    id: 'game-2026-1-afce1-afce2',
    homeTeamId: 'afce1',
    awayTeamId: 'afce2',
    homeScore: 31,
    awayScore: 17,
    week: 1,
    year: 2026,
    overtime: false,
    mvpPlayerId: 'afce1-qb',
    stats: {
      afce1: {
        totalYards: 412,
        passingYards: 286,
        rushingYards: 126,
        turnovers: 1,
        sacks: 4,
        thirdDownConversions: 7,
        thirdDownAttempts: 12,
        timeOfPossession: 33,
      },
      afce2: {
        totalYards: 305,
        passingYards: 214,
        rushingYards: 91,
        turnovers: 3,
        sacks: 1,
        thirdDownConversions: 4,
        thirdDownAttempts: 12,
        timeOfPossession: 27,
      },
    },
  };
}

describe('buildGameDayPackage', () => {
  it('builds a deterministic postgame package without using Math.random', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const opponent = game.teams.afce2!;
    const result = makeResult();
    team.wins = 1;
    team.streak = 3;
    team.ownerMood = 34;
    team.owner.approval = 34;

    const summary = buildWeeklySummary({
      team,
      opponent,
      result,
      year: 2026,
      week: 1,
      phase: 'regular_season',
      ownerDelta: -4,
      injuries: [{ playerId: 'afce1-rb', playerName: 'afce1-rb Player', severity: 'out', gamesOut: 2, type: 'hamstring' }],
      notes: ['2 turnovers forced', 'Won the third-down battle'],
    });
    const hooks: Hook[] = [
      { cat: 'owner', icon: 'alert-triangle', text: 'Owner mood is dangerously low. Your job is on the line.', priority: 92 },
      { cat: 'streak', icon: 'flame', text: '3-game win streak. The team is rolling.', priority: 70 },
    ];

    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random is forbidden');
    });

    const first = buildGameDayPackage({
      team,
      opponent,
      result,
      summary,
      hooks,
      activeArcs: [],
    });
    const second = buildGameDayPackage({
      team,
      opponent,
      result,
      summary,
      hooks,
      activeArcs: [],
    });

    randomSpy.mockRestore();

    expect(first).toEqual(second);
    expect(first.headline).toBe(summary.headline);
    expect(first.finalScore).toBe('31-17');
    expect(first.turningPoints.length).toBeGreaterThan(1);
    expect(first.topPerformers[0]?.playerId).toBe('afce1-qb');
    expect(first.injuryNotes).toContain('afce1-rb Player: hamstring (out, 2 games)');
    expect(first.pressConference.quotes.length).toBeGreaterThanOrEqual(2);
  });
});
