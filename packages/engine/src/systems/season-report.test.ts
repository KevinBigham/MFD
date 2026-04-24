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

  it('grades a 4-13 missed-playoffs season as F, not B', () => {
    // Regression: pre-fix the predicate was `playoffFinish !== 'missed'`, and
    // since the canonical missed string is 'missed_playoffs', every team that
    // missed the postseason silently fell through to the 'B' branch. The same
    // bug applied to the default sentinel, which used 'missed' and triggered
    // the bogus 'B' for any team without a franchiseHistory entry.
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    team.wins = 4;
    team.losses = 13;
    game.franchiseHistory.push({
      year: 2026,
      teamId: team.id,
      wins: 4,
      losses: 13,
      ties: 0,
      record: '4-13',
      pointDifferential: -150,
      playoffFinish: 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    });

    const report = generateSeasonReport(game, team.id);

    expect(report.overallGrade).toBe('F');
  });

  it('uses the missed_playoffs default sentinel when no history exists', () => {
    // Regression: the default sentinel was 'missed' which never matched the
    // canonical schema and fell through to the bogus 'B'. Default must be
    // 'missed_playoffs' so a 3-14 team with no history still grades as 'F'.
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    team.wins = 3;
    team.losses = 14;

    const report = generateSeasonReport(game, team.id);

    expect(report.overallGrade).toBe('F');
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

  it('injects rebuild exit copy when a rebuild breaks through', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    game.franchiseHistory.push({
      year: 2026,
      teamId: team.id,
      wins: 9,
      losses: 8,
      ties: 0,
      record: '9-8',
      pointDifferential: 42,
      playoffFinish: 'regular_season',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    });
    game.storyArcs = [{
      id: `rebuild-${team.id}-2023`,
      type: 'rebuild',
      teamId: team.id,
      startYear: 2023,
      endYear: 2026,
      currentStage: 'breakthrough',
      stageHistory: [
        { stage: 'breakthrough', year: 2026, note: 'Breakthrough', narrativeText: 'The rebuild hit daylight.' },
      ],
    }];

    const report = generateSeasonReport(game, team.id);

    expect(report.sections.some((section) => section.summary.includes('rebuild'))).toBe(true);
  });

  it('injects contender-window copy when the window extends', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    game.franchiseHistory.push({
      year: 2026,
      teamId: team.id,
      wins: 12,
      losses: 5,
      ties: 0,
      record: '12-5',
      pointDifferential: 96,
      playoffFinish: 'conference_final_exit',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    });
    game.storyArcs = [{
      id: `contender_window-${team.id}-2025`,
      type: 'contender_window',
      teamId: team.id,
      startYear: 2025,
      endYear: null,
      currentStage: 'window_extended',
      stageHistory: [
        { stage: 'window_extended', year: 2026, note: 'Window extended', narrativeText: 'The window held open.' },
      ],
    }];

    const report = generateSeasonReport(game, team.id);

    expect(report.sections.some((section) => section.summary.includes('contention window'))).toBe(true);
  });

  it('injects dynasty-breakthrough copy when a run hardens into a dynasty', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    game.franchiseHistory.push({
      year: 2026,
      teamId: team.id,
      wins: 14,
      losses: 3,
      ties: 0,
      record: '14-3',
      pointDifferential: 142,
      playoffFinish: 'champion',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    });
    game.storyArcs = [{
      id: `dynasty_run-${team.id}-2024`,
      type: 'dynasty_run',
      teamId: team.id,
      startYear: 2024,
      endYear: null,
      currentStage: 'dynasty_breakthrough',
      stageHistory: [
        { stage: 'dynasty_breakthrough', year: 2026, note: 'Dynasty breakthrough', narrativeText: 'The ring count changed the way the league talked about you.' },
      ],
    }];

    const report = generateSeasonReport(game, team.id);

    expect(report.sections.some((section) => section.summary.includes('dynasty'))).toBe(true);
  });

  it('builds the outlook section without mutating a frozen team roster', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce1!;
    team.wins = 8;
    team.losses = 9;
    const originalOrder = team.roster.map((player) => player.id);
    Object.freeze(team.roster);

    expect(() => generateSeasonReport(game, team.id)).not.toThrow();
    expect(team.roster.map((player) => player.id)).toEqual(originalOrder);
  });
});
