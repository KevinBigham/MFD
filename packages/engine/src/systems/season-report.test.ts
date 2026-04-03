import { describe, expect, it } from 'vitest';
import { generateSeasonReport } from './season-report';
import { makeLeagueState } from './test-helpers';

describe('season report', () => {
  it('gives championship teams an A+ overall grade', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    team.wins = 15;
    team.losses = 3;
    game.franchiseHistory.push({
      year: 2026,
      teamId: team.id,
      wins: 15,
      losses: 3,
      ties: 0,
      record: '15-3',
      pointDifferential: 170,
      playoffFinish: 'champion',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    });

    const report = generateSeasonReport(game, team.id);

    expect(report.overallGrade).toBe('A+');
  });

  it('creates all 10 report sections', () => {
    const game = makeLeagueState('offseason', 1);

    const report = generateSeasonReport(game, 'afce1');

    expect(report.sections).toHaveLength(10);
  });

  it('grades offense using points per game', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    team.seasonStats.gamesPlayed = 18;
    team.seasonStats.pointsFor = 540;

    const report = generateSeasonReport(game, team.id);
    const offense = report.sections.find((section) => section.title === 'Offense');

    expect(offense?.grade).toBe('A');
  });

  it('grades the draft class using starter production', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    for (const player of team.roster.slice(0, 3)) {
      player.draftYear = game.year;
      player.isStarter = true;
    }

    const report = generateSeasonReport(game, team.id);
    const draft = report.sections.find((section) => section.title === 'Draft Class');

    expect(draft?.grade).toBe('A');
  });

  it('grades financial health using cap flexibility', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    team.capSpace = 28;
    team.deadCap = 2;

    const report = generateSeasonReport(game, team.id);
    const finance = report.sections.find((section) => section.title === 'Financial Health');

    expect(finance?.grade).toBe('A');
  });
});
