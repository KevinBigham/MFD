import { RNG } from '../rng';
import type { BroadcastNetwork, GameState, ScheduledGame } from '../types';

type RandomFn = () => number;

export interface TeamScheduleEntry {
  week: number;
  opponentTeamId: string | null;
  opponentName: string;
  home: boolean;
  result: ScheduledGame['result'];
  recordAfterGame: string | null;
  bye: boolean;
  primetime: boolean;
  flexed: boolean;
  broadcastNetwork: BroadcastNetwork | null;
}

export interface WeekScheduleEntry {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  result: ScheduledGame['result'];
  broadcastNetwork: BroadcastNetwork | null;
  primetime: boolean;
  flexed: boolean;
  compellingScore: number;
}

function teamLabel(game: GameState, teamId: string): string {
  const team = game.teams[teamId];
  return team ? `${team.city} ${team.name}` : teamId;
}

function winPct(wins: number, losses: number, ties: number): number {
  const games = wins + losses + ties;
  return games === 0 ? 0.5 : (wins + ties * 0.5) / games;
}

function rivalryHeat(game: GameState, homeTeamId: string, awayTeamId: string): number {
  const home = game.teams[homeTeamId];
  if (!home) return 0;
  return home.rivals?.[awayTeamId]?.heat ?? home.rivalries.find((entry) => entry.teamId === awayTeamId)?.heat ?? 0;
}

function playoffImplicationScore(game: GameState, homeTeamId: string, awayTeamId: string): number {
  const home = game.teams[homeTeamId];
  const away = game.teams[awayTeamId];
  if (!home || !away) return 0;

  const homePressure = home.wins >= 8 ? 15 : home.wins >= 6 ? 8 : 2;
  const awayPressure = away.wins >= 8 ? 15 : away.wins >= 6 ? 8 : 2;
  return homePressure + awayPressure;
}

function compellingScore(game: GameState, matchup: ScheduledGame): number {
  const home = game.teams[matchup.homeTeamId];
  const away = game.teams[matchup.awayTeamId];
  if (!home || !away) return 0;

  const combinedWinPct = (winPct(home.wins, home.losses, home.ties) + winPct(away.wins, away.losses, away.ties)) * 50;
  return combinedWinPct + rivalryHeat(game, home.id, away.id) + playoffImplicationScore(game, home.id, away.id);
}

function ensureScheduledGameDefaults(matchup: ScheduledGame): void {
  matchup.flexed ??= false;
  matchup.primetime ??= false;
  matchup.broadcastNetwork ??= null;
}

export function flexSchedule(game: GameState, random: RandomFn = RNG.ai): ScheduledGame | null {
  if (game.week < 14 || game.phase !== 'regular_season') return null;
  const weekSchedule = game.schedule.find((entry) => entry.week === game.week);
  if (!weekSchedule || weekSchedule.games.length === 0) return null;

  for (const matchup of weekSchedule.games) {
    ensureScheduledGameDefaults(matchup);
    matchup.primetime = false;
  }

  const ranked = [...weekSchedule.games]
    .sort((a, b) => compellingScore(game, b) - compellingScore(game, a) || a.homeTeamId.localeCompare(b.homeTeamId));
  const selected = ranked[0] ?? null;
  if (!selected) return null;

  selected.primetime = true;
  selected.flexed = true;
  selected.broadcastNetwork = 'MFN';

  if (random() > 0.97 && ranked[1]) {
    ranked[1].flexed = true;
  }

  return selected;
}

export function assignBroadcasts(game: GameState, week: number): WeekScheduleEntry[] {
  const weekSchedule = game.schedule.find((entry) => entry.week === week);
  if (!weekSchedule) return [];

  const ranked = [...weekSchedule.games]
    .map((gameEntry) => ({ matchup: gameEntry, score: compellingScore(game, gameEntry) }))
    .sort((a, b) => b.score - a.score || a.matchup.homeTeamId.localeCompare(b.matchup.homeTeamId));

  let foxTurn = week % 2 === 0;
  for (const { matchup } of ranked) {
    ensureScheduledGameDefaults(matchup);
    if (matchup.primetime) {
      matchup.broadcastNetwork = 'MFN';
      continue;
    }
    if (!ranked[0]) {
      matchup.broadcastNetwork = 'ESPN8';
      continue;
    }
    if (matchup === ranked[1]?.matchup) {
      matchup.broadcastNetwork = 'NBC8';
      continue;
    }
    if (matchup === ranked[2]?.matchup || matchup === ranked[3]?.matchup) {
      matchup.broadcastNetwork = foxTurn ? 'FOX8' : 'CBS8';
      foxTurn = !foxTurn;
      continue;
    }
    matchup.broadcastNetwork = 'ESPN8';
  }

  return getWeekSchedule(game, week);
}

export function getFullSchedule(game: GameState, teamId: string): TeamScheduleEntry[] {
  const entries: TeamScheduleEntry[] = [];
  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (let week = 1; week <= 18; week += 1) {
    const weekSchedule = game.schedule.find((entry) => entry.week === week);
    const matchup = weekSchedule?.games.find((entry) => entry.homeTeamId === teamId || entry.awayTeamId === teamId) ?? null;

    if (!matchup) {
      entries.push({
        week,
        opponentTeamId: null,
        opponentName: 'BYE',
        home: false,
        result: null,
        recordAfterGame: `${wins}-${losses}${ties ? `-${ties}` : ''}`,
        bye: true,
        primetime: false,
        flexed: false,
        broadcastNetwork: null,
      });
      continue;
    }

    ensureScheduledGameDefaults(matchup);
    const home = matchup.homeTeamId === teamId;
    const opponentTeamId = home ? matchup.awayTeamId : matchup.homeTeamId;

    if (matchup.result) {
      const isWin = home
        ? matchup.result.homeScore > matchup.result.awayScore
        : matchup.result.awayScore > matchup.result.homeScore;
      const isTie = matchup.result.homeScore === matchup.result.awayScore;
      if (isTie) ties += 1;
      else if (isWin) wins += 1;
      else losses += 1;
    }

    entries.push({
      week,
      opponentTeamId,
      opponentName: teamLabel(game, opponentTeamId),
      home,
      result: matchup.result,
      recordAfterGame: matchup.result ? `${wins}-${losses}${ties ? `-${ties}` : ''}` : null,
      bye: false,
      primetime: matchup.primetime ?? false,
      flexed: matchup.flexed ?? false,
      broadcastNetwork: matchup.broadcastNetwork ?? null,
    });
  }

  return entries;
}

export function getWeekSchedule(game: GameState, week: number): WeekScheduleEntry[] {
  const weekSchedule = game.schedule.find((entry) => entry.week === week);
  if (!weekSchedule) return [];

  return weekSchedule.games.map((matchup) => {
    ensureScheduledGameDefaults(matchup);
    return {
      week,
      homeTeamId: matchup.homeTeamId,
      awayTeamId: matchup.awayTeamId,
      homeTeamName: teamLabel(game, matchup.homeTeamId),
      awayTeamName: teamLabel(game, matchup.awayTeamId),
      result: matchup.result,
      broadcastNetwork: matchup.broadcastNetwork ?? null,
      primetime: matchup.primetime ?? false,
      flexed: matchup.flexed ?? false,
      compellingScore: Math.round(compellingScore(game, matchup) * 100) / 100,
    };
  });
}
