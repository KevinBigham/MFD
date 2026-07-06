import type {
  GameResult,
  GameState,
  PlayoffBracket,
  PlayoffMatchup,
  PlayoffRound,
  PlayoffSeed,
  Team,
} from '../types';
import { getRuleValueForYear } from './league-rules';
import { getRegularSeasonWeekCount } from './season-schedule';

function getWinPct(team: Team): number {
  const gamesPlayed = team.wins + team.losses + team.ties;
  return gamesPlayed === 0 ? 0 : (team.wins + team.ties * 0.5) / gamesPlayed;
}

function sortStandings(a: Team, b: Team): number {
  return getWinPct(b) - getWinPct(a)
    || (b.seasonStats?.pointDifferential ?? 0) - (a.seasonStats?.pointDifferential ?? 0)
    || a.id.localeCompare(b.id);
}

function toSeed(seed: number, team: Team, divisionWinner: boolean): PlayoffSeed {
  return {
    seed,
    teamId: team.id,
    conference: team.conference,
    division: team.division,
    divisionWinner,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    pointDifferential: team.seasonStats?.pointDifferential ?? 0,
  };
}

function seedsPerConference(game: GameState): number {
  if (!game.leagueRules) return 7;
  return Number(getRuleValueForYear(game.leagueRules, 'playoff_seeds_per_conf', game.year));
}

function firstPlayoffWeek(game: GameState): number {
  return getRegularSeasonWeekCount(game) + 1;
}

function createMatchup(round: PlayoffRound, conference: PlayoffMatchup['conference'], week: number, homeTeamId: string, awayTeamId: string): PlayoffMatchup {
  return {
    id: `${round}-${conference}-${week}-${homeTeamId}-${awayTeamId}`,
    round,
    conference,
    week,
    homeTeamId,
    awayTeamId,
    winnerTeamId: null,
    result: null,
  };
}

function buildConferenceSeeds(teams: Team[], seedCount: number): PlayoffSeed[] {
  const sorted = [...teams].sort(sortStandings);
  const divisionLeaders = new Map<string, Team>();

  for (const team of sorted) {
    const current = divisionLeaders.get(team.division);
    if (!current || sortStandings(team, current) < 0) {
      divisionLeaders.set(team.division, team);
    }
  }

  const divisionWinners = [...divisionLeaders.values()].sort(sortStandings);
  const wildcards = sorted
    .filter((team) => divisionLeaders.get(team.division)?.id !== team.id)
    .slice(0, Math.max(0, seedCount - divisionWinners.length))
    .sort(sortStandings);

  return [...divisionWinners, ...wildcards]
    .slice(0, seedCount)
    .map((team, index) => toSeed(index + 1, team, index < divisionWinners.length));
}

function buildInitialMatchups(seeds: PlayoffSeed[], conference: 'AFC' | 'NFC', week: number): PlayoffMatchup[] {
  if (seeds.length === 6) {
    return [
      createMatchup('wild_card', conference, week, seeds[2]!.teamId, seeds[5]!.teamId),
      createMatchup('wild_card', conference, week, seeds[3]!.teamId, seeds[4]!.teamId),
    ];
  }
  if (seeds.length === 8) {
    return [
      createMatchup('wild_card', conference, week, seeds[0]!.teamId, seeds[7]!.teamId),
      createMatchup('wild_card', conference, week, seeds[1]!.teamId, seeds[6]!.teamId),
      createMatchup('wild_card', conference, week, seeds[2]!.teamId, seeds[5]!.teamId),
      createMatchup('wild_card', conference, week, seeds[3]!.teamId, seeds[4]!.teamId),
    ];
  }
  return [
    createMatchup('wild_card', conference, week, seeds[1]!.teamId, seeds[6]!.teamId),
    createMatchup('wild_card', conference, week, seeds[2]!.teamId, seeds[5]!.teamId),
    createMatchup('wild_card', conference, week, seeds[3]!.teamId, seeds[4]!.teamId),
  ];
}

function getConferenceSeeds(bracket: PlayoffBracket, conference: 'AFC' | 'NFC'): PlayoffSeed[] {
  return conference === 'AFC' ? bracket.afc : bracket.nfc;
}

