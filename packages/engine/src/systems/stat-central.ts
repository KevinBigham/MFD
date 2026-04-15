import { detectFranchiseEras } from './franchise-dashboard';
import { buildCareerTimelineHighlights } from './record-tracker';
import { emptyPlayerStats } from './season-stats';
import { getPlayerValue } from './player-profile';
import { compareStatLeaders } from '../utils';
import type {
  CareerTimeline,
  ComparedPlayer,
  FranchiseHistoryEntry,
  GameState,
  LeagueAverageEntry,
  LeagueStatSnapshot,
  Player,
  PlayerComparison,
  PlayerSeasonHistoryEntry,
  PlayerSeasonStats,
  Position,
  PositionRanking,
  StatLeaderEntry,
  TeamSeasonSummary,
} from '../types';

const POSITION_STAT_KEYS: Record<Position, string[]> = {
  QB: ['passYds', 'passTD', 'passINT'],
  RB: ['rushYds', 'rushTD', 'rec'],
  WR: ['rec', 'recYds', 'recTD'],
  TE: ['rec', 'recYds', 'recTD'],
  OL: ['gamesPlayed'],
  DL: ['sacks', 'tackles'],
  LB: ['tackles', 'sacks', 'defINT'],
  CB: ['defINT', 'tackles'],
  S: ['defINT', 'tackles'],
  K: ['fgMade', 'fgAtt'],
  P: ['gamesPlayed'],
};

const SNAPSHOT_STATS = ['passYds', 'rushYds', 'recYds', 'sacks', 'defINT'] as const;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function currentSeasonLabel(game: GameState): number {
  return game.phase === 'offseason' || game.phase === 'free_agency' || game.phase === 'draft' || game.phase === 'post_draft'
    ? game.year - 1
    : game.year;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return round(sorted[middle]!);
  return round((sorted[middle - 1]! + sorted[middle]!) / 2);
}

function seasonStatsFromHistory(entry: PlayerSeasonHistoryEntry): PlayerSeasonStats {
  const stats = emptyPlayerStats();
  stats.gamesPlayed = entry.gamesPlayed;
  for (const [key, value] of Object.entries(entry.keyStats)) {
    stats[key] = Number(value ?? 0);
  }
  return stats;
}

function playerForHistory(game: GameState, playerId: string): Player | null {
  return game.players[playerId] ?? null;
}

function playerName(game: GameState, playerId: string): string {
  const current = game.players[playerId];
  if (current) return current.name;
  const archive = game.playerArchive.find((entry) => entry.playerId === playerId);
  return archive?.name ?? playerId;
}

function playerPos(game: GameState, playerId: string): Position {
  const current = game.players[playerId];
  if (current) return current.pos;
  const archive = game.playerArchive.find((entry) => entry.playerId === playerId);
  return archive?.positions[0] ?? 'WR';
}

function teamAbbr(game: GameState, teamId: string | null): string {
  if (!teamId) return 'FA';
  return game.teams[teamId]?.abbr ?? teamId;
}

function awardsForSeason(game: GameState, playerId: string, season: number): string[] {
  return game.awardsHistory
    .filter((entry) => entry.year === season)
    .flatMap((entry) =>
      entry.awards
        .filter((award) => award.winnerId === playerId)
        .map((award) => award.label));
}

function currentSeasonEntry(game: GameState, player: Player): PlayerSeasonHistoryEntry | null {
  const season = currentSeasonLabel(game);
  if (game.playerSeasonHistory[player.id]?.some((entry) => entry.season === season)) return null;
  return {
    playerId: player.id,
    season,
    age: player.age,
    ovr: player.ovr,
    teamId: player.teamId,
    gamesPlayed: Number(player.stats.gamesPlayed ?? 0),
    gamesStarted: player.isStarter ? Number(player.stats.gamesPlayed ?? 0) : Math.round(Number(player.stats.gamesPlayed ?? 0) * 0.4),
    keyStats: { ...player.stats },
  };
}

function allSeasonEntriesForPlayer(game: GameState, playerId: string): PlayerSeasonHistoryEntry[] {
  const history = [...(game.playerSeasonHistory[playerId] ?? [])];
  const current = playerForHistory(game, playerId);
  const currentEntry = current ? currentSeasonEntry(game, current) : null;
  return [...history, ...(currentEntry ? [currentEntry] : [])]
    .sort((a, b) => a.season - b.season);
}

