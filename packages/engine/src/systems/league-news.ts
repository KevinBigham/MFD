import type { GameResult, GameState, NewsItem, Player, Team } from '../types';

function nextNewsId(game: GameState, type: NewsItem['type']): string {
  return `${type}-${game.year}-${game.week}-${game.leagueNews.length}`;
}

function pushNews(game: GameState, item: NewsItem): NewsItem {
  game.leagueNews = [...(game.leagueNews ?? []), item].slice(-200);
  return item;
}

function teamLabel(team: Team | undefined): string {
  return team ? `${team.city} ${team.name}` : 'League';
}

function playerLabel(player: Player | undefined): string {
  return player?.name ?? 'A player';
}

export function recordNewsItem(game: GameState, item: NewsItem): NewsItem {
  const existing = (game.leagueNews ?? []).find((entry) => entry.id === item.id);
  if (existing) return existing;
  return pushNews(game, item);
}

export function recordGovernanceNews(
  game: GameState,
  headline: string,
  body: string,
  options?: {
    importance?: NewsItem['importance'];
    teamIds?: string[];
    playerIds?: string[];
    idSuffix?: string;
  },
): NewsItem {
  return recordNewsItem(game, {
    id: options?.idSuffix ? `governance-${options.idSuffix}` : nextNewsId(game, 'governance'),
    year: game.year,
    week: game.week,
    type: 'governance',
    headline,
    body,
    teamIds: options?.teamIds ?? [],
    playerIds: options?.playerIds ?? [],
    importance: options?.importance ?? 'major',
  });
}

export function recordLaborNews(
  game: GameState,
  headline: string,
  body: string,
  options?: {
    importance?: NewsItem['importance'];
    teamIds?: string[];
    playerIds?: string[];
    idSuffix?: string;
  },
): NewsItem {
  return recordNewsItem(game, {
    id: options?.idSuffix ? `labor-${options.idSuffix}` : nextNewsId(game, 'labor'),
    year: game.year,
    week: game.week,
    type: 'labor',
    headline,
    body,
    teamIds: options?.teamIds ?? [],
    playerIds: options?.playerIds ?? [],
    importance: options?.importance ?? 'major',
  });
}

function makeWeeklyResultNews(game: GameState, result: GameResult): NewsItem {
  const home = game.teams[result.homeTeamId];
  const away = game.teams[result.awayTeamId];
  const winner = result.homeScore >= result.awayScore ? home : away;
  const loser = winner?.id === home?.id ? away : home;
  const margin = Math.abs(result.homeScore - result.awayScore);
  const headline = `${teamLabel(winner)} ${margin >= 10 ? 'makes a statement' : 'edges'} ${teamLabel(loser)}`;
  const body = `${teamLabel(home)} ${result.homeScore}, ${teamLabel(away)} ${result.awayScore}.`;

  return {
    id: nextNewsId(game, margin >= 14 ? 'rivalry' : 'record'),
    year: result.year,
    week: result.week,
    type: margin >= 14 ? 'rivalry' : 'record',
    headline,
    body,
    teamIds: [result.homeTeamId, result.awayTeamId],
    playerIds: result.mvpPlayerId ? [result.mvpPlayerId] : [],
    importance: margin >= 14 ? 'major' : 'minor',
  };
}

function milestoneCandidates(game: GameState): NewsItem[] {
  const items: NewsItem[] = [];

  for (const player of Object.values(game.players)) {
    if (player.stats.rushYds >= 1000) {
      items.push({
        id: `${player.id}-rush-1000-${game.year}-${game.week}`,
        year: game.year,
        week: game.week,
        type: 'milestone',
        headline: `${player.name} breaks through 1,000 rushing yards`,
        body: `${player.name} has powered to ${player.stats.rushYds} yards on the ground.`,
        teamIds: player.teamId ? [player.teamId] : [],
        playerIds: [player.id],
        importance: 'major',
      });
    }
    if (player.stats.recYds >= 1000) {
      items.push({
        id: `${player.id}-rec-1000-${game.year}-${game.week}`,
        year: game.year,
        week: game.week,
        type: 'milestone',
        headline: `${player.name} clears 1,000 receiving yards`,
        body: `${player.name} is now at ${player.stats.recYds} receiving yards on the season.`,
        teamIds: player.teamId ? [player.teamId] : [],
        playerIds: [player.id],
        importance: 'major',
      });
    }
    if (player.stats.sacks >= 10) {
      items.push({
        id: `${player.id}-sacks-${game.year}-${game.week}`,
        year: game.year,
        week: game.week,
        type: 'record',
        headline: `${player.name} is terrorizing pockets`,
        body: `${player.name} has reached ${player.stats.sacks} sacks this season.`,
        teamIds: player.teamId ? [player.teamId] : [],
        playerIds: [player.id],
        importance: 'minor',
      });
    }
  }

  return items;
}

function injuryItems(game: GameState): NewsItem[] {
  return Object.values(game.teams)
    .flatMap((team) => team.roster
      .filter((player) => player.injury && player.injury.gamesOut > 0)
      .slice(0, 1)
      .map((player) => ({
        id: `${player.id}-injury-${game.year}-${game.week}`,
        year: game.year,
        week: game.week,
        type: 'injury' as const,
        headline: `${player.name} hits the injury report`,
        body: `${player.name} is dealing with a ${player.injury?.type} issue and could miss ${player.injury?.gamesOut} week(s).`,
        teamIds: [team.id],
        playerIds: [player.id],
        importance: player.injury?.gamesOut && player.injury.gamesOut >= 4 ? 'major' : 'minor',
      })));
}

