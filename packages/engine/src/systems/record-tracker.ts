import { getActiveRule } from './league-rules';
import { compareStatLeaders } from '../utils';
import type {
  BrokenRecord,
  CareerLeader,
  GameResult,
  GameState,
  LeagueLeader,
  MilestoneChase,
  MilestoneReached,
  PaceProjection,
  Player,
  Position,
  RecordBook,
  RecordCategory,
  RecordChase,
  RecordEntry,
} from '../types';

const SINGLE_SEASON_RECORD_STATS = ['passYds', 'rushYds', 'recYds', 'passTD', 'rushTD', 'sacks', 'defINT', 'rec'] as const;

export const MILESTONE_THRESHOLDS: Record<string, number[]> = {
  passYds: [10000, 20000, 30000, 40000, 50000],
  passTD: [100, 200, 300, 400, 500],
  rushYds: [5000, 10000, 15000],
  rec: [500, 750, 1000],
  sacks: [50, 100, 150],
  defINT: [25, 50, 75],
  gp: [100, 150, 200],
};

const RECORD_TEMPLATES: Record<string, string[]> = {
  passYds_singleGame: [
    'HISTORY! {player} just set the single-game passing yards record with {value}, clearing {holder} and {previous}.',
    '{player} rewrote the single-game passing book with {value} yards, pushing past {holder}.',
    'One afternoon, one mountain moved: {player} posted {value} passing yards and left {holder} behind.',
  ],
  passYds_singleSeason: [
    '{player} now owns the single-season passing yards mark with {value}, topping {holder} and {previous}.',
    'The season passing crown belongs to {player}: {value} yards, ahead of {holder}.',
    '{player} broke the single-season passing yards record at {value}, moving past {holder}.',
  ],
  rushYds_singleGame: [
    '{player} blasted through the single-game rushing record with {value} yards, ahead of {holder}.',
    'No one ran like {player} today: {value} rushing yards and a new single-game record.',
    '{player} turned the ground game into history with {value} yards, surpassing {holder}.',
  ],
  rushYds_singleSeason: [
    '{player} captured the single-season rushing record with {value}, overtaking {holder}.',
    '{player} is the new season rushing king after reaching {value} yards.',
    '{player} pushed past {holder} and into the record book with {value} rushing yards.',
  ],
  recYds_singleGame: [
    '{player} authored a receiving clinic: {value} yards and a new single-game record.',
    '{player} just delivered the biggest receiving yardage day on record with {value}.',
    '{player} torched the secondary for {value} yards, breaking {holder}\'s old mark.',
  ],
  recYds_singleSeason: [
    '{player} owns the single-season receiving yards record now with {value}.',
    '{player} climbed past {holder} and into first place with {value} receiving yards.',
    '{player} finished the chase and broke the single-season receiving yards record at {value}.',
  ],
  passTD_singleSeason: [
    '{player} threw his way into history with {value} touchdown passes, ahead of {holder}.',
    '{player} now stands atop the single-season passing TD list with {value}.',
    'Touchdown after touchdown, {player} set the new season record at {value}.',
  ],
  rushTD_singleSeason: [
    '{player} powered to {value} rushing touchdowns and a new single-season record.',
    '{player} broke the rushing touchdown mark with {value}, clearing {holder}.',
    '{player} owns the season rushing TD crown now at {value}.',
  ],
  sacks_singleGame: [
    '{player} wrecked the pocket for {value} sacks and the new single-game record.',
    '{player} lived in the backfield all day, piling up {value} sacks and a record.',
    '{player} surpassed {holder} with {value} sacks in one game.',
  ],
  sacks_singleSeason: [
    '{player} set the season sacks record with {value}, pushing past {holder}.',
    '{player} chased down history and finished with {value} sacks, besting {holder}.',
    'Quarterbacks felt {player} all season, and the record book shows it: {value} sacks.',
  ],
  defINT_singleGame: [
    '{player} took over the game with {value} interceptions and a new single-game record.',
    '{player} just posted the most interceptions ever in one game with {value}.',
    '{player} picked off everything in sight and moved ahead of {holder}.',
  ],
  defINT_singleSeason: [
    '{player} set the season interception record with {value}, ahead of {holder}.',
    '{player} finished the takeaway chase and now owns the season mark at {value}.',
    '{player} turned ballhawking into history with {value} interceptions.',
  ],
  touchdowns_singleGame: [
    '{player} found the end zone {value} times and set a new single-game touchdowns record.',
    '{player} produced a scoring avalanche with {value} touchdowns, passing {holder}.',
    'Every trip seemed to end with {player}; {value} touchdowns is the new record.',
  ],
  rec_singleSeason: [
    '{player} caught history with {value} receptions and the new season record.',
    '{player} became the most productive receiver by catches in a season with {value}.',
    '{player} moved past {holder} and into first with {value} receptions.',
  ],
  generic: [
    '{player} broke the {category} {statLabel} record with {value}, surpassing {holder} and {previous}.',
    '{player} pushed the {category} {statLabel} mark to {value}, ahead of {holder}.',
    'The {category} {statLabel} record belongs to {player} now at {value}.',
  ],
};