function mvpNameForTeamSeason(game: GameState, teamId: string, season: number): string | null {
  const seasonAwards = game.awardsHistory.find((entry) => entry.year === season);
  const awardWinner = seasonAwards?.awards.find((award) => award.awardId === 'mvp' && award.winnerTeamId === teamId);
  if (awardWinner) return awardWinner.winnerName;

  const seasonPlayers = Object.entries(game.playerSeasonHistory)
    .flatMap(([playerId, entries]) =>
      entries
        .filter((entry) => entry.season === season && entry.teamId === teamId)
        .map((entry) => ({ playerId, entry })));

  const currentPlayers = season === currentSeasonLabel(game)
    ? Object.values(game.players)
      .filter((player) => player.teamId === teamId)
      .map((player) => ({
        playerId: player.id,
        entry: currentSeasonEntry(game, player) ?? {
          playerId: player.id,
          season,
          age: player.age,
          ovr: player.ovr,
          teamId,
          gamesPlayed: Number(player.stats.gamesPlayed ?? 0),
          gamesStarted: player.isStarter ? Number(player.stats.gamesPlayed ?? 0) : Math.round(Number(player.stats.gamesPlayed ?? 0) * 0.4),
          keyStats: { ...player.stats },
        },
      }))
    : [];

  const candidates = [...seasonPlayers, ...currentPlayers];
  const leader = candidates
    .sort((a, b) =>
      Number(b.entry.keyStats.passYds ?? 0) - Number(a.entry.keyStats.passYds ?? 0)
      || Number(b.entry.keyStats.rushYds ?? 0) - Number(a.entry.keyStats.rushYds ?? 0)
      || Number(b.entry.keyStats.recYds ?? 0) - Number(a.entry.keyStats.recYds ?? 0)
      || a.playerId.localeCompare(b.playerId))[0];

  return leader ? playerName(game, leader.playerId) : null;
}

function yearStatsFromHistory(game: GameState, stat: string, season: number, pos?: Position): StatLeaderEntry[] {
  const rows = Object.entries(game.playerSeasonHistory)
    .flatMap(([playerId, entries]) =>
      entries
        .filter((entry) => entry.season === season)
        .filter((entry) => !pos || playerPos(game, playerId) === pos)
        .map((entry) => ({
          playerId,
          playerName: playerName(game, playerId),
          teamId: entry.teamId,
          teamAbbr: teamAbbr(game, entry.teamId),
          pos: playerPos(game, playerId),
          value: Number(entry.keyStats[stat] ?? 0),
          gamesPlayed: entry.gamesPlayed,
        })))
    .filter((row) => row.value > 0);

  return rows
    .sort(compareStatLeaders)
    .map((row, index) => ({
      rank: index + 1,
      ...row,
      perGame: row.gamesPlayed > 0 ? round(row.value / row.gamesPlayed) : 0,
    }));
}

