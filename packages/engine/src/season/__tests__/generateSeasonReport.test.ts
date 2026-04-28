import { describe, expect, it } from 'vitest';
import { generateSeasonReport } from '../generateSeasonReport';
import { makeLeagueState } from '../../systems/test-helpers';
import type { AwardResult, GameResult, GameState, Player, PlayoffMatchup } from '../../types';

function setRecord(game: GameState, teamId: string, wins: number, losses: number, pointDifferential: number): void {
  const team = game.teams[teamId]!;
  team.wins = wins;
  team.losses = losses;
  team.ties = 0;
  team.seasonStats.gamesPlayed = wins + losses;
  team.seasonStats.pointsFor = 380 + pointDifferential;
  team.seasonStats.pointsAgainst = 380;
  team.seasonStats.pointDifferential = pointDifferential;
}

function award(id: string, label: string, player: Player, score: number): AwardResult {
  return {
    awardId: id,
    label,
    winnerId: player.id,
    winnerName: player.name,
    winnerTeamId: player.teamId,
    winnerTeam: player.teamId ?? 'N/A',
    winnerPosition: player.pos,
    winnerStats: {
      passYds: player.stats.passYds,
      passTD: player.stats.passTD,
      rushYds: player.stats.rushYds,
      recYds: player.stats.recYds,
      sacks: player.stats.sacks,
      tackles: player.stats.tackles,
      defINT: player.stats.defINT,
    },
    score,
    runnersUp: [],
    narrative: `${player.name} won ${label}.`,
  };
}

function result(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number, mvpPlayerId: string): GameResult {
  return {
    id: `${awayTeamId}-at-${homeTeamId}`,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    week: 22,
    year: 2026,
    overtime: false,
    mvpPlayerId,
    stats: {},
    playerMatchupEvents: [],
  };
}

function makeFinalSeasonState(): GameState {
  const game = makeLeagueState('offseason', 1);
  game.seed = 777;
  game.year = 2027;

  const records = [
    ['afce1', 14, 3, 120],
    ['afce2', 9, 8, 12],
    ['afcn1', 12, 5, 88],
    ['afcn2', 5, 12, -96],
    ['afcs1', 11, 6, 71],
    ['afcs2', 4, 13, -141],
    ['afcw1', 10, 7, 43],
    ['afcw2', 6, 11, -68],
    ['nfce1', 13, 4, 111],
    ['nfce2', 7, 10, -24],
    ['nfcn1', 12, 5, 86],
    ['nfcn2', 8, 9, -9],
    ['nfcs1', 9, 8, 18],
    ['nfcs2', 3, 14, -170],
    ['nfcw1', 10, 7, 44],
    ['nfcw2', 6, 11, -69],
  ] as const;
  for (const [teamId, wins, losses, pointDifferential] of records) {
    setRecord(game, teamId, wins, losses, pointDifferential);
  }

  for (const [index, player] of Object.values(game.players).entries()) {
    player.stats.passYds = player.pos === 'QB' ? 5200 - index : 0;
    player.stats.passTD = player.pos === 'QB' ? 46 - (index % 6) : 0;
    player.stats.passINT = player.pos === 'QB' ? 8 + (index % 11) : 0;
    player.stats.rushYds = player.pos === 'RB' ? 1700 - index : 120 + index;
    player.stats.rushTD = player.pos === 'RB' ? 19 - (index % 5) : 0;
    player.stats.recYds = player.pos === 'WR' || player.pos === 'TE' ? 1600 - index : 0;
    player.stats.recTD = player.pos === 'WR' || player.pos === 'TE' ? 15 - (index % 4) : 0;
    player.stats.sacks = player.pos === 'DL' || player.pos === 'LB' ? 18 - (index % 7) : 0;
    player.stats.tackles = player.pos === 'LB' || player.pos === 'S' ? 132 - (index % 13) : 20;
    player.stats.defINT = player.pos === 'CB' || player.pos === 'S' ? 7 - (index % 4) : 0;
  }

  const championQb = game.players['afce1-qb']!;
  const opoy = game.players['afce1-rb']!;
  const dpoy = game.players['afcn1-dl']!;
  const oroy = game.players['nfce1-wr1']!;
  const droy = game.players['nfcn1-cb']!;
  game.awardsHistory = [{
    year: 2026,
    awards: [
      award('mvp', 'MVP', championQb, 100),
      award('opoy', 'OPOY', opoy, 88),
      award('dpoy', 'DPOY', dpoy, 84),
      award('oroy', 'OROY', oroy, 75),
      award('droy', 'DROY', droy, 72),
      award('coach_of_year', 'COY', championQb, 71),
    ],
    ceremony: { headline: '2026 Awards Night', intro: 'Awards night.', blurbs: [] },
  }];

  const superBowl = result('afce1', 'nfce1', 31, 24, championQb.id);
  game.playoffBracket = {
    season: 2026,
    afc: [],
    nfc: [],
    championTeamId: 'afce1',
    matchups: [
      { id: 'wc-afc', round: 'wild_card', conference: 'AFC', week: 19, homeTeamId: 'afcn1', awayTeamId: 'afcw1', winnerTeamId: 'afcn1', result: result('afcn1', 'afcw1', 24, 17, game.players['afcn1-qb']!.id) },
      { id: 'sb', round: 'super_bowl', conference: 'NFL', week: 22, homeTeamId: 'afce1', awayTeamId: 'nfce1', winnerTeamId: 'afce1', result: superBowl },
    ] satisfies PlayoffMatchup[],
  };

  game.tradeDeadlineState = {
    isDeadlineWeek: false,
    minutesRemaining: 0,
    completedDeals: [{
      id: 'deal-1',
      teams: ['afce1', 'afce2'],
      players: ['afce2-wr1'],
      picks: ['2027 R2'],
      timestamp: 120,
      grade: 'B',
      splash: true,
      narrative: 'AFC East rivals swapped receiver help for a premium pick.',
    }],
    pendingOffers: [],
    urgencyLevel: 'calm',
    tickerMessages: [],
  };

  game.players['afce1-wr1']!.injury = {
    id: 'inj-1',
    type: 'acl',
    severity: 'ir',
    severityTier: 'season_ending',
    gamesOut: 12,
    gamesRecovered: 0,
    reinjuryRisk: 0.2,
    affectedRatings: ['speed'],
    ratingPenalty: 8,
    onIR: true,
  };

  game.dynastyTimeline = [{
    id: 'dynasty-1',
    year: 2026,
    week: 22,
    type: 'championship',
    headline: 'AFCE1 wins the title',
    importance: 'landmark',
    playerIds: [championQb.id],
    teamIds: ['afce1'],
  }];
  game.weekSummaries = [{
    id: 'week-18-afce1',
    year: 2026,
    week: 18,
    phase: 'regular_season',
    teamId: 'afce1',
    opponentTeamId: 'afcn1',
    opponentName: 'AFCN1 Club',
    result: 'win',
    teamScore: 30,
    opponentScore: 20,
    record: '14-3',
    headline: 'AFCE1 locks up the top seed',
    ownerDelta: 4,
    injuries: [],
    mvpPlayerId: championQb.id,
    notes: ['Late-season run held together.'],
  }];

  return game;
}

