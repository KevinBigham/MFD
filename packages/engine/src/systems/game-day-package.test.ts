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

function makeResultWithPlayerLines(): GameResult {
  // afce1-wr2 is the actual top performer (more yards + a TD); afce1-wr1 is
  // first in roster order but has poor stats. afce1-s outperforms the DL/LB
  // by stat output. Used to prove buildTopPerformers picks by performance,
  // not roster position.
  const base = {
    id: 'game-2026-1-afce1-afce2',
    homeTeamId: 'afce1',
    awayTeamId: 'afce2',
    homeScore: 27,
    awayScore: 13,
    week: 1,
    year: 2026,
    overtime: false,
    mvpPlayerId: 'afce1-qb',
  } as const;
  return {
    ...base,
    stats: {
      afce1: {
        totalYards: 380,
        passingYards: 280,
        rushingYards: 100,
        turnovers: 1,
        sacks: 3,
        thirdDownConversions: 6,
        thirdDownAttempts: 12,
        timeOfPossession: 32,
        playerLines: [
          { playerId: 'afce1-qb', name: 'afce1-qb Player', pos: 'QB', passAtt: 32, passComp: 22, passYds: 280, passTD: 2, passINT: 1 },
          { playerId: 'afce1-rb', name: 'afce1-rb Player', pos: 'RB', rushAtt: 18, rushYds: 64, rushTD: 0, rec: 1, recYds: 6 },
          { playerId: 'afce1-wr1', name: 'afce1-wr1 Player', pos: 'WR', rec: 2, recYds: 18, recTD: 0, targets: 4 },
          { playerId: 'afce1-wr2', name: 'afce1-wr2 Player', pos: 'WR', rec: 7, recYds: 142, recTD: 2, targets: 9 },
          { playerId: 'afce1-te', name: 'afce1-te Player', pos: 'TE', rec: 3, recYds: 32, recTD: 0, targets: 5 },
          { playerId: 'afce1-dl', name: 'afce1-dl Player', pos: 'DL', tackles: 4, sacks: 1 },
          { playerId: 'afce1-lb', name: 'afce1-lb Player', pos: 'LB', tackles: 6, sacks: 0 },
          { playerId: 'afce1-cb', name: 'afce1-cb Player', pos: 'CB', tackles: 3, defINT: 0 },
          { playerId: 'afce1-s', name: 'afce1-s Player', pos: 'S', tackles: 5, defINT: 2, sacks: 1 },
        ],
      },
      afce2: {
        totalYards: 260,
        passingYards: 180,
        rushingYards: 80,
        turnovers: 3,
        sacks: 1,
        thirdDownConversions: 4,
        thirdDownAttempts: 13,
        timeOfPossession: 28,
        playerLines: [],
      },
    },
  } as unknown as GameResult;
}

describe('buildGameDayPackage', () => {
  it('builds a deterministic postgame package without ambient random calls', () => {
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
      throw new Error('ambient random is forbidden');
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

  it('picks top performers by stat output, not roster order', () => {
    // Regression: pre-fix buildTopPerformers used `team.roster.find()` which
    // returned the first player matching a position group (always afce1-wr1
    // for the skill slot, always afce1-dl for the defender slot). After fix,
    // it scores playerLines and picks the actual leader. Here afce1-wr2 has
    // 142 rec yds + 2 TDs while afce1-wr1 has 18 yds + 0 TDs, and afce1-s
    // has 2 INTs + a sack while afce1-dl has 1 sack + 4 tackles.
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const opponent = game.teams.afce2!;
    const result = makeResultWithPlayerLines();

    const summary = buildWeeklySummary({
      team,
      opponent,
      result,
      year: 2026,
      week: 1,
      phase: 'regular_season',
      ownerDelta: 2,
      injuries: [],
      notes: [],
    });

    const pkg = buildGameDayPackage({
      team,
      opponent,
      result,
      summary,
      hooks: [],
      activeArcs: [],
    });

    const ids = pkg.topPerformers.map((entry) => entry.playerId);
    expect(ids).toContain('afce1-wr2');
    expect(ids).not.toContain('afce1-wr1');
    expect(ids).toContain('afce1-s');
    expect(ids).not.toContain('afce1-dl');
  });
});
