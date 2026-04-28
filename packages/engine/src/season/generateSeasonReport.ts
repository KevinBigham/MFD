import type {
  AwardResult,
  GameResult,
  GameState,
  Player,
  PlayoffRound,
  Team,
  TradeOfferAsset,
} from '../types';
import type {
  AwardReport,
  GenerateSeasonReportOptions,
  GradingAwardKey,
  InjuryImpactEntry,
  PlayoffGameReport,
  PlayoffRoundReport,
  SeasonReport,
  StatLeaderEntry,
  StatLeaderKey,
  StorylineReportEntry,
  TradeReportEntry,
} from './types';

const FINAL_PHASES = ['offseason', 'free_agency', 'draft', 'post_draft', 'training_camp'] as const;
const DIVISION_ORDER = ['East', 'North', 'South', 'West'];
const PLAYOFF_ROUND_ORDER: PlayoffRound[] = ['wild_card', 'divisional', 'conference', 'super_bowl'];
const AWARD_MAP: Record<string, GradingAwardKey> = {
  mvp: 'MVP',
  opoy: 'OPOY',
  dpoy: 'DPOY',
  oroy: 'OROY',
  droy: 'DROY',
  coach_of_year: 'COY',
  coy: 'COY',
};
const AWARD_KEYS: GradingAwardKey[] = ['MVP', 'OPOY', 'DPOY', 'OROY', 'DROY', 'COY'];
const STAT_FIELDS: Array<[StatLeaderKey, keyof Player['stats']]> = [
  ['passingYards', 'passYds'],
  ['passingTds', 'passTD'],
  ['interceptions', 'passINT'],
  ['rushingYards', 'rushYds'],
  ['rushingTds', 'rushTD'],
  ['receivingYards', 'recYds'],
  ['receivingTds', 'recTD'],
  ['sacks', 'sacks'],
  ['tackles', 'tackles'],
  ['defensiveInterceptions', 'defINT'],
];

function assertFinalSeasonState(game: GameState): void {
  if (!FINAL_PHASES.includes(game.phase as (typeof FINAL_PHASES)[number])) {
    throw new Error(`generateSeasonReport requires a final season state; received phase "${game.phase}" at week ${game.week}.`);
  }
}

function teamName(team: Team): string {
  return `${team.city} ${team.name}`.trim();
}

function teamRecord(game: GameState, teamId: string | null): string | null {
  if (!teamId) return null;
  const team = game.teams[teamId];
  if (!team) return null;
  return `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`;
}

function compareTeamIds(a: string, b: string): number {
  return a.localeCompare(b);
}

function completedSeasonYear(game: GameState): number {
  const years = [
    game.playoffBracket?.season,
    ...game.awardsHistory.map((entry) => entry.year),
    ...game.franchiseHistory.map((entry) => entry.year),
    ...game.schedule.flatMap((week) => week.games.map((matchup) => matchup.result?.year)),
  ].filter((year): year is number => Number.isFinite(year));

  if (years.length > 0) return Math.max(...years);
  return game.year > 1 ? game.year - 1 : game.year;
}

function pointDifferential(team: Team): number {
  if (Number.isFinite(team.seasonStats.pointDifferential)) return team.seasonStats.pointDifferential;
  return team.seasonStats.pointsFor - team.seasonStats.pointsAgainst;
}

function buildFinalStandings(game: GameState): SeasonReport['finalStandings'] {
  const standings = Object.values(game.teams)
    .map((team) => ({
      division: `${team.conference} ${team.division}`,
      team: {
        teamId: team.id,
        teamName: teamName(team),
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        pointDifferential: pointDifferential(team),
      },
      conferenceOrder: team.conference === 'AFC' ? 0 : 1,
      divisionOrder: DIVISION_ORDER.indexOf(team.division),
    }))
    .sort((a, b) =>
      a.conferenceOrder - b.conferenceOrder ||
      a.divisionOrder - b.divisionOrder ||
      b.team.wins - a.team.wins ||
      a.team.losses - b.team.losses ||
      b.team.pointDifferential - a.team.pointDifferential ||
      compareTeamIds(a.team.teamId, b.team.teamId));

  const divisions: SeasonReport['finalStandings'] = [];
  for (const row of standings) {
    const existing = divisions.find((division) => division.division === row.division);
    if (existing) {
      existing.teams.push(row.team);
    } else {
      divisions.push({ division: row.division, teams: [row.team] });
    }
  }

  return divisions;
}

function playoffGame(matchup: { homeTeamId: string; awayTeamId: string; winnerTeamId: string | null; result: GameResult | null }): PlayoffGameReport {
  return {
    homeTeamId: matchup.homeTeamId,
    awayTeamId: matchup.awayTeamId,
    homeScore: matchup.result?.homeScore ?? 0,
    awayScore: matchup.result?.awayScore ?? 0,
    winnerTeamId: matchup.winnerTeamId,
  };
}

