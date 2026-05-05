import type { GameState, Player, Team } from '../types';

const REGULAR_SEASON_GAMES = 17;

function gamesPlayed(team: Team): number {
  return team.wins + team.losses + team.ties;
}

function winPct(team: Team): number {
  const total = gamesPlayed(team);
  return total === 0 ? 0 : (team.wins + team.ties * 0.5) / total;
}

function sortTeams(a: Team, b: Team): number {
  return winPct(b) - winPct(a)
    || (b.seasonStats.pointDifferential ?? 0) - (a.seasonStats.pointDifferential ?? 0)
    || a.id.localeCompare(b.id);
}

function teamName(team: Team): string {
  return `${team.city} ${team.name}`;
}

function homeAwayRecord(game: GameState, teamId: string): { home: string; away: string } {
  let homeWins = 0;
  let homeLosses = 0;
  let homeTies = 0;
  let awayWins = 0;
  let awayLosses = 0;
  let awayTies = 0;

  for (const week of game.schedule) {
    for (const gameResult of week.games) {
      const result = gameResult.result;
      if (!result) continue;
      if (result.homeTeamId === teamId) {
        if (result.homeScore > result.awayScore) homeWins += 1;
        else if (result.homeScore < result.awayScore) homeLosses += 1;
        else homeTies += 1;
      }
      if (result.awayTeamId === teamId) {
        if (result.awayScore > result.homeScore) awayWins += 1;
        else if (result.awayScore < result.homeScore) awayLosses += 1;
        else awayTies += 1;
      }
    }
  }

  const home = `${homeWins}-${homeLosses}${homeTies ? `-${homeTies}` : ''}`;
  const away = `${awayWins}-${awayLosses}${awayTies ? `-${awayTies}` : ''}`;
  return { home, away };
}

function remainingGames(team: Team): number {
  return Math.max(0, REGULAR_SEASON_GAMES - gamesPlayed(team));
}

function divisionLeader(game: GameState, team: Team): Team {
  return Object.values(game.teams)
    .filter((candidate) => candidate.conference === team.conference && candidate.division === team.division)
    .sort(sortTeams)[0]!;
}

function conferenceSeeds(game: GameState, conference: Team['conference']): Team[] {
  const teams = Object.values(game.teams).filter((team) => team.conference === conference).sort(sortTeams);
  const divisionWinners = new Map<string, Team>();

  for (const team of teams) {
    const current = divisionWinners.get(team.division);
    if (!current || sortTeams(team, current) < 0) {
      divisionWinners.set(team.division, team);
    }
  }

  const orderedWinners = [...divisionWinners.values()].sort(sortTeams);
  const wildcards = teams.filter((team) => divisionWinners.get(team.division)?.id !== team.id).slice(0, 3);
  return [...orderedWinners, ...wildcards].slice(0, 7);
}

export interface StandingsRow {
  rank: number;
  teamId: string;
  teamName: string;
  teamIcon: string;
  conference: Team['conference'];
  division: string;
  wins: number;
  losses: number;
  ties: number;
  pct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  streak: number;
  homeRecord: string;
  awayRecord: string;
}

export interface PlayoffPictureEntry {
  seed: number;
  teamId: string;
  teamName: string;
  teamIcon: string;
  conference: Team['conference'];
  divisionWinner: boolean;
  indicator: '' | 'X' | 'Y' | 'E';
}

export interface StatLeaderEntry {
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamName: string;
  value: number;
}

export function getDivisionStandings(
  game: GameState,
  conference: Team['conference'],
  division: string,
): StandingsRow[] {
  return Object.values(game.teams)
    .filter((team) => team.conference === conference && team.division === division)
    .sort(sortTeams)
    .map((team, index) => {
      const record = homeAwayRecord(game, team.id);
      return {
        rank: index + 1,
        teamId: team.id,
        teamName: teamName(team),
        teamIcon: team.icon,
        conference: team.conference,
        division: team.division,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        pct: winPct(team),
        pointsFor: team.seasonStats.pointsFor,
        pointsAgainst: team.seasonStats.pointsAgainst,
        pointDifferential: team.seasonStats.pointDifferential,
        streak: team.streak,
        homeRecord: record.home,
        awayRecord: record.away,
      };
    });
}

export function getClinchedStatus(game: GameState, teamId: string): '' | 'X' | 'Y' | 'E' {
  const team = game.teams[teamId];
  if (!team) return '';

  const divisionOpponents = Object.values(game.teams)
    .filter((candidate) => candidate.id !== team.id && candidate.conference === team.conference && candidate.division === team.division);
  const maxDivisionWins = Math.max(...divisionOpponents.map((candidate) => candidate.wins + remainingGames(candidate)), 0);
  if (team.wins > maxDivisionWins) return 'X';

  const seeds = conferenceSeeds(game, team.conference);
  const bubble = seeds[6];
  const maxWins = team.wins + remainingGames(team);
  if (remainingGames(team) === 0 && !seeds.some((seed) => seed.id === team.id)) return 'E';
  if (bubble && maxWins < bubble.wins) return 'E';

  if (seeds.some((seed) => seed.id === team.id) && bubble && team.id !== divisionLeader(game, team).id) {
    const chasers = Object.values(game.teams)
      .filter((candidate) => candidate.conference === team.conference && !seeds.slice(0, 7).some((seed) => seed.id === candidate.id))
      .map((candidate) => candidate.wins + remainingGames(candidate));
    if (chasers.length === 0 || team.wins > Math.max(...chasers)) return 'Y';
  }

  return '';
}

export function buildPlayoffPicture(game: GameState): { afc: PlayoffPictureEntry[]; nfc: PlayoffPictureEntry[] } {
  const build = (conference: Team['conference']): PlayoffPictureEntry[] =>
    conferenceSeeds(game, conference).map((team, index) => ({
      seed: index + 1,
      teamId: team.id,
      teamName: teamName(team),
      teamIcon: team.icon,
      conference,
      divisionWinner: divisionLeader(game, team).id === team.id,
      indicator: getClinchedStatus(game, team.id),
    }));

  return {
    afc: build('AFC'),
    nfc: build('NFC'),
  };
}

function leaderRows(game: GameState, stat: keyof Player['stats']): StatLeaderEntry[] {
  const statValue = (player: Player): number => Number(player.stats?.[stat] ?? 0);

  return Object.values(game.players)
    .filter((player) => statValue(player) > 0)
    .sort((a, b) => statValue(b) - statValue(a) || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((player) => {
      const team = player.teamId ? game.teams[player.teamId] : null;
      return {
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId,
        teamName: team ? teamName(team) : 'Free Agent',
        value: statValue(player),
      };
    });
}

export function getStatLeaders(game: GameState): {
  passYds: StatLeaderEntry[];
  rushYds: StatLeaderEntry[];
  recYds: StatLeaderEntry[];
  sacks: StatLeaderEntry[];
  defINT: StatLeaderEntry[];
} {
  return {
    passYds: leaderRows(game, 'passYds'),
    rushYds: leaderRows(game, 'rushYds'),
    recYds: leaderRows(game, 'recYds'),
    sacks: leaderRows(game, 'sacks'),
    defINT: leaderRows(game, 'defINT'),
  };
}