const MILESTONE_TEMPLATES: Record<string, string[]> = {
  passYds: [
    '{player} has reached {label} career passing yards. Only {count} players have touched that plateau.',
    '{player} crossed {label} career passing yards and joined rare company.',
    '{player} hit {label} career passing yards, another major checkpoint in a growing legacy.',
  ],
  passTD: [
    '{player} has reached {label} career passing touchdowns. Only {count} players have done it.',
    '{player} joined the {label} career passing touchdown club.',
    '{player} kept climbing with {label} career touchdown passes.',
  ],
  rushYds: [
    '{player} has reached {label} career rushing yards, entering elite rushing territory.',
    '{player} crossed {label} career rushing yards and kept the chains moving historically.',
    '{player} is now over {label} career rushing yards and counting.',
  ],
  rec: [
    '{player} has caught his way to {label} career receptions.',
    '{player} reached {label} career catches and joined an exclusive list.',
    '{player} now owns {label} career receptions, another receiver milestone cleared.',
  ],
  sacks: [
    '{player} reached {label} career sacks and added another mark to the resume.',
    '{player} has piled up {label} career sacks, putting offensive lines on notice.',
    '{player} joined the {label}-sack club and kept climbing.',
  ],
  defINT: [
    '{player} collected interception number {label} for the career milestone.',
    '{player} reached {label} career interceptions and entered ballhawk history.',
    '{player} has now produced {label} career interceptions.',
  ],
  gp: [
    '{player} has appeared in {label} career games, a longevity milestone few sustain.',
    '{player} reached {label} career games played and kept stacking seasons.',
    '{player} joined the long-haul club with {label} career games played.',
  ],
  generic: [
    '{player} has reached {label} career {statLabel}. Only {count} players have achieved that milestone.',
    '{player} crossed the {label} career {statLabel} line.',
    '{player} now owns {label} career {statLabel} and counting.',
  ],
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function statLabel(stat: string): string {
  return stat
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .replace('Yds', 'Yards')
    .replace('Def I N T', 'INT')
    .replace('Gp', 'Games Played');
}

function normalizeCategory(category: RecordCategory): string {
  return category === 'singleGame'
    ? 'single-game'
    : category === 'singleSeason'
      ? 'single-season'
      : category;
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
    return [entry.category, entry.stat, entry.playerId ?? '', entry.teamId].join(':');
  }
  return [entry.category, entry.stat, entry.year, entry.teamId].join(':');
}

function upsertRecord(book: RecordBook, category: RecordCategory, stat: string, entry: RecordEntry): RecordEntry[] {
  const bucket = book[category];
  const existing = bucket[stat] ?? [];
  const identity = recordIdentity(entry);
  bucket[stat] = [...existing.filter((candidate) => recordIdentity(candidate) !== identity), entry]
    .sort(stableSort)
    .slice(0, 10);
  return bucket[stat]!;
}