function buildPlayoffs(game: GameState): SeasonReport['playoffs'] {
  const matchups = game.playoffBracket?.matchups ?? [];
  const rounds: PlayoffRoundReport[] = PLAYOFF_ROUND_ORDER
    .map((round) => ({
      round,
      games: matchups
        .filter((matchup) => matchup.round === round)
        .sort((a, b) =>
          a.week - b.week ||
          a.conference.localeCompare(b.conference) ||
          a.homeTeamId.localeCompare(b.homeTeamId) ||
          a.awayTeamId.localeCompare(b.awayTeamId))
        .map(playoffGame),
    }))
    .filter((round) => round.games.length > 0);

  return { rounds };
}

function numericStats(player: Player): Record<string, number> {
  return {
    passYds: player.stats.passYds,
    passTD: player.stats.passTD,
    passINT: player.stats.passINT,
    rushYds: player.stats.rushYds,
    rushTD: player.stats.rushTD,
    rec: player.stats.rec,
    recYds: player.stats.recYds,
    recTD: player.stats.recTD,
    sacks: player.stats.sacks,
    tackles: player.stats.tackles,
    defINT: player.stats.defINT,
  };
}

function buildSuperBowl(game: GameState): SeasonReport['superBowl'] {
  const superBowl = game.playoffBracket?.matchups
    .find((matchup) => matchup.round === 'super_bowl') ?? null;
  const winnerTeamId = superBowl?.winnerTeamId ?? game.playoffBracket?.championTeamId ?? null;
  const winner = winnerTeamId ? game.teams[winnerTeamId] ?? null : null;
  const mvp = superBowl?.result?.mvpPlayerId ? game.players[superBowl.result.mvpPlayerId] ?? null : null;

  return {
    winnerTeamId,
    winnerName: winner ? teamName(winner) : null,
    mvp: mvp
      ? {
        playerId: mvp.id,
        playerName: mvp.name,
        teamId: mvp.teamId,
        stats: numericStats(mvp),
      }
      : null,
    score: superBowl?.result ? `${superBowl.result.homeScore}-${superBowl.result.awayScore}` : null,
  };
}

function emptyAward(): AwardReport {
  return {
    winnerName: null,
    winnerTeamId: null,
    keyStats: {},
    teamRecord: null,
  };
}

function buildAwards(game: GameState, seasonYear: number): SeasonReport['awards'] {
  const awards: SeasonReport['awards'] = {
    MVP: emptyAward(),
    OPOY: emptyAward(),
    DPOY: emptyAward(),
    OROY: emptyAward(),
    DROY: emptyAward(),
    COY: emptyAward(),
  };
  const latest = [...game.awardsHistory]
    .filter((entry) => entry.year <= seasonYear)
    .sort((a, b) => b.year - a.year)[0];
  if (!latest) return awards;

  for (const result of latest.awards) {
    const key = AWARD_MAP[result.awardId];
    if (!key) continue;
    awards[key] = {
      winnerName: result.winnerName,
      winnerTeamId: result.winnerTeamId,
      keyStats: { ...result.winnerStats },
      teamRecord: teamRecord(game, result.winnerTeamId),
    };
  }

  for (const key of AWARD_KEYS) {
    awards[key] ??= emptyAward();
  }
  return awards;
}

function topPlayers(players: Player[], statField: keyof Player['stats']): StatLeaderEntry[] {
  return [...players]
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      value: Number(player.stats[statField] ?? 0),
    }))
    .sort((a, b) =>
      b.value - a.value ||
      a.playerName.localeCompare(b.playerName) ||
      a.playerId.localeCompare(b.playerId))
    .slice(0, 10);
}

function buildStatLeaders(game: GameState): SeasonReport['statLeaders'] {
  const players = Object.values(game.players);
  return Object.fromEntries(
    STAT_FIELDS.map(([key, field]) => [key, topPlayers(players, field)]),
  ) as SeasonReport['statLeaders'];
}

function assetPlayers(assets: TradeOfferAsset[]): string[] {
  return assets
    .filter((asset) => asset.type === 'player')
    .map((asset) => asset.description || asset.playerId || 'unknown player')
    .sort();
}

function assetPicks(assets: TradeOfferAsset[]): string[] {
  return assets
    .filter((asset) => asset.type === 'pick' || asset.type === 'conditional_pick')
    .map((asset) => asset.description || asset.pickId || asset.conditionalPickId || 'unknown pick')
    .sort();
}

