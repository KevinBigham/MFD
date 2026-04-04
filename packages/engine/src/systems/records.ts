import type {
  GameResult,
  GameState,
  Player,
  RecordBook,
  RecordBucket,
  RecordEntry,
  Team,
} from '../types';

const SINGLE_GAME_STATS = ['passYds', 'rushYds', 'recYds', 'touchdowns', 'sacks', 'defINT', 'pointsGame'] as const;
const SINGLE_SEASON_STATS = ['passYds', 'rushYds', 'recYds', 'passTD', 'rushTD', 'sacks', 'defINT', 'wins', 'pointsFor'] as const;
const CAREER_STATS = ['passYds', 'rushYds', 'recYds', 'touchdowns', 'sacks', 'defINT', 'gp'] as const;
const FRANCHISE_STATS = ['wins', 'winStreak', 'pointsGame', 'pointsSeason'] as const;

interface SingleGameRecordUpdate {
  year: number;
  week: number;
  teamId: string;
  teamName: string;
  entries: Array<{
    playerId?: string | null;
    playerName?: string | null;
    stat: string;
    value: number;
    category?: 'singleGame';
    note?: string;
  }>;
}

function makeBucket(keys: readonly string[]): RecordBucket {
  return keys.reduce<RecordBucket>((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

export function createEmptyRecordBook(): RecordBook {
  return {
    singleGame: makeBucket(SINGLE_GAME_STATS),
    singleSeason: makeBucket(SINGLE_SEASON_STATS),
    career: makeBucket(CAREER_STATS),
    franchise: makeBucket(FRANCHISE_STATS),
  };
}

function ensureBook(game: GameState): RecordBook {
  const current = game.records as RecordBook | undefined;
  if (
    current &&
    current.singleGame &&
    current.singleSeason &&
    current.career &&
    current.franchise
  ) {
    return current;
  }

  game.records = createEmptyRecordBook();
  return game.records;
}

function stableSort(a: RecordEntry, b: RecordEntry): number {
  if (a.value !== b.value) return b.value - a.value;
  if (a.year !== b.year) return a.year - b.year;
  if ((a.week ?? 0) !== (b.week ?? 0)) return (a.week ?? 0) - (b.week ?? 0);
  if ((a.teamId ?? '') !== (b.teamId ?? '')) return (a.teamId ?? '').localeCompare(b.teamId ?? '');
  return (a.playerId ?? '').localeCompare(b.playerId ?? '');
}

function recordIdentity(entry: RecordEntry): string {
  if (entry.category === 'singleGame') {
    return [entry.category, entry.stat, entry.year, entry.week ?? 0, entry.teamId, entry.playerId ?? ''].join(':');
  }
  if (entry.category === 'singleSeason') {
    return [entry.category, entry.stat, entry.year, entry.teamId, entry.playerId ?? ''].join(':');
  }
  if (entry.category === 'career') {
    return [entry.category, entry.stat, entry.teamId, entry.playerId ?? ''].join(':');
  }
  return [entry.category, entry.stat, entry.year, entry.teamId].join(':');
}

function upsertRecord(
  book: RecordBook,
  category: keyof RecordBook,
  stat: string,
  entry: RecordEntry,
): RecordEntry[] {
  const bucket = book[category];
  const existing = bucket[stat] ?? [];
  const identity = recordIdentity(entry);
  bucket[stat] = [...existing.filter((candidate) => recordIdentity(candidate) !== identity), entry]
    .sort(stableSort)
    .slice(0, 10);
  return bucket[stat]!;
}

function teamLabel(team: Team): string {
  return `${team.city} ${team.name}`;
}

function totalTouchdowns(player: Player): number {
  return (player.stats.passTD ?? 0) + (player.stats.rushTD ?? 0) + (player.stats.recTD ?? 0);
}

function normalizeCareerTouchdowns(player: Player): number {
  return (player.careerStats.passTD ?? 0) + (player.careerStats.rushTD ?? 0) + (player.careerStats.recTD ?? 0);
}

export function updateSingleGameRecords(game: GameState, update: SingleGameRecordUpdate): RecordEntry[] {
  const book = ensureBook(game);
  const changed: RecordEntry[] = [];

  for (const entry of update.entries) {
    const record: RecordEntry = {
      category: 'singleGame',
      stat: entry.stat,
      value: entry.value,
      teamId: update.teamId,
      teamName: update.teamName,
      year: update.year,
      week: update.week,
      playerId: entry.playerId ?? null,
      playerName: entry.playerName ?? null,
      note: entry.note,
    };

    const leaders = upsertRecord(book, 'singleGame', entry.stat, record);
    if (leaders.some((leader) =>
      leader.year === record.year &&
      leader.week === record.week &&
      leader.teamId === record.teamId &&
      leader.playerId === record.playerId &&
      leader.value === record.value
    )) {
      changed.push(record);
    }
  }

  return changed;
}

export function updateRecordsFromGameResult(game: GameState, result: GameResult): RecordEntry[] {
  const changed: RecordEntry[] = [];
  const homeTeam = game.teams[result.homeTeamId];
  const awayTeam = game.teams[result.awayTeamId];

  if (!homeTeam || !awayTeam) return changed;

  for (const team of [homeTeam, awayTeam]) {
    const teamStats = result.stats[team.id];
    if (!teamStats) continue;

    const entries = teamStats.playerLines.flatMap((line) => {
      const playerEntries: SingleGameRecordUpdate['entries'] = [];
      const touchdowns = (line.passTD ?? 0) + (line.rushTD ?? 0) + (line.recTD ?? 0);
      if ((line.passYds ?? 0) > 0) playerEntries.push({ playerId: line.playerId, playerName: line.name, stat: 'passYds', value: line.passYds ?? 0 });
      if ((line.rushYds ?? 0) > 0) playerEntries.push({ playerId: line.playerId, playerName: line.name, stat: 'rushYds', value: line.rushYds ?? 0 });
      if ((line.recYds ?? 0) > 0) playerEntries.push({ playerId: line.playerId, playerName: line.name, stat: 'recYds', value: line.recYds ?? 0 });
      if (touchdowns > 0) playerEntries.push({ playerId: line.playerId, playerName: line.name, stat: 'touchdowns', value: touchdowns });
      if ((line.sacks ?? 0) > 0) playerEntries.push({ playerId: line.playerId, playerName: line.name, stat: 'sacks', value: line.sacks ?? 0 });
      if ((line.defINT ?? 0) > 0) playerEntries.push({ playerId: line.playerId, playerName: line.name, stat: 'defINT', value: line.defINT ?? 0 });
      return playerEntries;
    });

    entries.push({
      stat: 'pointsGame',
      value: team.id === result.homeTeamId ? result.homeScore : result.awayScore,
      note: 'Team points in a game',
    });

    changed.push(...updateSingleGameRecords(game, {
      year: result.year,
      week: result.week,
      teamId: team.id,
      teamName: teamLabel(team),
      entries,
    }));

    const book = ensureBook(game);
    changed.push({
      category: 'franchise',
      stat: 'winStreak',
      value: Math.max(0, team.streak),
      teamId: team.id,
      teamName: teamLabel(team),
      year: result.year,
      week: result.week,
    });
    upsertRecord(book, 'franchise', 'winStreak', changed.at(-1)!);
  }

  return changed;
}

export function updateSeasonRecords(game: GameState, year: number): RecordEntry[] {
  const book = ensureBook(game);
  const changed: RecordEntry[] = [];

  for (const team of Object.values(game.teams)) {
    const teamName = teamLabel(team);
    const winRecord: RecordEntry = {
      category: 'franchise',
      stat: 'wins',
      value: team.wins,
      teamId: team.id,
      teamName,
      year,
    };
    upsertRecord(book, 'franchise', 'wins', winRecord);
    changed.push(winRecord);

    const pointsRecord: RecordEntry = {
      category: 'franchise',
      stat: 'pointsSeason',
      value: team.seasonStats.pointsFor,
      teamId: team.id,
      teamName,
      year,
    };
    upsertRecord(book, 'franchise', 'pointsSeason', pointsRecord);
    changed.push(pointsRecord);

    for (const player of team.roster) {
      const values: Array<[string, number]> = [
        ['passYds', player.stats.passYds],
        ['rushYds', player.stats.rushYds],
        ['recYds', player.stats.recYds],
        ['passTD', player.stats.passTD],
        ['rushTD', player.stats.rushTD],
        ['sacks', player.stats.sacks],
        ['defINT', player.stats.defINT],
      ];

      for (const [stat, value] of values) {
        if ((value ?? 0) <= 0) continue;
        const record: RecordEntry = {
          category: 'singleSeason',
          stat,
          value,
          teamId: team.id,
          teamName,
          year,
          playerId: player.id,
          playerName: player.name,
        };
        upsertRecord(book, 'singleSeason', stat, record);
        changed.push(record);
      }
    }

    const seasonWins: RecordEntry = {
      category: 'singleSeason',
      stat: 'wins',
      value: team.wins,
      teamId: team.id,
      teamName,
      year,
    };
    upsertRecord(book, 'singleSeason', 'wins', seasonWins);
    changed.push(seasonWins);

    const seasonPoints: RecordEntry = {
      category: 'singleSeason',
      stat: 'pointsFor',
      value: team.seasonStats.pointsFor,
      teamId: team.id,
      teamName,
      year,
    };
    upsertRecord(book, 'singleSeason', 'pointsFor', seasonPoints);
    changed.push(seasonPoints);
  }

  return changed;
}

export function updateCareerRecords(game: GameState, year: number): RecordEntry[] {
  const book = ensureBook(game);
  const changed: RecordEntry[] = [];

  for (const player of Object.values(game.players)) {
    const team = player.teamId ? game.teams[player.teamId] : null;
    const teamId = player.teamId ?? 'free_agents';
    const teamName = team ? teamLabel(team) : 'Free Agents';
    const values: Array<[string, number]> = [
      ['passYds', player.careerStats.passYds ?? 0],
      ['rushYds', player.careerStats.rushYds ?? 0],
      ['recYds', player.careerStats.recYds ?? 0],
      ['touchdowns', normalizeCareerTouchdowns(player)],
      ['sacks', player.careerStats.sacks ?? 0],
      ['defINT', player.careerStats.defINT ?? 0],
      ['gp', player.careerStats.gp ?? 0],
    ];

    for (const [stat, value] of values) {
      if (value <= 0) continue;
      const record: RecordEntry = {
        category: 'career',
        stat,
        value,
        teamId,
        teamName,
        year,
        playerId: player.id,
        playerName: player.name,
      };
      upsertRecord(book, 'career', stat, record);
      changed.push(record);
    }
  }

  return changed;
}

export function getSeasonRecordNotes(game: GameState, seasonYear: number, teamId: string): string[] {
  const book = ensureBook(game);
  const notes = new Set<string>();

  for (const category of ['singleGame', 'singleSeason', 'career', 'franchise'] as const) {
    for (const [stat, entries] of Object.entries(book[category])) {
      const leader = entries[0];
      if (!leader) continue;
      if (leader.year !== seasonYear) continue;
      if (leader.teamId !== teamId) continue;
      notes.add(formatRecordLabel(stat, leader));
    }
  }

  return [...notes].sort();
}

function formatRecordLabel(stat: string, entry: RecordEntry): string {
  const holder = entry.playerName ?? entry.teamName;
  const label = stat.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
  return `${label}: ${holder} (${entry.value})`;
}

export function getPlayerSeasonAwardLabel(player: Player): string {
  const touchdowns = totalTouchdowns(player);
  if (touchdowns >= 15) return `${player.name} scored ${touchdowns} TD`;
  if ((player.stats.passYds ?? 0) >= 4500) return `${player.name} threw for ${player.stats.passYds} yards`;
  if ((player.stats.sacks ?? 0) >= 12) return `${player.name} posted ${player.stats.sacks} sacks`;
  if ((player.stats.defINT ?? 0) >= 5) return `${player.name} grabbed ${player.stats.defINT} INT`;
  return `${player.name} made a record push`;
}