function chooseTemplate(templates: string[], seed: number): string {
  if (templates.length === 0) return '';
  return templates[Math.abs(seed) % templates.length]!;
}

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function milestoneFlagKey(stat: string, threshold: number): string {
  return `historian:milestone:${stat}:${threshold}`;
}

function careerValueFor(player: Player, stat: string): number {
  if (stat === 'gp') return Number(player.careerStats.gp ?? 0);
  return Number(player.careerStats[stat] ?? 0);
}

function seasonValueFor(player: Player, stat: string): number {
  return Number(player.stats?.[stat] ?? 0);
}

function regularSeasonGames(game: GameState): number {
  const configuredWeeks = Number(getActiveRule(game.leagueRules, 'schedule_weeks', game.year));
  return Math.max(1, configuredWeeks - 1);
}

function playerGamesPlayed(game: GameState, player: Player): number {
  if ((player.stats?.gamesPlayed ?? 0) > 0) {
    return Number(player.stats?.gamesPlayed ?? 0);
  }
  if (!player.teamId) return 0;
  const team = game.teams[player.teamId];
  return team ? team.wins + team.losses + team.ties : 0;
}

function topRecord(records: RecordBook, category: RecordCategory, stat: string): RecordEntry | null {
  return records[category][stat]?.[0] ?? null;
}

function buildPaceProjection(
  currentValue: number,
  recordValue: number,
  recordHolder: string,
  weeksPlayed: number,
  totalWeeks: number,
  stat: string,
): PaceProjection {
  const safeWeeks = Math.max(1, weeksPlayed);
  const projected = round((currentValue / safeWeeks) * totalWeeks);
  const pacePct = recordValue > 0 ? round((projected / recordValue) * 100) : 0;
  return {
    stat,
    currentValue,
    projected,
    gamesRemaining: Math.max(0, totalWeeks - safeWeeks),
    onRecordPace: recordValue > 0 && projected >= recordValue,
    recordValue,
    recordHolder,
    pacePct,
  };
}

function playerIdsFromResults(results: GameResult[]): Set<string> {
  const ids = new Set<string>();
  for (const result of results) {
    for (const teamStats of Object.values(result.stats)) {
      for (const line of teamStats.playerLines ?? []) {
        ids.add(line.playerId);
      }
    }
  }
  return ids;
}

function brokenSingleGameRecords(game: GameState, results: GameResult[]): BrokenRecord[] {
  const broken: BrokenRecord[] = [];

  for (const result of results) {
    for (const teamId of [result.homeTeamId, result.awayTeamId]) {
      const team = game.teams[teamId];
      const teamStats = result.stats[teamId];
      if (!team || !teamStats) continue;

      for (const line of teamStats.playerLines ?? []) {
        const entries: Array<[string, number]> = [
          ['passYds', Number(line.passYds ?? 0)],
          ['rushYds', Number(line.rushYds ?? 0)],
          ['recYds', Number(line.recYds ?? 0)],
          ['touchdowns', Number(line.passTD ?? 0) + Number(line.rushTD ?? 0) + Number(line.recTD ?? 0)],
          ['sacks', Number(line.sacks ?? 0)],
          ['defINT', Number(line.defINT ?? 0)],
        ];

        for (const [stat, value] of entries) {
          if (value <= 0) continue;
          const previous = topRecord(game.records, 'singleGame', stat);
          if (previous && value <= previous.value) continue;

          const record: BrokenRecord = {
            playerId: line.playerId,
            playerName: line.name,
            teamId,
            stat,
            newValue: value,
            previousValue: previous?.value ?? 0,
            previousHolder: previous?.playerName ?? previous?.teamName ?? 'No prior holder',
            category: 'singleGame',
            year: result.year,
            week: result.week,
            narrative: '',
          };
          record.narrative = generateRecordNarrative(record);
          broken.push(record);

          upsertRecord(game.records, 'singleGame', stat, {
            category: 'singleGame',
            stat,
            value,
            teamId,
            teamName: `${team.city} ${team.name}`,
            year: result.year,
            week: result.week,
            playerId: line.playerId,
            playerName: line.name,
          });
        }
      }
    }
  }

  return broken;
}