export function generateWeeklyLeagueNews(game: GameState, rand: () => number = () => 0.5): NewsItem[] {
  const targetCount = Math.max(3, Math.min(8, 3 + Math.round(rand() * 5)));
  const sourceWeek = Math.max(1, game.week - 1);
  const weekSchedule = game.schedule.find((entry) => entry.week === sourceWeek);
  const weeklyResults = (weekSchedule?.games ?? [])
    .map((entry) => entry.result)
    .filter((result): result is GameResult => result !== null)
    .sort((a, b) => Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore));

  const pool: NewsItem[] = [
    ...weeklyResults.map((result) => makeWeeklyResultNews(game, result)),
    ...injuryItems(game),
    ...milestoneCandidates(game),
  ];

  if (pool.length < targetCount) {
    const topTeams = Object.values(game.teams)
      .sort((a, b) => b.wins - a.wins || b.seasonStats.pointDifferential - a.seasonStats.pointDifferential || a.id.localeCompare(b.id))
      .slice(0, targetCount - pool.length);
    for (const team of topTeams) {
      pool.push({
        id: `${team.id}-pulse-${game.year}-${sourceWeek}`,
        year: game.year,
        week: sourceWeek,
        type: 'record',
        headline: `${teamLabel(team)} stays in the league conversation`,
        body: `${teamLabel(team)} sits at ${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''} with a ${team.seasonStats.pointDifferential >= 0 ? '+' : ''}${team.seasonStats.pointDifferential} point differential.`,
        teamIds: [team.id],
        playerIds: [],
        importance: 'minor',
      });
    }
  }

  return pool.slice(0, targetCount).map((item) => recordNewsItem(game, item));
}

export function generateOffseasonNews(game: GameState, _rand: () => number = () => 0.5): NewsItem[] {
  const items: NewsItem[] = [];

  for (const team of Object.values(game.teams)) {
    for (const tx of team.txLog.filter((entry) => entry.year === game.year)) {
      if (tx.type === 'SIGN_FA' && tx.playerId) {
        const player = game.players[tx.playerId];
        items.push(recordNewsItem(game, {
          id: `${tx.playerId}-sign-${game.year}-${team.id}`,
          year: game.year,
          week: game.week,
          type: 'signing',
          headline: `${teamLabel(team)} lands ${playerLabel(player)}`,
          body: `${teamLabel(team)} adds ${playerLabel(player)} in free agency.`,
          teamIds: [team.id],
          playerIds: player ? [player.id] : [],
          importance: 'major',
        }));
      }
    }
  }

  for (const event of game.eventLog.slice(-12)) {
    if (event.type === 'coach_hired' || event.type === 'coach_fired') {
      const teamId = String(event.data['teamId'] ?? '');
      items.push(recordNewsItem(game, {
        id: `${event.id}-news`,
        year: game.year,
        week: game.week,
        type: 'coaching',
        headline: event.description,
        body: 'The coaching carousel is reshaping the league.',
        teamIds: teamId ? [teamId] : [],
        playerIds: [],
        importance: 'major',
      }));
    }
    if (event.type === 'player_retired') {
      const playerId = String(event.data['playerId'] ?? '');
      const teamId = String(event.data['teamId'] ?? '');
      items.push(recordNewsItem(game, {
        id: `${event.id}-retirement`,
        year: game.year,
        week: game.week,
        type: 'milestone',
        headline: event.description,
        body: 'A veteran career comes to a close.',
        teamIds: teamId ? [teamId] : [],
        playerIds: playerId ? [playerId] : [],
        importance: 'major',
      }));
    }
  }

  for (const entry of game.hallOfFame.filter((hallEntry) => hallEntry.inductionYear === game.year).slice(-3)) {
    items.push(recordNewsItem(game, {
      id: `${entry.playerId}-hof-${game.year}`,
      year: game.year,
      week: game.week,
      type: 'milestone',
      headline: `${entry.name} enters the Hall of Fame`,
      body: `${entry.name} is honored for a career that peaked at ${entry.peakOvr} overall.`,
      teamIds: [],
      playerIds: [entry.playerId],
      importance: 'breaking',
    }));
  }

  for (const team of Object.values(game.teams)) {
    const compPicks = team.draftPicks.filter((pick) => pick.year === game.year && pick.isCompPick);
    if (compPicks.length === 0) continue;
    items.push(recordNewsItem(game, {
      id: `comp-picks-${team.id}-${game.year}`,
      year: game.year,
      week: game.week,
      type: 'draft',
      headline: `${teamLabel(team)} picks up ${compPicks.length} compensatory selection${compPicks.length === 1 ? '' : 's'}`,
      body: `${teamLabel(team)} is awarded draft capital for offseason departures.`,
      teamIds: [team.id],
      playerIds: [],
      importance: compPicks.some((pick) => pick.round <= 3) ? 'major' : 'minor',
    }));
  }

  return items;
}

export function getRecentNews(game: GameState, count: number): NewsItem[] {
  return [...(game.leagueNews ?? [])].slice(-count).reverse();
}

export function getTeamNews(game: GameState, teamId: string, count: number): NewsItem[] {
  return [...(game.leagueNews ?? [])]
    .filter((item) => item.teamIds.includes(teamId))
    .slice(-count)
    .reverse();
}