function currentYearStats(game: GameState, stat: string, pos?: Position): StatLeaderEntry[] {
  return Object.values(game.players)
    .filter((player) => player.teamId)
    .filter((player) => !pos || player.pos === pos)
    .map((player) => ({
      rank: 0,
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      teamAbbr: teamAbbr(game, player.teamId),
      pos: player.pos,
      value: Number(player.stats[stat] ?? 0),
      gamesPlayed: Number(player.stats.gamesPlayed ?? 0),
      perGame: Number(player.stats.gamesPlayed ?? 0) > 0 ? round(Number(player.stats[stat] ?? 0) / Number(player.stats.gamesPlayed ?? 0)) : 0,
    }))
    .filter((row) => row.value > 0)
    .sort(compareStatLeaders)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

function championshipCount(game: GameState, playerId: string): number {
  const teamIds = new Set(
    game.playerArchive.find((entry) => entry.playerId === playerId)?.teamHistory.map((stint) => stint.teamId)
    ?? [game.players[playerId]?.teamId].filter((teamId): teamId is string => Boolean(teamId)),
  );
  return game.franchiseHistory.filter((entry) => teamIds.has(entry.teamId) && entry.playoffFinish === 'champion').length;
}

function awardCount(game: GameState, playerId: string, matcher: (awardId: string) => boolean): number {
  return game.awardsHistory.reduce((count, entry) =>
    count + entry.awards.filter((award) => award.winnerId === playerId && matcher(award.awardId)).length,
  0);
}

export function getStatLeaderboard(
  game: GameState,
  stat: string,
  season?: number,
  pos?: Position,
): StatLeaderEntry[] {
  const currentSeason = currentSeasonLabel(game);
  const rows = typeof season === 'number' && season !== currentSeason
    ? yearStatsFromHistory(game, stat, season, pos)
    : currentYearStats(game, stat, pos);
  return rows.slice(0, 20);
}

export function getPlayerCareerTimeline(game: GameState, playerId: string): CareerTimeline {
  const player = game.players[playerId];
  const archive = game.playerArchive.find((entry) => entry.playerId === playerId);
  const pos = player?.pos ?? archive?.positions[0] ?? 'WR';
  const seasons = allSeasonEntriesForPlayer(game, playerId)
    .map((entry) => ({
      year: entry.season,
      teamId: entry.teamId,
      teamAbbr: teamAbbr(game, entry.teamId),
      age: entry.age,
      ovr: entry.ovr,
      stats: seasonStatsFromHistory(entry),
      awards: awardsForSeason(game, playerId, entry.season),
      highlights: buildCareerTimelineHighlights(game, playerId, entry.season),
    }));

  return {
    playerId,
    playerName: player?.name ?? archive?.name ?? playerId,
    pos,
    seasons,
  };
}

export function comparePlayerCareers(game: GameState, playerIds: string[]): PlayerComparison {
  const selected = playerIds.slice(0, 4);
  const players = selected.map<ComparedPlayer>((playerId) => {
    const timeline = getPlayerCareerTimeline(game, playerId);
    const peakOvr = timeline.seasons.reduce((max, season) => Math.max(max, season.ovr), game.players[playerId]?.ovr ?? 0);
    return {
      playerId,
      playerName: timeline.playerName,
      pos: timeline.pos,
      peakOvr,
      careerLength: timeline.seasons.length,
      championships: championshipCount(game, playerId),
      mvps: awardCount(game, playerId, (awardId) => awardId === 'mvp'),
      allPros: awardCount(game, playerId, (awardId) => awardId.includes('all_pro')),
      seasons: timeline.seasons.map((season) => ({
        year: season.year,
        ovr: season.ovr,
        keyStats: POSITION_STAT_KEYS[timeline.pos].reduce<Record<string, number>>((acc, key) => {
          acc[key] = Number(season.stats[key] ?? 0);
          return acc;
        }, {}),
      })),
    };
  });

  const statColumns = [...new Set(players.flatMap((player) => player.seasons.flatMap((season) => Object.keys(season.keyStats))))];
  const peakComparison = statColumns.reduce<PlayerComparison['peakComparison']>((acc, stat) => {
    const values = Object.fromEntries(players.map((player) => [
      player.playerId,
      Math.max(...player.seasons.map((season) => Number(season.keyStats[stat] ?? 0)), 0),
    ]));
    const leader = players
      .slice()
      .sort((a, b) => Number(values[b.playerId] ?? 0) - Number(values[a.playerId] ?? 0) || a.playerName.localeCompare(b.playerName))[0];
    acc[stat] = {
      leader: leader?.playerId ?? '',
      values,
    };
    return acc;
  }, {});

  return {
    players,
    statColumns,
    peakComparison,
  };
}

export function getTeamSeasonHistory(game: GameState, teamId: string): TeamSeasonSummary[] {
  const entries: FranchiseHistoryEntry[] = [
    ...game.franchiseHistory.filter((entry) => entry.teamId === teamId),
  ];

  const currentTeam = game.teams[teamId];
  const currentSeason = currentSeasonLabel(game);
  if (currentTeam && !entries.some((entry) => entry.year === currentSeason)) {
    entries.push({
      year: currentSeason,
      teamId,
      wins: currentTeam.wins,
      losses: currentTeam.losses,
      ties: currentTeam.ties,
      record: `${currentTeam.wins}-${currentTeam.losses}${currentTeam.ties ? `-${currentTeam.ties}` : ''}`,
      pointDifferential: currentTeam.seasonStats.pointDifferential,
      playoffFinish: game.phase === 'playoffs' ? 'playoff_team' : 'regular_season',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
      keyStats: {
        totalYards: currentTeam.seasonStats.totalYards,
        pointsFor: currentTeam.seasonStats.pointsFor,
        pointsAgainst: currentTeam.seasonStats.pointsAgainst,
      },
    });
  }

  const eras = detectFranchiseEras(entries.filter((entry) => entry.teamId === teamId));
  return entries
    .sort((a, b) => a.year - b.year)
    .map((entry) => ({
      year: entry.year,
      wins: entry.wins,
      losses: entry.losses,
      ties: entry.ties,
      playoffResult: entry.playoffFinish,
      mvpName: mvpNameForTeamSeason(game, teamId, entry.year),
      keyStats: {
        totalYards: Number(entry.keyStats?.totalYards ?? 0),
        pointsFor: Number(entry.keyStats?.pointsFor ?? 0),
        pointsAgainst: Number(entry.keyStats?.pointsAgainst ?? 0),
      },
      era: eras.find((era) => entry.year >= era.startYear && entry.year <= (era.endYear ?? era.startYear))?.name ?? null,
    }));
}

export function getLeagueAverages(game: GameState, stat: string): LeagueAverageEntry[] {
  const byYear = new Map<number, number[]>();

  for (const entries of Object.values(game.playerSeasonHistory)) {
    for (const entry of entries) {
      const value = Number(entry.keyStats[stat] ?? 0);
      if (value <= 0) continue;
      const bucket = byYear.get(entry.season) ?? [];
      bucket.push(value);
      byYear.set(entry.season, bucket);
    }
  }

  const currentSeason = currentSeasonLabel(game);
  const currentValues = Object.values(game.players)
    .map((player) => Number(player.stats[stat] ?? 0))
    .filter((value) => value > 0);
  if (currentValues.length > 0) {
    byYear.set(currentSeason, currentValues);
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, values]) => {
      const sorted = [...values].sort((a, b) => b - a);
      const total = values.reduce((sum, value) => sum + value, 0);
      const top10 = sorted.slice(0, 10);
      return {
        year,
        average: round(total / values.length),
        median: median(values),
        top10Avg: top10.length > 0 ? round(top10.reduce((sum, value) => sum + value, 0) / top10.length) : 0,
      };
    });
}

