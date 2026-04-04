import type {
  FranchiseDashboard,
  FranchiseEra,
  FranchiseHistoryEntry,
  GameState,
} from '../types';
import { getFranchiseLegends } from './franchise-legends';

function sortHistory(history: FranchiseHistoryEntry[]): FranchiseHistoryEntry[] {
  return [...history].sort((a, b) => a.year - b.year);
}

function isWinningSeason(entry: FranchiseHistoryEntry): boolean {
  return entry.wins > entry.losses;
}

function isPlayoffSeason(entry: FranchiseHistoryEntry): boolean {
  return entry.playoffFinish !== 'missed_playoffs' && entry.playoffFinish !== 'regular_season';
}

function championshipCount(entries: FranchiseHistoryEntry[]): number {
  return entries.filter((entry) => entry.playoffFinish === 'champion').length;
}

export function detectFranchiseEras(franchiseHistory: FranchiseHistoryEntry[]): FranchiseEra[] {
  const history = sortHistory(franchiseHistory);
  const eras: FranchiseEra[] = [];
  let index = 0;

  while (index < history.length) {
    const start = history[index]!;
    const losingRun: FranchiseHistoryEntry[] = [];
    while (index < history.length && !isWinningSeason(history[index]!)) {
      losingRun.push(history[index]!);
      index += 1;
    }

    if (losingRun.length >= 3) {
      eras.push({
        name: 'Dark Ages',
        startYear: losingRun[0]!.year,
        endYear: losingRun[losingRun.length - 1]!.year,
        description: 'Three or more consecutive losing seasons pulled the franchise into a slump.',
      });
    }

    const winningRun: FranchiseHistoryEntry[] = [];
    while (index < history.length && isWinningSeason(history[index]!)) {
      winningRun.push(history[index]!);
      index += 1;
    }

    if (winningRun.length === 0) continue;

    if (losingRun.length >= 3 && winningRun.length >= 2) {
      const rebuildSlice = winningRun.slice(0, 2);
      const rebuildHasTitle = rebuildSlice.some((entry) => entry.playoffFinish === 'champion');
      eras.push({
        name: rebuildHasTitle ? 'Golden Rebuild' : 'The Rebuild',
        startYear: rebuildSlice[0]!.year,
        endYear: rebuildSlice[rebuildSlice.length - 1]!.year,
        description: 'The franchise clawed out of a losing stretch and started stacking wins again.',
      });
    }

    if (winningRun.length >= 3) {
      const titles = championshipCount(winningRun);
      eras.push({
        name: titles >= 2 || winningRun.some((entry) => entry.playoffFinish === 'champion') ? 'Dynasty Era' : 'Golden Age',
        startYear: winningRun[0]!.year,
        endYear: winningRun[winningRun.length - 1]!.year,
        description: titles >= 2 ? 'Sustained success turned this stretch into a dynasty.' : 'A long winning run restored belief around the club.',
      });
    }
  }

  return eras;
}

function activeStreak(history: FranchiseHistoryEntry[], predicate: (entry: FranchiseHistoryEntry) => boolean): number {
  let count = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (!predicate(history[index]!)) break;
    count += 1;
  }
  return count;
}

export function buildFranchiseDashboard(gameState: GameState, teamId: string): FranchiseDashboard {
  const team = gameState.teams[teamId]!;
  const history = sortHistory(gameState.franchiseHistory.filter((entry) => entry.teamId === teamId));
  const eras = detectFranchiseEras(history);
  const allTimeRecord = history.reduce((record, entry) => ({
    wins: record.wins + entry.wins,
    losses: record.losses + entry.losses,
    ties: record.ties + entry.ties,
    winPct: 0,
  }), { wins: 0, losses: 0, ties: 0, winPct: 0 });
  const totalGames = allTimeRecord.wins + allTimeRecord.losses + allTimeRecord.ties;
  allTimeRecord.winPct = totalGames > 0 ? (allTimeRecord.wins + allTimeRecord.ties * 0.5) / totalGames : 0;

  const recent = history.slice(-5);
  const topLegends = getFranchiseLegends(gameState, teamId, 5);
  const currentDecadeTeam = [...gameState.allDecadeTeams]
    .filter((entry) => entry.teamId === teamId)
    .sort((a, b) => b.startYear - a.startYear)[0] ?? null;

  return {
    identity: team.franchiseIdentity,
    allTimeRecord,
    championships: championshipCount(history),
    playoffAppearances: history.filter(isPlayoffSeason).length,
    activeStreaks: {
      winningSeasons: activeStreak(history, isWinningSeason),
      playoffStreak: activeStreak(history, isPlayoffSeason),
      losingSeasons: activeStreak(history, (entry) => !isWinningSeason(entry)),
    },
    topLegends,
    currentDecadeTeam,
    stadiumDealStatus: !team.franchiseIdentity.stadiumDeal
      ? 'none'
      : team.franchiseIdentity.stadiumDeal.yearsRemaining <= 1
        ? 'expiring'
        : 'active',
    fanbaseTrend: recent.map((entry) => entry.fanbase ?? team.franchiseIdentity.fanbase),
    prestigeTrend: recent.map((entry) => entry.prestige ?? team.franchiseIdentity.prestige),
    currentEra: eras[eras.length - 1]
      ? {
        name: eras[eras.length - 1]!.name,
        startYear: eras[eras.length - 1]!.startYear,
        description: eras[eras.length - 1]!.description,
      }
      : {
        name: 'Founding Era',
        startYear: history[0]?.year ?? gameState.year,
        description: 'The franchise is still writing its first defining chapter.',
      },
  };
}
