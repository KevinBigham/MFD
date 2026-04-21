import { describe, expect, it } from 'vitest';
import { getTeamContent, type AwardResult, type GameState } from '../index';
import { buildSeasonRecap } from './season-recap';
import { makeLeagueState } from './test-helpers';

function seedCompletedSeason(game: GameState, year: number, teamId = 'afce1') {
  const team = game.teams[teamId]!;
  const quarterback = team.roster.find((player) => player.pos === 'QB')!;
  const runningBack = team.roster.find((player) => player.pos === 'RB')!;
  const breakout = team.roster.find((player) => player.pos === 'WR')!;

  quarterback.stats.gamesPlayed = 17;
  quarterback.stats.passYds = 4_612;
  quarterback.stats.passTD = 36;
  runningBack.stats.gamesPlayed = 17;
  runningBack.stats.rushYds = 1_487;
  runningBack.stats.rushTD = 14;
  breakout.age = 24;
  breakout.ovr = 82;
  breakout.careerStats.previousSeasonOvr = 77;

  game.franchiseHistory = game.franchiseHistory.filter((entry) => entry.year !== year);
  game.franchiseHistory.push(
    {
      year,
      teamId: 'afce1',
      wins: 12,
      losses: 5,
      ties: 0,
      record: '12-5',
      pointDifferential: 88,
      playoffFinish: 'conference_final_exit',
      majorEvents: ['Won 8 of the last 10 games to seize control of the conference race.'],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: 'afce2',
      wins: 10,
      losses: 7,
      ties: 0,
      record: '10-7',
      pointDifferential: 15,
      playoffFinish: 'wild_card_exit',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: 'afce3',
      wins: 9,
      losses: 8,
      ties: 0,
      record: '9-8',
      pointDifferential: -4,
      playoffFinish: 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: 'afce4',
      wins: 6,
      losses: 11,
      ties: 0,
      record: '6-11',
      pointDifferential: -80,
      playoffFinish: 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
    {
      year,
      teamId: 'afcn1',
      wins: 13,
      losses: 4,
      ties: 0,
      record: '13-4',
      pointDifferential: 111,
      playoffFinish: 'champion',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    },
  );

  game.awardsHistory = [{
    year,
    awards: [makeAwardResult(team.id, quarterback.id, quarterback.name, 'mvp', 'MVP')],
    ceremony: {
      headline: 'Awards Night',
      intro: 'The hardware changed hands.',
      blurbs: [],
    },
  }];

  game.storyArcs = [{
    id: `contender_window-${team.id}-${year - 1}`,
    type: 'contender_window',
    teamId: team.id,
    startYear: year - 1,
    endYear: null,
    currentStage: 'window_extended',
    stageHistory: [
      {
        stage: 'window_extended',
        year,
        note: 'Window extended',
        narrativeText: 'The core group forced the window open for another shot.',
      },
    ],
  }];

  return { team, quarterback, runningBack, breakout };
}

function makeAwardResult(
  teamId: string,
  winnerId: string,
  winnerName: string,
  awardId: string,
  label: string,
): AwardResult {
  return {
    awardId,
    label,
    winnerId,
    winnerName,
    winnerTeamId: teamId,
    winnerTeam: teamId.toUpperCase(),
    winnerPosition: 'QB',
    winnerStats: { passYds: 4_612, passTD: 36 },
    score: 99,
    runnersUp: [],
    narrative: `${winnerName} took home ${label}.`,
  };
}

describe('buildSeasonRecap', () => {
  it('returns a recap for a team with a completed season', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team } = seedCompletedSeason(game, 2026);

    const recap = buildSeasonRecap(game, team.id);

    expect(recap).not.toBeNull();
    expect(recap?.teamId).toBe(team.id);
    expect(recap?.seasonYear).toBe(2026);
  });

  it('returns null when the current season is still in progress', () => {
    const game = makeLeagueState('regular_season', 8);
    game.year = 2027;
    seedCompletedSeason(game, 2026);

    const recap = buildSeasonRecap(game, 'afce1');

    expect(recap).toBeNull();
  });

  it('captures the archived record and division/conference finishes', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    seedCompletedSeason(game, 2026);

    const recap = buildSeasonRecap(game, 'afce1');

    expect(recap?.record).toBe('12-5');
    expect(recap?.wins).toBe(12);
    expect(recap?.losses).toBe(5);
    expect(recap?.divisionFinish).toBe(1);
    expect(recap?.conferenceFinish).toBe(2);
  });

  it('normalizes playoff finishes into recap-facing labels', () => {
    const expectations: Array<[string, string]> = [
      ['missed_playoffs', 'missed'],
      ['wild_card_exit', 'wild-card-loss'],
      ['divisional_exit', 'division-loss'],
      ['conference_final_exit', 'conf-loss'],
      ['super_bowl_runner_up', 'championship-loss'],
      ['champion', 'champion'],
    ];

    for (const [playoffFinish, expected] of expectations) {
      const game = makeLeagueState('offseason', 1);
      game.year = 2027;
      seedCompletedSeason(game, 2026);
      const entry = game.franchiseHistory.find((history) => history.teamId === 'afce1' && history.year === 2026)!;
      entry.playoffFinish = playoffFinish;

      expect(buildSeasonRecap(game, 'afce1')?.playoffResult).toBe(expected);
    }
  });

  it('uses the team passing and rushing leaders as top performers', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team, quarterback, runningBack } = seedCompletedSeason(game, 2026);
    const rivalQb = game.teams.afcn1!.roster.find((player) => player.pos === 'QB')!;
    rivalQb.stats.gamesPlayed = 17;
    rivalQb.stats.passYds = 5_101;

    const recap = buildSeasonRecap(game, team.id);

    expect(recap?.topPerformers.passingLeader?.playerId).toBe(quarterback.id);
    expect(recap?.topPerformers.rushingLeader?.playerId).toBe(runningBack.id);
  });

  it('pulls awards, motto, story, and breakout candidates from existing game state', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    const { team, breakout } = seedCompletedSeason(game, 2026);

    const recap = buildSeasonRecap(game, team.id);

    expect(recap?.teamAwards).toEqual(['MVP']);
    expect(recap?.teamMotto).toBe(getTeamContent(team.id)?.motto ?? null);
    expect(recap?.seasonStory).toContain('contention window');
    expect(recap?.breakoutCandidates.some((candidate) => candidate.playerId === breakout.id)).toBe(true);
  });

  it('is deterministic for the same game state and team', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    seedCompletedSeason(game, 2026);

    const left = buildSeasonRecap(game, 'afce1');
    const right = buildSeasonRecap(game, 'afce1');

    expect(left).toEqual(right);
  });
});