export function getPositionRankings(game: GameState, pos: Position): PositionRanking[] {
  return Object.values(game.players)
    .filter((player) => player.teamId && player.pos === pos)
    .sort((a, b) =>
      b.ovr - a.ovr
      || Number(b.stats[POSITION_STAT_KEYS[pos][0]!] ?? 0) - Number(a.stats[POSITION_STAT_KEYS[pos][0]!] ?? 0)
      || a.name.localeCompare(b.name))
    .map((player, index) => {
      const value = getPlayerValue(player, game);
      return {
        rank: index + 1,
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId,
        ovr: player.ovr,
        keyStats: POSITION_STAT_KEYS[pos].reduce<Record<string, number>>((acc, key) => {
          acc[key] = Number(player.stats[key] ?? 0);
          return acc;
        }, {}),
        contractValue: round((player.contract?.baseSalary ?? 0) + (player.contract?.prorated ?? 0)),
        surplus: value.surplus,
      };
    });
}

export function buildStatSnapshot(game: GameState): LeagueStatSnapshot {
  const leaders = SNAPSHOT_STATS.reduce<LeagueStatSnapshot['leaders']>((acc, stat) => {
    const leader = currentYearStats(game, stat, undefined)[0];
    acc[stat] = leader
      ? { playerId: leader.playerId, playerName: leader.playerName, value: leader.value }
      : { playerId: '', playerName: '', value: 0 };
    return acc;
  }, {});

  const totals = SNAPSHOT_STATS.reduce<Record<string, number>>((acc, stat) => {
    acc[stat] = round(Object.values(game.players).reduce((sum, player) => sum + Number(player.stats[stat] ?? 0), 0));
    return acc;
  }, {});

  const teamCount = Math.max(1, Object.keys(game.teams).length);
  const averages = Object.fromEntries(
    Object.entries(totals).map(([stat, value]) => [stat, round(value / teamCount)]),
  );

  return {
    year: game.year,
    week: game.week,
    leaders,
    totals,
    averages,
  };
}