function buildTrades(game: GameState): TradeReportEntry[] {
  const deadlineDeals: TradeReportEntry[] = (game.tradeDeadlineState?.completedDeals ?? []).map((deal) => ({
    week: null,
    teams: [...deal.teams].sort(),
    players: [...deal.players].sort(),
    picks: [...deal.picks].sort(),
    summary: deal.narrative,
  }));

  const acceptedProposals: TradeReportEntry[] = (game.activeProposals ?? [])
    .filter((proposal) => proposal.status === 'accepted')
    .map((proposal) => {
      const assets = [...proposal.offering, ...proposal.requesting];
      return {
        week: null,
        teams: [proposal.fromTeamId, proposal.toTeamId].sort(),
        players: assetPlayers(assets),
        picks: assetPicks(assets),
        summary: proposal.aiResponse || `Accepted trade between ${proposal.fromTeamId} and ${proposal.toTeamId}.`,
      };
    });

  const offseasonOffers: TradeReportEntry[] = (game.offseasonState?.tradeOffers ?? [])
    .filter((offer) => offer.status === 'accepted')
    .map((offer) => {
      const assets = [...offer.send, ...offer.receive];
      return {
        week: null,
        teams: [offer.fromTeamId, offer.toTeamId].sort(),
        players: assetPlayers(assets),
        picks: assetPicks(assets),
        summary: offer.summary,
      };
    });

  return [...deadlineDeals, ...acceptedProposals, ...offseasonOffers]
    .sort((a, b) =>
      (a.week ?? 99) - (b.week ?? 99) ||
      a.summary.localeCompare(b.summary) ||
      a.teams.join('|').localeCompare(b.teams.join('|')));
}

function buildInjuries(game: GameState): SeasonReport['injuries'] {
  const bySeverity: SeasonReport['injuries']['bySeverity'] = {
    questionable: 0,
    doubtful: 0,
    out: 0,
    ir: 0,
  };
  const mostImpactful: InjuryImpactEntry[] = [];

  for (const player of Object.values(game.players)) {
    if (!player.injury) continue;
    bySeverity[player.injury.severity] += 1;
    mostImpactful.push({
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      injuryType: player.injury.type,
      severity: player.injury.severity,
      gamesOut: player.injury.gamesOut,
      impactScore: Number((player.injury.gamesOut * 10 + player.injury.ratingPenalty + player.ovr / 10).toFixed(2)),
    });
  }

  mostImpactful.sort((a, b) =>
    b.impactScore - a.impactScore ||
    b.gamesOut - a.gamesOut ||
    a.playerName.localeCompare(b.playerName) ||
    a.playerId.localeCompare(b.playerId));

  return {
    bySeverity,
    mostImpactful: mostImpactful.slice(0, 5),
  };
}

function buildStorylines(game: GameState, seasonYear: number): StorylineReportEntry[] {
  const dynastyEvents: StorylineReportEntry[] = (game.dynastyTimeline ?? [])
    .filter((entry) => entry.year === seasonYear)
    .map((entry) => ({
      type: entry.type,
      week: entry.week,
      year: entry.year,
      headline: entry.headline,
      summary: entry.importance,
      teamIds: [...entry.teamIds].sort(),
      playerIds: [...entry.playerIds].sort(),
    }));

  const weeklyEvents: StorylineReportEntry[] = (game.weekSummaries ?? [])
    .filter((entry) => entry.year === seasonYear && entry.headline)
    .map((entry) => ({
      type: 'weekly_summary',
      week: entry.week,
      year: entry.year,
      headline: entry.headline,
      summary: entry.notes.join(' '),
      teamIds: [entry.teamId, entry.opponentTeamId].filter((teamId): teamId is string => Boolean(teamId)).sort(),
      playerIds: entry.mvpPlayerId ? [entry.mvpPlayerId] : [],
    }));

  const arcEvents: StorylineReportEntry[] = (game.storyArcs ?? []).flatMap((arc) =>
    arc.stageHistory
      .filter((beat) => beat.year === seasonYear)
      .map((beat) => ({
        type: arc.type,
        week: null,
        year: beat.year,
        headline: beat.note,
        summary: beat.narrativeText,
        teamIds: [arc.teamId],
        playerIds: [],
      })));

  const newsEvents: StorylineReportEntry[] = (game.leagueNews ?? [])
    .filter((item) => item.year === seasonYear)
    .map((item) => ({
      type: item.type,
      week: item.week,
      year: item.year,
      headline: item.headline,
      summary: item.body,
      teamIds: [...item.teamIds].sort(),
      playerIds: [...item.playerIds].sort(),
    }));

  return [...dynastyEvents, ...weeklyEvents, ...arcEvents, ...newsEvents]
    .sort((a, b) =>
      a.year - b.year ||
      (a.week ?? 99) - (b.week ?? 99) ||
      a.type.localeCompare(b.type) ||
      a.headline.localeCompare(b.headline))
    .slice(0, 12);
}

export function generateSeasonReport(game: GameState, options: GenerateSeasonReportOptions): SeasonReport {
  assertFinalSeasonState(game);
  const seasonYear = completedSeasonYear(game);

  return {
    seed: game.seed,
    releaseTag: options.releaseTag,
    generatedAtSeason: {
      year: game.year,
      week: game.week,
      phase: game.phase,
      completedSeasonYear: seasonYear,
    },
    finalStandings: buildFinalStandings(game),
    playoffs: buildPlayoffs(game),
    superBowl: buildSuperBowl(game),
    awards: buildAwards(game, seasonYear),
    statLeaders: buildStatLeaders(game),
    trades: buildTrades(game),
    injuries: buildInjuries(game),
    storylines: buildStorylines(game, seasonYear),
  };
}

export type { SeasonReport } from './types';