function brokenSingleSeasonRecords(game: GameState, playerIds?: Set<string>): BrokenRecord[] {
  const broken: BrokenRecord[] = [];

  for (const player of Object.values(game.players)) {
    if (playerIds && !playerIds.has(player.id)) continue;
    if (!player.teamId) continue;

    const team = game.teams[player.teamId];
    if (!team) continue;

    for (const stat of SINGLE_SEASON_RECORD_STATS) {
      const value = seasonValueFor(player, stat);
      if (value <= 0) continue;

      const previous = topRecord(game.records, 'singleSeason', stat);
      if (previous && value <= previous.value) continue;
      if (
        previous
        && previous.playerId === player.id
        && previous.teamId === player.teamId
        && previous.year === game.year
      ) {
        upsertRecord(game.records, 'singleSeason', stat, {
          category: 'singleSeason',
          stat,
          value,
          teamId: team.id,
          teamName: `${team.city} ${team.name}`,
          year: game.year,
          playerId: player.id,
          playerName: player.name,
        });
        continue;
      }

      const record: BrokenRecord = {
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId,
        stat,
        newValue: value,
        previousValue: previous?.value ?? 0,
        previousHolder: previous?.playerName ?? previous?.teamName ?? 'No prior holder',
        category: 'singleSeason',
        year: game.year,
        week: game.week,
        narrative: '',
      };
      record.narrative = generateRecordNarrative(record);
      broken.push(record);

      upsertRecord(game.records, 'singleSeason', stat, {
        category: 'singleSeason',
        stat,
        value,
        teamId: team.id,
        teamName: `${team.city} ${team.name}`,
        year: game.year,
        playerId: player.id,
        playerName: player.name,
      });
    }
  }

  return broken;
}

function teamAbbr(game: GameState, teamId: string | null | undefined): string {
  if (!teamId) return 'FA';
  return game.teams[teamId]?.abbr ?? teamId;
}

function awardLabelsForSeason(game: GameState, playerId: string, season: number): string[] {
  return game.awardsHistory
    .filter((entry) => entry.year === season)
    .flatMap((entry) =>
      entry.awards
        .filter((award) => award.winnerId === playerId)
        .map((award) => award.label));
}

function countMilestoneReachers(game: GameState, stat: string, threshold: number): number {
  const archiveCount = game.playerArchive.filter((entry) => {
    const value = stat === 'gp'
      ? Number(entry.careerStats?.gp ?? 0)
      : Number(entry.careerStats?.[stat] ?? 0);
    return value >= threshold;
  }).length;
  const activeOnlyCount = Object.values(game.players)
    .filter((player) => !game.playerArchive.some((entry) => entry.playerId === player.id))
    .filter((player) => careerValueFor(player, stat) >= threshold)
    .length;
  return archiveCount + activeOnlyCount;
}

export function getRecordHolders(
  records: RecordBook,
  category: RecordCategory,
  stat: string,
  limit = 10,
): RecordEntry[] {
  return [...(records[category][stat] ?? [])].slice(0, limit);
}

export function getSeasonPaceProjection(
  player: Player,
  stat: string,
  weeksPlayed: number,
  totalWeeks: number,
): PaceProjection {
  return buildPaceProjection(
    seasonValueFor(player, stat),
    0,
    '',
    weeksPlayed,
    totalWeeks,
    stat,
  );
}