function getWinners(bracket: PlayoffBracket, conference: 'AFC' | 'NFC', round: PlayoffRound): PlayoffSeed[] {
  const seeds = getConferenceSeeds(bracket, conference);
  const winnerIds = bracket.matchups
    .filter((matchup) => matchup.conference === conference && matchup.round === round && matchup.winnerTeamId)
    .map((matchup) => matchup.winnerTeamId!);

  return winnerIds
    .map((id) => seeds.find((seed) => seed.teamId === id))
    .filter((seed): seed is PlayoffSeed => Boolean(seed))
    .sort((a, b) => a.seed - b.seed);
}

function buildDivisionalMatchups(bracket: PlayoffBracket, conference: 'AFC' | 'NFC', week: number): PlayoffMatchup[] {
  const seeds = getConferenceSeeds(bracket, conference);
  const winners = getWinners(bracket, conference, 'wild_card');
  const remaining = (seeds.length === 6
    ? [seeds[0]!, seeds[1]!, ...winners]
    : seeds.length === 7
      ? [seeds[0]!, ...winners]
      : winners
  ).sort((a, b) => a.seed - b.seed);

  return [
    createMatchup('divisional', conference, week, remaining[0]!.teamId, remaining[3]!.teamId),
    createMatchup('divisional', conference, week, remaining[1]!.teamId, remaining[2]!.teamId),
  ];
}

function buildConferenceChampionship(bracket: PlayoffBracket, conference: 'AFC' | 'NFC', week: number): PlayoffMatchup[] {
  const winners = getWinners(bracket, conference, 'divisional').sort((a, b) => a.seed - b.seed);
  return [createMatchup('conference', conference, week, winners[0]!.teamId, winners[1]!.teamId)];
}

function buildSuperBowl(bracket: PlayoffBracket, week: number): PlayoffMatchup[] {
  const afcWinner = getWinners(bracket, 'AFC', 'conference')[0]!;
  const nfcWinner = getWinners(bracket, 'NFC', 'conference')[0]!;
  const home = afcWinner.seed <= nfcWinner.seed ? afcWinner : nfcWinner;
  const away = home.teamId === afcWinner.teamId ? nfcWinner : afcWinner;

  return [createMatchup('super_bowl', 'NFL', week, home.teamId, away.teamId)];
}

export function seedPlayoffBracket(game: GameState): PlayoffBracket {
  const teams = Object.values(game.teams);
  const seedCount = seedsPerConference(game);
  const afc = buildConferenceSeeds(teams.filter((team) => team.conference === 'AFC'), seedCount);
  const nfc = buildConferenceSeeds(teams.filter((team) => team.conference === 'NFC'), seedCount);
  const wildCardWeek = firstPlayoffWeek(game);

  return {
    season: game.year,
    afc,
    nfc,
    matchups: [
      ...buildInitialMatchups(afc, 'AFC', wildCardWeek),
      ...buildInitialMatchups(nfc, 'NFC', wildCardWeek),
    ],
    championTeamId: null,
  };
}

export function advancePlayoffBracket(
  bracket: PlayoffBracket,
  week: number,
  playMatchup: (homeTeamId: string, awayTeamId: string) => GameResult,
): PlayoffBracket {
  const currentRound = bracket.matchups.filter((matchup) => matchup.week === week && matchup.result === null);
  if (currentRound.length === 0) return bracket;

  for (const matchup of currentRound) {
    const result = playMatchup(matchup.homeTeamId, matchup.awayTeamId);
    matchup.result = result;
    matchup.winnerTeamId = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
  }

  const round = currentRound[0]!.round;
  if (round === 'wild_card' && !bracket.matchups.some((matchup) => matchup.round === 'divisional')) {
    bracket.matchups.push(...buildDivisionalMatchups(bracket, 'AFC', week + 1), ...buildDivisionalMatchups(bracket, 'NFC', week + 1));
  }
  if (round === 'divisional' && !bracket.matchups.some((matchup) => matchup.round === 'conference')) {
    bracket.matchups.push(...buildConferenceChampionship(bracket, 'AFC', week + 1), ...buildConferenceChampionship(bracket, 'NFC', week + 1));
  }
  if (round === 'conference' && !bracket.matchups.some((matchup) => matchup.round === 'super_bowl')) {
    bracket.matchups.push(...buildSuperBowl(bracket, week + 1));
  }
  if (round === 'super_bowl') {
    bracket.championTeamId = bracket.matchups.find((matchup) => matchup.round === 'super_bowl')?.winnerTeamId ?? null;
  }

  return bracket;
}