describe('generateSeasonReport grading harness output', () => {
  it('returns the required deterministic grading shape for a completed season', () => {
    const report = generateSeasonReport(makeFinalSeasonState(), { releaseTag: 'rc2' });

    expect(report.seed).toBe(777);
    expect(report.releaseTag).toBe('rc2');
    expect(report.finalStandings).toHaveLength(8);
    expect(report.playoffs.rounds.map((round) => round.round)).toContain('super_bowl');
    expect(report.superBowl.winnerName).toBe('AFCE1 Club');
    expect(Object.keys(report.awards)).toEqual(['MVP', 'OPOY', 'DPOY', 'OROY', 'DROY', 'COY']);
    expect(Object.keys(report.statLeaders)).toEqual([
      'passingYards',
      'passingTds',
      'interceptions',
      'rushingYards',
      'rushingTds',
      'receivingYards',
      'receivingTds',
      'sacks',
      'tackles',
      'defensiveInterceptions',
    ]);
    expect(report.trades).toHaveLength(1);
    expect(report.injuries.bySeverity.ir).toBe(1);
    expect(report.storylines.length).toBeGreaterThan(0);
  });

  it('is pure and deterministic for identical input state', () => {
    const state = makeFinalSeasonState();

    const first = generateSeasonReport(state, { releaseTag: 'rc2' });
    const second = generateSeasonReport(state, { releaseTag: 'rc2' });

    expect(second).toEqual(first);
  });

  it('sorts standings and stat leaders with stable limits', () => {
    const report = generateSeasonReport(makeFinalSeasonState(), { releaseTag: 'rc2' });
    const afcEast = report.finalStandings.find((division) => division.division === 'AFC East')!;

    expect(afcEast.teams.map((team) => team.teamId)).toEqual(['afce1', 'afce2']);
    expect(report.statLeaders.passingYards).toHaveLength(10);
    expect(report.statLeaders.passingYards[0]!.value).toBeGreaterThanOrEqual(report.statLeaders.passingYards[1]!.value);
  });

  it('handles empty trades, injuries, and missing awards explicitly', () => {
    const state = makeFinalSeasonState();
    state.tradeDeadlineState = undefined;
    state.activeProposals = [];
    state.awardsHistory = [];
    for (const player of Object.values(state.players)) {
      player.injury = null;
    }

    const report = generateSeasonReport(state, { releaseTag: 'rc2' });

    expect(report.trades).toEqual([]);
    expect(report.injuries.bySeverity).toEqual({
      questionable: 0,
      doubtful: 0,
      out: 0,
      ir: 0,
    });
    expect(report.awards.MVP.winnerName).toBeNull();
  });

  it('rejects a mid-season state instead of grading partial data', () => {
    const state = makeLeagueState('regular_season', 8);

    expect(() => generateSeasonReport(state, { releaseTag: 'rc2' })).toThrow(/final season state/i);
  });

  it('does not mutate frozen roster arrays while building sorted sections', () => {
    const state = makeFinalSeasonState();
    const originalOrders = Object.fromEntries(
      Object.values(state.teams).map((team) => [team.id, team.roster.map((player) => player.id)]),
    );
    for (const team of Object.values(state.teams)) {
      Object.freeze(team.roster);
    }

    expect(() => generateSeasonReport(state, { releaseTag: 'rc2' })).not.toThrow();
    for (const team of Object.values(state.teams)) {
      expect(team.roster.map((player) => player.id)).toEqual(originalOrders[team.id]);
    }
  });
});