export function checkRecordChases(game: GameState): RecordChase[] {
  const totalWeeks = regularSeasonGames(game);
  const chases = Object.values(game.players)
    .flatMap<RecordChase>((player) => {
      if (!player.teamId) return [];
      const weeksPlayed = playerGamesPlayed(game, player);
      if (weeksPlayed <= 0 || weeksPlayed >= totalWeeks) return [];

      return SINGLE_SEASON_RECORD_STATS.flatMap((stat) => {
        const currentValue = seasonValueFor(player, stat);
        if (currentValue <= 0) return [];
        const record = topRecord(game.records, 'singleSeason', stat);
        if (!record || record.playerId === player.id && record.year === game.year) return [];
        const projection = buildPaceProjection(currentValue, record.value, record.playerName ?? record.teamName, weeksPlayed, totalWeeks, stat);
        if (projection.pacePct < 80) return [];

        return [{
          playerId: player.id,
          playerName: player.name,
          teamId: player.teamId!,
          stat,
          currentValue,
          recordValue: record.value,
          recordHolder: record.playerName ?? record.teamName,
          pace: round(Math.min(100, projection.pacePct)),
          category: 'singleSeason',
          weeksRemaining: projection.gamesRemaining,
          projected: projection.projected,
        }];
      });
    })
    .sort((a, b) =>
      (b.projected - b.recordValue) - (a.projected - a.recordValue)
      || b.pace - a.pace
      || a.playerName.localeCompare(b.playerName));

  return chases;
}

export function detectBrokenRecords(game: GameState, weekResults: GameResult[]): BrokenRecord[] {
  const involvedPlayers = playerIdsFromResults(weekResults);
  const broken = [
    ...brokenSingleGameRecords(game, weekResults),
    ...brokenSingleSeasonRecords(game, involvedPlayers),
  ];
  return broken.sort((a, b) => a.playerName.localeCompare(b.playerName) || a.stat.localeCompare(b.stat));
}

export function getActiveMilestoneChases(game: GameState): MilestoneChase[] {
  return Object.values(game.players)
    .flatMap<MilestoneChase>((player) => Object.entries(MILESTONE_THRESHOLDS).flatMap(([stat, thresholds]) => {
      const currentValue = careerValueFor(player, stat);
      const nextThreshold = thresholds.find((threshold) => threshold > currentValue);
      if (!nextThreshold) return [];

      const pace = round((currentValue / nextThreshold) * 100);
      if (pace < 80) return [];

      return [{
        playerId: player.id,
        playerName: player.name,
        stat,
        currentValue,
        milestoneValue: nextThreshold,
        milestoneLabel: `${nextThreshold.toLocaleString()}`,
        remaining: nextThreshold - currentValue,
        pace,
      }];
    }))
    .sort((a, b) => a.remaining - b.remaining || b.pace - a.pace || a.playerName.localeCompare(b.playerName));
}

export function checkMilestones(game: GameState): MilestoneReached[] {
  const reached: MilestoneReached[] = [];

  for (const player of Object.values(game.players)) {
    for (const [stat, thresholds] of Object.entries(MILESTONE_THRESHOLDS)) {
      const currentValue = careerValueFor(player, stat);
      for (const threshold of thresholds) {
        if (currentValue < threshold) continue;
        const flag = milestoneFlagKey(stat, threshold);
        if (player.traitMilestones[flag]) continue;

        player.traitMilestones[flag] = true;
        const milestone: MilestoneReached = {
          playerId: player.id,
          playerName: player.name,
          stat,
          value: currentValue,
          milestoneLabel: `${threshold.toLocaleString()}`,
          narrative: '',
          year: game.year,
          week: game.week,
        };
        milestone.narrative = generateMilestoneNarrative(milestone, countMilestoneReachers(game, stat, threshold));
        reached.push(milestone);
      }
    }
  }

  return reached;
}

