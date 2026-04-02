import type { GameState, PowerRanking, ScheduledGame, Team } from '../types';

function recordString(team: Team): string {
  return `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`;
}

function getPlayedGames(game: GameState, teamId: string): ScheduledGame[] {
  return game.schedule.flatMap((week) =>
    week.games.filter((entry) =>
      entry.result &&
      (entry.homeTeamId === teamId || entry.awayTeamId === teamId)
    )
  );
}

function opponentId(game: ScheduledGame, teamId: string): string {
  return game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
}

function strengthOfSchedule(state: GameState, teamId: string): number {
  const played = getPlayedGames(state, teamId);
  if (played.length === 0) return 0.5;

  const total = played.reduce((sum, matchup) => {
    const opponent = state.teams[opponentId(matchup, teamId)];
    if (!opponent) return sum + 0.5;
    const games = opponent.wins + opponent.losses + opponent.ties;
    return sum + (games > 0 ? (opponent.wins + opponent.ties * 0.5) / games : 0.5);
  }, 0);

  return total / played.length;
}

function recentForm(state: GameState, teamId: string): number {
  const recent = getPlayedGames(state, teamId).slice(-3);
  if (recent.length === 0) return 0.5;

  const wins = recent.reduce((sum, matchup) => {
    const result = matchup.result!;
    const isHome = result.homeTeamId === teamId;
    const teamScore = isHome ? result.homeScore : result.awayScore;
    const oppScore = isHome ? result.awayScore : result.homeScore;
    return sum + (teamScore > oppScore ? 1 : teamScore === oppScore ? 0.5 : 0);
  }, 0);

  return wins / recent.length;
}

function compositeScore(state: GameState, team: Team): number {
  const gamesPlayed = Math.max(1, team.wins + team.losses + team.ties);
  const winPct = (team.wins + team.ties * 0.5) / gamesPlayed;
  const pointDiff = team.seasonStats.pointDifferential;
  const sos = strengthOfSchedule(state, team.id);
  const form = recentForm(state, team.id);
  const momentum = Math.max(-5, Math.min(5, team.streak)) * 2.5;

  return (
    winPct * 40 +
    pointDiff * 0.3 +
    sos * 15 +
    form * 15 +
    momentum
  );
}

function topPlayerBlurb(team: Team): string {
  const candidate = [...team.roster]
    .sort((a, b) =>
      ((b.stats.passYds + b.stats.rushYds + b.stats.recYds + b.stats.sacks * 25 + b.stats.defINT * 40) -
        (a.stats.passYds + a.stats.rushYds + a.stats.recYds + a.stats.sacks * 25 + a.stats.defINT * 40)) ||
      b.ovr - a.ovr ||
      a.id.localeCompare(b.id)
    )[0];

  if (!candidate) {
    return `${team.city} ${team.name} are searching for their spark.`;
  }

  if (team.streak >= 3) {
    return `Riding a ${team.streak}-game win streak behind ${candidate.name}.`;
  }
  if (team.streak <= -3) {
    return `Sliding under the weight of a ${Math.abs(team.streak)}-game skid despite ${candidate.name}.`;
  }
  if (team.seasonStats.pointDifferential >= 40) {
    return `Winning the margin battle every week with ${candidate.name} setting the tone.`;
  }
  if (team.seasonStats.pointDifferential <= -40) {
    return `Still trying to steady the season after too many uneven Sundays.`;
  }
  return `${candidate.name} keeps ${team.city} in the weekly conversation.`;
}

export function createPowerRankings(game: GameState, previous: PowerRanking[] = []): PowerRanking[] {
  const previousRankByTeam = new Map(previous.map((entry) => [entry.teamId, entry.rank]));

  return Object.values(game.teams)
    .map((team) => {
      const score = Math.round(compositeScore(game, team) * 100) / 100;
      const previousRank = previousRankByTeam.get(team.id) ?? null;

      return {
        rank: 0,
        teamId: team.id,
        teamName: `${team.city} ${team.name}`,
        score,
        previousRank,
        delta: 0,
        blurb: topPlayerBlurb(team),
        record: recordString(team),
      } satisfies PowerRanking;
    })
    .sort((a, b) => b.score - a.score || a.teamId.localeCompare(b.teamId))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      delta: entry.previousRank === null ? 0 : entry.previousRank - (index + 1),
    }));
}

export function updatePowerRankings(game: GameState, previous: PowerRanking[] = game.powerRankings ?? []): PowerRanking[] {
  const rankings = createPowerRankings(game, previous);
  game.powerRankings = rankings;
  return rankings;
}