export function generateRecordNarrative(record: BrokenRecord): string {
  const key = `${record.stat}_${record.category}`;
  const templates = RECORD_TEMPLATES[key] ?? RECORD_TEMPLATES.generic ?? [];
  const template = chooseTemplate(templates, record.year + record.week + record.newValue + record.previousValue);
  return formatTemplate(template, {
    player: record.playerName,
    value: String(record.newValue),
    holder: record.previousHolder,
    previous: String(record.previousValue),
    statLabel: statLabel(record.stat),
    category: normalizeCategory(record.category),
  });
}

export function generateMilestoneNarrative(milestone: MilestoneReached, playerCount?: number): string {
  const templates = MILESTONE_TEMPLATES[milestone.stat] ?? MILESTONE_TEMPLATES.generic ?? [];
  const template = chooseTemplate(templates, milestone.year + milestone.week + milestone.value);
  return formatTemplate(template, {
    player: milestone.playerName,
    label: milestone.milestoneLabel,
    statLabel: statLabel(milestone.stat).toLowerCase(),
    count: Math.max(1, playerCount ?? 1),
  });
}

export function getLeagueLeaders(
  game: GameState,
  stat: string,
  pos?: Position,
  limit = 10,
): LeagueLeader[] {
  return Object.values(game.players)
    .filter((player) => player.teamId)
    .filter((player) => !pos || player.pos === pos)
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId!,
      teamAbbr: teamAbbr(game, player.teamId),
      pos: player.pos,
      value: seasonValueFor(player, stat),
    }))
    .filter((leader) => leader.value > 0)
    .sort(compareStatLeaders)
    .slice(0, limit)
    .map((leader, index) => ({
      ...leader,
      rank: index + 1,
    }));
}

export function getCareerLeaders(
  game: GameState,
  stat: string,
  limit = 10,
): CareerLeader[] {
  const activeIds = new Set(Object.keys(game.players));
  const leaders = new Map<string, CareerLeader>();

  for (const archive of game.playerArchive) {
    const activePlayer = game.players[archive.playerId];
    const isActive = activeIds.has(archive.playerId) && Boolean(activePlayer?.teamId);
    const value = Number(activePlayer ? careerValueFor(activePlayer, stat) : archive.careerStats?.[stat] ?? (stat === 'gp' ? archive.careerStats?.gp : 0) ?? 0);
    if (value <= 0) continue;
    leaders.set(archive.playerId, {
      playerId: archive.playerId,
      playerName: activePlayer?.name ?? archive.name,
      pos: activePlayer?.pos ?? archive.positions[0] ?? 'WR',
      value,
      rank: 0,
      isActive,
      years: Math.max(1, archive.lastYear - archive.firstYear + 1),
    });
  }

  for (const player of Object.values(game.players)) {
    if (leaders.has(player.id)) continue;
    const value = careerValueFor(player, stat);
    if (value <= 0) continue;
    leaders.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      pos: player.pos,
      value,
      rank: 0,
      isActive: Boolean(player.teamId),
      years: Math.max(1, Number(player.careerStats.seasons ?? player.yearsExp + 1)),
    });
  }

  return [...leaders.values()]
    .sort(compareStatLeaders)
    .slice(0, limit)
    .map((leader, index) => ({
      ...leader,
      rank: index + 1,
    }));
}

export function buildCareerTimelineHighlights(
  game: GameState,
  playerId: string,
  season: number,
): string[] {
  const highlights = new Set<string>();

  for (const record of game.records.singleSeason ? Object.values(game.records.singleSeason).flat() : []) {
    if (record.playerId === playerId && record.year === season) {
      highlights.add(`Single-season ${statLabel(record.stat)} record`);
    }
  }
  for (const record of game.records.singleGame ? Object.values(game.records.singleGame).flat() : []) {
    if (record.playerId === playerId && record.year === season) {
      highlights.add(`Single-game ${statLabel(record.stat)} record`);
    }
  }

  for (const award of awardLabelsForSeason(game, playerId, season)) {
    highlights.add(award);
  }

  return [...highlights];
}
